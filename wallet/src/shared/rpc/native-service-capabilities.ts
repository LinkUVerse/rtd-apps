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
import { normalizeStructTag } from "rtd-typescript/utils";
import { walletAddress } from "./asset-address";
import { decodeFreshObject, FRESH_OBJECT_MASK } from "./fresh-object";
import {
  assertNativeReadWindowUnchanged,
  NetworkIdentityError,
  WalletNativeReadWindowChangedError,
} from "./identity";
import { assertGenesisDigest } from "./profile";
import { WalletReadSession } from "./session";

type NativeRole = "fullnode" | "archive";
export const NATIVE_READ_PROBE_METHODS = Object.freeze({
  fullnode: Object.freeze([
    "LedgerService/GetServiceInfo",
    "LedgerService/GetCheckpoint",
    "LedgerService/GetObject",
    "StateService/GetCoinInfo",
    "MovePackageService/GetDatatype",
    "MovePackageService/GetFunction",
  ] as const),
  archive: Object.freeze([
    "LedgerService/GetServiceInfo",
    "LedgerService/GetCheckpoint",
  ] as const),
});
type ProbeMethod = (typeof NATIVE_READ_PROBE_METHODS)[NativeRole][number];
type FailureReason =
  | "unsupported"
  | "missing-positive"
  | "incompatible"
  | "budget"
  | "changed"
  | "unavailable";
// The SDK transport preserves RpcError instances, including local bounded-body failures.
class NativeProbeError extends RpcError {
  constructor(readonly reason: FailureReason) {
    super(
      "原生只读方法未取得完整正例，未接纳该项能力",
      reason === "budget" ? "RESOURCE_EXHAUSTED" : "UNKNOWN",
    );
    this.name = "NativeProbeError";
  }
}
export type NativeMethodCapability = Readonly<
  | {
      state: "positive-read-verified";
      responseSha256: string;
      selector: string;
    }
  | { state: "unverified"; reason: FailureReason }
>;
export type NativeEndpointCapabilities = Readonly<
  | { state: "unconfigured" }
  | { state: "unavailable"; reason: FailureReason }
  | {
      state: "probes-verified" | "probes-degraded";
      genesisDigest: string;
      checkpointHeight: string;
      lowestAvailableCheckpoint: string;
      lowestAvailableCheckpointObjects: string;
      methods: Readonly<Partial<Record<ProbeMethod, NativeMethodCapability>>>;
    }
>;
export interface WalletNativeServiceCapabilities {
  readonly state: "native-probes-verified" | "native-probes-degraded";
  readonly bindingKey: string;
  readonly readSessionKey: string;
  readonly observedAt: number;
  readonly endpoints: Readonly<Record<NativeRole, NativeEndpointCapabilities>>;
  readonly deployment: "not-verified";
  readonly nonReadMethods: "not-probed";
  readonly packageRegistryCompatibility: "not-verified";
}

function u64(value: unknown): bigint {
  if (typeof value !== "bigint" || value < 0n || value > 0xffffffffffffffffn)
    throw new NativeProbeError("incompatible");
  return value;
}
function positive<T>(value: T | undefined): T {
  if (value === undefined) throw new NativeProbeError("missing-positive");
  return value;
}
function knownSignatureType(
  body: GrpcTypes.OpenSignatureBody | undefined,
): boolean {
  return (
    !!body && Number.isInteger(body.type) && body.type! >= 1 && body.type! <= 11
  );
}
function failure(error: unknown): FailureReason {
  if (error instanceof WalletNativeReadWindowChangedError) return "changed";
  if (error instanceof NativeProbeError) return error.reason;
  if (error instanceof RpcError) {
    if (error.code === GrpcStatusCode[GrpcStatusCode.UNIMPLEMENTED])
      return "unsupported";
    if (error.code === GrpcStatusCode[GrpcStatusCode.NOT_FOUND])
      return "missing-positive";
  }
  return "unavailable";
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
        if (signal.aborted) reject(signal.reason);
        else resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
    if (signal.aborted) abort();
  });
}

