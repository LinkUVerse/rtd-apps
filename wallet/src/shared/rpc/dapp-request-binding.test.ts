// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { Transaction } from "rtd-typescript/transactions";
import {
  bindDappRequest,
  assertDappRequestBinding,
  type DappTransactionSource,
} from "./dapp-request-binding";
import { profileFixture } from "./profile-fixture";
import { validateNetworkProfile } from "./profile";

const profile = validateNetworkProfile(profileFixture());
const origin = "https://dapp.example";
function source(): DappTransactionSource {
  return {
    data: new Transaction().serialize(),
    account: "0x7",
    chain: profile.walletStandardChain,
  };
}
describe("dApp后台请求绑定", () => {
  it("保存来源、规范账户、链、配置和原文hash且冻结", async () => {
    const input = source();
    const binding = await bindDappRequest("request-1", origin, input, profile);
    expect(binding).toMatchObject({
      requestId: "request-1",
      origin,
      account: `0x${"0".repeat(63)}7`,
      chain: profile.walletStandardChain,
      mode: "execute",
    });
    expect(binding.sourceHash).toMatch(/^[0-9a-f]{64}$/);
    expect(Object.isFrozen(binding)).toBe(true);
    expect(
      await assertDappRequestBinding(
        binding,
        "request-1",
        origin,
        input,
        profile,
      ),
    ).toEqual(binding);
  });
  it.each([undefined, null, 7])("拒绝未提供或非法chain %s", async (chain) => {
    await expect(bindDappRequest("r", origin, { ...source(), chain, justSign: true } as any, profile)).rejects.toThrow("链");
  });
  it.each(["rtd:mainnet", "", "sui:localnet"])(
    "拒绝显式错链 %s",
    async (chain) => {
      await expect(
        bindDappRequest("r", origin, { ...source(), chain }, profile),
      ).rejects.toThrow("链");
    },
  );
  it.each([
    "https://dapp.example/path",
    "https://dapp.example/",
    "https://user:pass@dapp.example",
    "file:///tmp/x",
    "null",
    "https://dapp.example?x=1",
  ])("拒绝非浏览器规范origin %s", async (value) => {
    await expect(
      bindDappRequest("r", value, source(), profile),
    ).rejects.toThrow();
  });
  it("显式sender只能为授权账户", async () => {
    const tx = new Transaction();
    tx.setSender("0x8");
    await expect(
      bindDappRequest(
        "r",
        origin,
        { ...source(), data: tx.serialize() },
        profile,
      ),
    ).rejects.toThrow("sender");
    tx.setSender("0x07");
    await expect(
      bindDappRequest(
        "r",
        origin,
        { ...source(), data: tx.serialize() },
        profile,
      ),
    ).resolves.toBeDefined();
  });
  it.each(["", "x".repeat(201), 123])("拒绝无效请求id", async (id) => {
    await expect(
      bindDappRequest(id as string, origin, source(), profile),
    ).rejects.toThrow("标识");
  });
  it.each(["", "x".repeat(2_000_001), "坏".repeat(700_000), 123, null])(
    "拒绝无效或超限交易原文",
    async (data) => {
      await expect(
        bindDappRequest(
          "r",
          origin,
          { ...source(), data: data as string },
          profile,
        ),
      ).rejects.toThrow("大小");
    },
  );
  it.each(["true", 1, null])("拒绝非布尔签名模式", async (justSign) => {
    await expect(
      bindDappRequest(
        "r",
        origin,
        { ...source(), justSign: justSign as unknown as boolean },
        profile,
      ),
    ).rejects.toThrow("格式");
  });
  it("拒绝无法解析的交易", async () => {
    await expect(
      bindDappRequest(
        "r",
        origin,
        { ...source(), data: "not-a-transaction" },
        profile,
      ),
    ).rejects.toThrow();
  });
  it.each(["revision", "generation", "expectedGenesisDigest"] as const)(
    "配置%s变更不能复用批准请求",
    async (field) => {
      const input = source();
      const binding = await bindDappRequest("r", origin, input, profile);
      const changed = profileFixture();
      if (field === "revision") changed.revision++;
      else if (field === "generation") changed.generation = "dev-2";
      else changed.expectedGenesisDigest = "11111111111111111111111111111111";
      await expect(
        assertDappRequestBinding(
          binding,
          "r",
          origin,
          input,
          validateNetworkProfile(changed),
        ),
      ).rejects.toThrow("绑定");
    },
  );
  it("拒绝账户、请求id、origin、原文、模式以及hash变更", async () => {
    const input = source();
    const binding = await bindDappRequest("r", origin, input, profile);
    const tx = new Transaction();
    tx.setSender("0x7");
    for (const next of [
      { ...input, account: "0x8" },
      { ...input, justSign: true },
      { ...input, data: tx.serialize() },
    ])
      await expect(
        assertDappRequestBinding(binding, "r", origin, next, profile),
      ).rejects.toThrow("绑定");
    await expect(
      assertDappRequestBinding(binding, "r2", origin, input, profile),
    ).rejects.toThrow("绑定");
    await expect(
      assertDappRequestBinding(
        binding,
        "r",
        "https://other.example",
        input,
        profile,
      ),
    ).rejects.toThrow("绑定");
    await expect(
      assertDappRequestBinding(
        { ...binding, sourceHash: "0".repeat(64) },
        "r",
        origin,
        input,
        profile,
      ),
    ).rejects.toThrow("绑定");
  });
  it("旧请求缺少绑定必须重新发起", async () => {
    await expect(
      assertDappRequestBinding(undefined!, "r", origin, source(), profile),
    ).rejects.toThrow("旧dApp");
  });
});
