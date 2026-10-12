// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { expect, it } from "vitest";
import { createCapabilityFetch } from "./capability-fetch";
import { probeNetworkIdentity } from "./identity";
import { networkCapabilitiesFixture } from "./network-capabilities-fixture";

it("finished identity deadlines cannot cancel an ongoing aggregate later", async () => {
  const f = await networkCapabilitiesFixture();
  const signals: AbortSignal[] = [];
  const parent = new AbortController();
  const bounded = createCapabilityFetch(
    f.session,
    parent.signal,
    async (input, init) => {
      if (init?.signal) signals.push(init.signal);
      return f.fetch(input, init);
    },
  );
  try {
    const identity = await probeNetworkIdentity(f.session, {
      fetch: bounded,
      timeoutMs: 100,
    });
    expect(identity.state).toBe("identity-verified");
    expect(signals.length).toBeGreaterThan(0);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(signals.every((signal) => !signal.aborted)).toBe(true);
    expect(() => bounded.assertCompleted()).not.toThrow();
  } finally {
    bounded.dispose();
    f.session.close();
  }
});

it("a real unfinished identity deadline still rejects and cannot complete physical work", async () => {
  const f = await networkCapabilitiesFixture();
  const held = Promise.withResolvers<void>();
  const parent = new AbortController();
  const bounded = createCapabilityFetch(
    f.session,
    parent.signal,
    async (input, init) => {
      await held.promise;
      return f.fetch(input, init);
    },
  );
  try {
    await expect(
      probeNetworkIdentity(f.session, { fetch: bounded, timeoutMs: 40 }),
    ).rejects.toMatchObject({ name: "TimeoutError" });
    expect(() => bounded.assertCompleted()).toThrowError(
      expect.objectContaining({ reason: "budget" }),
    );
  } finally {
    held.resolve();
    bounded.dispose();
    f.session.close();
  }
});

it("external caller cancellation remains observable after identity EOF", async () => {
  const f = await networkCapabilitiesFixture();
  const caller = new AbortController(),
    parent = new AbortController();
  const bounded = createCapabilityFetch(f.session, parent.signal, f.fetch);
  try {
    await probeNetworkIdentity(f.session, {
      fetch: bounded,
      timeoutMs: 100,
      signal: caller.signal,
    });
    caller.abort();
    expect(() => bounded.assertCompleted()).toThrowError(
      expect.objectContaining({ reason: "budget" }),
    );
  } finally {
    bounded.dispose();
    f.session.close();
  }
});
