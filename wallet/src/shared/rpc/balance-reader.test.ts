// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  balanceNode,
  connection,
  snapshotFixture,
} from "../../../tests/unit/rpc/fixtures";
import { WalletAssetReader } from "./asset-reader";
import { BALANCE_COVERAGE, WalletBalanceReader } from "./balance-reader";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("independent complete balance snapshot through actual SDK and three SDLs", () => {
  it("reads all advancing pages including empty middle page, same S and precise coin/address totals without Display", async () => {
    const f = snapshotFixture({
      read: (request) => ({
        address: {
          address: request.variables.owner,
          balances:
            request.variables.cursor === null
              ? connection([balanceNode()], "next", true)
              : request.variables.cursor === "next"
                ? connection([], "last", true)
                : connection([balanceNode("0x9::coin::TOKEN")]),
        },
      }),
      alter: (body, request) =>
        request.query.includes("walletDisplayService")
          ? { ...body, errors: [{ message: "Display uncovered" }] }
          : body,
    });
    vi.stubGlobal("fetch", f.fetch);
    await expect(WalletAssetReader.open(f.session)).rejects.toThrow();
    f.requests.length = 0;
    const result = await WalletBalanceReader.read(f.session, "0xb");
    expect(result.value).toHaveLength(2);
    expect(result.value[0].balance).toBe("900719925474099312345");
    expect(result.snapshot.displayHistory).toBeUndefined();
    expect(
      new Set(result.snapshot.dependencies.map((d) => `${d.type}.${d.field}`)),
    ).toEqual(new Set(BALANCE_COVERAGE.map((d) => `${d.type}.${d.field}`)));
    expect(
      f.requests.every((r) => !r.query.includes("walletDisplayService")),
    ).toBe(true);
    expect(
      f.requests
        .slice(1)
        .every((r) =>
          r.query.includes("walletSnapshot: checkpoint(sequenceNumber: 10)"),
        ),
    ).toBe(true);
    expect(f.requests.at(-1)?.query).toContain("WalletSnapshotRevalidate");
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value[0])).toBe(true);
  });
  it("accepts only a fully covered explicit empty set", async () => {
    const f = snapshotFixture({
      read: (request) => ({
        address: { address: request.variables.owner, balances: connection([]) },
      }),
    });
    vi.stubGlobal("fetch", f.fetch);
    const result = await WalletBalanceReader.read(f.session, "0xb");
    expect(result.value).toEqual([]);
    expect(f.requests.at(-1)?.query).toContain("WalletSnapshotRevalidate");
  });
  it.each([
    "missing-amount",
    "inexact-number",
    "noncanonical",
    "negative",
    "u128-overflow",
    "bad-sum",
    "bad-type",
    "wrong-owner",
    "missing-address",
    "missing-connection",
    "oversized-page",
    "duplicate",
    "stalled",
  ])("refuses %s without a partial list or trusted zero", async (fault) => {
    const f = snapshotFixture({
      read: (request) => {
        const node: any = balanceNode();
        if (fault === "missing-amount") delete node.addressBalance;
        if (fault === "inexact-number") node.totalBalance = 9007199254740992;
        if (fault === "noncanonical") node.totalBalance = "01";
        if (fault === "negative") node.totalBalance = "-1";
        if (fault === "u128-overflow")
          node.totalBalance = (1n << 128n).toString();
        if (fault === "bad-sum") node.totalBalance = "0";
        if (fault === "bad-type") node.coinType.repr = "bad";
        const nodes =
          fault === "oversized-page"
            ? Array.from({ length: 51 }, (_, i) => ({
                ...node,
                coinType: { repr: `0x2::fixture::COIN${i}` },
              }))
            : [node];
        const balances = connection(
          nodes,
          "same",
          fault === "duplicate" || fault === "stalled",
        );
        if (fault === "stalled") balances.nodes = [];
        return {
          address:
            fault === "missing-address"
              ? null
              : {
                  address:
                    fault === "wrong-owner" ? "0xf" : request.variables.owner,
                  balances: fault === "missing-connection" ? null : balances,
                },
        };
      },
    });
    vi.stubGlobal("fetch", f.fetch);
    await expect(WalletBalanceReader.read(f.session, "0xb")).rejects.toThrow();
    expect(f.requests.at(-1)?.query).not.toContain("WalletSnapshotRevalidate");
  });
  it.each([
    "wrong-chain",
    "missing-range",
    "partial-page",
    "final-range",
    "final-digest",
    "final-partial",
  ])("refuses %s without returning balances", async (fault) => {
    const f = snapshotFixture({
      read: (request) => ({
        address: {
          address: request.variables.owner,
          balances: connection([balanceNode()]),
        },
      }),
      alter: (body, request) => {
        const data = body.data as Record<string, any>;
        if (fault === "wrong-chain")
          data.walletGenesis.digest = "11111111111111111111111111111111";
        if (fault === "missing-range") delete data.serviceConfig.range1;
        if (
          fault === "partial-page" &&
          request.query.includes("WalletSnapshotRead")
        )
          return { ...body, errors: [{ message: "partial" }] };
        if (request.query.includes("WalletSnapshotRevalidate")) {
          if (fault === "final-range")
            data.serviceConfig.range1.last.sequenceNumber = 9;
          if (fault === "final-digest")
            data.walletSnapshot.digest = "11111111111111111111111111111111";
          if (fault === "final-partial")
            return { ...body, errors: [{ message: "partial" }] };
        }
        return body;
      },
    });
    vi.stubGlobal("fetch", f.fetch);
    await expect(WalletBalanceReader.read(f.session, "0xb")).rejects.toThrow();
  });
  it.each(["pages", "items"])(
    "keeps complete collection %s budget instead of truncating success",
    async (budget) => {
      let page = 0;
      const f = snapshotFixture({
        read: (request) => {
          const index = page++;
          const nodes =
            budget === "pages"
              ? []
              : Array.from({ length: 50 }, (_, i) =>
                  balanceNode(`0x2::fixture::COIN${index * 50 + i}`),
                );
          return {
            address: {
              address: request.variables.owner,
              balances: connection(nodes, `next${index}`, true),
            },
          };
        },
      });
      vi.stubGlobal("fetch", f.fetch);
      await expect(
        WalletBalanceReader.read(f.session, "0xb"),
      ).rejects.toMatchObject({ reason: "budget" });
      expect(page).toBe(budget === "pages" ? 256 : 201);
    },
  );
  it("rejects invalid owner, cancelled caller and closed session before transport", async () => {
    const f = snapshotFixture();
    vi.stubGlobal("fetch", f.fetch);
    await expect(WalletBalanceReader.read(f.session, "bad")).rejects.toThrow();
    await expect(
      WalletBalanceReader.read(f.session, "0xb", AbortSignal.abort()),
    ).rejects.toThrow();
    f.session.close();
    await expect(WalletBalanceReader.read(f.session, "0xb")).rejects.toThrow();
    expect(f.requests).toHaveLength(0);
  });
  it("20 seconds covers admission and all pages, not only the collection phase", async () => {
    const f = snapshotFixture({
      read: (request) => ({
        address: {
          address: request.variables.owner,
          balances: connection([balanceNode()]),
        },
      }),
    });
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
      const c = new AbortController();
      setTimeout(
        () => c.abort(new DOMException("expired", "TimeoutError")),
        ms,
      );
      return c.signal;
    });
    let finished = 0;
    vi.stubGlobal(
      "fetch",
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const response = await f.fetch(input, init);
        return new Promise<Response>((resolve, reject) => {
          const timer = setTimeout(() => {
            finished++;
            resolve(response);
          }, 7000);
          init!.signal!.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              reject(init!.signal!.reason);
            },
            { once: true },
          );
        });
      },
    );
    const result = WalletBalanceReader.read(f.session, "0xb").then(
      () => null,
      (error) => error,
    );
    await vi.advanceTimersByTimeAsync(19_999);
    expect(finished).toBe(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toBeInstanceOf(Error);
  });
});
