// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  WALLET_READ_OPERATIONS,
  type WalletReadOperation,
} from "rtd-apps-core/src/rpc/read-admission";
import {
  WalletReadAdmission,
  guardAssetSnapshot,
  guardWalletRpc,
  admissionQueryAffected,
} from "./read-admission";
import type { WalletAssetSnapshot } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { WalletReadSession } from "./session";
import { validateNetworkProfile } from "./profile";
import { profileFixture } from "./profile-fixture";
import {
  createNetworkAdmissionTicket,
  reserveNetworkAdmissionObservation,
  completeNetworkAdmissionObservation,
  WalletNetworkAdmissionStateError,
  type NetworkAdmissionRecord,
  type NetworkAdmissionFault,
  type NetworkAdmissionArea,
} from "./network-admission-state";

function fixture() {
  const profile = validateNetworkProfile(profileFixture()),
    session = new WalletReadSession(profile);
  let row: NetworkAdmissionRecord | undefined,
    listener: (() => void) | undefined;
  const capture = vi.fn(async () => row),
    unsubscribe = vi.fn();
  const gate = new WalletReadAdmission(session, {
    capture,
    subscribe: (fn) => {
      listener = fn;
      return unsubscribe;
    },
  });
  const add = (fault: NetworkAdmissionFault) => {
    const { reason: _reason, ...area } = fault;
    const ticket = createNetworkAdmissionTicket([area]);
    row = completeNetworkAdmissionObservation(
      profile,
      reserveNetworkAdmissionObservation(profile, row, ticket),
      ticket,
      [fault],
    );
  };
  return {
    profile,
    session,
    gate,
    capture,
    unsubscribe,
    add,
    notify: () => listener?.(),
    get row() {
      return row;
    },
    set row(value) {
      row = value;
    },
  };
}
afterEach(() => vi.useRealTimers());
describe("current read fence, stored negatives and publication", () => {
  it.each(["fullnode", "graphql", "archive", "accountHistory"] as const)(
    "%s identity fault closes all new facts and cannot be cleared by an empty later row",
    async (role) => {
      const f = fixture();
      await f.gate.refresh();
      f.add({ kind: "identity", role, reason: "chain-mismatch" });
      await f.gate.refresh();
      expect(f.session.signal.aborted).toBe(true);
      expect(f.gate.getSnapshot().view.blocked).toEqual(WALLET_READ_OPERATIONS);
      f.row = undefined;
      await f.gate.refresh();
      const io = vi.fn(async () => 1);
      await expect(f.gate.run("balances", io)).rejects.toMatchObject({
        reason: "quarantined",
      });
      expect(io).not.toHaveBeenCalled();
    },
  );
  it.each([
    ["balances", "balances"],
    ["coinMetadata", "coinMetadata"],
    ["staking", "staking"],
    ["assets", "assets"],
    ["names", "names"],
    ["sentTransactions", "sentTransactions"],
    ["eventsByType", "eventsByType"],
    ["eventsByModule", "eventsByModule"],
  ] as const)(
    "%s schema blocks its dependent operation while an independent native balance remains readable",
    async (domain, op) => {
      const f = fixture();
      f.add({ kind: "graphql-domain", domain, reason: "schema" });
      await f.gate.refresh();
      await expect(f.gate.run(op, async () => 1)).rejects.toMatchObject({
        reason: "quarantined",
      });
      await expect(f.gate.run("freshBalance", async () => 2)).resolves.toBe(2);
      expect(f.session.signal.aborted).toBe(false);
      if (domain !== "balances")
        await expect(f.gate.run("balances", async () => 3)).resolves.toBe(3);
    },
  );
  it.each([
    ["display", "assets"],
    ["staking", "staking"],
    ["coins", "assetCoins"],
    ["dynamicFields", "assetDynamicFields"],
    ["kiosk", "assetKiosks"],
    ["personalKiosk", "assetKiosks"],
    ["originByteDiscovery", "assetKiosks"],
    ["names", "names"],
    ["readerSupport", "assets"],
    ["standardLibrary", "staking"],
    ["framework", "assets"],
  ] as const)(
    "%s ABI blocks only its dependent read and does not close independent balances",
    async (group, op) => {
      const f = fixture();
      f.add({ kind: "move-group", group, reason: "abi" });
      await f.gate.refresh();
      await expect(f.gate.run(op, async () => 1)).rejects.toMatchObject({
        reason: "quarantined",
      });
      await expect(f.gate.run("balances", async () => 2)).resolves.toBe(2);
      expect(f.session.signal.aborted).toBe(false);
    },
  );
  it("pending identity withdraws facts without closing the session; only real completion restores reads with new cache keys", async () => {
    const f = fixture();
    await f.gate.refresh();
    const first = f.gate.getSnapshot().view.keys.balances;
    const ticket = createNetworkAdmissionTicket([
      { kind: "identity", role: "accountHistory" },
    ]);
    f.row = reserveNetworkAdmissionObservation(f.profile, undefined, ticket);
    await f.gate.refresh();
    await expect(f.gate.run("balances", async () => 1)).rejects.toMatchObject({
      reason: "reviewing",
    });
    expect(f.session.signal.aborted).toBe(false);
    f.row = completeNetworkAdmissionObservation(f.profile, f.row, ticket, []);
    await f.gate.refresh();
    expect(f.gate.getSnapshot().view.keys.balances).not.toBe(first);
    await expect(f.gate.run("balances", async () => 1)).resolves.toBe(1);
  });
  it("publication reread rejects a fault committed while business IO completes", async () => {
    const f = fixture();
    const publish = vi.fn();
    await expect(
      f.gate
        .run("balances", async () => {
          f.add({ kind: "identity", role: "archive", reason: "incompatible" });
          return 1;
        })
        .then(publish),
    ).rejects.toMatchObject({ reason: "quarantined" });
    expect(publish).not.toHaveBeenCalled();
    expect(f.capture).toHaveBeenCalledTimes(2);
  });
  it("missing/corrupt storage prevents IO and a failed final reread prevents publication", async () => {
    const f = fixture(),
      io = vi.fn(async () => 1),
      publish = vi.fn();
    f.capture.mockRejectedValueOnce(
      new WalletNetworkAdmissionStateError("corrupt"),
    );
    await expect(f.gate.run("balances", io)).rejects.toMatchObject({
      reason: "corrupt",
    });
    expect(io).not.toHaveBeenCalled();
    f.capture
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(
        new WalletNetworkAdmissionStateError("unavailable"),
      );
    await expect(
      f.gate.run("balances", io).then(publish),
    ).rejects.toMatchObject({ reason: "unavailable" });
    expect(io).toHaveBeenCalledOnce();
    expect(publish).not.toHaveBeenCalled();
    expect(f.gate.getSnapshot().view.blocked).toEqual(WALLET_READ_OPERATIONS);
  });
  it("notification never inherits old capture/tickets; native reread is required and late positive cannot restore the view", async () => {
    const f = fixture();
    let release!: () => void;
    f.capture.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve(undefined);
        }),
    );
    const stop = f.gate.start();
    f.add({ kind: "identity", role: "fullnode", reason: "chain-mismatch" });
    f.notify();
    release();
    await vi.waitFor(() =>
      expect(f.gate.getSnapshot().identityFault?.role).toBe("fullnode"),
    );
    expect(f.capture).toHaveBeenCalledTimes(2);
    stop();
    expect(f.unsubscribe).toHaveBeenCalledOnce();
  });
  it("an earlier definite negative is retained even while a newer capture is still pending", async () => {
    const f = fixture();
    f.add({ kind: "identity", role: "archive", reason: "chain-mismatch" });
    const bad = f.row;
    let first!: (v: NetworkAdmissionRecord | undefined) => void,
      second!: (v: NetworkAdmissionRecord | undefined) => void;
    f.capture
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            first = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            second = resolve;
          }),
      );
    const a = f.gate.check("balances");
    // Wait until the earlier native capture actually starts before issuing
    // the later one; lightweight captures queue until the next task.
    await vi.waitFor(() => expect(first).toBeTypeOf("function"));
    const b = f.gate.check("freshBalance");
    const ra = expect(a).rejects.toMatchObject({ reason: "quarantined" }),
      rb = expect(b).rejects.toMatchObject({ reason: "quarantined" });
    first(bad);
    await ra;
    expect(f.session.signal.aborted).toBe(true);
    second(undefined);
    await rb;
  });
  it("only not-yet-started lightweight captures share; in-flight and later checks read afresh", async () => {
    const f = fixture();
    let release!: () => void;
    f.capture.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve(undefined);
        }),
    );
    const a = f.gate.check("balances"),
      b = f.gate.check("coinMetadata");
    await vi.waitFor(() => expect(f.capture).toHaveBeenCalledTimes(1));
    await f.gate.check("coinMetadata");
    expect(f.capture).toHaveBeenCalledTimes(2);
    release();
    await Promise.all([a, b]);
    await f.gate.check("balances");
    expect(f.capture).toHaveBeenCalledTimes(3);
  });
  it("shared capture keeps domain rejection independent and caller cancellation local", async () => {
    const f = fixture();
    f.add({ kind: "graphql-domain", domain: "coinMetadata", reason: "schema" });
    const results = await Promise.allSettled([
      f.gate.check("balances"),
      f.gate.check("coinMetadata"),
    ]);
    expect(f.capture).toHaveBeenCalledTimes(1);
    expect(results[0].status).toBe("fulfilled");
    expect(results[1]).toMatchObject({
      status: "rejected",
      reason: { reason: "quarantined" },
    });
    const other = fixture(),
      abort = new AbortController();
    const a = other.gate.check("balances", abort.signal),
      b = other.gate.check("coinMetadata");
    abort.abort();
    const cancelled = await Promise.allSettled([a, b]);
    expect(cancelled[0].status).toBe("rejected");
    expect(cancelled[1].status).toBe("fulfilled");
    expect(other.capture).toHaveBeenCalledTimes(1);
  });
  it("invalidation prevents reuse of a queued previous generation capture", async () => {
    const f = fixture();
    const before = f.gate.check("balances");
    const rejected = expect(before).rejects.toMatchObject({
      reason: "reviewing",
    });
    f.gate.invalidate();
    const after = f.gate.check("coinMetadata");
    await Promise.all([rejected, after]);
    // The old/new queued reads stay separate. Invalidation's immediate capture
    // is superseded by the queued read sequence, so its checking-state follow-up
    // also runs before the task dispatch. Neither old read restores the view.
    expect(f.capture).toHaveBeenCalledTimes(4);
    expect(f.gate.getSnapshot().view.phase).toBe("observed");
    expect(f.gate.getSnapshot().view.blocked).not.toContain("coinMetadata");
  });
  it("unchanged polling does not rotate healthy slow-collection keys; signal/closed session remains fenced", async () => {
    const f = fixture();
    await f.gate.refresh();
    const snapshot = f.gate.getSnapshot();
    await f.gate.refresh();
    expect(f.gate.getSnapshot()).toBe(snapshot);
    const controller = new AbortController();
    controller.abort();
    const io = vi.fn(async () => 1);
    await expect(
      f.gate.run("balances", io, controller.signal),
    ).rejects.toBeDefined();
    expect(io).not.toHaveBeenCalled();
    f.session.close();
    await expect(f.gate.run("balances", io)).rejects.toBeDefined();
  });
  it("all retained asset methods are fenced, including combined staking dependencies", async () => {
    const f = fixture();
    const proof = {
      bindingKey: f.session.bindingKey,
      cacheKey: "public-proof",
      checkpoint: "10",
      digest: f.profile.expectedGenesisDigest,
    };
    const io = vi.fn(async () => ({ snapshot: proof, value: [] }));
    const raw = {
      proof,
      balances: io,
      coinMetadata: io,
      ownedObjects: io,
      objects: io,
      coinObjects: io,
      staking: io,
      nativeKiosks: io,
      kiosks: io,
      dynamicFields: io,
      dynamicField: io,
    } as unknown as WalletAssetSnapshot;
    const guarded = guardAssetSnapshot(raw, f.gate);
    await guarded.staking();
    expect(io).toHaveBeenCalledOnce();
    f.add({ kind: "move-group", group: "display", reason: "abi" });
    await f.gate.refresh();
    const calls = [
      () => guarded.balances("public"),
      () => guarded.coinMetadata("public"),
      () => guarded.ownedObjects("public"),
      () => guarded.objects([]),
      () => guarded.coinObjects("public", "public"),
      () => guarded.staking(),
      () => guarded.nativeKiosks("public"),
      () => guarded.kiosks("public"),
      () => guarded.dynamicFields("public"),
      () => guarded.dynamicField("public", {} as never, "DynamicField"),
    ];
    for (const call of calls)
      await expect(call()).rejects.toMatchObject({ reason: "quarantined" });
    expect(io).toHaveBeenCalledOnce();
  });
  it("cache retraction is exact binding/session and does not cancel an in-flight background preview on pending", async () => {
    const f = fixture();
    const q = (
      prefix: string,
      session: unknown = f.session.cacheKey,
      binding = f.session.bindingKey,
      op?: WalletReadOperation,
    ) => ({
      queryKey: [prefix, binding, session],
      meta: op ? { walletReadOperation: op } : undefined,
    });
    expect(admissionQueryAffected(q("wallet-balances"), f.gate)).toBe(true);
    expect(
      admissionQueryAffected(q("wallet-balances", "other"), f.gate, true),
    ).toBe(false);
    expect(
      admissionQueryAffected(
        q("wallet-balances", f.session.cacheKey, "other"),
        f.gate,
        true,
      ),
    ).toBe(false);
    expect(admissionQueryAffected(q("apps-catalog"), f.gate, true)).toBe(false);
    expect(
      admissionQueryAffected(q("wallet-transaction-preview", null), f.gate),
    ).toBe(false);
    f.add({ kind: "identity", role: "accountHistory", reason: "incompatible" });
    await f.gate.refresh();
    expect(
      admissionQueryAffected(q("wallet-transaction-preview", null), f.gate),
    ).toBe(true);
  });
});

