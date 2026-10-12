// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { API_ENV } from "../api-env";
import { profileFixture } from "./profile-fixture";
import { selectBuiltinProfile, selectNetworkProfile } from "./profile-registry";

describe("内置 NetworkProfile 显式配置", () => {
  it.each([undefined, "", "{}", '{"mainnet":null}'])(
    "空/无效配置 %s 不推导旧 URL",
    (source) => {
      expect(selectBuiltinProfile(API_ENV.local, source).state).toBe(
        "unconfigured",
      );
    },
  );
  it.each(["[]", "null", "malformed", '{"local":null}'])(
    "异常配置 %s 有明确错误状态",
    (source) => {
      expect(selectBuiltinProfile(API_ENV.local, source).state).toBe("invalid");
    },
  );
  it("只绑定当前网络的显式 v2，冻结规范化，不使用 SDK 默认 Sui URL", () => {
    const selected = selectBuiltinProfile(
      API_ENV.local,
      JSON.stringify({ local: profileFixture() }),
    );
    expect(selected.state).toBe("configured");
    if (selected.state !== "configured") throw new Error("expected configured");
    expect(selected.profile.endpoints.fullnodeGrpcWeb).toBe(
      "http://127.0.0.1:9000/fullnode",
    );
    expect(Object.isFrozen(selected.profile)).toBe(true);
  });
  it("legacy customRPC 即使传入完整 registry 也不能偷偷改绑定", () => {
    expect(
      selectBuiltinProfile(
        API_ENV.customRPC,
        JSON.stringify({ customRPC: profileFixture() }),
      ).state,
    ).toBe("unconfigured");
  });
});

it.each(['graphqlUrl', 'archiveGrpcWeb', 'accountHistoryUrl'] as const)(
  'built-in profile missing %s cannot silently become Fullnode-only', (field) => {
    const profile = profileFixture();
    delete profile.endpoints[field];
    expect(selectBuiltinProfile(API_ENV.local, JSON.stringify({ local: profile })).state).toBe('invalid');
  },
);

it('custom profile selection reads the saved v2 and legacy URL stays unconfigured', () => {
  expect(selectNetworkProfile({ env: API_ENV.customRPC, customRpcUrl: 'http://legacy' }, undefined).state).toBe('unconfigured');
  const selected = selectNetworkProfile({ env: API_ENV.customRPC, customRpcUrl: 'http://legacy', profile: profileFixture() }, undefined);
  expect(selected.state).toBe('configured');
  if (selected.state === 'configured') expect(selected.profile.endpoints.fullnodeGrpcWeb).toBe('http://127.0.0.1:9000/fullnode');
});
