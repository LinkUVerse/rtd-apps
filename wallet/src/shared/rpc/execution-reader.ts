import { bcs } from "rtd-typescript/bcs";
// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { boundedGrpcFetch } from "./grpc-response-budget";

import { RtdGrpcClient } from "rtd-typescript/grpc";
import {
  Transaction,
  TransactionDataBuilder,
} from "rtd-typescript/transactions";
import { fromBase64, toBase64 } from "rtd-typescript/utils";
import type { WalletTransactionDetails } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { walletAddress } from "./asset-address";
import { type WalletExecutionReceipt } from "./execution-journal";
import { NetworkIdentityError } from "./identity";
import { WalletNetworkAdmissionStateError } from "./network-admission-state";
import { assertGenesisDigest } from "./profile";
import { WalletReadSession } from "./session";
import {
  validateTransactionReceipt,
  RECEIPT_READ_MASK,
} from "./receipt-validation";
import { WalletLedgerReader } from "./ledger-reader";

export function approvedTransaction(bytesBase64: string, sender: string) {
  if (typeof bytesBase64 !== "string" || bytesBase64.length > 1_400_000)
    throw new Error("批准交易bytes格式无效");
  const bytes = fromBase64(bytesBase64);
  if (
    !bytes.length ||
    bytes.length > 1_048_576 ||
    toBase64(bytes) !== bytesBase64
  )
    throw new Error("批准交易bytes格式无效");
  const transaction = Transaction.from(bytes).getData();
  if (walletAddress(transaction.sender) !== walletAddress(sender))
    throw new Error("批准交易sender不属于授权账户");
  return {
    bytes,
    transaction,
    digest: TransactionDataBuilder.getDigestFromBytes(bytes),
  };
}
function u64(value: unknown): bigint {
  if (typeof value !== "bigint" || value < 0n || value > 0xffffffffffffffffn)
    throw new Error("交易回执数值字段不完整");
  return value;
}
/** Execute is available only to the coordinator, never through the UI read Provider. */
export class WalletExecutionReader {
  constructor(
    readonly session: WalletReadSession,
    readonly options: {
      fetch?: typeof fetch;
      timeoutMs?: number;
      finalDispatch?: (send: () => Promise<Response>) => Promise<Response>;
    } = {},
  ) {
    const timeout = options.timeoutMs ?? 20_000;
    if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 60_000)
      throw new RangeError("提交／恢复超时无效");
  }
  async #operation<T>(
    operation: (client: RtdGrpcClient, signal: AbortSignal) => Promise<T>,
    callerSignal?: AbortSignal,
  ): Promise<T> {
    return this.session.read(async (sessionSignal) => {
      const signal = AbortSignal.any([
        sessionSignal,
        AbortSignal.timeout(this.options.timeoutMs ?? 20_000),
        ...(callerSignal ? [callerSignal] : []),
      ]);
      const fetch = boundedGrpcFetch(this.options.fetch ?? globalThis.fetch);
      const client = new RtdGrpcClient({
        network: this.session.profile.sdkNetwork,
        baseUrl: this.session.profile.endpoints.fullnodeGrpcWeb,
        format: "binary",
        fetch: async (input, init) => {
          signal.throwIfAborted();
          this.session.assertActive();
          const send = () => {
            signal.throwIfAborted();
            this.session.assertActive();
            return fetch(input, {
              ...init,
              signal: AbortSignal.any([
                signal,
                ...(init?.signal ? [init.signal] : []),
              ]),
              redirect: "error",
              credentials: "omit",
            });
          };
          const response = await (String(input).endsWith(
            "/rtd.rpc.v2.TransactionExecutionService/ExecuteTransaction",
          ) && this.options.finalDispatch
            ? this.options.finalDispatch(send)
            : send());
          signal.throwIfAborted();
          this.session.assertActive();
          return response;
        },
        mvr: { url: "" },
      });
      const verify = async () => {
        const { response } = await this.session.request(signal, () =>
          client.ledgerService.getServiceInfo({}, { abort: signal }),
        );
        if (
          assertGenesisDigest(response.chainId) !==
          this.session.profile.expectedGenesisDigest
        )
          throw new NetworkIdentityError("fullnode", "chain-mismatch");
        const height = u64(response.checkpointHeight);
        for (const lower of [
          response.lowestAvailableCheckpoint,
          response.lowestAvailableCheckpointObjects,
        ])
          if (lower !== undefined && u64(lower) > height)
            throw new NetworkIdentityError("fullnode", "incompatible");
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
  async verifySignature(
    bytesBase64: string,
    sender: string,
    signature: string,
    signal?: AbortSignal,
  ): Promise<void> {
    const approved = approvedTransaction(bytesBase64, sender);
    return this.verifyIntentSignature(
      "TransactionData",
      approved.bytes,
      sender,
      signature,
      signal,
    );
  }
  async verifyPersonalMessage(
    message: Uint8Array,
    sender: string,
    signature: string,
    signal?: AbortSignal,
  ) {
    return this.verifyIntentSignature(
      "PersonalMessage",
      bcs.vector(bcs.u8()).serialize(message).toBytes(),
      sender,
      signature,
      signal,
    );
  }
  private async verifyIntentSignature(
    name: "TransactionData" | "PersonalMessage",
    bytes: Uint8Array,
    sender: string,
    signature: string,
    signal?: AbortSignal,
  ): Promise<void> {
    if (typeof signature !== "string" || signature.length > 87_384)
      throw new Error("账户签名格式无效");
    const signatureBytes = fromBase64(signature);
    if (!signatureBytes.length || toBase64(signatureBytes) !== signature)
      throw new Error("账户签名格式无效");
    await this.#operation(async (client, abort) => {
      const { response } = await this.session.request(abort, () =>
        client.signatureVerificationService.verifySignature(
          {
            message: { name, value: bytes },
            signature: {
              bcs: { value: signatureBytes },
              signature: { oneofKind: undefined },
            },
            address: walletAddress(sender),
            jwks: [],
          },
          { abort },
        ),
      );
      if (response.isValid !== true || response.reason)
        throw new Error("签名与批准bytes／账户不一致");
    }, signal);
  }
  async dispatch(
    bytesBase64: string,
    sender: string,
    signatures: readonly string[],
    signal?: AbortSignal,
  ): Promise<WalletExecutionReceipt> {
    const approved = approvedTransaction(bytesBase64, sender);
    if (!this.options.finalDispatch)
      throw new WalletNetworkAdmissionStateError("unavailable");
    if (
      !signatures.length ||
      signatures.length > 16 ||
      new Set(signatures).size !== signatures.length
    )
      throw new Error("提交签名集合无效");
    const signatureBytes = signatures.map((sig) => {
      const bytes = fromBase64(sig);
      if (!bytes.length || bytes.length > 65_536 || toBase64(bytes) !== sig)
        throw new Error("提交签名格式无效");
      return bytes;
    });
    return this.#operation(async (client, abort) => {
      const { response } =
        await client.transactionExecutionService.executeTransaction(
          {
            transaction: { bcs: { value: approved.bytes } },
            signatures: signatureBytes.map((value) => ({
              bcs: { value },
              signature: { oneofKind: undefined },
            })),
            readMask: { paths: RECEIPT_READ_MASK },
          },
          { abort },
        );
      return validateTransactionReceipt(
        response.transaction,
        approved.digest,
        approved.bytes,
        signatures,
      );
    }, signal);
  }
  /** Only readonly Ledger access is forwarded; archive can never receive execute or verifySignature. */
  details(
    digest: string,
    signal?: AbortSignal,
  ): Promise<WalletTransactionDetails | null> {
    return new WalletLedgerReader(this.session, this.options).details(
      digest,
      signal,
    );
  }
  lookup(
    digest: string,
    signal?: AbortSignal,
  ): Promise<WalletExecutionReceipt | null> {
    return new WalletLedgerReader(this.session, this.options).lookup(
      digest,
      signal,
    );
  }
}
