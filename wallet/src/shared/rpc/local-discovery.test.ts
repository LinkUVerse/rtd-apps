// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { GrpcTypes } from "rtd-typescript/grpc";
import { toBase58 } from "rtd-typescript/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ENV } from "../api-env";
import {
  __resetLocalDiscoveryCache,
  discoverLocalProfile,
  LocalChainDiscoveryError,
  localProfileFor,
  setLocalChainDiscoveryEnabled,
} from "./local-discovery";
import { LOCAL_DEV_ENDPOINTS } from "./local-dev-endpoints";
import { profileFixture } from "./profile-fixture";
import { resolveNetworkProfile, selectBuiltinProfile } from "./profile-registry";

const DIGEST = toBase58(new Uint8Array(32).fill(7));
const OTHER = toBase58(new Uint8Array(32).fill(9));

function frame(payload: Uint8Array, trailer = false) {
  const output = new Uint8Array(5 + payload.length);
  output[0] = trailer ? 128 : 0;
  new DataView(output.buffer).setUint32(1, payload.length, false);
  output.set(payload, 5);
  return output;
}

function grpcInfo(chainId: string) {
  const message = frame(
    GrpcTypes.GetServiceInfoResponse.toBinary({
      chainId,
      checkpointHeight: 100n,
      lowestAvailableCheckpoint: 0n,
      lowestAvailableCheckpointObjects: 0n,
    }),
  );
  const trailer = frame(
    new TextEncoder().encode("grpc-status: 0\r\n"),
    true,
  );
  const output = new Uint8Array(message.length + trailer.length);
  output.set(message);
  output.set(trailer, message.length);
  return new Response(output, {
    headers: { "content-type": "application/grpc-web+proto" },
  });
}

/** The dev stack serves one chain per role; a disagreement models a half-restarted stack. */
function transport(
  options: {
    fullnode?: string;
    archive?: string;
    graphql?: string;
    down?: boolean;
  } = {},
) {
  return vi.fn<typeof fetch>(async (url) => {
    if (options.down) throw new TypeError("Failed to fetch");
    const target = String(url);
    if (target.endsWith("/graphql"))
      return Response.json({
        data: { checkpoint: { digest: options.graphql ?? options.fullnode ?? DIGEST } },
      });
    return grpcInfo(
      target.startsWith(LOCAL_DEV_ENDPOINTS.archiveGrpcWeb)
        ? (options.archive ?? options.fullnode ?? DIGEST)
        : (options.fullnode ?? DIGEST),
    );
  });
}

beforeEach(() => {
  // testSetup disables discovery so the machine's own chain cannot leak in;
  // this suite exercises the production path, so it turns it back on.
  setLocalChainDiscoveryEnabled(true);
  __resetLocalDiscoveryCache();
});