async function boundedResponse(
  response: Response,
  fence: () => void,
): Promise<Response> {
  if (!response.ok || !response.body) {
    void response.body?.cancel().catch(() => {});
    throw new NativeProbeError("unavailable");
  }
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0,
    complete = false;
  try {
    while (true) {
      const chunk = await reader.read();
      fence();
      if (chunk.done) {
        complete = true;
        break;
      }
      size += chunk.value.byteLength;
      if (size > 2 * 1024 * 1024) throw new NativeProbeError("budget");
      chunks.push(chunk.value);
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

/** Explicit positive readonly methods only. No service discovery, deployment attestation, ABI compatibility or signing authority. */
export async function probeNativeServiceCapabilities(
  session: WalletReadSession,
  options: {
    fetch?: typeof fetch;
    lifetime?: CapabilityObservationLifetime;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {},
): Promise<WalletNativeServiceCapabilities> {
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
        throw new RangeError("原生方法探测期限必须在1–60000ms");
      const identityFailure = new AbortController();
      const deadline = createReadDeadline(timeoutMs);
      disposeDeadline = deadline.dispose;
      const signal = AbortSignal.any([
        sessionSignal,
        identityFailure.signal,
        deadline.signal,
        ...(options.signal ? [options.signal] : []),
      ]);
      const fence = () => {
        signal.throwIfAborted();
        session.assertActive();
      };
      fence();
      const fatal: NetworkIdentityError[] = [];
      const fetchFn = boundedGrpcFetch(options.fetch ?? globalThis.fetch);
      const probeRole = async (
        role: NativeRole,
      ): Promise<NativeEndpointCapabilities> => {
        const endpoint =
          role === "fullnode"
            ? session.profile.endpoints.fullnodeGrpcWeb
            : session.profile.endpoints.archiveGrpcWeb;
        if (!endpoint) return Object.freeze({ state: "unconfigured" });
        const allowed = NATIVE_READ_PROBE_METHODS[role].map(
          (method) => `${endpoint}/rtd.rpc.v2.${method}`,
        );
        const client = new RtdGrpcClient({
          network: session.profile.sdkNetwork,
          baseUrl: endpoint,
          format: "binary",
          mvr: { url: "" },
          fetch: async (input, init) => {
            fence();
            if (init?.method !== "POST" || !allowed.includes(String(input)))
              throw new NativeProbeError("incompatible");
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
        const info = async () => {
          const { response } = await session.request(signal, () =>
            client.ledgerService.getServiceInfo(
              {},
              { abort: signal, timeout: timeoutMs },
            ),
          );
          let genesisDigest: string,
            height: bigint,
            lower: bigint,
            objectLower: bigint;
          try {
            genesisDigest = assertGenesisDigest(response.chainId);
          } catch {
            throw new NetworkIdentityError(role, "incompatible");
          }
          if (genesisDigest !== session.profile.expectedGenesisDigest)
            throw new NetworkIdentityError(role, "chain-mismatch");
          try {
            height = u64(response.checkpointHeight);
            lower = u64(response.lowestAvailableCheckpoint);
            objectLower = u64(response.lowestAvailableCheckpointObjects);
            if (lower > height || objectLower > height)
              throw new NativeProbeError("incompatible");
          } catch {
            throw new NetworkIdentityError(role, "incompatible");
          }
          fence();
          return { response, genesisDigest, height, lower, objectLower };
        };
        const hash = async (bytes: Uint8Array) => {
          const digest = new Uint8Array(
            await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
          );
          fence();
          return [...digest]
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("");
        };
        const verified = async (
          selector: string,
          bytes: Uint8Array,
        ): Promise<NativeMethodCapability> =>
          Object.freeze({
            state: "positive-read-verified",
            selector,
            responseSha256: await hash(bytes),
          });
        try {
          const before = await info();
          const method = async (
            operation: () => Promise<NativeMethodCapability>,
          ): Promise<NativeMethodCapability> => {
            try {
              return await operation();
            } catch (error) {
              if (error instanceof NetworkIdentityError) {
                fatal.push(error);
                if (error.reason === "chain-mismatch")
                  identityFailure.abort(error);
                throw error;
              }
              fence();
              return Object.freeze({
                state: "unverified",
                reason: failure(error),
              });
            }
          };
          const checkpoint = method(async () => {
            const { response } = await session.request(signal, () =>
              client.ledgerService.getCheckpoint(
                {
                  checkpointId: {
                    oneofKind: "sequenceNumber",
                    sequenceNumber: before.lower,
                  },
                  readMask: { paths: ["sequence_number", "digest"] },
                },
                { abort: signal, timeout: timeoutMs },
              ),
            );
            const cp = positive(response.checkpoint);
            if (u64(cp.sequenceNumber) !== before.lower)
              throw new NativeProbeError("incompatible");
            let digest: string;
            try {
              digest = assertGenesisDigest(cp.digest);
            } catch {
              throw new NativeProbeError("incompatible");
            }
            if (
              before.lower === 0n &&
              digest !== session.profile.expectedGenesisDigest
            )
              throw new NetworkIdentityError(role, "chain-mismatch");
            return verified(
              before.lower.toString(),
              GrpcTypes.GetCheckpointResponse.toBinary(response),
            );
          });
          const packageId = walletAddress("0x2");
          const fullnode =
            role === "fullnode"
              ? [
                  method(async () => {
                    const { response } = await session.request(signal, () =>
                      client.ledgerService.getObject(
                        {
                          objectId: packageId,
                          readMask: { paths: [...FRESH_OBJECT_MASK] },
                        },
                        { abort: signal, timeout: timeoutMs },
                      ),
                    );
                    let object;
                    const raw = positive(response.object);
                    try {
                      object = decodeFreshObject(raw, packageId);
                    } catch {
                      throw new NativeProbeError("incompatible");
                    }
                    if (
                      object.type !== "package" ||
                      object.owner.$kind !== "Immutable"
                    )
                      throw new NativeProbeError("incompatible");
                    return verified(
                      packageId,
                      GrpcTypes.GetObjectResponse.toBinary(response),
                    );
                  }),
                  method(async () => {
                    const coinType = normalizeStructTag("0x2::rtd::RTD");
                    const { response } = await session.request(signal, () =>
                      client.stateService.getCoinInfo(
                        { coinType },
                        { abort: signal, timeout: timeoutMs },
                      ),
                    );
                    const metadata = positive(response.metadata);
                    try {
                      if (
                        normalizeStructTag(positive(response.coinType)) !==
                        coinType
                      )
                        throw new Error();
                      walletAddress(metadata.id);
                      if (
                        !Number.isInteger(metadata.decimals) ||
                        metadata.decimals! < 0 ||
                        metadata.decimals! > 255 ||
                        typeof metadata.name !== "string" ||
                        !metadata.name.length ||
                        metadata.name.length > 256 ||
                        typeof metadata.symbol !== "string" ||
                        !metadata.symbol.length ||
                        metadata.symbol.length > 256
                      )
                        throw new Error();
                    } catch {
                      throw new NativeProbeError("incompatible");
                    }
                    return verified(
                      coinType,
                      GrpcTypes.GetCoinInfoResponse.toBinary(response),
                    );
                  }),
                  method(async () => {
                    const { response } = await session.request(signal, () =>
                      client.movePackageService.getDatatype(
                        {
                          packageId,
                          moduleName: "object",
                          name: "UID",
                        },
                        { abort: signal, timeout: timeoutMs },
                      ),
                    );
                    const datatype = positive(response.datatype);
                    try {
                      if (
                        normalizeStructTag(positive(datatype.typeName)) !==
                          normalizeStructTag("0x2::object::UID") ||
                        walletAddress(datatype.definingId) !== packageId ||
                        datatype.module !== "object" ||
                        datatype.name !== "UID" ||
                        datatype.kind !==
                          GrpcTypes.DatatypeDescriptor_DatatypeKind.STRUCT ||
                        !datatype.fields.length ||
                        datatype.variants.length ||
                        new Set(datatype.fields.map((f) => f.name)).size !==
                          datatype.fields.length ||
                        datatype.fields.some(
                          (f) =>
                            !f.name ||
                            !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(f.name) ||
                            !knownSignatureType(f.type),
                        )
                      )
                        throw new Error();
                    } catch {
                      throw new NativeProbeError("incompatible");
                    }
                    return verified(
                      `${packageId}::object::UID`,
                      GrpcTypes.GetDatatypeResponse.toBinary(response),
                    );
                  }),
                  method(async () => {
                    const { response } = await session.request(signal, () =>
                      client.movePackageService.getFunction(
                        {
                          packageId,
                          moduleName: "object",
                          name: "id",
                        },
                        { abort: signal, timeout: timeoutMs },
                      ),
                    );
                    const fn = positive(response.function);
                    if (
                      fn.name !== "id" ||
                      !fn.parameters.length ||
                      !fn.returns.length ||
                      typeof fn.isEntry !== "boolean" ||
                      ![
                        GrpcTypes.FunctionDescriptor_Visibility.PUBLIC,
                        GrpcTypes.FunctionDescriptor_Visibility.PRIVATE,
                        GrpcTypes.FunctionDescriptor_Visibility.FRIEND,
                      ].includes(fn.visibility!) ||
                      [...fn.parameters, ...fn.returns].some(
                        (signature) => !knownSignatureType(signature.body),
                      )
                    )
                      throw new NativeProbeError("incompatible");
                    return verified(
                      `${packageId}::object::id`,
                      GrpcTypes.GetFunctionResponse.toBinary(response),
                    );
                  }),
                ]
              : [];
          // All leaves settle before bracketing identity, including rejected method probes.
          const values = await Promise.allSettled([checkpoint, ...fullnode]);
          for (const value of values)
            if (
              value.status === "rejected" &&
              value.reason instanceof NetworkIdentityError
            )
              throw value.reason;
          fence();
          const after = await info();
          assertNativeReadWindowUnchanged(
            role,
            { ...before, objects: before.objectLower },
            { ...after, objects: after.objectLower },
          );
          const entries = await Promise.all([
            verified(
              "current-service-info",
              GrpcTypes.GetServiceInfoResponse.toBinary(after.response),
            ),
            ...values.map((value) =>
              value.status === "fulfilled"
                ? value.value
                : Object.freeze({
                    state: "unverified" as const,
                    reason: failure(value.reason),
                  }),
            ),
          ]);
          const methods = Object.freeze(
            Object.fromEntries(
              NATIVE_READ_PROBE_METHODS[role].map((name, index) => [
                name,
                entries[index],
              ]),
            ),
          ) as Readonly<Partial<Record<ProbeMethod, NativeMethodCapability>>>;
          fence();
          return Object.freeze({
            state: entries.every(
              (entry) => entry.state === "positive-read-verified",
            )
              ? "probes-verified"
              : "probes-degraded",
            genesisDigest: after.genesisDigest,
            checkpointHeight: after.height.toString(),
            lowestAvailableCheckpoint: after.lower.toString(),
            lowestAvailableCheckpointObjects: after.objectLower.toString(),
            methods,
          });
        } catch (error) {
          options.lifetime?.noteError(error);
          if (error instanceof NetworkIdentityError) {
            fatal.push(error);
            if (error.reason === "chain-mismatch") identityFailure.abort(error);
            throw error;
          }
          fence();
          return Object.freeze({
            state: "unavailable",
            reason: failure(error),
          });
        }
      };
      let values: PromiseSettledResult<NativeEndpointCapabilities>[];
      try {
        values = await cancellable(
          Promise.allSettled([probeRole("fullnode"), probeRole("archive")]),
          signal,
        );
      } catch (error) {
        const mismatch = fatal.find(
          (value) => value.reason === "chain-mismatch",
        );
        if (mismatch) throw mismatch;
        throw error;
      }
      const mismatch = fatal.find((value) => value.reason === "chain-mismatch");
      if (mismatch) throw mismatch;
      if (fatal.length) throw fatal[0];
      fence();
      const endpoints = Object.freeze(
        Object.fromEntries(
          ["fullnode", "archive"].map((role, index) => [
            role,
            values[index].status === "fulfilled"
              ? values[index].value
              : Object.freeze({ state: "unavailable", reason: "unavailable" }),
          ]),
        ),
      ) as Readonly<Record<NativeRole, NativeEndpointCapabilities>>;
      return Object.freeze({
        state: Object.values(endpoints).every(
          (endpoint) =>
            endpoint.state === "probes-verified" ||
            endpoint.state === "unconfigured",
        )
          ? "native-probes-verified"
          : "native-probes-degraded",
        bindingKey: session.bindingKey,
        readSessionKey: session.cacheKey,
        observedAt: Date.now(),
        endpoints,
        deployment: "not-verified",
        nonReadMethods: "not-probed",
        packageRegistryCompatibility: "not-verified",
      });
    })
    .finally(() => disposeDeadline?.());
}
