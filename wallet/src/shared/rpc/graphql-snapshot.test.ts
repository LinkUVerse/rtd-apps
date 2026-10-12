// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toBase58 } from "rtd-typescript/utils";
import { describe, expect, it, vi } from "vitest";

import {
  snapshotDigest,
  snapshotFixture,
} from "../../../tests/unit/rpc/fixtures";
import {
  checkpointNumber,
  GraphQLSnapshot,
  SnapshotReadError,
} from "./graphql-snapshot";
import { NetworkIdentityError } from "./identity";
import { StaleWalletSessionError } from "./session";

const dependencies = [
  { type: "Address", field: "balances" },
  { type: "Query", field: "coinMetadata" },
];

describe("GraphQL 同 checkpoint 快照准入", () => {
  it("HTTP 临时故障恢复后仍核验完整 H0，不重试错链响应", async () => {
    vi.useFakeTimers();
    try {
      const fixture = snapshotFixture({
        alter: (response) => {
          (response.data as Record<string, any>).walletGenesis.digest =
            toBase58(new Uint8Array(32).fill(7));
          return response;
        },
      });
      let calls = 0;
      const fetch: typeof globalThis.fetch = async (input, init) => {
        calls++;
        if (calls === 1) return new Response(null, { status: 503 });
        return fixture.fetch(input, init);
      };
      const pending = GraphQLSnapshot.open(fixture.session, dependencies, {
        fetch,
      });
      const assertion =
        expect(pending).rejects.toBeInstanceOf(NetworkIdentityError);
      await vi.runAllTimersAsync();
      await assertion;
      expect(calls).toBe(2);
      expect(fixture.requests).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("历史固定窗口独立于最新上界，前端及末验必须仍覆盖下界", async () => {
    let pruned = false;
    const f = snapshotFixture({
      range: () => ({ first: pruned ? 3 : 0, last: 10 }),
    });
    const snapshot = await GraphQLSnapshot.open(f.session, dependencies, {
      fetch: f.fetch,
      window: { lower: 2, upper: 8 },
    });
    expect(snapshot.proof.checkpoint).toBe("8");
    expect(snapshot.firstCheckpoint).toBe(2);
    expect(f.requests).toHaveLength(1);
    expect(f.requests[0].query).toContain('WalletSnapshotAdmissionAndPin');
    expect(f.requests[0].query).toContain('walletHead: checkpoint');
    expect(f.requests[0].query).toContain('walletSnapshot: checkpoint(sequenceNumber: 8)');
    await snapshot.revalidate();
    expect(f.requests).toHaveLength(2);
    pruned = true;
    await expect(snapshot.revalidate()).rejects.toMatchObject({
      reason: "coverage",
    });
  });
  it.each(['missing-pin', 'wrong-height', 'bad-digest', 'missing-head', 'future-pin', 'wrong-chain', 'partial'])(
    '固定窗口合并请求仍拒绝 %s', async failure => {
      const f = snapshotFixture({ alter: response => {
        const data = response.data as Record<string, any>;
        if (failure === 'missing-pin') delete data.walletSnapshot;
        if (failure === 'wrong-height') data.walletSnapshot.sequenceNumber = 7;
        if (failure === 'bad-digest') data.walletSnapshot.digest = 'invalid';
        if (failure === 'missing-head') delete data.walletHead;
        if (failure === 'future-pin') data.walletHead.sequenceNumber = 7;
        if (failure === 'wrong-chain') data.walletGenesis.digest = toBase58(new Uint8Array(32).fill(7));
        return failure === 'partial' ? {...response, errors:[{message:'pin failed'}]} : response;
      } });
      await expect(GraphQLSnapshot.open(f.session, dependencies, {
        fetch:f.fetch, window:{lower:2,upper:8},
      })).rejects.toThrow();
      expect(f.requests).toHaveLength(1);
    },
  );
  it.each([
    { lower: 9, upper: 8 },
    { lower: 0, upper: 12 },
    { lower: -1, upper: 8 },
  ])("不可满足的历史窗口拒绝 %#", async (window) => {
    const f = snapshotFixture();
    await expect(
      GraphQLSnapshot.open(f.session, dependencies, { fetch: f.fetch, window }),
    ).rejects.toThrow();
  });
  it("取字段覆盖交集，SDK SDL 验证所有请求，后续请求和复验固定同一 S/digest", async () => {
    const fixture = snapshotFixture({
      range: (index) =>
        index ? { first: 3, last: 8 } : { first: 1, last: 10 },
      read: () => ({ checkpoint: { sequenceNumber: 8 } }),
    });
    const snapshot = await GraphQLSnapshot.open(fixture.session, dependencies, {
      fetch: fixture.fetch,
    });
    expect(snapshot.proof.checkpoint).toBe("8");
    expect(snapshot.proof.digest).toBe(snapshotDigest);
    expect(Object.isFrozen(snapshot.proof.dependencies)).toBe(true);
    await expect(
      snapshot.read({ selection: "checkpoint { sequenceNumber }" }),
    ).resolves.toEqual({ checkpoint: { sequenceNumber: 8 } });
    await snapshot.revalidate();
    expect(
      fixture.requests
        .slice(1)
        .every((request) =>
          request.query.includes(
            "walletSnapshot: checkpoint(sequenceNumber: 8)",
          ),
        ),
    ).toBe(true);
  });

  it("无共同覆盖和最低写后读 checkpoint 未到达时均拒绝", async () => {
    const gap = snapshotFixture({
      range: (index) =>
        index ? { first: 9, last: 10 } : { first: 1, last: 8 },
    });
    await expect(
      GraphQLSnapshot.open(gap.session, dependencies, { fetch: gap.fetch }),
    ).rejects.toMatchObject({ reason: "coverage" });
    expect(gap.requests).toHaveLength(1);
    const lag = snapshotFixture();
    await expect(
      GraphQLSnapshot.open(lag.session, dependencies, {
        fetch: lag.fetch,
        minimumCheckpoint: "11",
      }),
    ).rejects.toMatchObject({ reason: "coverage" });
  });

  it.each([
    "partial",
    "wrong-genesis",
    "wrong-digest",
    "wrong-height",
    "pruned",
    "missing-query",
  ])("读取中 %s 不接纳数据", async (failure) => {
    let enabled = false;
    const fixture = snapshotFixture({
      read: () => ({ checkpoint: { sequenceNumber: 10 } }),
      alter: (response) => {
        if (!enabled) return response;
        const data = response.data as Record<string, any>;
        if (failure === "partial")
          return {
            ...response,
            errors: [{ message: "dependency unavailable" }],
          };
        if (failure === "wrong-genesis")
          data.walletGenesis.digest = toBase58(new Uint8Array(32).fill(7));
        if (failure === "wrong-digest")
          data.walletSnapshot.digest = toBase58(new Uint8Array(32).fill(8));
        if (failure === "wrong-height") data.walletSnapshot.sequenceNumber = 9;
        if (failure === "pruned")
          data.serviceConfig.range0.first.sequenceNumber = 11;
        if (failure === "missing-query") delete data.walletSnapshot.query;
        return response;
      },
    });
    const snapshot = await GraphQLSnapshot.open(fixture.session, dependencies, {
      fetch: fixture.fetch,
    });
    enabled = true;
    await expect(
      snapshot.read({ selection: "checkpoint { sequenceNumber }" }),
    ).rejects.toBeInstanceOf(
      failure === "wrong-genesis" ? NetworkIdentityError : SnapshotReadError,
    );
  });

  it("会话关闭或调用方取消，即使底层完成也拒绝迟到结果", async () => {
    const fixture = snapshotFixture();
    const snapshot = await GraphQLSnapshot.open(fixture.session, dependencies, {
      fetch: fixture.fetch,
    });
    fixture.session.close();
    await expect(snapshot.revalidate()).rejects.toBeInstanceOf(
      StaleWalletSessionError,
    );
    expect(fixture.requests).toHaveLength(2);
    const fresh = snapshotFixture();
    const reader = await GraphQLSnapshot.open(fresh.session, dependencies, {
      fetch: fresh.fetch,
    });
    const controller = new AbortController();
    controller.abort();
    await expect(
      reader.read({
        selection: "checkpoint { sequenceNumber }",
        signal: controller.signal,
      }),
    ).rejects.toThrow();
    expect(fresh.requests).toHaveLength(2);
  });

  it.each([
    -1,
    1.2,
    Number.MAX_SAFE_INTEGER + 1,
    "9007199254740992",
    "1e3",
    "01",
    null,
    undefined,
  ])("拒绝不可精确表达的 UInt53 %s", (value) => {
    expect(() => checkpointNumber(value)).toThrow(SnapshotReadError);
  });

  it("覆盖合同复制冻结且规范化，不能通过外部修改改变已准入范围", async () => {
    const fixture = snapshotFixture();
    const inputs = [{ type: "Address", field: "balances", filters: ["type"] }];
    const snapshot = await GraphQLSnapshot.open(fixture.session, inputs, {
      fetch: fixture.fetch,
    });
    inputs[0].filters.push("owner");
    inputs[0].field = "objects";
    expect(snapshot.proof.dependencies).toEqual([
      { type: "Address", field: "balances", filters: ["type"] },
    ]);
    await snapshot.revalidate();
    expect(fixture.requests.at(-1)?.query).toContain(
      'field: "balances", filters: ["type"]',
    );
  });
});
