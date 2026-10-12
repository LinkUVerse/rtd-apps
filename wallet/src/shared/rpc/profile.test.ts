// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toBase58 } from "rtd-typescript/utils";
import { describe, expect, it } from "vitest";
import { profileFixture } from "./profile-fixture";

import {
  executionScopeKey,
  networkBindingKey,
  validateNetworkProfile,
} from "./profile";

describe("钱包网络配置与身份作用域", () => {
  it("复制并冻结完整配置、规范化 URL 和包 ID", () => {
    const input = profileFixture();
    const parsed = validateNetworkProfile(input, { requireComplete: true });
    expect(parsed.endpoints.fullnodeGrpcWeb).toBe(
      "http://127.0.0.1:9000/fullnode",
    );
    expect(parsed.packages.kiosk).toBe(`0x${"0".repeat(63)}2`);
    input.endpoints.graphqlUrl = "https://other.example/graphql";
    input.packages.name!.packageId = "0xa";
    expect(parsed.endpoints.graphqlUrl).toBe("https://localhost:9001/graphql");
    expect(parsed.packages.name!.packageId).toBe(`0x${"0".repeat(63)}4`);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed.packages.name)).toBe(true);
  });

  it.each([
    "http://rpc.example/fullnode",
    "ftp://localhost/file",
    "https://user:secret@rpc.example",
    "https://rpc.example/#x",
    "https://rpc.example/#",
    "https://rpc.example/?",
    "https://rpc.example/?token=secret",
    "http://127.1:9000",
    "http://2130706433:9000",
  ])("拒绝不安全或含秘密的 endpoint %s", (endpoint) => {
    // Browsers canonicalize IPv4 aliases. Explicit local HTTP is accepted only in canonical form.
    const input = profileFixture();
    input.endpoints.fullnodeGrpcWeb = endpoint;
    expect(() => validateNetworkProfile(input)).toThrow();
  });

  it.each([
    "",
    "0x12345678",
    "111",
    "not-a-digest",
    toBase58(new Uint8Array(33)),
  ])("拒绝短标识或无效 H0 %s", (digest) => {
    const input = profileFixture();
    input.expectedGenesisDigest = digest;
    expect(() => validateNetworkProfile(input)).toThrow();
  });

  it("原生归档和独立账户历史不能意外复用另外角色的入口", () => {
    const input = profileFixture();
    input.endpoints.archiveGrpcWeb = input.endpoints.fullnodeGrpcWeb;
    expect(() => validateNetworkProfile(input)).toThrow();
    const other = profileFixture();
    other.endpoints.accountHistoryUrl = other.endpoints.graphqlUrl;
    expect(() => validateNetworkProfile(other)).toThrow();
  });

  it("仅 Fullnode 的自定义网络必须显式以非完整 profile 校验", () => {
    const input = profileFixture();
    input.endpoints = { fullnodeGrpcWeb: "https://rpc.example/fullnode" };
    expect(validateNetworkProfile(input).endpoints.graphqlUrl).toBeUndefined();
    expect(() =>
      validateNetworkProfile(input, { requireComplete: true }),
    ).toThrow();
  });

  it("URL／别名／revision 改变会隔离缓存，却不能绕开同链同账户执行锁", () => {
    const a = validateNetworkProfile(profileFixture());
    const input = profileFixture();
    input.id = "other-alias";
    input.revision = 2;
    input.endpoints.fullnodeGrpcWeb = "https://another.example/fullnode";
    const b = validateNetworkProfile(input);
    expect(networkBindingKey(a)).not.toBe(networkBindingKey(b));
    expect(executionScopeKey(a, "0x7")).toBe(executionScopeKey(b, "0x07"));
    expect(executionScopeKey(a, "0x7")).not.toBe(executionScopeKey(a, "0x8"));
  });

  it.each(["genesis", "generation", "package", "registry"])(
    "dev %s 变化隔离绑定与所需锁作用域",
    (change) => {
      const a = validateNetworkProfile(profileFixture());
      const input = profileFixture();
      if (change === "genesis")
        input.expectedGenesisDigest = toBase58(new Uint8Array(32).fill(2));
      if (change === "generation") input.generation = "dev-2";
      if (change === "package") input.packages.personalKiosk = "0xa";
      if (change === "registry") input.packages.name!.forwardRegistry = "0xb";
      const b = validateNetworkProfile(input);
      expect(networkBindingKey(a)).not.toBe(networkBindingKey(b));
      expect(executionScopeKey(a, "0x7") === executionScopeKey(b, "0x7")).toBe(
        change === "package" || change === "registry",
      );
    },
  );

  it.each([
    null,
    [],
    { ...profileFixture(), schemaVersion: 1 },
    { ...profileFixture(), revision: Number.MAX_SAFE_INTEGER + 1 },
    { ...profileFixture(), walletStandardChain: "rtd:unknown" },
    { ...profileFixture(), packages: { kiosk: "@sui/kiosk" } },
  ])("拒绝不合法 schema、未知链或公网包别名", (input) => {
    expect(() => validateNetworkProfile(input)).toThrow();
  });
});

it('faucet endpoint is explicit, validated and part of the profile binding', () => {
  const base = validateNetworkProfile(profileFixture());
  expect(base.faucetUrl).toBeUndefined();
  const configured = validateNetworkProfile({ ...profileFixture(), faucetUrl: 'http://127.0.0.1:9123' });
  expect(configured.faucetUrl).toBe('http://127.0.0.1:9123/');
  expect(() => validateNetworkProfile({ ...profileFixture(), faucetUrl: 'https://faucet.example/prefix' })).toThrow();
  expect(networkBindingKey(configured)).not.toBe(networkBindingKey(base));
  expect(executionScopeKey(configured, '0x7')).toBe(executionScopeKey(base, '0x7'));
  expect(() => validateNetworkProfile({ ...profileFixture(), faucetUrl: 'https://user:secret@faucet.example' })).toThrow();
});
