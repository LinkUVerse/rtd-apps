// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Pure transition tests; never native IndexedDB commit or physical durability evidence.
import { describe, expect, it } from "vitest";
import { profileFixture } from "./profile-fixture";
import { validateNetworkProfile } from "./profile";
import { networkObservationScope } from "./network-observation-state";
import {
  validateNetworkAdmissionArea,
  validateNetworkAdmissionFault,
  validateNetworkAdmissionTicket,
  validateNetworkAdmissionRecord,
  createNetworkAdmissionTicket,
  reserveNetworkAdmissionObservation,
  completeNetworkAdmissionObservation,
  assertNetworkAdmissionClear,
  WalletNetworkAdmissionStateError,
  type NetworkAdmissionArea,
  type NetworkAdmissionFault,
} from "./network-admission-state";

const profile = () => validateNetworkProfile(profileFixture());
const balance = { kind: "graphql-domain", domain: "balances" } as const;
const assets = { kind: "graphql-domain", domain: "assets" } as const;
const display = { kind: "move-group", group: "display" } as const;
const identity = { kind: "identity", role: "graphql" } as const;
const schema = { ...assets, reason: "schema" } as const;
const abi = { ...display, reason: "abi" } as const;
const wrong = { ...identity, reason: "chain-mismatch" } as const;
describe("负面与观察占位精确状态合同", () => {
  it("不存在／空记录仅未被负面检查拒绝，不产生授权字段", () => {
    const p = profile();
    expect(validateNetworkAdmissionRecord(p, undefined)).toBeUndefined();
    expect(assertNetworkAdmissionClear(p, undefined)).toBeUndefined();
    const t = createNetworkAdmissionTicket([balance]),
      r = completeNetworkAdmissionObservation(
        p,
        reserveNetworkAdmissionObservation(p, undefined, t),
        t,
        [],
      );
    expect(r.faults).toEqual([]);
    expect(r.pending).toEqual([]);
    expect(r).not.toHaveProperty("ready");
    expect(r).not.toHaveProperty("canSign");
  });
  it("提交前占位使未完成观察保守阻止，分领域保留独立余额", () => {
    const p = profile(),
      t = createNetworkAdmissionTicket([assets, display]),
      r = reserveNetworkAdmissionObservation(p, undefined, t);
    expect(() => assertNetworkAdmissionClear(p, r, [assets])).toThrow(
      expect.objectContaining({ reason: "reviewing" }),
    );
    expect(() => assertNetworkAdmissionClear(p, r, [display])).toThrow(
      expect.objectContaining({ reason: "reviewing" }),
    );
    expect(() => assertNetworkAdmissionClear(p, r, [balance])).not.toThrow();
    expect(() =>
      reserveNetworkAdmissionObservation(
        p,
        r,
        createNetworkAdmissionTicket([assets]),
      ),
    ).toThrow(expect.objectContaining({ reason: "reviewing" }));
  });
  it.each(["fullnode", "graphql", "archive", "accountHistory"] as const)(
    "任何身份角色占位及负面影响整个绑定：%s",
    (role) => {
      const p = profile(),
        t = createNetworkAdmissionTicket([{ kind: "identity", role }]),
        r = reserveNetworkAdmissionObservation(p, undefined, t);
      expect(() => assertNetworkAdmissionClear(p, r, [balance])).toThrow(
        expect.objectContaining({ reason: "reviewing" }),
      );
      const q = completeNetworkAdmissionObservation(p, r, t, [
        { kind: "identity", role, reason: "chain-mismatch" },
      ]);
      for (const targets of [[], [balance], [assets], [display]])
        expect(() => assertNetworkAdmissionClear(p, q, targets)).toThrow(
          expect.objectContaining({ reason: "quarantined" }),
        );
    },
  );
  it("完成正面只移除自己的占位，并发其它schema／ABI负面保留", () => {
    const p = profile(),
      a = createNetworkAdmissionTicket([balance]),
      b = createNetworkAdmissionTicket([assets, display]);
    let r = reserveNetworkAdmissionObservation(p, undefined, a);
    r = reserveNetworkAdmissionObservation(p, r, b);
    r = completeNetworkAdmissionObservation(p, r, b, [schema, abi]);
    expect(r.pending).toHaveLength(1);
    r = completeNetworkAdmissionObservation(p, r, a, []);
    expect(r.pending).toEqual([]);
    expect(r.faults).toHaveLength(2);
    expect(() => assertNetworkAdmissionClear(p, r, [assets])).toThrow(
      expect.objectContaining({ reason: "quarantined" }),
    );
    expect(() => assertNetworkAdmissionClear(p, r, [display])).toThrow(
      expect.objectContaining({ reason: "quarantined" }),
    );
    expect(() => assertNetworkAdmissionClear(p, r, [balance])).not.toThrow();
    const other = createNetworkAdmissionTicket([balance]);
    r = completeNetworkAdmissionObservation(
      p,
      reserveNetworkAdmissionObservation(p, r, other),
      other,
      [],
    );
    expect(r.faults).toHaveLength(2);
  });
  it("并发较晚的identity负面不会被旧domain正面擦掉", () => {
    const p = profile(),
      a = createNetworkAdmissionTicket([assets]),
      b = createNetworkAdmissionTicket([identity]);
    let r = reserveNetworkAdmissionObservation(p, undefined, a);
    r = reserveNetworkAdmissionObservation(p, r, b);
    r = completeNetworkAdmissionObservation(p, r, b, [wrong]);
    r = completeNetworkAdmissionObservation(p, r, a, []);
    expect(r.pending).toEqual([]);
    expect(r.faults).toEqual([wrong]);
    expect(() => assertNetworkAdmissionClear(p, r, [balance])).toThrow(
      expect.objectContaining({ reason: "quarantined" }),
    );
  });
  it("同一次观察的错链与结构负面均保留，重复输入拒绝", () => {
    const p = profile(),
      t = createNetworkAdmissionTicket([identity]),
      r = reserveNetworkAdmissionObservation(p, undefined, t),
      inc = { ...identity, reason: "incompatible" } as const;
    const q = completeNetworkAdmissionObservation(p, r, t, [wrong, inc]);
    expect(q.faults).toHaveLength(2);
    expect(() =>
      completeNetworkAdmissionObservation(p, r, t, [wrong, wrong]),
    ).toThrow(WalletNetworkAdmissionStateError);
  });
  it("不能移除别人的ticket、完成不属于自己area的负面或重复完成", () => {
    const p = profile(),
      t = createNetworkAdmissionTicket([balance]),
      r = reserveNetworkAdmissionObservation(p, undefined, t);
    expect(() =>
      completeNetworkAdmissionObservation(
        p,
        r,
        createNetworkAdmissionTicket([balance]),
        [],
      ),
    ).toThrow(expect.objectContaining({ reason: "stale" }));
    expect(() =>
      completeNetworkAdmissionObservation(p, r, { ...t, areas: [assets] }, []),
    ).toThrow(expect.objectContaining({ reason: "corrupt" }));
    expect(() => completeNetworkAdmissionObservation(p, r, t, [wrong])).toThrow(
      expect.objectContaining({ reason: "corrupt" }),
    );
    expect(() => reserveNetworkAdmissionObservation(p, r, t)).toThrow(
      expect.objectContaining({ reason: "stale" }),
    );
    expect(() =>
      completeNetworkAdmissionObservation(
        p,
        completeNetworkAdmissionObservation(p, r, t, []),
        t,
        [],
      ),
    ).toThrow(expect.objectContaining({ reason: "stale" }));
  });
  it("复制／deep freeze所有公开状态，不冻结调用方或继承其后来改变", () => {
    const p = profile(),
      input = { id: crypto.randomUUID(), areas: [{ ...assets }] },
      r = reserveNetworkAdmissionObservation(p, undefined, input);
    expect(Object.isFrozen(input)).toBe(false);
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.isFrozen(r.pending[0].areas[0])).toBe(true);
    Object.assign(input.areas[0], { domain: "balances" });
    expect(r.pending[0].areas).toEqual([assets]);
    const raw = structuredClone(r),
      checked = validateNetworkAdmissionRecord(p, raw)!;
    Object.assign(raw.pending[0], { id: crypto.randomUUID() });
    expect(checked.pending[0].id).toBe(r.pending[0].id);
    expect(Object.isFrozen(raw)).toBe(false);
  });
  it.each(["schemaVersion", "bindingKey", "faults", "pending"] as const)(
    "根必需字段不可省略：%s",
    (key) => {
      const p = profile(),
        t = createNetworkAdmissionTicket([assets]),
        raw: Record<string, unknown> = {
          ...reserveNetworkAdmissionObservation(p, undefined, t),
        };
      delete raw[key];
      expect(() => validateNetworkAdmissionRecord(p, raw)).toThrow(
        WalletNetworkAdmissionStateError,
      );
    },
  );
  it.each([
    "extra",
    "wrong-version",
    "foreign-binding",
    "faults-object",
    "pending-object",
    "ticket-payload",
    "ticket-uuid",
    "unknown-role",
    "unknown-domain",
    "unknown-group",
    "wrong-reason",
    "area-payload",
    "duplicate-area",
    "duplicate-ticket",
    "duplicate-fault",
    "unsorted-areas",
  ] as const)("损坏或非canonical存储值拒绝：%s", (mode) => {
    const p = profile(),
      t = createNetworkAdmissionTicket([assets, display]),
      raw = structuredClone(
        reserveNetworkAdmissionObservation(p, undefined, t),
      );
    if (mode === "extra") Object.assign(raw, { payload: "discarded" });
    else if (mode === "wrong-version") Object.assign(raw, { schemaVersion: 2 });
    else if (mode === "foreign-binding")
      Object.assign(raw, { bindingKey: "foreign" });
    else if (mode === "faults-object") Object.assign(raw, { faults: {} });
    else if (mode === "pending-object") Object.assign(raw, { pending: {} });
    else if (mode === "ticket-payload")
      Object.assign(raw.pending[0], { payload: "discarded" });
    else if (mode === "ticket-uuid")
      Object.assign(raw.pending[0], { id: "broken" });
    else if (mode === "unknown-role")
      Object.assign(raw.pending[0], {
        areas: [{ kind: "identity", role: "default" }],
      });
    else if (mode === "unknown-domain")
      Object.assign(raw.pending[0], {
        areas: [{ kind: "graphql-domain", domain: "default" }],
      });
    else if (mode === "unknown-group")
      Object.assign(raw.pending[0], {
        areas: [{ kind: "move-group", group: "default" }],
      });
    else if (mode === "wrong-reason")
      Object.assign(raw, { faults: [{ ...assets, reason: "transport" }] });
    else if (mode === "area-payload")
      Object.assign(raw.pending[0].areas[0], { payload: "discarded" });
    else if (mode === "duplicate-area")
      Object.assign(raw.pending[0], { areas: [assets, assets] });
    else if (mode === "duplicate-ticket")
      Object.assign(raw, { pending: [raw.pending[0], raw.pending[0]] });
    else if (mode === "duplicate-fault")
      Object.assign(raw, { faults: [schema, schema] });
    else Object.assign(raw.pending[0], { areas: [display, assets] });
    expect(() => validateNetworkAdmissionRecord(p, raw)).toThrow(
      WalletNetworkAdmissionStateError,
    );
  });
  it.each(["pending", "areas", "faults", "binding"] as const)(
    "数量或UTF8预算不可越过：%s",
    (mode) => {
      const p = profile(),
        t = createNetworkAdmissionTicket([assets]),
        raw = structuredClone(
          reserveNetworkAdmissionObservation(p, undefined, t),
        );
      if (mode === "pending")
        Object.assign(raw, {
          pending: Array.from({ length: 33 }, () => ({
            id: crypto.randomUUID(),
            areas: [assets],
          })),
        });
      else if (mode === "areas")
        Object.assign(raw.pending[0], {
          areas: Array.from({ length: 25 }, () => assets),
        });
      else if (mode === "faults")
        Object.assign(raw, {
          faults: Array.from({ length: 29 }, () => schema),
        });
      else Object.assign(raw, { bindingKey: "文".repeat(21846) });
      expect(() => validateNetworkAdmissionRecord(p, raw)).toThrow(
        expect.objectContaining({ reason: "budget" }),
      );
    },
  );
  it("不同ticket不能重复占同一area，存储损坏保持拒绝", () => {
    const p = profile(),
      t = createNetworkAdmissionTicket([assets]),
      raw = structuredClone(
        reserveNetworkAdmissionObservation(p, undefined, t),
      );
    Object.assign(raw, {
      pending: [t, createNetworkAdmissionTicket([assets])].sort((a, b) =>
        a.id < b.id ? -1 : 1,
      ),
    });
    expect(() => validateNetworkAdmissionRecord(p, raw)).toThrow(
      expect.objectContaining({ reason: "corrupt" }),
    );
  });
  it("所有24个area／28种Fault可规范合并，unknown／payload不进入记录", () => {
    const roles = ["fullnode", "graphql", "archive", "accountHistory"] as const,
      domains = [
        "balances",
        "coinMetadata",
        "staking",
        "assets",
        "names",
        "sentTransactions",
        "eventsByType",
        "eventsByModule",
      ] as const,
      groups = [
        "standardLibrary",
        "readerSupport",
        "coins",
        "staking",
        "dynamicFields",
        "display",
        "framework",
        "kiosk",
        "personalKiosk",
        "originByteDiscovery",
        "originByteExecution",
        "names",
      ] as const;
    const targets: NetworkAdmissionArea[] = [
      ...roles.map((role) => ({ kind: "identity" as const, role })),
      ...domains.map((domain) => ({ kind: "graphql-domain" as const, domain })),
      ...groups.map((group) => ({ kind: "move-group" as const, group })),
    ];
    const fs: NetworkAdmissionFault[] = [
      ...roles.flatMap((role) => [
        { kind: "identity" as const, role, reason: "chain-mismatch" as const },
        { kind: "identity" as const, role, reason: "incompatible" as const },
      ]),
      ...domains.map((domain) => ({
        kind: "graphql-domain" as const,
        domain,
        reason: "schema" as const,
      })),
      ...groups.map((group) => ({
        kind: "move-group" as const,
        group,
        reason: "abi" as const,
      })),
    ];
    const p = profile(),
      t = createNetworkAdmissionTicket(targets),
      r = completeNetworkAdmissionObservation(
        p,
        reserveNetworkAdmissionObservation(p, undefined, t),
        t,
        fs,
      );
    expect(r.faults).toHaveLength(28);
    expect(validateNetworkAdmissionRecord(p, r)).toEqual(r);
    expect(() =>
      validateNetworkAdmissionArea({ ...assets, reason: "schema" }),
    ).toThrow(WalletNetworkAdmissionStateError);
    expect(() =>
      validateNetworkAdmissionFault({ ...wrong, payload: "discarded" }),
    ).toThrow(WalletNetworkAdmissionStateError);
    expect(() => validateNetworkAdmissionTicket({ ...t, client: {} })).toThrow(
      WalletNetworkAdmissionStateError,
    );
  });
  it("重绑不修改原记录，高度reset作用域仍按H0／generation而非revision", () => {
    const p = profile(),
      t = createNetworkAdmissionTicket([identity]),
      q = completeNetworkAdmissionObservation(
        p,
        reserveNetworkAdmissionObservation(p, undefined, t),
        t,
        [wrong],
      );
    const revision = validateNetworkProfile({ ...p, revision: p.revision + 1 }),
      generation = validateNetworkProfile({
        ...p,
        generation: "reviewed-next-generation",
      });
    expect(() => validateNetworkAdmissionRecord(revision, q)).toThrow(
      WalletNetworkAdmissionStateError,
    );
    expect(() => validateNetworkAdmissionRecord(generation, q)).toThrow(
      WalletNetworkAdmissionStateError,
    );
    expect(networkObservationScope(revision)).toBe(networkObservationScope(p));
    expect(networkObservationScope(generation)).not.toBe(
      networkObservationScope(p),
    );
    expect(q.faults).toEqual([wrong]);
    expect(() => assertNetworkAdmissionClear(p, q)).toThrow(
      expect.objectContaining({ reason: "quarantined" }),
    );
  });
});
