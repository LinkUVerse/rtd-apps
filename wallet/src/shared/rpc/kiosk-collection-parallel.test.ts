// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, describe, expect, it, vi } from "vitest";
import { GraphQLSnapshot } from "./graphql-snapshot";
import { WalletAssetReader } from "./asset-reader";
import { KIOSK_COLLECTION_TIMEOUT_MS } from "./kiosk-read-budget";

const reads = vi.hoisted(() => ({ native: vi.fn(), origin: vi.fn() }));
vi.mock("./kiosk-reader", async (original) => ({
  ...(await original<typeof import("./kiosk-reader")>()),
  readNativeKiosks: reads.native,
}));
vi.mock("./originbyte-kiosk", async (original) => ({
  ...(await original<typeof import("./originbyte-kiosk")>()),
  readOriginByteKiosks: reads.origin,
}));

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

async function fixture(mode = "both") {
  reads.native.mockReset(); reads.origin.mockReset();
  const proof = Object.freeze({ checkpoint: "524022", digest: "fixed-S" });
  const revalidate = vi.fn(async (signal: AbortSignal) => signal.throwIfAborted());
  const snapshot = {
    proof, revalidate,
    session: { profile: { packages: {
      ...(mode === "both" || mode === "native" ? { kiosk: "0x2" } : {}),
      ...(mode === "both" || mode === "origin" ? { originByte: {} } : {}),
    } } },
  };
  vi.spyOn(GraphQLSnapshot, "open").mockResolvedValue(snapshot as never);
  const reader = await WalletAssetReader.open(snapshot.session as never);
  const native = { snapshot: proof, value: [{ kioskId: "native", kind: "framework" }] };
  const origin = { snapshot: proof, value: [{ kioskId: "origin", kind: "originbyte" }] };
  reads.native.mockResolvedValue(native); reads.origin.mockResolvedValue(origin);
  return { reader, proof, revalidate, native, origin };
}

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("complete Kiosk collection concurrency and operation cancellation", () => {
  it("starts both complete branches before either settles, preserving native-first order", async () => {
    const f = await fixture(), first = deferred<typeof f.native>(), second = deferred<typeof f.origin>();
    reads.native.mockReturnValue(first.promise); reads.origin.mockReturnValue(second.promise);
    const operation = f.reader.kiosks("0xb"); let delivered = false;
    void operation.then(() => { delivered = true; });
    try {
      await Promise.resolve();
      expect(reads.native).toHaveBeenCalledTimes(1);
      expect(reads.origin).toHaveBeenCalledTimes(1);
      expect(reads.native.mock.calls[0][0]).toBe(f.reader);
      expect(reads.origin.mock.calls[0][0]).toBe(f.reader);
      expect(reads.native.mock.calls[0][2]).toBe(reads.origin.mock.calls[0][2]);
      second.resolve(f.origin); await Promise.resolve();
      expect(delivered).toBe(false); expect(f.revalidate).not.toHaveBeenCalled();
    } finally { first.resolve(f.native); second.resolve(f.origin); }
    const result = await operation;
    expect(result.snapshot).toBe(f.proof);
    expect(result.value.map(k => k.kioskId)).toEqual(["native", "origin"]);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(f.revalidate).toHaveBeenCalledTimes(1);
    expect(reads.native.mock.calls[0][2].aborted).toBe(true);
  });

  it.each(["native", "origin"] as const)("%s failure aborts the other branch without a partial result", async failure => {
    const f = await fixture(), error = new Error("branch failed"), sibling = deferred<never>();
    reads[failure].mockRejectedValue(error);
    const other = failure === "native" ? "origin" : "native";
    reads[other].mockImplementation((_reader, _owner, signal: AbortSignal) => {
      signal.addEventListener("abort", () => sibling.reject(new Error("operation cancelled")), { once: true });
      return sibling.promise;
    });
    await expect(f.reader.kiosks("0xb")).rejects.toBe(error);
    expect(reads[other].mock.calls[0][2].aborted).toBe(true);
    expect(f.revalidate).not.toHaveBeenCalled();
  });

  it("caller cancellation reaches both operation branches", async () => {
    const f = await fixture(), controller = new AbortController();
    for (const read of [reads.native, reads.origin]) read.mockImplementation((_r, _o, signal: AbortSignal) =>
      new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true })));
    const operation = f.reader.kiosks("0xb", controller.signal);
    controller.abort(new Error("caller cancelled"));
    await expect(operation).rejects.toThrow("caller cancelled");
    expect(reads.native.mock.calls[0][2].aborted).toBe(true);
    expect(reads.origin.mock.calls[0][2].aborted).toBe(true);
    expect(f.revalidate).not.toHaveBeenCalled();
  });

  it("keeps the existing 60 second timeout and cancels both branches", async () => {
    const f = await fixture(), timer = vi.spyOn(AbortSignal, "timeout"), deadline = new AbortController();
    timer.mockReturnValue(deadline.signal);
    for (const read of [reads.native, reads.origin]) read.mockImplementation((_r, _o, signal: AbortSignal) =>
      new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true })));
    const operation = f.reader.kiosks("0xb");
    expect(timer).toHaveBeenCalledWith(KIOSK_COLLECTION_TIMEOUT_MS);
    expect(KIOSK_COLLECTION_TIMEOUT_MS).toBe(60_000);
    deadline.abort(new DOMException("deadline", "TimeoutError"));
    await expect(operation).rejects.toMatchObject({ name: "TimeoutError" });
    expect(reads.native.mock.calls[0][2].aborted).toBe(true);
    expect(reads.origin.mock.calls[0][2].aborted).toBe(true);
  });

  it("rejects duplicate IDs before final revalidation", async () => {
    const f = await fixture(); reads.origin.mockResolvedValue({ snapshot: f.proof, value: f.native.value });
    await expect(f.reader.kiosks("0xb")).rejects.toThrow();
    expect(f.revalidate).not.toHaveBeenCalled();
    expect(reads.native.mock.calls[0][2].aborted).toBe(true);
  });

  it("does not deliver results when final snapshot revalidation fails", async () => {
    const f = await fixture(), error = new Error("snapshot changed"); f.revalidate.mockRejectedValue(error);
    await expect(f.reader.kiosks("0xb")).rejects.toBe(error);
    expect(reads.native.mock.calls[0][2].aborted).toBe(true);
    expect(reads.origin.mock.calls[0][2].aborted).toBe(true);
  });

  it.each(["native", "origin"])("keeps the configured %s-only route", async mode => {
    const f = await fixture(mode), result = await f.reader.kiosks("0xb");
    expect(result.value).toEqual(mode === "native" ? f.native.value : f.origin.value);
    expect(reads.native).toHaveBeenCalledTimes(mode === "native" ? 1 : 0);
    expect(reads.origin).toHaveBeenCalledTimes(mode === "origin" ? 1 : 0);
    expect(f.revalidate).toHaveBeenCalledTimes(1);
  });

  it("an unconfigured or already cancelled operation issues no reads", async () => {
    const f = await fixture("none");
    await expect(f.reader.kiosks("0xb")).rejects.toThrow("未配置");
    expect(reads.native).not.toHaveBeenCalled(); expect(reads.origin).not.toHaveBeenCalled();
    const controller = new AbortController(); controller.abort();
    await expect(f.reader.kiosks("0xb", controller.signal)).rejects.toThrow();
    expect(reads.native).not.toHaveBeenCalled(); expect(reads.origin).not.toHaveBeenCalled();
  });
});
