// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { boundedGrpcFetch } from "./grpc-response-budget";

import { bcs } from "rtd-typescript/bcs";
import {
  GrpcTypes,
  GrpcWebFetchTransport,
  parseGrpcSimulateTransactionResponse,
  RtdGrpcClient,
  type RpcTransport,
} from "rtd-typescript/grpc";
import {
  Transaction,
  TransactionDataBuilder,
} from "rtd-typescript/transactions";
import { fromBase64, toBase64 } from "rtd-typescript/utils";
import type {
  WalletPreparedTransaction,
  WalletSimulationResult,
} from "rtd-apps-core/src/rpc/WalletRpcContext";

import { budgetedUnary } from "./budgeted-unary";
import { walletAddress } from "./asset-address";
import { dynamicType } from "./dynamic-fields";
import { NetworkIdentityError } from "./identity";
import { assertGenesisDigest } from "./profile";
import { WalletReadSession } from "./session";

export class WalletSimulationError extends Error {
  constructor(
    readonly reason: "incompatible" | "failed" | "sender" | "budget",
    readonly stage: "resolution" | "final",
    message = "交易模拟未通过，不能用于签名授权",
  ) {
    super(message);
    this.name = "WalletSimulationError";
  }
}

function u64(value: unknown): bigint {
  if (typeof value !== "bigint" || value < 0n || value > 0xffffffffffffffffn)
    throw new WalletSimulationError("incompatible", "final");
  return value;
}

function equalBytes(left: Uint8Array, right: Uint8Array) {
  return (
    left.length === right.length && left.every((byte, i) => byte === right[i])
  );
}

/** Validate the SDK resolver's response before optional proto fields can acquire defaults. */
function validateResolution(
  response: GrpcTypes.SimulateTransactionResponse,
  sender: string,
) {
  const transaction = response.transaction;
  const status = transaction?.effects?.status;
  if (
    typeof status?.success !== "boolean" ||
    transaction?.effects?.epoch === undefined
  )
    throw new WalletSimulationError("incompatible", "resolution");
  u64(transaction.effects.epoch);
  if (!status.success)
    throw new WalletSimulationError(
      "failed",
      "resolution",
      status.error?.description ?? "交易构建模拟失败",
    );
  if (
    status.error ||
    !transaction.transaction?.kind ||
    !transaction.transaction.gasPayment
  )
    throw new WalletSimulationError("incompatible", "resolution");
  const resolved = transaction.transaction;
  if (walletAddress(resolved.sender) !== sender)
    throw new WalletSimulationError("sender", "resolution");
  walletAddress(resolved.gasPayment!.owner);
  u64(resolved.gasPayment!.price);
  u64(resolved.gasPayment!.budget);
  for (const object of resolved.gasPayment!.objects) {
    walletAddress(object.objectId);
    assertGenesisDigest(object.digest);
    u64(object.version);
  }
}