describe("本地开发链运行时发现", () => {
  it("固定回环端口上运行的新链会被发现，无需构建期 H0", async () => {
    const profile = await discoverLocalProfile({
      fetch: transport(),
      now: () => 0,
    });
    expect(profile.expectedGenesisDigest).toBe(DIGEST);
    expect(profile.endpoints.fullnodeGrpcWeb).toBe(
      LOCAL_DEV_ENDPOINTS.fullnodeGrpcWeb,
    );
    expect(profile.walletStandardChain).toBe("rtd:localnet");
    // Package ids belong to one deployment; a fresh chain ships none.
    expect(profile.packages).toEqual({});
  });

  it("每次 reset 得到不同链时绑定键随之改变", () => {
    const first = localProfileFor(DIGEST);
    const second = localProfileFor(OTHER);
    expect(first.generation).not.toBe(second.generation);
    expect(first.expectedGenesisDigest).not.toBe(second.expectedGenesisDigest);
  });

  it("端点分属不同链时拒绝接入", async () => {
    await expect(
      discoverLocalProfile({
        fetch: transport({ fullnode: DIGEST, graphql: OTHER }),
        now: () => 0,
      }),
    ).rejects.toMatchObject({ reason: "disagreement" });
  });

  it("本地链未运行时给出可操作的错误", async () => {
    await expect(
      discoverLocalProfile({ fetch: transport({ down: true }), now: () => 0 }),
    ).rejects.toBeInstanceOf(LocalChainDiscoveryError);
    await expect(
      discoverLocalProfile({ fetch: transport({ down: true }), now: () => 0 }),
    ).rejects.toMatchObject({ reason: "not-running" });
  });

  it("非回环端点不允许运行时发现", async () => {
    await expect(
      discoverLocalProfile({
        fetch: transport(),
        now: () => 0,
        endpoints: {
          ...LOCAL_DEV_ENDPOINTS,
          fullnodeGrpcWeb: "https://example.invalid:43350",
        },
      }),
    ).rejects.toMatchObject({ reason: "incompatible" });
  });

  it("短时间内的重复选择共享一次探测", async () => {
    const fetch = transport();
    const now = () => 1_000;
    await discoverLocalProfile({ fetch, now });
    await discoverLocalProfile({ fetch, now });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("缓存窗口过后重新探测，链已重置则跟随新链", async () => {
    let clock = 0;
    await discoverLocalProfile({ fetch: transport(), now: () => clock });
    clock = 60_000;
    const profile = await discoverLocalProfile({
      fetch: transport({ fullnode: OTHER }),
      now: () => clock,
    });
    expect(profile.expectedGenesisDigest).toBe(OTHER);
  });

  it("已配置的 profile 复核时跳过缓存，立刻看到重置后的新链", async () => {
    const now = () => 1_000;
    await discoverLocalProfile({ fetch: transport(), now });
    // Same clock: a cached answer would still report the old digest.
    const profile = await discoverLocalProfile({
      fetch: transport({ fullnode: OTHER }),
      now,
      fresh: true,
    });
    expect(profile.expectedGenesisDigest).toBe(OTHER);
  });

  it("跳过缓存仍然合并并发的探测，不放大请求", async () => {
    const now = () => 1_000;
    const fetch = transport();
    await Promise.all([
      discoverLocalProfile({ fetch, now, fresh: true }),
      discoverLocalProfile({ fetch, now, fresh: true }),
    ]);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});

describe("本地网络的 profile 选择", () => {
  it("local 优先使用运行中的开发链，而不是构建期固定值", async () => {
    __resetLocalDiscoveryCache();
    const selected = await resolveNetworkProfile(
      { env: API_ENV.local, customRpcUrl: null },
      JSON.stringify({ local: profileFixture() }),
      { fetch: transport(), now: () => 0 },
    );
    expect(selected.state).toBe("configured");
    // The pinned fixture digest differs from the discovered chain on purpose.
    if (selected.state === "configured")
      expect(selected.profile.expectedGenesisDigest).toBe(DIGEST);
  });

  it("本地链不可用时回退到审核过的 local 配置", async () => {
    __resetLocalDiscoveryCache();
    const selected = await resolveNetworkProfile(
      { env: API_ENV.local, customRpcUrl: null },
      JSON.stringify({ local: profileFixture() }),
      { fetch: transport({ down: true }), now: () => 0 },
    );
    expect(selected.state).toBe("configured");
    if (selected.state === "configured")
      expect(selected.profile.expectedGenesisDigest).toBe(
        profileFixture().expectedGenesisDigest,
      );
  });

  it("本地链不可用且无审核配置时给出可操作提示", async () => {
    __resetLocalDiscoveryCache();
    const selected = await resolveNetworkProfile(
      { env: API_ENV.local, customRpcUrl: null },
      undefined,
      { fetch: transport({ down: true }), now: () => 0 },
    );
    expect(selected.state).toBe("unconfigured");
    if (selected.state !== "configured")
      expect(selected.message).toContain("rtd-dev.sh start");
  });

  it("非 local 内置网络仍只接受审核过的 profile", async () => {
    expect(
      (
        await resolveNetworkProfile(
          { env: API_ENV.testNet, customRpcUrl: null },
          JSON.stringify({ testNet: profileFixture() }),
        )
      ).state,
    ).toBe("configured");
    expect(
      (
        await resolveNetworkProfile(
          { env: API_ENV.testNet, customRpcUrl: null },
          undefined,
        )
      ).state,
    ).toBe("unconfigured");
  });

  it("内置选择器本身仍不推导任何旧 URL", () => {
    expect(
      selectBuiltinProfile(API_ENV.local, undefined).state,
    ).toBe("unconfigured");
  });
});
