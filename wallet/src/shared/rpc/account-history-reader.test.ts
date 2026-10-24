// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";
import { toBase58 } from "rtd-typescript/utils";
import {
  historyFixture,
  historyRow,
} from "../../../tests/unit/rpc/history-fixtures";
import { sender } from "../../../tests/unit/rpc/execution-fixtures";
import { WalletAccountHistoryReader } from "./account-history-reader";

describe("独立账户历史窗口准入", () => {
  it.each([
    { delay: 21_000, timeoutMs: undefined, accepted: true },
    { delay: 31_000, timeoutMs: undefined, accepted: false },
    { delay: 21_000, timeoutMs: 20_000, accepted: false },
  ])("完整分页共用总期限 $delay/$timeoutMs，接受=$accepted", async ({ delay, timeoutMs, accepted }) => {
    const a = (await historyRow(1n, true, 22)).row,
      b = (await historyRow(2n, true, 21)).row;
    const f = await historyFixture({ rows: [a, b] });
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const fetch: typeof globalThis.fetch = async (input, init) => {
        if (JSON.parse(String(init?.body)).query.includes("WalletAccountHistory"))
          await new Promise((resolve) => setTimeout(resolve, delay));
        // Deliberately finish after abort to exercise the late-response fence.
        return f.fetch(input, init);
      };
      const result = new WalletAccountHistoryReader(f.native.session, {
        fetch, pageSize: 1, timeoutMs,
      }).read(sender).then(
        (data) => ({ data, error: null }),
        (error) => ({ data: null, error }),
      );
      await vi.advanceTimersByTimeAsync(delay * 2 + 1);
      const settled = await result;
      if (accepted) {
        expect(settled.error).toBeNull();
        expect(settled.data?.transactions.map((row) => row.digest)).toEqual([a.digest, b.digest]);
        expect(settled.data?.coverage.allAccountActivityCertified).toBe(false);
      } else {
        expect(settled.data).toBeNull();
        expect(settled.error).toMatchObject({ name: "TimeoutError" });
      }
    } finally {
      vi.useRealTimers();
    }
  });
  it("冷恢复地址snapshot不覆盖旧窗口时仍读取服务认证历史，未枚举地址对象", async () => {
    const f = await historyFixture({
      nativeAlter: (data, request) => {
        const snapshots = request.query.match(/range(\d+): availableRange\(type: "Address", field: "objects"/);
        if (snapshots) data.serviceConfig[`range${snapshots[1]}`].first.sequenceNumber = 30;
      },
    });
    const result = await f.reader.read(sender);
    expect(result.transactions).toHaveLength(1);
    expect(result.coverage.allAccountActivityCertified).toBe(false);
    expect(f.native.requests.every((r) => !r.query.includes('type: "Address", field: "objects"'))).toBe(true);
  });
  it.each([0, 1, 2, 3, 4])("实际原生依赖%s缺少旧窗口时在第一页前拒绝", async (dependency) => {
    const f = await historyFixture({
      nativeAlter: (data, request) => {
        if (request.query.includes("Admission")) data.serviceConfig[`range${dependency}`].first.sequenceNumber = 1;
      },
    });
    await expect(f.reader.read(sender)).rejects.toMatchObject({ reason: "coverage" });
    expect(f.requests.some((r) => r.query.includes("WalletAccountHistory"))).toBe(false);
  });
  it("实际原生／扩展SDL通过；完整多页、相同S、bigint事实与未证明全集旗标保留", async () => {
    const a = (await historyRow(1n, true, 22)).row,
      b = (await historyRow(2n, false, 21)).row;
    const f = await historyFixture({ rows: [a, b] });
    const result = await f.reader.read(sender);
    expect(result).toMatchObject({
      bindingKey: f.native.session.bindingKey,
      readSessionKey: f.native.session.cacheKey,
      address: sender,
      checkpointLo: 0,
      checkpointHi: 25,
      coverage: { allAccountActivityCertified: false },
    });
    expect(result.transactions.map((row) => row.status)).toEqual([
      "SUCCESS",
      "FAILURE",
    ]);
    expect(result.transactions[0].transaction!.balanceChanges[0].amount).toBe(
      "-9007199254740993123",
    );
    expect(result.transactions[0].nativeTransaction).toEqual(a.transaction);
    const pages = f.requests.filter((request) =>
      request.query.includes("WalletAccountHistory"),
    );
    expect(pages).toHaveLength(2);
    expect(pages[1].variables.cursor).toBe("p1.sig");
    expect(
      pages.every(
        (request) => request.variables.hi === 25 && request.variables.lo === 0,
      ),
    ).toBe(true);
  });
  it("有范围和限定旗标的真实空集合被接纳，不伪造全集", async () => {
    const f = await historyFixture({ rows: [] });
    expect(await f.reader.read(sender)).toMatchObject({
      transactions: [],
      coverage: { allAccountActivityCertified: false },
    });
    expect(f.requests).toHaveLength(3);
    expect(f.native.requests).toHaveLength(2);
    expect(f.native.requests[0].query).toContain('WalletSnapshotAdmissionAndPin');
    expect(f.native.requests[1].query).toContain('WalletSnapshotRevalidate');
  });
  it("未配置历史能力不请求旧RPC／原生affectedAddress补齐", async () => {
    const f = await historyFixture({ noHistory: true });
    await expect(f.reader.read(sender)).rejects.toMatchObject({
      reason: "unconfigured",
    });
    expect(f.fetch).not.toHaveBeenCalled();
  });
  it.each([
    "chain",
    "address",
    "window",
    "snapshot",
    "duplicate",
    "order",
    "cursor",
    "continuation",
    "flags",
    "partial-set",
  ])("后页%s错误整组拒绝", async (failure) => {
    const a = (await historyRow(1n, true, 22)).row,
      b = (await historyRow(2n, true, 21)).row;
    const f = await historyFixture({
      rows: [a, b],
      alter: (data, request) => {
        if (!request.variables.cursor) return;
        const page = data.accountHistory;
        if (failure === "chain")
          page.chainId = toBase58(new Uint8Array(32).fill(3));
        if (failure === "address") page.address = "0x" + "0".repeat(64);
        if (failure === "window") page.checkpointLo = 1;
        if (failure === "snapshot") page.snapshot = "b".repeat(64);
        if (failure === "duplicate") page.transactions = [a];
        if (failure === "order")
          page.transactions = [
            {
              ...b,
              checkpoint: 23,
              transaction: {
                ...b.transaction,
                effects: {
                  ...b.transaction.effects,
                  checkpoint: { sequenceNumber: 23 },
                },
              },
            },
          ];
        if (failure === "cursor") {
          page.hasNextPage = true;
          page.nextCursor = "p1.sig";
        }
        if (failure === "continuation") page.nextCursor = "bad.sig";
        if (failure === "flags") page.completeForDiscoveredCapabilities = false;
        if (failure === "partial-set") page.transactions = [];
      },
    });
    await expect(f.reader.read(sender)).rejects.toThrow();
  });
  it.each([
    "extension-chain",
    "boundary-digest",
    "native-chain",
    "native-retention",
    "final-range",
    "coverage-certification",
    "nullable-flag",
  ])("覆盖%s不得证明可读历史", async (failure) => {
    const f = await historyFixture({
      alter: (data, request, call) => {
        const coverage = data.accountHistoryCoverage;
        if (coverage && failure === "extension-chain")
          coverage.chainId = toBase58(new Uint8Array(32).fill(3));
        if (coverage && failure === "boundary-digest")
          coverage.checkpointDigest = toBase58(new Uint8Array(32).fill(3));
        if (coverage && failure === "final-range" && call > 1)
          coverage.checkpointLo = 1;
        if (data.accountHistory && failure === "coverage-certification")
          data.accountHistory.allAccountActivityCertified = true;
        if (data.accountHistory && failure === "nullable-flag")
          delete data.accountHistory.completeForDiscoveredCapabilities;
      },
      nativeAlter: (data, request) => {
        if (failure === "native-chain")
          data.walletGenesis.digest = toBase58(new Uint8Array(32).fill(3));
        if (
          failure === "native-retention" &&
          request.query.includes("Revalidate")
        )
          data.serviceConfig.range0.first.sequenceNumber = 1;
      },
    });
    await expect(f.reader.read(sender)).rejects.toThrow();
  });
  it("发布上界向前推进不改变旧窗口／原摘要集合", async () => {
    const f = await historyFixture({
      alter: (data, _request, call) => {
        if (data.accountHistoryCoverage && call > 1) {
          data.accountHistoryCoverage.checkpointHi = 26;
          data.accountHistoryCoverage.checkpointDigest = toBase58(
            new Uint8Array(32).fill(3),
          );
        }
      },
    });
    expect((await f.reader.read(sender)).checkpointHi).toBe(25);
  });
  it("总量超预算不得提交第一页；部分GraphQL响应拒绝", async () => {
    const f = await historyFixture({
      maxPages: 1,
      rows: [(await historyRow(1n)).row, (await historyRow(2n)).row],
    });
    await expect(f.reader.read(sender)).rejects.toMatchObject({
      reason: "budget",
    });
    const g = await historyFixture();
    const fetch: typeof globalThis.fetch = async (input, init) => {
      const response = await g.fetch(input, init);
      if (String(input) === g.native.profile.endpoints.accountHistoryUrl) {
        const body = await response.json();
        return Response.json({
          ...body,
          errors: [{ message: "dependency missing" }],
        });
      }
      return response;
    };
    await expect(
      new WalletAccountHistoryReader(g.native.session, { fetch }).read(sender),
    ).rejects.toMatchObject({ reason: "partial" });
  });
  it("取消、切网迟到及共用总预算不接纳数据", async () => {
    const f = await historyFixture();
    const controller = new AbortController();
    controller.abort();
    await expect(f.reader.read(sender, controller.signal)).rejects.toThrow();
    expect(f.fetch).not.toHaveBeenCalled();
    const g = await historyFixture({
      alter: (data) => {
        if (data.accountHistory) g.native.session.close();
      },
    });
    await expect(g.reader.read(sender)).rejects.toThrow();
    const h = await historyFixture();
    const fetch: typeof globalThis.fetch = async (...args) => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return h.fetch(...args);
    };
    await expect(
      new WalletAccountHistoryReader(h.native.session, {
        fetch,
        timeoutMs: 5,
      }).read(sender),
    ).rejects.toThrow();
  });
});
