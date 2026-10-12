// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { CapabilityObservationLifetime } from "./capability-observation-lifetime";

import { boundedGrpcFetch } from "./grpc-response-budget";
import { createReadDeadline } from "./read-deadline";
import {
  GrpcStatusCode,
  GrpcTypes,
  RpcError,
  RtdGrpcClient,
} from "rtd-typescript/grpc";
import { decodeFreshObject, FRESH_OBJECT_MASK } from "./fresh-object";
import { assertNativeReadWindowUnchanged, NetworkIdentityError } from "./identity";
import {
  matchMoveContract,
  WalletMoveContractError,
} from "./move-contract-shape";
import {
  probeMovePackageCapabilities,
  type WalletMovePackageCapabilities,
} from "./move-package-capabilities";
import { assertGenesisDigest } from "./profile";
import { WalletReadSession } from "./session";
import {
  deploymentSha256,
  matchesDeploymentPackage,
  nameRegistryMoveContract,
  verifyNameRegistryField,
  verifyNameRegistryRoot,
  verifyReviewedDeployment,
  WalletDeploymentContractError,
  type ReviewedWalletDeployment,
} from "./deployment-contract";

class DeploymentReadError extends RpcError {
  constructor(readonly reason: "budget" | "missing-positive" | "transport") {
    super(
      "部署合同未取得完整只读响应",
      reason === "budget" ? "RESOURCE_EXHAUSTED" : "UNKNOWN",
    );
  }
}
export type WalletNameRegistryCapability = Readonly<
  | { state: "unconfigured" }
  | { state: "unreviewed" }
  | {
      state: "incomplete";
      reason:
        | "package"
        | "abi"
        | "registry"
        | "changed"
        | "missing-positive"
        | "budget"
        | "transport";
    }
  | {
      state: "anchor-matched";
      rootId: string;
      fieldId: string;
      rootVersion: string;
      fieldVersion: string;
      forwardSize: string;
      reverseSize: string;
    }
>;
export interface WalletDeploymentCapabilities {
  readonly scope: "reviewed-move-deployment";
  readonly serviceDeployment: "not-verified";
  readonly state:
    | "unreviewed"
    | "declaration-rejected"
    | "reviewed-deployment-matched"
    | "reviewed-deployment-degraded";
  readonly bindingKey: string;
  readonly readSessionKey: string;
  readonly observedAt: number;
  readonly declaration: Readonly<
    | { state: "missing" }
    | { state: "rejected"; reason: WalletDeploymentContractError["reason"] }
    | {
        state: "release-pin-matched";
        sha256: string;
        reviewId: string;
        authority: "caller-pinned-release";
      }
  >;
  readonly packages: readonly Readonly<{
    packageId: string;
    state: "pin-matched" | "pin-mismatch" | "incomplete";
  }>[];
  readonly move: WalletMovePackageCapabilities | null;
  readonly registry: WalletNameRegistryCapability;
  readonly executionSemantics: "not-verified";
}

