// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from "rtd-typescript/bcs";
import { GrpcTypes } from "rtd-typescript/grpc";
import { Ed25519Keypair } from "rtd-typescript/keypairs/ed25519";
import {
  Transaction,
  TransactionDataBuilder,
} from "rtd-typescript/transactions";
import { fromBase64, toBase58, toBase64 } from "rtd-typescript/utils";
import type { WalletExecutionReceipt } from "../../../src/shared/rpc/execution-journal";

// Deterministic public test fixture only, never a dev-chain account.
export const testKey = Ed25519Keypair.fromSecretKey(new Uint8Array(32).fill(7));
export const sender = testKey.getPublicKey().toRtdAddress();
export async function executionFixture(amount = 1n) {
  const tx = new Transaction();
  tx.setSender(sender);
  tx.setGasOwner(sender);
  tx.setGasPrice(1n);
  tx.setGasBudget(100n);
  tx.setGasPayment([
    {
      objectId: "0xc",
      version: "11",
      digest: toBase58(new Uint8Array(32).fill(9)),
    },
  ]);
  const [coin] = tx.splitCoins(tx.gas, [amount]);
  tx.transferObjects([coin], "0xa");
  const bytes = await tx.build();
  const signed = await testKey.signTransaction(bytes);
  const digest = TransactionDataBuilder.getDigestFromBytes(bytes);
  const data = tx.getData();
  const raw = GrpcTypes.Transaction.create({
    sender,
    gasPayment: {
      owner: sender,
      price: 1n,
      budget: 100n,
      objects: [
        {
          objectId: "0xc",
          version: 11n,
          digest: data.gasData.payment![0].digest,
        },
      ],
    },
    expiration: {
      kind: GrpcTypes.TransactionExpiration_TransactionExpirationKind.NONE,
    },
    kind: {
      kind: GrpcTypes.TransactionKind_Kind.PROGRAMMABLE_TRANSACTION,
      data: {
        oneofKind: "programmableTransaction",
        programmableTransaction: {
          inputs: [
            {
              kind: GrpcTypes.Input_InputKind.PURE,
              pure: bcs.u64().serialize(amount).toBytes(),
            },
            {
              kind: GrpcTypes.Input_InputKind.PURE,
              pure: bcs.Address.serialize("0xa").toBytes(),
            },
          ],
          commands: [
            {
              command: {
                oneofKind: "splitCoins",
                splitCoins: {
                  coin: { kind: GrpcTypes.Argument_ArgumentKind.GAS },
                  amounts: [
                    { kind: GrpcTypes.Argument_ArgumentKind.INPUT, input: 0 },
                  ],
                },
              },
            },
            {
              command: {
                oneofKind: "transferObjects",
                transferObjects: {
                  objects: [
                    {
                      kind: GrpcTypes.Argument_ArgumentKind.RESULT,
                      result: 0,
                      subresult: 0,
                    },
                  ],
                  address: {
                    kind: GrpcTypes.Argument_ArgumentKind.INPUT,
                    input: 1,
                  },
                },
              },
            },
          ],
        },
      },
    },
    bcs: { value: bytes },
  });
  function result(success = true): GrpcTypes.ExecutedTransaction {
    const gasUsed = {
      computationCost: 1n,
      storageCost: 2n,
      storageRebate: 0n,
      nonRefundableStorageFee: 0n,
    };
    return GrpcTypes.ExecutedTransaction.create({
      digest,
      transaction: raw,
      checkpoint: 21n,
      signatures: [
        {
          bcs: { value: fromBase64(signed.signature) },
          signature: { oneofKind: undefined },
        },
      ],
      effects: {
        version: 2,
        transactionDigest: digest,
        epoch: 7n,
        lamportVersion: 12n,
        gasUsed,
        status: success
          ? { success: true }
          : {
              success: false,
              error: {
                description: "Insufficient gas",
                kind: GrpcTypes.ExecutionError_ExecutionErrorKind
                  .INSUFFICIENT_GAS,
                errorDetails: { oneofKind: undefined },
              },
            },
        bcs: {
          value: bcs.TransactionEffects.serialize({
            V2: {
              status: success
                ? { Success: true }
                : {
                    Failure: {
                      error: { InsufficientGas: true },
                      command: null,
                    },
                  },
              executedEpoch: 7n,
              gasUsed,
              transactionDigest: digest,
              gasObjectIndex: null,
              eventsDigest: null,
              dependencies: [],
              lamportVersion: 12n,
              changedObjects: [],
              unchangedConsensusObjects: [],
              auxDataDigest: null,
            },
          }).toBytes(),
        },
      },
    });
  }
  function receipt(success = true): WalletExecutionReceipt {
    const raw = result(success);
    return {
      digest,
      success,
      checkpoint: "21",
      epoch: "7",
      effectsBase64: toBase64(raw.effects!.bcs!.value!),
      source: "fullnode",
    };
  }
  return {
    bytesBase64: toBase64(bytes),
    bytes,
    digest,
    signed,
    result,
    receipt,
  };
}
export function grpcResponse(payload: Uint8Array, status = 0): Response {
  const trailer = new TextEncoder().encode(`grpc-status: ${status}\r\n`);
  const bytes = new Uint8Array(10 + payload.length + trailer.length);
  new DataView(bytes.buffer).setUint32(1, payload.length, false);
  bytes.set(payload, 5);
  bytes[5 + payload.length] = 128;
  new DataView(bytes.buffer).setUint32(
    6 + payload.length,
    trailer.length,
    false,
  );
  bytes.set(trailer, 10 + payload.length);
  return new Response(bytes, {
    headers: { "content-type": "application/grpc-web+proto" },
  });
}
