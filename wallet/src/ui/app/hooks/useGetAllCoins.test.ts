// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";
import type { WalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import {
  fetchAllCoins,
  getAllCoinsQueryKey,
  getAllCoinsQueryOptions,
} from "./useGetAllCoins";

function rpc(overrides: Partial<WalletRpc> = {}): WalletRpc {
  return {
    state: "configured",
    bindingKey: "binding-1",
    readSessionKey: "session-1",
    assetSnapshotKey: "asset-1",
    hasFullnodeSession: true,
    probeEntryAccess: vi
      .fn()
      .mockResolvedValue({ state: "accessible", checkpoint: "1" }),
    packages: {},
    prepareTransaction: async () => {
      throw new Error("not needed");
    },
    simulateTransaction: async () => {
      throw new Error("not needed");
    },
    resolveRecipientName: vi.fn().mockRejectedValue(new Error("unused")),
    readDefaultName: vi.fn().mockRejectedValue(new Error("unused")),
    readAccountHistory: vi.fn(),
    readTransactionDetails: vi.fn().mockResolvedValue(null),
    readFreshObject: vi.fn().mockResolvedValue(null),
    readFreshCoins: vi.fn().mockResolvedValue([]),
    readFreshBalance: vi.fn().mockRejectedValue(new Error("unused")),
    readFreshBalances: vi.fn().mockRejectedValue(new Error("unused")),
    openAssetSnapshot: async () => {
      throw new Error("not needed");
    },
    refreshAssets: async () => {},
    ...overrides,
  };
}
describe("发送 coin Hook 的领域接入", () => {
  it("完整读取委托 Fullnode 领域接口并传递取消信号", async () => {
    const domain = rpc();
    const signal = new AbortController().signal;
    expect(await fetchAllCoins(domain, "0x2::rtd::RTD", "0xb", signal)).toEqual(
      [],
    );
    expect(domain.readFreshCoins).toHaveBeenCalledWith(
      "0xb",
      "0x2::rtd::RTD",
      signal,
    );
  });
  it("失败不转换为空余额", async () => {
    const error = new Error("offline");
    const domain = rpc({ readFreshCoins: vi.fn().mockRejectedValue(error) });
    await expect(fetchAllCoins(domain, "0x2::rtd::RTD", "0xb")).rejects.toBe(
      error,
    );
  });
  it("即时过期、无持久化、无自动重试，缓存完整绑定 profile 和读会话", async () => {
    const domain = rpc();
    const options = getAllCoinsQueryOptions(domain, "0x2::rtd::RTD", "0xb");
    expect(options.queryKey).toEqual([
      "wallet-fresh-coins",
      "binding-1",
      "session-1",
      "0xb",
      "0x2::rtd::RTD",
    ]);
    expect(options).toMatchObject({
      meta: { skipPersistedCache: true },
      staleTime: 0,
      gcTime: 0,
      retry: false,
    });
    const signal = new AbortController().signal;
    await options.queryFn({ signal });
    expect(domain.readFreshCoins).toHaveBeenCalledWith(
      "0xb",
      "0x2::rtd::RTD",
      signal,
    );
    expect(
      getAllCoinsQueryKey(
        rpc({ bindingKey: "binding-2" }),
        "0x2::rtd::RTD",
        "0xb",
      ),
    ).not.toEqual(options.queryKey);
    expect(
      getAllCoinsQueryKey(
        rpc({ readSessionKey: "session-2" }),
        "0x2::rtd::RTD",
        "0xb",
      ),
    ).not.toEqual(options.queryKey);
  });
  it.each(["initializing", "unconfigured", "invalid"] as const)(
    "未配置状态 %s 不发起查询",
    (state) => {
      expect(
        getAllCoinsQueryOptions(rpc({ state }), "0x2::rtd::RTD", "0xb").enabled,
      ).toBe(false);
    },
  );
});
