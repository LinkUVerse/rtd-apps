// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { blake2b } from "@noble/hashes/blake2.js";
import { GrpcTypes } from "rtd-typescript/grpc";
import { toBase58, toBase64 } from "rtd-typescript/utils";
import { vi, expect } from "vitest";
import {
  snapshotFixture,
  snapshotDigest,
  graphql,
  type GraphQLRequest,
} from "./fixtures";
import { executionFixture } from "./execution-fixtures";
import { WalletAccountHistoryReader } from "../../../src/shared/rpc/account-history-reader";
import { validateNetworkProfile } from "../../../src/shared/rpc/profile";
import { WalletReadSession } from "../../../src/shared/rpc/session";

const schema = graphql.buildSchema(
  readFileSync(
    resolve(
      process.cwd(),
      "migrationToGRpcOrGraphQLDoc/evidence/account-history-schema.graphql.txt",
    ),
    "utf8",
  ),
);
export async function historyRow(amount = 1n, success = true, checkpoint = 21) {
  const f = await executionFixture(amount);
  const raw = f.result(success);
  const prefix = new TextEncoder().encode("TransactionEffects::");
  const body = raw.effects!.bcs!.value!;
  const typed = new Uint8Array(prefix.length + body.length);
  typed.set(prefix);
  typed.set(body, prefix.length);
  raw.effects!.digest = toBase58(blake2b(typed, { dkLen: 32 }));
  raw.balanceChanges = [
    GrpcTypes.BalanceChange.create({
      address: raw.transaction!.sender,
      coinType: "0x2::rtd::RTD",
      amount: "-9007199254740993123",
    }),
  ];
  const row = {
    digest: f.digest,
    checkpoint,
    sender: raw.transaction!.sender!,
    status: success ? "SUCCESS" : "FAILURE",
    origins: ["affectedAddress"],
    transaction: {
      digest: f.digest,
      kind: { __typename: "ProgrammableTransaction" },
      sender: { address: raw.transaction!.sender },
      transactionBcs: toBase64(f.bytes),
      transactionJson: GrpcTypes.Transaction.toJson({
        ...raw.transaction!,
        digest: f.digest,
      }),
      effects: {
        digest: f.digest,
        effectsDigest: raw.effects!.digest,
        effectsBcs: toBase64(body),
        effectsJson: GrpcTypes.TransactionEffects.toJson(raw.effects!),
        version: 2,
        status: success ? "SUCCESS" : "FAILURE",
        timestamp: "2026-10-03T01:02:03.123456789Z",
        balanceChangesJson: raw.balanceChanges.map((value) =>
          GrpcTypes.BalanceChange.toJson(value),
        ),
        checkpoint: { sequenceNumber: checkpoint },
        gasEffects: {
          gasSummary: { computationCost: 1, storageCost: 2, storageRebate: 0 },
        },
      },
    },
    eventFacts: { events: [], eventsDigest: null, complete: true },
    kioskTransfers: null,
  };
  return { f, raw, row };
}
export async function historyFixture(
  options: {
    rows?: unknown[];
    alter?: (
      data: Record<string, any>,
      request: GraphQLRequest,
      call: number,
    ) => void;
    nativeAlter?: (data: Record<string, any>, request: GraphQLRequest) => void;
    noHistory?: boolean;
    timeoutMs?: number;
    maxPages?: number;
    pageSize?: number;
  } = {},
) {
  const native = snapshotFixture({
    range: () => ({ first: 0, last: 30 }),
    alter: (response, request) => {
      const data = response.data as Record<string, any>;
      if (request.query.includes("Admission"))
        data.walletHead.sequenceNumber = 30;
      options.nativeAlter?.(data, request);
      return response;
    },
  });
  if (options.noHistory) {
    const endpoints = { ...native.profile.endpoints };
    delete endpoints.accountHistoryUrl;
    native.profile = validateNetworkProfile({ ...native.profile, endpoints });
    native.session = new WalletReadSession(native.profile);
  }
  const rows = options.rows ?? [(await historyRow()).row];
  const requests: GraphQLRequest[] = [];
  const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
    expect(init!.credentials).toBe("omit");
    expect(init!.redirect).toBe("error");
    if (String(input) === native.profile.endpoints.graphqlUrl)
      return native.fetch(input, init);
    expect(String(input)).toBe(native.profile.endpoints.accountHistoryUrl);
    const request = JSON.parse(String(init!.body)) as GraphQLRequest;
    expect(graphql.validate(schema, graphql.parse(request.query))).toEqual([]);
    requests.push(request);
    const { variables } = request;
    expect(variables.chain).toBe(native.profile.expectedGenesisDigest);
    const data: Record<string, any> = request.query.includes(
      "WalletHistoryCoverage",
    )
      ? {
          accountHistoryCoverage: {
            chainId: native.profile.expectedGenesisDigest,
            checkpointLo: 0,
            checkpointHi: 25,
            checkpointDigest: snapshotDigest,
            allAccountActivityCertified: false,
          },
        }
      : {
          accountHistory: {
            chainId: native.profile.expectedGenesisDigest,
            address: variables.address,
            checkpointLo: variables.lo,
            checkpointHi: variables.hi,
            limit: variables.limit,
            snapshot: "a".repeat(64),
            registrationComplete: true,
            completeForRegisteredKiosks: true,
            completeForDiscoveredOwnerTokens: true,
            completeForDiscoveredCapabilities: true,
            allAccountActivityCertified: false,
            allAccountTransfersCertified: false,
            transactions: rows.slice(
              variables.cursor
                ? Number(String(variables.cursor).split(".")[0].slice(1))
                : 0,
              (variables.cursor
                ? Number(String(variables.cursor).split(".")[0].slice(1))
                : 0) + Number(variables.limit),
            ),
            hasNextPage:
              (variables.cursor
                ? Number(String(variables.cursor).split(".")[0].slice(1))
                : 0) +
                Number(variables.limit) <
              rows.length,
            nextCursor:
              (variables.cursor
                ? Number(String(variables.cursor).split(".")[0].slice(1))
                : 0) +
                Number(variables.limit) <
              rows.length
                ? `p${(variables.cursor ? Number(String(variables.cursor).split(".")[0].slice(1)) : 0) + Number(variables.limit)}.sig`
                : null,
          },
        };
    options.alter?.(data, request, requests.length);
    return Response.json({ data });
  });
  const reader = new WalletAccountHistoryReader(native.session, {
    fetch,
    timeoutMs: options.timeoutMs,
    pageSize: options.pageSize ?? 1,
    maxPages: options.maxPages,
  });
  return { native, reader, fetch, requests, rows };
}