export function assertNativeExecutedTransaction(
  transaction: GrpcTypes.ExecutedTransaction | undefined,
  bytes: Uint8Array,
): void {
  const digest = TransactionDataBuilder.getDigestFromBytes(bytes);
  const effects = transaction?.effects;
  if (
    !transaction ||
    !effects ||
    typeof effects.status?.success !== "boolean" ||
    !transaction.transaction?.bcs?.value ||
    !effects.bcs?.value
  )
    throw new WalletSimulationError("incompatible", "final");
  if (
    !equalBytes(transaction.transaction.bcs.value, bytes) ||
    assertGenesisDigest(transaction.digest) !== digest ||
    assertGenesisDigest(effects.transactionDigest) !== digest
  )
    throw new WalletSimulationError("incompatible", "final");
  const wire = transaction.transaction;
  walletAddress(wire.sender);
  if (!wire.gasPayment || !wire.kind)
    throw new WalletSimulationError("incompatible", "final");
  walletAddress(wire.gasPayment.owner);
  u64(wire.gasPayment.price);
  u64(wire.gasPayment.budget);
  for (const object of wire.gasPayment.objects) {
    walletAddress(object.objectId);
    u64(object.version);
    assertGenesisDigest(object.digest);
  }
  const parsed = bcs.TransactionEffects.parse(effects.bcs.value);
  if (
    !equalBytes(
      bcs.TransactionEffects.serialize(parsed).toBytes(),
      effects.bcs.value,
    )
  )
    throw new WalletSimulationError("incompatible", "final");
  const body = parsed.$kind === "V1" ? parsed.V1 : parsed.V2;
  if (
    body.transactionDigest !== digest ||
    (body.status.$kind === "Success") !== effects.status.success ||
    body.executedEpoch !== u64(effects.epoch).toString() ||
    effects.version !== (parsed.$kind === "V1" ? 1 : 2) ||
    (effects.status.success && !!effects.status.error) ||
    (!effects.status.success && !effects.status.error)
  )
    throw new WalletSimulationError("incompatible", "final");
  if (
    (effects.eventsDigest ?? null) !== body.eventsDigest ||
    JSON.stringify(effects.dependencies) !==
      JSON.stringify(body.dependencies) ||
    (parsed.$kind === "V2" &&
      (effects.auxiliaryDataDigest ?? null) !== parsed.V2.auxDataDigest)
  )
    throw new WalletSimulationError("incompatible", "final");
  for (const name of [
    "computationCost",
    "storageCost",
    "storageRebate",
    "nonRefundableStorageFee",
  ] as const)
    if (u64(effects.gasUsed?.[name]).toString() !== body.gasUsed[name])
      throw new WalletSimulationError("incompatible", "final");
  for (const change of transaction.balanceChanges) {
    walletAddress(change.address);
    dynamicType(change.coinType);
    if (
      typeof change.amount !== "string" ||
      !/^-?(0|[1-9]\d*)$/.test(change.amount) ||
      change.amount === "-0" ||
      BigInt(change.amount) < -(1n << 127n) ||
      BigInt(change.amount) >= 1n << 127n
    )
      throw new WalletSimulationError("incompatible", "final");
  }
  // The account-history projection omits the JSON object list because the
  // canonical BCS already carries it in a fraction of the bytes; a single
  // contract initialization otherwise repeats 1024 created shards as JSON.
  // An empty mirror therefore means "not supplied", and validation falls back
  // to the bytes that are the trust anchor. A populated mirror — every Fullnode
  // and archive read — is still cross-checked entry by entry.
  const mirroredObjects = effects.changedObjects.length > 0;
  const mirroredConsensus = effects.unchangedConsensusObjects.length > 0;
  if (mirroredObjects)
    for (const change of effects.changedObjects) {
      walletAddress(change.objectId);
      if (
        change.inputState === undefined ||
        change.outputState === undefined ||
        change.idOperation === undefined ||
        change.idOperation ===
          GrpcTypes.ChangedObject_IdOperation.ID_OPERATION_UNKNOWN
      )
        throw new WalletSimulationError("incompatible", "final");
    }
  if (
    parsed.$kind === "V2" &&
    mirroredObjects &&
    effects.changedObjects.length !== parsed.V2.changedObjects.length
  )
    throw new WalletSimulationError("incompatible", "final");
  if (parsed.$kind === "V2") {
    if (
      u64(effects.lamportVersion).toString() !== parsed.V2.lamportVersion ||
      (mirroredObjects &&
        effects.changedObjects.some(
          (change, i) =>
            walletAddress(change.objectId) !== parsed.V2.changedObjects[i][0],
        )) ||
      (mirroredConsensus &&
        (effects.unchangedConsensusObjects.length !==
          parsed.V2.unchangedConsensusObjects.length ||
          effects.unchangedConsensusObjects.some(
            (change, i) =>
              walletAddress(change.objectId) !==
              parsed.V2.unchangedConsensusObjects[i][0],
          )))
    )
      throw new WalletSimulationError("incompatible", "final");
  }
}

export async function validateFinalSimulation(
  response: GrpcTypes.SimulateTransactionResponse,
  bytes: Uint8Array,
): Promise<WalletSimulationResult> {
  // Sui and RTD simulation omit the outer ExecutedTransaction.digest.
  // Derive that redundant field only here; effects proto + native BCS must still
  // bind to the exact input bytes. Committed-history validation stays strict.
  if (response.transaction && response.transaction.digest === undefined) {
    response = {
      ...response,
      transaction: {
        ...response.transaction,
        digest: TransactionDataBuilder.getDigestFromBytes(bytes),
      },
    };
  }
  assertNativeExecutedTransaction(response.transaction, bytes);
  // Preserve all native effects/transaction/command details for the modern preview consumers.
  const result = parseGrpcSimulateTransactionResponse(response, {
    include: {
      effects: true,
      transaction: true,
      bcs: true,
      balanceChanges: true,
      objectTypes: true,
      commandResults: true,
    },
  });
  const data =
    result.Transaction?.transaction ?? result.FailedTransaction!.transaction;
  if (!equalBytes(await Transaction.from(JSON.stringify(data)).build(), bytes))
    throw new WalletSimulationError("incompatible", "final");
  return result;
}

/** Empty priced payment means address-balance gas. On Sui/RTD, disabling gas
 * selection injects a mock coin for this shape and changes the effects digest.
 * Enable the native funded path, then require the returned bytes/effects to match
 * exactly. Any real gas reselection still fails validateFinalSimulation. */
function requireFundedAddressGasSimulation(bytes: Uint8Array): boolean {
  const gas = Transaction.from(bytes).getData().gasData;
  return (
    gas.payment?.length === 0 && gas.price !== null && BigInt(gas.price) > 0n
  );
}

