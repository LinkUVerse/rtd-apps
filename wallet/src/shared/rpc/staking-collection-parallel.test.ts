// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeRtdAddress as address } from "rtd-typescript/utils";
import { stakingFixture } from "../../../tests/unit/rpc/staking-fixture";
import { WalletAssetReader } from "./asset-reader";
import { WalletStakingSnapshotReader } from "./staking-snapshot-reader";

function controlledClock() {
  vi.useFakeTimers();
  return vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
    const controller = new AbortController();
    setTimeout(
      () => controller.abort(new DOMException("deadline", "TimeoutError")),
      ms,
    );
    return controller.signal;
  });
}

function delayedFetch(
  f: ReturnType<typeof stakingFixture>,
  delay: number,
): typeof fetch {
  return async (input, init) => {
    await new Promise<void>((resolve, reject) => {
      const signal = init?.signal;
      signal?.throwIfAborted();
      const abort = () => {
        clearTimeout(timer);
        reject(signal?.reason);
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", abort);
        resolve();
      }, delay);
      signal?.addEventListener("abort", abort, { once: true });
    });
    return f.fetch(input, init);
  };
}

async function settleWithinDeadline<T>(operation: Promise<T>) {
  let value: T | undefined, error: unknown, settledAt: number | undefined;
  const startedAt = Date.now();
  void operation.then(
    (result) => {
      value = result;
      settledAt = Date.now() - startedAt;
    },
    (failure) => {
      error = failure;
      settledAt = Date.now() - startedAt;
    },
  );
  await vi.advanceTimersByTimeAsync(20_000);
  return { value, error, settledAt };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe.each([
  ["asset", WalletAssetReader],
  ["snapshot", WalletStakingSnapshotReader],
] as const)(
  "%s complete staking with independent slow collections",
  (_name, Reader) => {
    it("completes all tables and positions within the unchanged 20 second budget at 1500 ms per leaf", async () => {
      const f = stakingFixture();
      controlledClock();
      const open = Reader.open(f.session, { fetch: delayedFetch(f, 1500) });
      // Two 1500ms responses plus the pending-only dispatch tasks. Fake timers
      // place a nested zero-delay timer at the next millisecond.
      await vi.advanceTimersByTimeAsync(3010);
      const reader = await open;
      const result = await settleWithinDeadline(reader.staking(f.owner));
      expect(result.error).toBeUndefined();
      expect(result.value?.value.validators).toHaveLength(2);
      expect(result.value?.value.positions).toHaveLength(3);
      expect(result.value?.value.positions?.[0].reward).toMatchObject({
        amount: "4503599627370497",
      });
      expect(result.settledAt).toBeLessThan(20_000);
      expect(
        f.requests.filter((request) =>
          request.query.includes("dynamicFields(first:"),
        ),
      ).toHaveLength(3);
    });
  },
);

it("the snapshot-reader entry includes admission in its original total 20 second budget", async () => {
  const f = stakingFixture();
  const deadlines = controlledClock();
  vi.stubGlobal("fetch", delayedFetch(f, 1500));
  try {
    const result = await settleWithinDeadline(
      WalletStakingSnapshotReader.read(f.session, f.owner),
    );
    expect(result.error).toBeUndefined();
    expect(result.value?.value.positions).toHaveLength(3);
    expect(result.settledAt).toBeLessThan(20_000);
    expect(deadlines.mock.calls.filter(([ms]) => ms === 20_000)).toHaveLength(
      2,
    );
  } finally {
    vi.unstubAllGlobals();
  }
});

function manyValidators() {
  const f = stakingFixture();
  for (let index = 1; index < 8; index++) {
    const value: typeof f.validator = JSON.parse(JSON.stringify(f.validator));
    value.metadata.rtd_address = address(`0x${(0xb000 + index).toString(16)}`);
    value.metadata.name = `Validator ${index}`;
    value.staking_pool.id = address(`0x${(0xc000 + index).toString(16)}`);
    value.staking_pool.exchange_rates.id = address(
      `0x${(0xd000 + index).toString(16)}`,
    );
    f.system.validators.active_validators.push(value);
  }
  return f;
}

type Reader = WalletAssetReader | WalletStakingSnapshotReader;
function holdCollections(reader: Reader, ignoreAbort = false) {
  const waiting = new Map<
    string,
    {
      signal: AbortSignal;
      release: () => void;
      fail: (error: Error) => void;
    }
  >();
  const started: string[] = [];
  let active = 0,
    peak = 0;
  async function hold<T>(
    key: string,
    signal: AbortSignal,
    run: () => Promise<T>,
  ) {
    started.push(key);
    active++;
    peak = Math.max(peak, active);
    try {
      await new Promise<void>((release, fail) => {
        const abort = () => fail(signal.reason);
        if (!ignoreAbort)
          signal.addEventListener("abort", abort, { once: true });
        waiting.set(key, {
          signal,
          release: () => {
            signal.removeEventListener("abort", abort);
            release();
          },
          fail: (error) => {
            signal.removeEventListener("abort", abort);
            fail(error);
          },
        });
      });
      return await run();
    } finally {
      active--;
    }
  }
  const fields = reader.dynamicFields.bind(reader);
  vi.spyOn(reader, "dynamicFields").mockImplementation(
    (...args: Parameters<Reader["dynamicFields"]>) => {
      const [parent, signal] = args;
      return parent === address("0xe")
        ? fields(parent, signal)
        : hold(parent, signal!, () => fields(parent, signal));
    },
  );
  const objects = reader.ownedObjects.bind(reader);
  vi.spyOn(reader, "ownedObjects").mockImplementation(
    (...args: Parameters<Reader["ownedObjects"]>) => {
      const [owner, options] = args;
      return hold("owned", options!.signal!, () => objects(owner, options));
    },
  );
  return { waiting, started, peak: () => peak };
}

describe.each([
  ["asset", WalletAssetReader],
  ["snapshot", WalletStakingSnapshotReader],
] as const)("%s complete staking queue and cancellation", (_name, Reader) => {
  it("bounds complete collection tasks at four and keeps original order when tasks settle out of order", async () => {
    const f = manyValidators(),
      reader = await Reader.open(f.session, { fetch: f.fetch });
    const held = holdCollections(reader);
    const operation = reader.staking(f.owner);
    let delivered = false;
    void operation.then(() => {
      delivered = true;
    });
    await vi.waitFor(() => expect(held.started).toHaveLength(4));
    expect(held.peak()).toBe(4);
    const signal = held.waiting.values().next().value!.signal;
    try {
      held.waiting.get(held.started[3])!.release();
      await vi.waitFor(() => expect(held.started).toHaveLength(5));
      expect(delivered).toBe(false);
      // Later tables finish first, but the portfolio still follows chain/owner order.
      for (let round = 0; round < 10 && !delivered; round++) {
        for (const entry of held.waiting.values()) entry.release();
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      const result = await operation;
      expect(held.started).toHaveLength(10); // Eight active, one inactive, one owner collection.
      expect(held.peak()).toBe(4);
      expect(result.value.validators.map((value) => value.address)).toEqual([
        ...f.system.validators.active_validators.map(
          (value) => value.metadata.rtd_address,
        ),
        f.inactive.metadata.rtd_address,
      ]);
      expect(result.value.positions?.map((value) => value.objectId)).toEqual(
        f.stakes.map((value) => value.id),
      );
      expect(result.value.positions?.[0].reward).toMatchObject({
        amount: "4503599627370497",
      });
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(
        [...held.waiting.values()].every((value) => value.signal === signal),
      ).toBe(true);
      expect(signal.aborted).toBe(true);
      expect(f.session.signal.aborted).toBe(false);
      // Ending this combination must leave other reads on the same session usable.
      await reader.snapshot.revalidate();
    } finally {
      for (const entry of held.waiting.values()) entry.release();
      f.session.close();
    }
  });

  it("a collection failure immediately aborts siblings and prevents queued collections from starting", async () => {
    const f = manyValidators(),
      reader = await Reader.open(f.session, { fetch: f.fetch });
    const held = holdCollections(reader),
      failure = new Error("complete rate collection failed");
    const operation = reader.staking(f.owner);
    const rejected = expect(operation).rejects.toBe(failure);
    await vi.waitFor(() => expect(held.started).toHaveLength(4));
    const revalidate = vi.spyOn(reader.snapshot, "revalidate");
    held.waiting.get(held.started[1])!.fail(failure);
    await rejected;
    await Promise.resolve();
    expect(held.started).toHaveLength(4);
    expect(
      [...held.waiting.values()].every(
        (value) => value.signal.aborted && value.signal.reason === failure,
      ),
    ).toBe(true);
    expect(revalidate).not.toHaveBeenCalled();
    expect(f.session.signal.aborted).toBe(false);
    f.session.close();
  });

  it.each(["caller", "session"] as const)(
    "%s cancellation reaches all active collections and starts none of the queued ones",
    async (source) => {
      const f = manyValidators(),
        reader = await Reader.open(f.session, { fetch: f.fetch });
      const held = holdCollections(reader),
        caller = new AbortController();
      const operation = reader.staking(f.owner, caller.signal);
      const rejected = expect(operation).rejects.toThrow();
      await vi.waitFor(() => expect(held.started).toHaveLength(4));
      if (source === "caller") caller.abort(new Error("caller cancelled"));
      else f.session.close();
      // Session cancellation is checked by each actual reader. Release the controlled
      // pre-transport gate so these checks see the closed session without waiting for I/O.
      if (source === "session")
        for (const entry of held.waiting.values()) entry.release();
      await rejected;
      expect(held.started).toHaveLength(4);
      expect(
        [...held.waiting.values()].every((value) => value.signal.aborted),
      ).toBe(true);
      f.session.close();
    },
  );

  it("keeps the original 20 second timeout, aborts active collections and stops the queue", async () => {
    const f = manyValidators(),
      reader = await Reader.open(f.session, { fetch: f.fetch });
    const held = holdCollections(reader),
      deadline = new AbortController();
    const timer = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(deadline.signal);
    const operation = reader.staking(f.owner);
    const rejected = expect(operation).rejects.toMatchObject({
      name: "TimeoutError",
    });
    await vi.waitFor(() => expect(held.started).toHaveLength(4));
    expect(timer).toHaveBeenCalledWith(20_000);
    deadline.abort(new DOMException("deadline", "TimeoutError"));
    await rejected;
    expect(held.started).toHaveLength(4);
    expect(
      [...held.waiting.values()].every((value) => value.signal.aborted),
    ).toBe(true);
    f.session.close();
  });

  it("late transport gates cannot deliver a result or start queued work after caller cancellation", async () => {
    const f = manyValidators(),
      reader = await Reader.open(f.session, { fetch: f.fetch });
    const held = holdCollections(reader, true),
      caller = new AbortController();
    const operation = reader.staking(f.owner, caller.signal);
    const rejected = expect(operation).rejects.toThrow("caller cancelled");
    await vi.waitFor(() => expect(held.started).toHaveLength(4));
    caller.abort(new Error("caller cancelled"));
    for (const entry of held.waiting.values()) entry.release();
    await rejected;
    expect(held.started).toHaveLength(4);
    f.session.close();
  });

  it.each([
    "duplicate-address",
    "declared-total",
    "future-activation",
  ] as const)(
    "invalid %s is rejected before scheduling rates or owner reads",
    async (failure) => {
      const f = manyValidators();
      if (failure === "duplicate-address")
        f.system.validators.active_validators[1].metadata.rtd_address =
          f.validator.metadata.rtd_address;
      if (failure === "declared-total")
        for (const value of f.system.validators.active_validators)
          value.staking_pool.exchange_rates.size = "1500";
      if (failure === "future-activation")
        f.validator.staking_pool.activation_epoch = "3";
      const reader = await Reader.open(f.session, { fetch: f.fetch });
      await expect(reader.staking(f.owner)).rejects.toThrow();
      expect(
        f.requests.filter(
          (request) =>
            request.query.includes("dynamicFields(first:") &&
            request.variables.parent !== address("0xe"),
        ),
      ).toHaveLength(0);
      expect(
        f.requests.some((request) => request.query.includes("objects(first:")),
      ).toBe(false);
      f.session.close();
    },
  );

  it("final snapshot revalidation remains mandatory after all independent collections complete", async () => {
    const f = stakingFixture(),
      reader = await Reader.open(f.session, { fetch: f.fetch });
    let collections = 0;
    const fields = reader.dynamicFields.bind(reader),
      owned = reader.ownedObjects.bind(reader);
    vi.spyOn(reader, "dynamicFields").mockImplementation(
      async (...args: Parameters<Reader["dynamicFields"]>) => {
        const [parent, signal] = args;
        const result = await fields(parent, signal);
        if (parent !== address("0xe")) collections++;
        return result;
      },
    );
    vi.spyOn(reader, "ownedObjects").mockImplementation(
      async (...args: Parameters<Reader["ownedObjects"]>) => {
        const [owner, options] = args;
        const result = await owned(owner, options);
        collections++;
        return result;
      },
    );
    const finalFailure = new Error("final checkpoint changed"),
      revalidate = reader.snapshot.revalidate.bind(reader.snapshot);
    vi.spyOn(reader.snapshot, "revalidate").mockImplementation((signal) => {
      if (collections === 3) throw finalFailure;
      return revalidate(signal);
    });
    await expect(reader.staking(f.owner)).rejects.toBe(finalFailure);
    expect(collections).toBe(3);
    f.session.close();
  });
});
