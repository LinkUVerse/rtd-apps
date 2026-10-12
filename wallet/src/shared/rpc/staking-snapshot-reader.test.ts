// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, describe, expect, it, vi } from "vitest";
import { stakingFixture } from "../../../tests/unit/rpc/staking-fixture";
import { WalletAssetReader } from "./asset-reader";
import {
  STAKING_COVERAGE,
  WalletStakingSnapshotReader,
} from "./staking-snapshot-reader";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("independent BCS staking domain admission", () => {
  it("validates the complete private portfolio once after every nested collection", async () => {
    const f = stakingFixture();
    vi.stubGlobal("fetch", f.fetch);
    const result = await WalletStakingSnapshotReader.read(f.session, f.owner);
    expect(result.value.positions).toHaveLength(3);
    expect(result.value.validators).toHaveLength(2);
    expect(f.requests.filter((r) => r.query.includes("WalletSnapshotRevalidate"))).toHaveLength(1);
    expect(f.requests.at(-1)?.query).toContain("WalletSnapshotRevalidate");
  });

  it.each(["coverage", "genesis", "partial", "cancel"] as const)(
    "never returns tentative composite data when final validation fails: %s",
    async (fault) => {
      const f = stakingFixture(), controller = new AbortController();
      vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = JSON.parse(String(init?.body));
        const body = await (await f.fetch(input, init)).json();
        if (request.query.includes("WalletSnapshotRevalidate")) {
          if (fault === "coverage") body.data.serviceConfig.range5.last.sequenceNumber = 9;
          if (fault === "genesis") body.data.walletGenesis.digest = "11111111111111111111111111111111";
          if (fault === "partial") body.errors = [{ message: "late failure" }];
          if (fault === "cancel") controller.abort();
        }
        return Response.json(body);
      });
      await expect(WalletStakingSnapshotReader.read(f.session, f.owner, controller.signal)).rejects.toThrow();
      expect(f.requests.some((r) => r.query.includes("objects(first:"))).toBe(true);
      expect(f.requests.at(-1)?.query).toContain("WalletSnapshotRevalidate");
    },
  );

  it("reads a complete portfolio without Display; full assets still reject missing Display capability", async () => {
    const f = stakingFixture();
    const fetch: typeof globalThis.fetch = async (input, init) => {
      const body = await (await f.fetch(input, init)).json();
      if (body.data.walletDisplayService) body.data.walletDisplayService = null;
      if (body.data.walletSnapshot?.query?.walletDisplayService)
        body.data.walletSnapshot.query.walletDisplayService = null;
      return Response.json(body);
    };
    await expect(
      WalletAssetReader.open(f.session, { fetch }),
    ).rejects.toThrow();
    f.requests.length = 0;
    const reader = await WalletStakingSnapshotReader.open(f.session, { fetch });
    const result = await reader.staking(f.owner);
    expect(result.value.positions).toHaveLength(3);
    expect(result.snapshot).toBe(reader.proof);
    expect(result.snapshot.displayHistory).toBeUndefined();
    expect(result.snapshot.dependencies).toHaveLength(6);
    expect(
      new Set(result.snapshot.dependencies.map((x) => `${x.type}.${x.field}`)),
    ).toEqual(new Set(STAKING_COVERAGE.map((x) => `${x.type}.${x.field}`)));
    expect(f.requests.at(-1)?.query).toContain("WalletSnapshotRevalidate");
    expect(
      f.requests.every(
        (request) =>
          !/\bdisplay\b|\bbasis\b|\bjson\b|hasPublicTransfer|walletDisplayService/.test(
            request.query,
          ),
      ),
    ).toBe(true);
    const objects = await reader.ownedObjects(f.owner, {
      type: "0x3::staking_pool::StakedRtd",
    });
    expect(objects.value[0]).not.toHaveProperty("display");
    expect(objects.value[0]).not.toHaveProperty("hasPublicTransfer");
  });

  it.each(["genesis", "missing-range", "final-range", "partial-last"] as const)(
    "refuses %s without returning a domain view",
    async (fault) => {
      const f = stakingFixture();
      let positionsRead = false;
      const fetch: typeof globalThis.fetch = async (input, init) => {
        const request = JSON.parse(String(init?.body));
        const body = await (await f.fetch(input, init)).json();
        if (fault === "genesis")
          body.data.walletGenesis.digest = "11111111111111111111111111111111";
        if (fault === "missing-range") delete body.data.serviceConfig.range5;
        if (request.query.includes("objects(first:")) positionsRead = true;
        if (
          positionsRead &&
          request.query.includes("WalletSnapshotRevalidate")
        ) {
          if (fault === "final-range")
            body.data.serviceConfig.range5.last.sequenceNumber = 9;
          if (fault === "partial-last")
            body.errors = [{ message: "late partial" }];
        }
        return Response.json(body);
      };
      await expect(
        (async () =>
          (
            await WalletStakingSnapshotReader.open(f.session, { fetch })
          ).staking(f.owner))(),
      ).rejects.toThrow();
    },
  );

  it.each(["", "  ", "@0x3::staking_pool::StakedRtd", "nonsense"])(
    "refuses invalid type %j before reading owned objects",
    async (type) => {
      const f = stakingFixture(),
        reader = await WalletStakingSnapshotReader.open(f.session, {
          fetch: f.fetch,
        });
      const before = f.requests.length;
      await expect(reader.ownedObjects(f.owner, { type })).rejects.toThrow();
      expect(f.requests).toHaveLength(before);
    },
  );

  it("validates owner and cancelled caller before making a transport request", async () => {
    const f = stakingFixture();
    vi.stubGlobal("fetch", f.fetch);
    await expect(
      WalletStakingSnapshotReader.read(f.session, "bad-owner"),
    ).rejects.toThrow();
    await expect(
      WalletStakingSnapshotReader.read(f.session, f.owner, AbortSignal.abort()),
    ).rejects.toThrow();
    expect(f.requests).toHaveLength(0);
  });

  it("one 20 second deadline covers admission as well as portfolio reads", async () => {
    const f = stakingFixture();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    // Native timeout is deliberately replaced only in this test to inspect the joined signal.
    vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
      const controller = new AbortController();
      setTimeout(
        () => controller.abort(new DOMException("expired", "TimeoutError")),
        ms,
      );
      return controller.signal;
    });
    let observed: AbortSignal | undefined;
    let finished = 0;
    vi.stubGlobal(
      "fetch",
      async (input: RequestInfo | URL, init?: RequestInit) => {
        observed = init?.signal ?? undefined;
        const response = await f.fetch(input, init);
        return new Promise<Response>((resolve, reject) => {
          const signal = observed!;
          const timer = setTimeout(() => {
            finished++;
            resolve(response);
          }, 7_000);
          signal.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              reject(signal.reason);
            },
            { once: true },
          );
        });
      },
    );
    const outcome = WalletStakingSnapshotReader.read(f.session, f.owner).then(
      () => ({ error: undefined }),
      (error) => ({ error }),
    );
    await vi.advanceTimersByTimeAsync(19_999);
    expect(finished).toBe(2);
    expect(observed?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect((await outcome).error).toBeInstanceOf(Error);
    expect(observed?.aborted).toBe(true);
  });
});