/** A per-operation private client; this API can resolve/simulate, but cannot dispatch. */
export class WalletTransactionReader {
  readonly #fetch: typeof fetch;
  readonly #timeoutMs: number;
  constructor(
    readonly session: WalletReadSession,
    options: { fetch?: typeof fetch; timeoutMs?: number } = {},
  ) {
    // Native WorkerGlobalScope.fetch requires the global receiver, not this reader.
    this.#fetch = boundedGrpcFetch(
      options.fetch ?? globalThis.fetch.bind(globalThis),
    );
    this.#timeoutMs = options.timeoutMs ?? 20_000;
    if (
      !Number.isSafeInteger(this.#timeoutMs) ||
      this.#timeoutMs < 1 ||
      this.#timeoutMs > 60_000
    )
      throw new RangeError("交易查询总超时必须在1–60000 ms");
  }

  async #operation<T>(
    sender: string,
    callerSignal: AbortSignal | undefined,
    operation: (client: RtdGrpcClient, signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    return this.session.read(async (sessionSignal) => {
      const signal = AbortSignal.any([
        sessionSignal,
        AbortSignal.timeout(this.#timeoutMs),
        ...(callerSignal ? [callerSignal] : []),
      ]);
      signal.throwIfAborted();
      const base = new GrpcWebFetchTransport({
        baseUrl: this.session.profile.endpoints.fullnodeGrpcWeb,
        format: "binary",
        fetch: async (input, init) => {
          signal.throwIfAborted();
          this.session.assertActive();
          const response = await this.#fetch(input, {
            ...init,
            signal: AbortSignal.any([
              signal,
              ...(init?.signal ? [init.signal] : []),
            ]),
            redirect: "error",
            credentials: "omit",
          });
          signal.throwIfAborted();
          this.session.assertActive();
          return response;
        },
      });
      const limitedUnary = budgetedUnary(this.session, base, signal);
      let calls = 0;
      const transport: RpcTransport = {
        mergeOptions: (options) => base.mergeOptions(options),
        unary: (method, input, options) => {
          signal.throwIfAborted();
          this.session.assertActive();
          if (++calls > 64)
            throw new WalletSimulationError("budget", "resolution");
          if (
            method.service.typeName ===
              "rtd.rpc.v2.TransactionExecutionService" &&
            method.name !== "SimulateTransaction"
          )
            throw new WalletSimulationError("incompatible", "resolution");
          const call = limitedUnary(method, input, {
            ...options,
            abort: signal,
            timeout: this.#timeoutMs,
          });
          const checked = call.response.then((value) => {
            signal.throwIfAborted();
            this.session.assertActive();
            if (
              method.service.typeName ===
              "rtd.rpc.v2.TransactionExecutionService"
            ) {
              const request = input as GrpcTypes.SimulateTransactionRequest;
              if (
                request.checks ===
                GrpcTypes.SimulateTransactionRequest_TransactionChecks.DISABLED
              )
                throw new WalletSimulationError("incompatible", "resolution");
              if (!request.transaction?.bcs)
                validateResolution(
                  value as GrpcTypes.SimulateTransactionResponse,
                  sender,
                );
            }
            return value;
          });
          // Keep the SDK's trailers/status and thenable semantics while validating response fields.
          return new Proxy(call, {
            get: (target, key, receiver) =>
              key === "response" ? checked : Reflect.get(target, key, receiver),
          });
        },
        serverStreaming: () => {
          throw new WalletSimulationError("incompatible", "resolution");
        },
        clientStreaming: () => {
          throw new WalletSimulationError("incompatible", "resolution");
        },
        duplex: () => {
          throw new WalletSimulationError("incompatible", "resolution");
        },
      };
      const client = new RtdGrpcClient({
        network: this.session.profile.sdkNetwork,
        transport,
        mvr: { url: "" },
      });
      const verify = async () => {
        const { response } = await client.ledgerService.getServiceInfo(
          {},
          { abort: signal },
        );
        let digest: string;
        let height: bigint;
        try {
          digest = assertGenesisDigest(response.chainId);
          height = u64(response.checkpointHeight);
          for (const lower of [
            response.lowestAvailableCheckpoint,
            response.lowestAvailableCheckpointObjects,
          ])
            if (lower !== undefined && u64(lower) > height)
              throw new Error("watermark");
        } catch {
          throw new NetworkIdentityError("fullnode", "incompatible");
        }
        if (digest !== this.session.profile.expectedGenesisDigest)
          throw new NetworkIdentityError("fullnode", "chain-mismatch");
        return height;
      };
      const height = await verify();
      const result = await operation(client, signal);
      if ((await verify()) < height)
        throw new NetworkIdentityError("fullnode", "incompatible");
      signal.throwIfAborted();
      return result;
    });
  }

  async prepare(
    transaction: Transaction,
    address: string,
    signal?: AbortSignal,
  ): Promise<WalletPreparedTransaction> {
    const sender = walletAddress(address);
    // Copy only data/built-in intents; do not inherit caller-provided executable build plugins.
    const tx = Transaction.from(transaction);
    if (tx.getData().sender && walletAddress(tx.getData().sender) !== sender)
      throw new WalletSimulationError("sender", "resolution");
    tx.setSenderIfNotSet(sender);
    const supplied = tx.getData();
    return this.#operation(sender, signal, async (client, abort) => {
      let bytes: Uint8Array;
      try {
        bytes = await tx.build({ client });
      } catch (error) {
        if (
          error instanceof Error &&
          error.cause instanceof WalletSimulationError
        )
          throw error.cause;
        throw error;
      }
      if (!bytes.length || bytes.length > 1_048_576)
        throw new WalletSimulationError("budget", "final");
      const { response } =
        await client.transactionExecutionService.simulateTransaction(
          {
            transaction: { bcs: { value: bytes } },
            checks:
              GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED,
            doGasSelection: requireFundedAddressGasSimulation(bytes),
            readMask: { paths: ["transaction", "command_outputs"] },
          },
          { abort },
        );
      const simulation = await validateFinalSimulation(response, bytes);
      if (simulation.$kind === "FailedTransaction")
        throw new WalletSimulationError(
          "failed",
          "final",
          simulation.FailedTransaction.status.error?.message,
        );
      const data = Transaction.from(bytes).getData();
      if (
        walletAddress(data.sender) !== sender ||
        data.gasData.owner === null ||
        data.gasData.budget === null ||
        data.gasData.price === null
      )
        throw new WalletSimulationError("incompatible", "final");
      if (
        data.gasData.payment?.length === 0 &&
        String(data.gasData.price) !== "0" &&
        data.expiration?.$kind !== "ValidDuring" &&
        data.expiration?.$kind !== "Validity"
      )
        throw new WalletSimulationError("incompatible", "final");
      // Explicit sponsor, gas and expiration constraints cannot be silently replaced by resolution.
      if (
        (supplied.gasData.owner !== null &&
          walletAddress(supplied.gasData.owner) !==
            walletAddress(data.gasData.owner)) ||
        (supplied.gasData.budget !== null &&
          String(supplied.gasData.budget) !== String(data.gasData.budget)) ||
        (supplied.gasData.price !== null &&
          String(supplied.gasData.price) !== String(data.gasData.price)) ||
        (supplied.gasData.payment !== null &&
          JSON.stringify(supplied.gasData.payment) !==
            JSON.stringify(data.gasData.payment)) ||
        (supplied.expiration != null &&
          !equalBytes(
            bcs.TransactionExpiration.serialize(supplied.expiration).toBytes(),
            bcs.TransactionExpiration.serialize(data.expiration!).toBytes(),
          ))
      )
        throw new WalletSimulationError("incompatible", "final");
      return Object.freeze({
        bindingKey: this.session.bindingKey,
        readSessionKey: this.session.cacheKey,
        sender,
        gasOwner: walletAddress(data.gasData.owner),
        gasBudget: String(data.gasData.budget),
        gasPrice: String(data.gasData.price),
        gasPaymentKind: data.gasData.payment!.length
          ? "coins"
          : String(data.gasData.price) === "0"
            ? "gasless"
            : "addressBalance",
        bytesBase64: toBase64(bytes),
        digest: TransactionDataBuilder.getDigestFromBytes(bytes),
        simulation,
      });
    });
  }

  async simulate(
    bytesBase64: string,
    address: string,
    signal?: AbortSignal,
  ): Promise<WalletSimulationResult> {
    const sender = walletAddress(address);
    const bytes = Uint8Array.from(fromBase64(bytesBase64));
    if (
      !bytes.length ||
      bytes.length > 1_048_576 ||
      toBase64(bytes) !== bytesBase64
    )
      throw new WalletSimulationError("incompatible", "final");
    const tx = Transaction.from(bytes);
    if (walletAddress(tx.getData().sender) !== sender)
      throw new WalletSimulationError("sender", "final");
    if (!equalBytes(await tx.build(), bytes))
      throw new WalletSimulationError("incompatible", "final");
    return this.#operation(sender, signal, async (client, abort) => {
      const { response } =
        await client.transactionExecutionService.simulateTransaction(
          {
            transaction: { bcs: { value: bytes } },
            checks:
              GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED,
            doGasSelection: requireFundedAddressGasSimulation(bytes),
            readMask: { paths: ["transaction", "command_outputs"] },
          },
          { abort },
        );
      return validateFinalSimulation(response, bytes);
    });
  }
}
