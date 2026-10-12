// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { CapabilityObservationLifetime } from "./capability-observation-lifetime";

import { boundedGrpcFetch } from "./grpc-response-budget";
import { createReadDeadline } from "./read-deadline";
import { bcs } from "rtd-typescript/bcs";
import {
  GrpcStatusCode,
  GrpcTypes,
  RpcError,
  RtdGrpcClient,
} from "rtd-typescript/grpc";
import { decodeFreshObject, FRESH_OBJECT_MASK } from "./fresh-object";
import { assertNativeReadWindowUnchanged, NetworkIdentityError } from "./identity";
import { auditWalletMoveCatalog } from "./move-contract-catalog";
import {
  associateMovePackage,
  matchMoveContract,
  WalletMoveContractError,
} from "./move-contract-shape";
import { assertGenesisDigest } from "./profile";
import { WalletReadSession } from "./session";
import {
  walletMoveContracts,
  type WalletMoveContractGroup,
} from "./wallet-move-contracts";

class PackageProbeError extends RpcError {
  constructor(readonly reason: "unavailable" | "missing-positive" | "budget") {
    super(
      "当前包合同未取得完整可读响应",
      reason === "budget" ? "RESOURCE_EXHAUSTED" : "UNKNOWN",
    );
    this.name = "PackageProbeError";
  }
}
export interface WalletMovePackageAssociation {
  readonly storageId: string;
  readonly originalId: string;
  readonly originalIdVerification:
    | "version-one-verified"
    | "service-declaration";
  readonly version: string;
  readonly objectDigest: string;
  readonly objectBcsSha256: string;
  readonly descriptorSha256: string;
  readonly modules: readonly Readonly<{
    name: string;
    bytecodeSha256: string;
  }>[];
}
export type WalletMovePackageState = Readonly<
  | { state: "association-verified"; association: WalletMovePackageAssociation }
  | {
      state: "incomplete";
      reason: "missing-positive" | "association" | "changed" | "budget";
    }
  | { state: "unavailable"; reason: "transport" }
>;
export type WalletMoveGroupCapability = Readonly<
  | { state: "unconfigured" }
  | {
      state: "unsupported";
      reason: "contract-not-reviewed" | "kiosk-package" | "abi";
    }
  | { state: "incomplete"; reason: "package" | "dependency" | "budget" }
  | {
      state: "abi-compatible";
      contracts: readonly Readonly<{
        packageId: string;
        abiSha256: string;
        datatypes: number;
        functions: number;
      }>[];
    }