function cancellableRaw<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener("abort", abort);
      reject(signal.reason);
    };
    signal.addEventListener("abort", abort, { once: true });
    work.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        signal.aborted ? reject(signal.reason) : resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
    if (signal.aborted) abort();
  });
}
async function body(response: Response, fence: () => void): Promise<Response> {
  if (!response.ok || !response.body) {
    void response.body?.cancel().catch(() => {});
    throw new DeploymentReadError("transport");
  }
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0,
    complete = false;
  try {
    while (true) {
      const item = await reader.read();
      fence();
      if (item.done) {
        complete = true;
        break;
      }
      size += item.value.length;
      if (size > 2 * 1024 * 1024) throw new DeploymentReadError("budget");
      chunks.push(item.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return new Response(bytes, {
      status: response.status,
      headers: response.headers,
    });
  } finally {
    if (!complete) void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

/** Fresh package/ABI and independently pinned release evidence. This never publishes a wallet client or signing readiness. */
export async function probeDeploymentCapabilities(
  session: WalletReadSession,
  options: {
    declaration?: { json: string; trustedSha256: string };
    fetch?: typeof fetch;
    lifetime?: CapabilityObservationLifetime;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {},
): Promise<WalletDeploymentCapabilities> {
  const cancellable = <T>(promise: Promise<T>, signal: AbortSignal) =>
    cancellableRaw(options.lifetime?.track(promise) ?? promise, signal);
  let disposeDeadline: (() => void) | undefined;
  return session
    .read(async (sessionSignal) => {
      const timeoutMs = options.timeoutMs ?? 30_000;
      if (
        !Number.isSafeInteger(timeoutMs) ||
        timeoutMs < 1 ||
        timeoutMs > 60_000
      )
        throw new RangeError("部署探测期限必须在1–60000ms");
      const deadline = createReadDeadline(timeoutMs);
      disposeDeadline = deadline.dispose;
      const signal = AbortSignal.any([
        sessionSignal,
        deadline.signal,
        ...(options.signal ? [options.signal] : []),
      ]);
      const fence = () => {
        signal.throwIfAborted();
        session.assertActive();
      };
      const finish = (
        value: Omit<
          WalletDeploymentCapabilities,
          | "bindingKey"
          | "readSessionKey"
          | "observedAt"
          | "executionSemantics"
          | "scope"
          | "serviceDeployment"
        >,
      ): WalletDeploymentCapabilities => {
        fence();
        return Object.freeze({
          ...value,
          scope: "reviewed-move-deployment",
          serviceDeployment: "not-verified",
          bindingKey: session.bindingKey,
          readSessionKey: session.cacheKey,
          observedAt: Date.now(),
          executionSemantics: "not-verified",
        });
      };
      const work = async (): Promise<WalletDeploymentCapabilities> => {
        fence();
        // Snapshot scalar inputs before the asynchronous hash; caller mutation cannot retarget the declaration.
        const input = options.declaration && {
          json: options.declaration.json,
          trustedSha256: options.declaration.trustedSha256,
        };
        let declaration: ReviewedWalletDeployment | undefined;
        if (input) {
          try {
            declaration = await verifyReviewedDeployment(
              session.profile,
              input,
            );
            fence();
          } catch (error) {
            fence();
            if (!(error instanceof WalletDeploymentContractError)) throw error;
            return finish({
              state: "declaration-rejected",
              declaration: Object.freeze({
                state: "rejected",
                reason: error.reason,
              }),
              packages: Object.freeze([]),
              move: null,
              registry: Object.freeze({
                state: session.profile.packages.name
                  ? "unreviewed"
                  : "unconfigured",
              }),
            });
          }
        }
        const move = await probeMovePackageCapabilities(session, {
          fetch: options.fetch,
          lifetime: options.lifetime,
          signal,
          timeoutMs,
        });
        fence();
        if (!declaration || !input)
          return finish({
            state: "unreviewed",
            declaration: Object.freeze({ state: "missing" }),
            packages: Object.freeze([]),
            move,
            registry: Object.freeze({
              state: session.profile.packages.name
                ? "unreviewed"
                : "unconfigured",
            }),
          });
        const packages = Object.freeze(
          declaration.packages.map((expected) => {
            const result = move.packages.find(
              (p) => p.packageId === expected.storageId,
            )?.result;
            return Object.freeze({
              packageId: expected.storageId,
              state:
                result?.state !== "association-verified"
                  ? ("incomplete" as const)
                  : matchesDeploymentPackage(expected, result.association)
                    ? ("pin-matched" as const)
                    : ("pin-mismatch" as const),
            });
          }),
        );
        let registry: WalletNameRegistryCapability = Object.freeze({
          state: "unconfigured",
        });
        if (declaration.nameRegistry) {
          const pkgId = session.profile.packages.name!.packageId;
          const association = move.packages.find(
            (p) => p.packageId === pkgId,
          )?.result;
          if (
            move.groups.names.state !== "abi-compatible" ||
            packages.find((p) => p.packageId === pkgId)?.state !==
              "pin-matched" ||
            association?.state !== "association-verified"
          )
            registry = Object.freeze({
              state: "incomplete",
              reason: "package",
            });
          else {
            const endpoint = session.profile.endpoints.fullnodeGrpcWeb;
            const allowed = [
              "LedgerService/GetServiceInfo",
              "LedgerService/GetObject",
              "MovePackageService/GetPackage",
            ].map((method) => `${endpoint}/rtd.rpc.v2.${method}`);
            const client = new RtdGrpcClient({
              network: session.profile.sdkNetwork,
              baseUrl: endpoint,
              format: "binary",
              mvr: { url: "" },
              fetch: async (url, init) => {
                fence();
                if (init?.method !== "POST" || !allowed.includes(String(url)))
                  throw new DeploymentReadError("transport");
                const response = await boundedGrpcFetch(
                  options.fetch ?? globalThis.fetch,
                )(url, {
                  ...init,
                  signal,
                  credentials: "omit",
                  redirect: "error",
                });
                fence();
                return body(response, fence);
              },
            });
            const info = async () => {
              const { response } = await session.request(signal, () =>
                client.ledgerService.getServiceInfo(
                  {},
                  { abort: signal, timeout: timeoutMs },
                ),
              );
              let h0: string;
              try {
                h0 = assertGenesisDigest(response.chainId);
              } catch {
                throw new NetworkIdentityError("fullnode", "incompatible");
              }
              if (h0 !== session.profile.expectedGenesisDigest)
                throw new NetworkIdentityError("fullnode", "chain-mismatch");
              const values = [
                response.checkpointHeight,
                response.lowestAvailableCheckpoint,
                response.lowestAvailableCheckpointObjects,
              ];
              if (
                values.some(
                  (v) =>
                    typeof v !== "bigint" || v < 0n || v > 0xffffffffffffffffn,
                )
              )
                throw new NetworkIdentityError("fullnode", "incompatible");
              const [height, lower, objects] = values as bigint[];
              if (
                lower > height ||
                objects > height ||
                height < BigInt(move.checkpointHeight)
              )
                throw new NetworkIdentityError("fullnode", "incompatible");
              return { height, lower, objects };
            };
            const readObject = async (id: string) => {
              const { response } = await session.request(signal, () =>
                client.ledgerService.getObject(
                  { objectId: id, readMask: { paths: [...FRESH_OBJECT_MASK] } },
                  { abort: signal, timeout: timeoutMs },
                ),
              );
              if (!response.object)
                throw new DeploymentReadError("missing-positive");
              try {
                return decodeFreshObject(response.object, id);
              } catch {
                throw new WalletDeploymentContractError("registry");
              }
            };
            const before = await info();
            try {
              const anchor = declaration.nameRegistry;
              const root = await readObject(anchor.rootId);
              verifyNameRegistryRoot(session.profile, anchor, root);
              const field = await readObject(anchor.registryFieldId);
              const sizes = verifyNameRegistryField(
                session.profile,
                anchor,
                field,
              );
              const { response } = await session.request(signal, () =>
                client.movePackageService.getPackage(
                  { packageId: pkgId },
                  { abort: signal, timeout: timeoutMs },
                ),
              );
              if (!response.package)
                throw new DeploymentReadError("missing-positive");
              if (
                (await deploymentSha256(
                  GrpcTypes.Package.toBinary(response.package),
                )) !== association.association.descriptorSha256
              )
                throw new WalletDeploymentContractError("registry");
              fence();
              matchMoveContract(
                response.package,
                nameRegistryMoveContract(pkgId),
              );
              const lastField = await readObject(anchor.registryFieldId);
              verifyNameRegistryField(session.profile, anchor, lastField);
              const lastRoot = await readObject(anchor.rootId);
              verifyNameRegistryRoot(session.profile, anchor, lastRoot);
              registry =
                root.version !== lastRoot.version ||
                root.digest !== lastRoot.digest ||
                field.version !== lastField.version ||
                field.digest !== lastField.digest
                  ? Object.freeze({ state: "incomplete", reason: "changed" })
                  : Object.freeze({
                      state: "anchor-matched",
                      rootId: root.objectId,
                      fieldId: field.objectId,
                      rootVersion: root.version,
                      fieldVersion: field.version,
                      ...sizes,
                    });
            } catch (error) {
              fence();
              if (error instanceof NetworkIdentityError) throw error;
              const reason =
                error instanceof WalletMoveContractError
                  ? error.reason === "budget"
                    ? "budget"
                    : "abi"
                  : error instanceof WalletDeploymentContractError
                    ? "registry"
                    : error instanceof DeploymentReadError
                      ? error.reason
                      : error instanceof RpcError &&
                          error.code ===
                            GrpcStatusCode[GrpcStatusCode.NOT_FOUND]
                        ? "missing-positive"
                        : "transport";
              registry = Object.freeze({ state: "incomplete", reason });
            }
            // Even a failed name read is bracketed; known end-chain mismatch must not disappear behind a local error.
            const after = await info();
            assertNativeReadWindowUnchanged("fullnode", before, after);
          }
        }
        return finish({
          state:
            packages.every((p) => p.state === "pin-matched") &&
            move.state === "selected-contracts-compatible" &&
            (registry.state === "anchor-matched" ||
              registry.state === "unconfigured")
              ? "reviewed-deployment-matched"
              : "reviewed-deployment-degraded",
          declaration: Object.freeze({
            state: "release-pin-matched",
            sha256: input.trustedSha256,
            reviewId: declaration.reviewId,
            authority: "caller-pinned-release",
          }),
          packages,
          move,
          registry,
        });
      };
      return cancellable(work(), signal);
    })
    .finally(() => disposeDeadline?.());
}
