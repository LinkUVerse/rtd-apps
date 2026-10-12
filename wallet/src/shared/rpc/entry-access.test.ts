// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { GrpcTypes } from "rtd-typescript/grpc";
import { toBase58 } from "rtd-typescript/utils";
import { describe, expect, it, vi } from "vitest";
import { probeEntryAccess } from "./entry-access";
import { WalletReadSession } from "./session";
import { profileFixture } from "./profile-fixture";
import { validateNetworkProfile } from "./profile";
function session() {
  return new WalletReadSession(
    validateNetworkProfile(profileFixture(), { requireComplete: true }),
  );
}
function info(
  chainId = profileFixture().expectedGenesisDigest,
  height: bigint | undefined = 9007199254740993n,
  status = 0,
) {
  const payload = GrpcTypes.GetServiceInfoResponse.toBinary({
    chainId,
    checkpointHeight: height,
  });
  const trailer = new TextEncoder().encode(`grpc-status: ${status}\r\n`);
  const bytes = new Uint8Array(10 + payload.length + trailer.length);
  const view = new DataView(bytes.buffer);
  view.setUint32(1, payload.length, false);
  bytes.set(payload, 5);
  bytes[5 + payload.length] = 128;
  view.setUint32(6 + payload.length, trailer.length, false);
  bytes.set(trailer, 10 + payload.length);
  return new Response(bytes, {
    headers: { "content-type": "application/grpc-web+proto" },
  });
}
describe("profile Fullnode entry probe", () => {
  it("入口探测在共享队列中取消不发请求，也不判为accessible", async () => {
    const s = session();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const active = Array.from({ length: 4 }, () =>
      s.request(s.signal, () => gate),
    );
    const fetch = vi.fn<typeof globalThis.fetch>();
    const controller = new AbortController();
    const pending = probeEntryAccess(s, controller.signal, fetch);
    const error = new Error("cancelled");
    const assertion = expect(pending).rejects.toBe(error);
    controller.abort(error);
    await assertion;
    release();
    await Promise.all(active);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses actual gRPC service info on the selected endpoint and validates full chain id", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async (url, init) => {
      expect(String(url)).toBe(
        "http://127.0.0.1:9000/fullnode/rtd.rpc.v2.LedgerService/GetServiceInfo",
      );
      expect(init).toMatchObject({ redirect: "error", credentials: "omit" });
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return info();
    });
    await expect(
      probeEntryAccess(session(), undefined, fetch),
    ).resolves.toEqual({ state: "accessible", checkpoint: "9007199254740993" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("recognizes only the exact existing HTTP403/1020 policy response", async () => {
    await expect(
      probeEntryAccess(
        session(),
        undefined,
        async () => new Response("error code: 1020", { status: 403 }),
      ),
    ).resolves.toEqual({ state: "restricted" });
  });
  it.each([
    ["forbidden", 403],
    ["error code: 1020\n", 403],
    ["error code: 1020", 503],
    ["x".repeat(2048), 403],
  ] as const)(
    "other status/body is unknown, not a location verdict",
    async (body, status) => {
      await expect(
        probeEntryAccess(
          session(),
          undefined,
          async () => new Response(body, { status }),
        ),
      ).rejects.toThrow();
    },
  );
  it("HTTP200 with nonzero gRPC status is not accessible", async () => {
    await expect(
      probeEntryAccess(session(), undefined, async () =>
        info(undefined, 1n, 7),
      ),
    ).rejects.toThrow();
  });
  it("wrong chain is not accessible", async () => {
    await expect(
      probeEntryAccess(session(), undefined, async () =>
        info(toBase58(new Uint8Array(32).fill(2))),
      ),
    ).rejects.toThrow("不同链");
  });
  it("missing height is incompatible", async () => {
    const response = GrpcTypes.GetServiceInfoResponse.toBinary({
      chainId: profileFixture().expectedGenesisDigest,
    });
    const framed = new Uint8Array(response.length + 5);
    new DataView(framed.buffer).setUint32(1, response.length, false);
    framed.set(response, 5);
    await expect(
      probeEntryAccess(
        session(),
        undefined,
        async () =>
          new Response(framed, {
            headers: {
              "content-type": "application/grpc-web+proto",
              "grpc-status": "0",
            },
          }),
      ),
    ).rejects.toThrow();
  });
  it("cancelled caller and closed session cannot produce late restriction", async () => {
    const s = session();
    let release!: (value: Response) => void;
    const response = new Promise<Response>((r) => (release = r));
    const pending = probeEntryAccess(s, undefined, async () => response);
    s.close();
    release(new Response("error code: 1020", { status: 403 }));
    await expect(pending).rejects.toThrow();
    const cancelled = new AbortController();
    cancelled.abort();
    const fetch = vi.fn();
    await expect(
      probeEntryAccess(session(), cancelled.signal, fetch),
    ).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
});
