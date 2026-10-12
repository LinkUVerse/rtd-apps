// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_ENV } from "../../../shared/api-env";
import { profileFixture } from "../../../shared/rpc/profile-fixture";
import type { WalletReadSession } from "../../../shared/rpc/session";
import { getCurrentEpoch } from "./current-epoch";

const mocks = vi.hoisted(() => ({
  network: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  epoch: vi.fn(),
}));
vi.mock("../../NetworkEnv", () => ({
  default: { getActiveNetwork: mocks.network, on: mocks.on, off: mocks.off },
}));
vi.mock("../../../shared/rpc/fullnode-reader", () => ({
  WalletFullnodeReader: class {
    constructor(readonly session: WalletReadSession) {}
    currentEpoch() {
      return mocks.epoch(this.session);
    }
  },
}));
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv(
    "WALLET_NETWORK_PROFILES",
    JSON.stringify({ [API_ENV.local]: profileFixture() }),
  );
  mocks.network.mockResolvedValue({ env: API_ENV.local, customRpcUrl: null });
  mocks.epoch.mockResolvedValue(12);
});
afterEach(() => vi.unstubAllEnvs());
describe("zkLogin background 的当前 epoch 配置绑定", () => {
  it("每次签名重新查 epoch，无旧别名缓存；退出释放会话与监听", async () => {
    expect(await getCurrentEpoch()).toBe(12);
    mocks.epoch.mockResolvedValueOnce(13);
    expect(await getCurrentEpoch()).toBe(13);
    expect(mocks.epoch).toHaveBeenCalledTimes(2);
    expect(mocks.off).toHaveBeenCalledTimes(2);
    for (const [session] of mocks.epoch.mock.calls)
      expect(session.signal.aborted).toBe(true);
  });
  it("期间切网络会话失效，不能将旧 epoch 交给签名", async () => {
    mocks.epoch.mockImplementation(async () => {
      mocks.on.mock.calls[0][1]();
      return 12;
    });
    await expect(getCurrentEpoch()).rejects.toThrow("会话");
    expect(mocks.off).toHaveBeenCalledOnce();
  });
  it("返回前重新核对当前 profile，不把自定义未知链当原网络", async () => {
    mocks.network
      .mockResolvedValueOnce({ env: API_ENV.local })
      .mockResolvedValueOnce({ env: API_ENV.customRPC });
    await expect(getCurrentEpoch()).rejects.toThrow("网络配置");
    expect(mocks.off).toHaveBeenCalledOnce();
  });
  it("未配置服务不查询、不启用旧 JSON-RPC fallback", async () => {
    vi.stubEnv("WALLET_NETWORK_PROFILES", "{}");
    await expect(getCurrentEpoch()).rejects.toThrow("尚未配置");
    expect(mocks.epoch).not.toHaveBeenCalled();
    expect(mocks.on).not.toHaveBeenCalled();
  });
});