it("focus rereads durable admission without rotating a clear balance key or masking an admitted value", async () => {
  const f = fixture(),
    stop = f.gate.start();
  await f.gate.refresh();
  const before = f.gate.getSnapshot().view.keys.balances;
  f.capture.mockClear();
  globalThis.dispatchEvent(new Event("focus"));
  await vi.waitFor(() => expect(f.capture).toHaveBeenCalled());
  await f.gate.refresh();
  expect(f.gate.getSnapshot().view.keys.balances).toBe(before);
  expect(f.gate.getSnapshot().view.blocked).not.toContain("balances");
  // Simulate a missed notification: focus must still discover the durable fault.
  f.add({ kind: "identity", role: "archive", reason: "chain-mismatch" });
  globalThis.dispatchEvent(new Event("focus"));
  await vi.waitFor(() =>
    expect(f.gate.getSnapshot().view.blocked).toContain("balances"),
  );
  expect(f.session.signal.aborted).toBe(true);
  stop();
});

it("focus discovers pending and storage failure even without a notification", async () => {
  const f = fixture(),
    stop = f.gate.start();
  await f.gate.refresh();
  const ticket = createNetworkAdmissionTicket([
    { kind: "graphql-domain", domain: "balances" },
  ]);
  f.row = reserveNetworkAdmissionObservation(f.profile, undefined, ticket);
  globalThis.dispatchEvent(new Event("focus"));
  await vi.waitFor(() =>
    expect(f.gate.getSnapshot().view.blocked).toContain("balances"),
  );
  expect(f.gate.getSnapshot().view.reasons?.balances).toBe("checking");
  f.row = completeNetworkAdmissionObservation(f.profile, f.row, ticket, []);
  await f.gate.refresh();
  f.capture.mockRejectedValueOnce(
    new WalletNetworkAdmissionStateError("unavailable"),
  );
  globalThis.dispatchEvent(new Event("focus"));
  await vi.waitFor(() =>
    expect(f.gate.getSnapshot().view.phase).toBe("unavailable"),
  );
  expect(f.gate.getSnapshot().view.reasons?.balances).toBe("unavailable");
  stop();
});

