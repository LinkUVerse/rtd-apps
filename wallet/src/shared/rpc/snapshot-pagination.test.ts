// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { snapshotFixture } from "../../../tests/unit/rpc/fixtures";
import { GraphQLSnapshot } from "./graphql-snapshot";
import {
  collectSnapshotPages,
  SnapshotPaginationError,
} from "./snapshot-pagination";

async function reader() {
  const fixture = snapshotFixture();
  const snapshot = await GraphQLSnapshot.open(
    fixture.session,
    [{ type: "Address", field: "balances" }],
    { fetch: fixture.fetch },
  );
  return { fixture, snapshot };
}

describe("快照全分页失败关闭", () => {
  it("允许空扫描页，只要 continuation 前进，直到终页后才交付", async () => {
    const { snapshot, fixture } = await reader();
    const cursors: (string | null)[] = [];
    const result = await collectSnapshotPages(
      snapshot,
      async (cursor) => {
        cursors.push(cursor);
        return cursor === null
          ? { items: [], cursor: "next", hasNextPage: true }
          : { items: ["asset"], cursor: null, hasNextPage: false };
      },
      (item) => item,
    );
    expect(result).toEqual(["asset"]);
    expect(cursors).toEqual([null, "next"]);
    expect(fixture.requests.at(-1)?.query).toContain(
      "WalletSnapshotRevalidate",
    );
  });

  it("空页面 cursor 重复不能循环，也不返回已取结果", async () => {
    const { snapshot } = await reader();
    await expect(
      collectSnapshotPages(
        snapshot,
        async () => ({ items: [], cursor: "same", hasNextPage: true }),
        (item: string) => item,
      ),
    ).rejects.toMatchObject({ reason: "cursor-stalled" });
  });

  it("超过页数或项目预算不返回截断列表", async () => {
    const { snapshot } = await reader();
    await expect(
      collectSnapshotPages(
        snapshot,
        async () => ({ items: ["a", "b"], cursor: null, hasNextPage: false }),
        (item) => item,
        { maxItems: 1 },
      ),
    ).rejects.toBeInstanceOf(SnapshotPaginationError);
    let counter = 0;
    await expect(
      collectSnapshotPages(
        snapshot,
        async () => ({
          items: [],
          cursor: String(++counter),
          hasNextPage: true,
        }),
        (item: string) => item,
        { maxPages: 2 },
      ),
    ).rejects.toMatchObject({ reason: "budget" });
  });

  it("终页复验失败时不交付所有已暂存页", async () => {
    const fixture = snapshotFixture({
      alter: (response, request) =>
        request.query.includes("WalletSnapshotRevalidate")
          ? { ...response, errors: [{ message: "coverage lost" }] }
          : response,
    });
    const snapshot = await GraphQLSnapshot.open(
      fixture.session,
      [{ type: "Address", field: "balances" }],
      { fetch: fixture.fetch },
    );
    await expect(
      collectSnapshotPages(
        snapshot,
        async () => ({ items: ["a"], cursor: null, hasNextPage: false }),
        (item) => item,
      ),
    ).rejects.toMatchObject({ reason: "partial" });
  });
});