>;
export interface WalletMovePackageCapabilities {
  readonly state:
    | "selected-contracts-compatible"
    | "selected-contracts-degraded";
  readonly bindingKey: string;
  readonly readSessionKey: string;
  readonly observedAt: number;
  readonly genesisDigest: string;
  readonly checkpointHeight: string;
  readonly packages: readonly Readonly<{
    packageId: string;
    result: WalletMovePackageState;
  }>[];
  readonly groups: Readonly<
    Record<WalletMoveContractGroup, WalletMoveGroupCapability>
  >;
  readonly catalogClosure: "reviewed-wallet-contracts";
  readonly catalog: ReturnType<typeof auditWalletMoveCatalog>;
  readonly deployment: "not-verified";
  readonly registry: "not-verified";
  readonly executionSemantics: "not-verified";
}
function u64(value: unknown) {
  if (typeof value !== "bigint" || value < 0n || value > 0xffffffffffffffffn)
    throw new NetworkIdentityError("fullnode", "incompatible");
  return value;
}
function cancellableRaw<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener("abort", abort);
      reject(signal.reason);
    };
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
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
async function boundedResponse(response: Response, fence: () => void) {
  if (!response.ok || !response.body) {
    void response.body?.cancel().catch(() => {});
    throw new PackageProbeError("unavailable");
  }
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let length = 0,
    complete = false;
  try {
    while (true) {
      const chunk = await reader.read();
      fence();
      if (chunk.done) {
        complete = true;
        break;
      }
      length += chunk.value.length;
      if (length > 2 * 1024 * 1024) throw new PackageProbeError("budget");
      chunks.push(chunk.value);
    }
    const bytes = new Uint8Array(length);
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
function negative(error: unknown): WalletMovePackageState {
  if (error instanceof WalletMoveContractError)
    return Object.freeze({
      state: "incomplete",
      reason: error.reason === "budget" ? "budget" : "association",
    });
  if (error instanceof PackageProbeError && error.reason !== "unavailable")
    return Object.freeze({ state: "incomplete", reason: error.reason });
  if (
    error instanceof RpcError &&
    error.code === GrpcStatusCode[GrpcStatusCode.NOT_FOUND]
  )
    return Object.freeze({ state: "incomplete", reason: "missing-positive" });
  return Object.freeze({ state: "unavailable", reason: "transport" });
}

/** Reviewed wallet codec/call contracts and package association. Opaque user contracts, code semantics, deployment, registry and authorization remain separate. */
export async function probeMovePackageCapabilities(
  session: WalletReadSession,
  options: {
    fetch?: typeof fetch;
    lifetime?: CapabilityObservationLifetime;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {},
): Promise<WalletMovePackageCapabilities> {
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
        throw new RangeError("包合同探测期限必须在1–60000ms");
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
      fence();
      const endpoint = session.profile.endpoints.fullnodeGrpcWeb;
      const fetchFn = boundedGrpcFetch(options.fetch ?? globalThis.fetch);
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
        fetch: async (input, init) => {
          fence();
          if (init?.method !== "POST" || !allowed.includes(String(input)))
            throw new PackageProbeError("unavailable");
          const response = await fetchFn(input, {
            ...init,
            signal,
            credentials: "omit",
            redirect: "error",
          });
          fence();
          return boundedResponse(response, fence);
        },
      });
      const hash = async (bytes: Uint8Array) => {
        const result = new Uint8Array(
          await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
        );
        fence();
        return [...result]
          .map((value) => value.toString(16).padStart(2, "0"))
          .join("");
      };
      const info = async () => {
        const { response } = await session.request(signal, () =>
          client.ledgerService.getServiceInfo(
            {},
            { abort: signal, timeout: timeoutMs },
          ),
        );
        let digest: string;
        try {
          digest = assertGenesisDigest(response.chainId);
        } catch {
          throw new NetworkIdentityError("fullnode", "incompatible");
        }
        if (digest !== session.profile.expectedGenesisDigest)
          throw new NetworkIdentityError("fullnode", "chain-mismatch");
        const height = u64(response.checkpointHeight),
          lower = u64(response.lowestAvailableCheckpoint),
          objects = u64(response.lowestAvailableCheckpointObjects);
        if (lower > height || objects > height)
          throw new NetworkIdentityError("fullnode", "incompatible");
        fence();
        return { digest, height, lower, objects };
      };
      const contracts = walletMoveContracts(session.profile);
      const catalog = auditWalletMoveCatalog(contracts);
      const selected = Object.values(contracts).flatMap((group) =>
        group.state === "configured" ? group.contracts : [],
      );
      const ids = [...new Set(selected.map((contract) => contract.packageId))];
      const readObject = async (packageId: string) => {
        const { response } = await session.request(signal, () =>
          client.ledgerService.getObject(
            {
              objectId: packageId,
              readMask: { paths: [...FRESH_OBJECT_MASK] },
            },
            { abort: signal, timeout: timeoutMs },
          ),
        );
        if (!response.object) throw new PackageProbeError("missing-positive");
        try {
          const object = decodeFreshObject(response.object, packageId);
          if (object.type !== "package" || object.owner.$kind !== "Immutable")
            throw new Error();
          const parsed = bcs.Object.parse(object.objectBcs);
          if (parsed.data.$kind !== "Package") throw new Error();
          return { object, parsed: parsed.data.Package };
        } catch {
          throw new WalletMoveContractError("association");
        }
      };
      const work = async () => {
        const before = await info();
        const rawPackages = new Map<string, GrpcTypes.Package>();
        const results = await Promise.all(
          ids.map(async (packageId): Promise<WalletMovePackageState> => {
            try {
              const first = await readObject(packageId);
              const { response } = await session.request(signal, () =>
                client.movePackageService.getPackage(
                  { packageId },
                  { abort: signal, timeout: timeoutMs },
                ),
              );
              if (!response.package)
                throw new PackageProbeError("missing-positive");
              const associated = associateMovePackage(
                response.package,
                first.parsed,
                packageId,
              );
              const last = await readObject(packageId);
              if (
                first.object.digest !== last.object.digest ||
                first.object.version !== last.object.version
              )
                return Object.freeze({
                  state: "incomplete",
                  reason: "changed",
                });
              const modules = [];
              for (const [name, bytes] of first.parsed.moduleMap)
                modules.push(
                  Object.freeze({
                    name,
                    bytecodeSha256: await hash(Uint8Array.from(bytes)),
                  }),
                );
              const association = Object.freeze({
                storageId: packageId,
                originalId: associated.originalId,
                originalIdVerification:
                  first.object.version === "1"
                    ? ("version-one-verified" as const)
                    : ("service-declaration" as const),
                version: first.object.version,
                objectDigest: first.object.digest,
                objectBcsSha256: await hash(first.object.objectBcs),
                descriptorSha256: await hash(
                  GrpcTypes.Package.toBinary(response.package),
                ),
                modules: Object.freeze(modules),
              });
              fence();
              rawPackages.set(packageId, response.package);
              return Object.freeze({
                state: "association-verified",
                association,
              });
            } catch (error) {
              fence();
              if (error instanceof NetworkIdentityError) throw error;
              return negative(error);
            }
          }),
        );
        fence();
        const after = await info();
        assertNativeReadWindowUnchanged("fullnode", before, after);
        const packageResults = new Map(ids.map((id, i) => [id, results[i]]));
        const groups = new Map<
          WalletMoveContractGroup,
          WalletMoveGroupCapability
        >();
        for (const [key, contract] of Object.entries(contracts)) {
          const name = key as WalletMoveContractGroup;
          if (contract.state !== "configured") {
            groups.set(name, Object.freeze(contract));
            continue;
          }
          if (
            contract.contracts.some(
              (c) =>
                packageResults.get(c.packageId)?.state !==
                "association-verified",
            )
          ) {
            groups.set(
              name,
              Object.freeze({ state: "incomplete", reason: "package" }),
            );
            continue;
          }
          try {
            const values = [];
            for (const reviewed of contract.contracts) {
              const shape = matchMoveContract(
                rawPackages.get(reviewed.packageId)!,
                reviewed,
              );
              values.push(
                Object.freeze({
                  packageId: reviewed.packageId,
                  abiSha256: await hash(new TextEncoder().encode(shape)),
                  datatypes: reviewed.datatypes.length,
                  functions: reviewed.functions.length,
                }),
              );
            }
            groups.set(
              name,
              Object.freeze({
                state: "abi-compatible",
                contracts: Object.freeze(values),
              }),
            );
          } catch (error) {
            if (
              error instanceof WalletMoveContractError &&
              error.reason !== "budget"
            )
              options.lifetime?.noteFault({
                kind: "move-group",
                group: name,
                reason: "abi",
              });
            options.lifetime?.noteError(error);
            fence();
            if (error instanceof WalletMoveContractError)
              groups.set(
                name,
                error.reason === "budget"
                  ? Object.freeze({ state: "incomplete", reason: "budget" })
                  : Object.freeze({ state: "unsupported", reason: "abi" }),
              );
            else throw error;
          }
        }
        // Transitive dependency failures revoke even a locally matched group's capability.
        for (let pass = 0; pass < Object.keys(contracts).length; pass++) {
          for (const [key, contract] of Object.entries(contracts)) {
            const name = key as WalletMoveContractGroup;
            if (
              contract.state === "configured" &&
              groups.get(name)?.state === "abi-compatible" &&
              contract.dependencies.some(
                (dependency) =>
                  groups.get(dependency)?.state !== "abi-compatible",
              )
            )
              groups.set(
                name,
                Object.freeze({ state: "incomplete", reason: "dependency" }),
              );
          }
        }
        fence();
        return Object.freeze({
          state: [...groups.values()].every(
            (g) => g.state === "abi-compatible" || g.state === "unconfigured",
          )
            ? ("selected-contracts-compatible" as const)
            : ("selected-contracts-degraded" as const),
          bindingKey: session.bindingKey,
          readSessionKey: session.cacheKey,
          observedAt: Date.now(),
          genesisDigest: after.digest,
          checkpointHeight: after.height.toString(),
          packages: Object.freeze(
            ids.map((id, i) =>
              Object.freeze({ packageId: id, result: results[i] }),
            ),
          ),
          groups: Object.freeze(Object.fromEntries(groups)) as Readonly<
            Record<WalletMoveContractGroup, WalletMoveGroupCapability>
          >,
          catalogClosure: "reviewed-wallet-contracts" as const,
          catalog,
          deployment: "not-verified" as const,
          registry: "not-verified" as const,
          executionSemantics: "not-verified" as const,
        });
      };
      return cancellable(work(), signal);
    })
    .finally(() => disposeDeadline?.());
}