it("current funds remain independent of indexed balance coverage but reject known chain mismatches", async () => {
  const f = fixture();
  await f.gate.refresh();
  f.add({ kind: "graphql-domain", domain: "balances", reason: "schema" });
  await f.gate.refresh();
  const readFreshBalances = vi.fn().mockResolvedValue([]);
  const rpc = guardWalletRpc(
    { readFreshBalances, hasFullnodeSession: true } as any,
    f.gate,
  );
  await expect(rpc.readFreshBalances("0xb")).resolves.toEqual([]);
  expect(readFreshBalances).toHaveBeenCalledOnce();
  expect(
    admissionQueryAffected(
      {
        meta: undefined,
        queryKey: [
          "wallet-current-balances",
          f.session.bindingKey,
          f.session.cacheKey,
        ],
      },
      f.gate,
    ),
  ).toBe(false);
  f.add({ kind: "identity", role: "fullnode", reason: "chain-mismatch" });
  await f.gate.refresh();
  await expect(rpc.readFreshBalances("0xb")).rejects.toThrow();
  expect(readFreshBalances).toHaveBeenCalledOnce();
  expect(
    admissionQueryAffected(
      {
        meta: undefined,
        queryKey: [
          "wallet-current-balances",
          f.session.bindingKey,
          f.session.cacheKey,
        ],
      },
      f.gate,
    ),
  ).toBe(true);
});
