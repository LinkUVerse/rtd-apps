// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeStructTag } from "rtd-typescript/utils";
import { snapshotFixture } from "../../../tests/unit/rpc/fixtures";
import { WalletAssetReader } from "./asset-reader";
import {
  COIN_METADATA_COVERAGE,
  WalletCoinMetadataReader,
} from "./coin-metadata-reader";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
const metadata = () => ({
  address: "0xc",
  decimals: 9,
  name: "RTD",
  symbol: "RTD",
  description: "",
  iconUrl: null,
});

describe("independently admitted metadata using actual SDK and three SDLs", () => {
  it.each([null, 0, 255])(
    "accepts explicit absence / decimals %s after final validation without Display",
    async (decimals) => {
      const f = snapshotFixture({
        read: () => ({
          coinMetadata: decimals === null ? null : { ...metadata(), decimals },
        }),
        alter: (body, request) =>
          request.query.includes("walletDisplayService")
            ? { ...body, errors: [{ message: "Display uncovered" }] }
            : body,
      });
      vi.stubGlobal("fetch", f.fetch);
      await expect(WalletAssetReader.open(f.session)).rejects.toThrow();
      f.requests.length = 0;
      const result = await WalletCoinMetadataReader.read(
        f.session,
        "0x2::rtd::RTD",
      );
      expect(result.value?.decimals ?? null).toBe(decimals);
      expect(result.snapshot.displayHistory).toBeUndefined();
      expect(
        new Set(
          result.snapshot.dependencies.map((r) => `${r.type}.${r.field}`),
        ),
      ).toEqual(
        new Set(COIN_METADATA_COVERAGE.map((r) => `${r.type}.${r.field}`)),
      );
      expect(f.requests).toHaveLength(4);
      expect(f.requests.at(-1)?.query).toContain("WalletSnapshotRevalidate");
      expect(
        f.requests.every((r) => !r.query.includes("walletDisplayService")),
      ).toBe(true);
      expect(
        f.requests.find((r) => r.query.includes("coinMetadata(coinType:"))
          ?.variables.type,
      ).toBe(normalizeStructTag("0x2::rtd::RTD"));
      expect(Object.isFrozen(result)).toBe(true);
      if (result.value) expect(Object.isFrozen(result.value)).toBe(true);
    },
  );

  it.each([
    "missing",
    "decimals-string",
    "decimals-negative",
    "decimals-fraction",
    "decimals-overflow",
    "name",
    "symbol",
    "description",
    "icon",
    "id",
  ])("refuses malformed %s before final success", async (fault) => {
    const row: Record<string, unknown> = metadata();
    if (fault === "missing") delete row.decimals;
    if (fault === "decimals-string") row.decimals = "9";
    if (fault === "decimals-negative") row.decimals = -1;
    if (fault === "decimals-fraction") row.decimals = 1.5;
    if (fault === "decimals-overflow") row.decimals = 256;
    if (["name", "symbol", "description"].includes(fault)) row[fault] = null;
    if (fault === "icon") delete row.iconUrl;
    if (fault === "id") row.address = "bad-id";
    const f = snapshotFixture({ read: () => ({ coinMetadata: row }) });
    vi.stubGlobal("fetch", f.fetch);
    await expect(
      WalletCoinMetadataReader.read(f.session, "0x2::rtd::RTD"),
    ).rejects.toThrow();
    expect(f.requests.at(-1)?.query).toContain("WalletSnapshotRead");
  });

  it.each([
    "missing-field",
    "partial",
    "wrong-chain",
    "missing-range",
    "final-range",
    "final-digest",
    "final-partial",
  ])("refuses %s and never returns metadata", async (fault) => {
    const f = snapshotFixture({
      read: () =>
        fault === "missing-field" ? {} : { coinMetadata: metadata() },
      alter: (body, request) => {
        const data = body.data as Record<string, any>;
        if (fault === "wrong-chain")
          data.walletGenesis.digest = "11111111111111111111111111111111";
        if (fault === "missing-range") delete data.serviceConfig.range1;
        if (fault === "partial" && request.query.includes("WalletSnapshotRead"))
          return { ...body, errors: [{ message: "partial" }] };
        if (request.query.includes("WalletSnapshotRevalidate")) {
          if (fault === "final-range")
            data.serviceConfig.range1.last.sequenceNumber = 9;
          if (fault === "final-digest")
            data.walletSnapshot.digest = "11111111111111111111111111111111";
          if (fault === "final-partial")
            return { ...body, errors: [{ message: "late partial" }] };
        }
        return body;
      },
    });
    vi.stubGlobal("fetch", f.fetch);
    await expect(
      WalletCoinMetadataReader.read(f.session, "0x2::rtd::RTD"),
    ).rejects.toThrow();
  });

  it("rejects invalid type, cancellation and closed session before transport", async () => {
    const f = snapshotFixture();
    vi.stubGlobal("fetch", f.fetch);
    for (const type of ["", " ", "bad", "@0x2::rtd::RTD"])
      await expect(
        WalletCoinMetadataReader.read(f.session, type),
      ).rejects.toThrow();
    await expect(
      WalletCoinMetadataReader.read(
        f.session,
        "0x2::rtd::RTD",
        AbortSignal.abort(),
      ),
    ).rejects.toThrow();
    f.session.close();
    await expect(
      WalletCoinMetadataReader.read(f.session, "0x2::rtd::RTD"),
    ).rejects.toThrow();
    expect(f.requests).toHaveLength(0);
  });

  it("uses a single 20 second deadline from admission through revalidation", async () => {
    const f = snapshotFixture({ read: () => ({ coinMetadata: metadata() }) });
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
    const outcome = WalletCoinMetadataReader.read(
      f.session,
      "0x2::rtd::RTD",
    ).then(
      () => null,
      (error) => error,
    );
    await vi.advanceTimersByTimeAsync(19_999);
    expect(finished).toBe(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(await outcome).toBeInstanceOf(Error);
  });
});
