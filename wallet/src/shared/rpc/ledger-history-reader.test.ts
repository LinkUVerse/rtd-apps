// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { GrpcTypes } from "rtd-typescript/grpc";
import { toBase58 } from "rtd-typescript/utils";
import { describe, expect, it, vi } from "vitest";
import {
  executionFixture,
  grpcResponse,
} from "../../../tests/unit/rpc/execution-fixtures";
import { WalletLedgerReader } from "./ledger-reader";
import { WalletReadSession } from "./session";
import { validateNetworkProfile } from "./profile";
import { profileFixture } from "./profile-fixture";

class HistoryReader extends WalletLedgerReader {
  request: GrpcTypes.ListTransactionsRequest | undefined;
  constructor(
    session: WalletReadSession,
    private readonly frames: () => AsyncIterable<GrpcTypes.ListTransactionsResponse>,
    fetch?: typeof globalThis.fetch,
  ) {
    super(session, { fetch });
  }
  protected override createClient(): never {
    return {
      ledgerService: {
        listTransactions: (request: GrpcTypes.ListTransactionsRequest) => {
          this.request = request;
          return { responses: this.frames() };
        },
      },
    } as never;
  }
}

describe("WalletLedgerReader history", () => {
  it("reads an affected-address page from the archive ledger", async () => {
    const first = await executionFixture(1n);
    const second = await executionFixture(2n);
    const cursors = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5])];
    const session = new WalletReadSession(
      validateNetworkProfile(profileFixture()),
    );
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      grpcResponse(
        GrpcTypes.GetServiceInfoResponse.toBinary({
          chainId: session.profile.expectedGenesisDigest,
          checkpointHeight: 30n,
          lowestAvailableCheckpoint: 0n,
        }),
      ),
    );
    const reader = new HistoryReader(
      session,
      async function* () {
        yield GrpcTypes.ListTransactionsResponse.create({
          transaction: first.result(),
          watermark: { cursor: cursors[0] },
        });
        yield GrpcTypes.ListTransactionsResponse.create({
          transaction: second.result(),
          watermark: { cursor: cursors[1] },
          end: { reason: GrpcTypes.QueryEndReason.ITEM_LIMIT },
        });
      },
      fetch,
    );

    const page = await reader.historyPage("0x" + "a".repeat(64), null, {
      limit: 2,
    });

    expect(page).toMatchObject({
      source: "archive",
      checkpointHeight: 30,
      lowestAvailableCheckpoint: 0,
      hasNextPage: true,
      nextCursor: "BAU=",
    });
    expect(page.transactions.map((tx) => tx.digest)).toEqual([
      first.digest,
      second.digest,
    ]);
    expect(reader.request).toMatchObject({
      filter: {
        terms: [
          {
            literals: [
              {
                negated: false,
                predicate: {
                  oneofKind: "affectedAddress",
                  affectedAddress: { address: "0x" + "a".repeat(64) },
                },
              },
            ],
          },
        ],
      },
      options: {
        limit: 3,
        ordering: GrpcTypes.Ordering.DESCENDING,
      },
    });
    expect(reader.request!.options?.before).toBeUndefined();
    expect(session.cacheKey).not.toBe("");
  });

  it("rejects a cursor that is not the exact opaque encoding", async () => {
    const session = new WalletReadSession(
      validateNetworkProfile(profileFixture()),
    );
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      grpcResponse(
        GrpcTypes.GetServiceInfoResponse.toBinary({
          chainId: session.profile.expectedGenesisDigest,
          checkpointHeight: 30n,
          lowestAvailableCheckpoint: 0n,
        }),
      ),
    );
    const reader = new HistoryReader(session, async function* () {}, fetch);
    await expect(
      reader.historyPage("0x" + "a".repeat(64), "not base64"),
    ).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requires an archive endpoint", async () => {
    const config = profileFixture();
    delete config.endpoints.archiveGrpcWeb;
    const session = new WalletReadSession(validateNetworkProfile(config));
    const reader = new HistoryReader(session, async function* () {});
    await expect(reader.historyPage("0x" + "a".repeat(64))).rejects.toThrow(
      "当前网络未配置归档查询入口",
    );
  });
});
