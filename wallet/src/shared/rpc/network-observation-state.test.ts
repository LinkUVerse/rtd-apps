// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { expect, it } from "vitest";
import { toBase58 } from "rtd-typescript/utils";
import { MemoryNetworkObservations } from "../../../tests/unit/rpc/network-observation-fixture";
import { profileFixture } from "./profile-fixture";
import {
  validateNetworkProfile,
  networkBindingKey,
  type ValidatedNetworkProfile,
} from "./profile";
import type { NetworkIdentityReport } from "./identity";
import {
  captureNetworkObservation,
  networkObservationScope,
  reconcileNetworkObservation,
  validateNetworkObservation,
  type NetworkObservationRecord,
} from "./network-observation-state";
const profile = () => validateNetworkProfile(profileFixture());
function report(
  p: ValidatedNetworkProfile,
  fullnode = 100n,
  archive: bigint | null = 80n,
): NetworkIdentityReport {
  return {
    state: "identity-verified",
    bindingKey: networkBindingKey(p),
    observedAt: Date.now(),
    endpoints: [
      {
        role: "fullnode",
        state: "verified",
        genesisDigest: p.expectedGenesisDigest,
        checkpointHeight: fullnode,
      },
      {
        role: "graphql",
        state: "verified",
        genesisDigest: p.expectedGenesisDigest,
      },
      archive === null
        ? { role: "archive", state: "unavailable" }
        : {
            role: "archive",
            state: "verified",
            genesisDigest: p.expectedGenesisDigest,
            checkpointHeight: archive,
          },
    ],
  };
}
function row(p: ValidatedNetworkProfile): NetworkObservationRecord {
  return reconcileNetworkObservation(
    p,
    captureNetworkObservation(p, undefined),
    report(p),
    undefined,
  ).next!;
}
it("同H0／generation别名、revision、URL不清除原生角色水位", async () => {
  const p = profile(),
    store = new MemoryNetworkObservations();
  await store.observe(p, await store.capture(p), report(p));
  const alias = validateNetworkProfile({
    ...p,
    id: "alias",
    revision: p.revision + 1,
    endpoints: {
      ...p.endpoints,
      fullnodeGrpcWeb: "https://other.example/grpc",
    },
  });
  expect(networkBindingKey(alias)).not.toBe(networkBindingKey(p));
  expect(networkObservationScope(alias)).toBe(networkObservationScope(p));
  expect((await store.capture(alias)).highest).toEqual({
    fullnode: "100",
    archive: "80",
  });
  await expect(
    store.observe(alias, await store.capture(alias), report(alias, 99n)),
  ).rejects.toMatchObject({
    name: "TransactionNetworkResetError",
    previousHeight: 100n,
    observedHeight: 99n,
  });
  await expect(store.capture(p)).rejects.toMatchObject({
    name: "TransactionNetworkResetError",
  });
});
it("显式新generation／H0分别隔离，旧scope及reset记录不删除", async () => {
  const p = profile(),
    store = new MemoryNetworkObservations();
  await store.observe(p, await store.capture(p), report(p));
  await expect(
    store.observe(p, await store.capture(p), report(p, 99n)),
  ).rejects.toThrow();
  for (const next of [
    validateNetworkProfile({ ...p, generation: "dev-2" }),
    validateNetworkProfile({
      ...p,
      expectedGenesisDigest: toBase58(new Uint8Array(32).fill(3)),
    }),
  ]) {
    await store.observe(next, await store.capture(next), report(next, 1n, 0n));
    expect((await store.capture(next)).highest.fullnode).toBe("1");
  }
  expect(store.records.size).toBe(3);
  expect(store.records.get(networkObservationScope(p))?.state).toBe(
    "reset-required",
  );
});
it("原生角色不互代；archive暂不可用保留既有水位", async () => {
  const p = profile(),
    store = new MemoryNetworkObservations();
  await store.observe(p, await store.capture(p), report(p, 100n, 200n));
  await store.observe(p, await store.capture(p), report(p, 101n, null));
  expect((await store.capture(p)).highest).toEqual({
    fullnode: "101",
    archive: "200",
  });
  await expect(
    store.observe(p, await store.capture(p), report(p, 102n, 199n)),
  ).rejects.toMatchObject({ role: "archive", previousHeight: 200n });
  expect(store.records.get(networkObservationScope(p))?.highest).toEqual({
    fullnode: "101",
    archive: "200",
  });
});
it("并发首次低响应晚返回拒绝本次准入，不错误隔离scope", async () => {
  const p = profile(),
    store = new MemoryNetworkObservations(),
    early = await store.capture(p),
    newer = await store.capture(p);
  await store.observe(p, newer, report(p, 101n, 81n));
  await expect(
    store.observe(p, early, report(p, 100n, 80n)),
  ).rejects.toMatchObject({ reason: "stale" });
  expect(store.records.get(networkObservationScope(p))?.state).toBe("observed");
  expect((await store.capture(p)).highest).toEqual({
    fullnode: "101",
    archive: "81",
  });
});
it("并发期间升高后等于开始旧水位只是迟到，之后新探测低于已提交高水位才隔离", async () => {
  const p = profile(),
    store = new MemoryNetworkObservations();
  await store.observe(p, await store.capture(p), report(p));
  const old = await store.capture(p),
    newer = await store.capture(p);
  await store.observe(p, newer, report(p, 102n, 82n));
  await expect(store.observe(p, old, report(p))).rejects.toMatchObject({
    reason: "stale",
  });
  const before = await store.capture(p);
  await expect(
    store.observe(p, before, report(p, 101n, 83n)),
  ).rejects.toMatchObject({ previousHeight: 102n, observedHeight: 101n });
  await expect(store.capture(p)).rejects.toMatchObject({
    name: "TransactionNetworkResetError",
  });
});
it("旧探测真的低于开始前已提交水位，持久隔离且不覆盖期间更高观察", async () => {
  const p = profile(),
    store = new MemoryNetworkObservations();
  await store.observe(p, await store.capture(p), report(p));
  const before = await store.capture(p);
  await store.observe(p, await store.capture(p), report(p, 102n, 82n));
  await expect(
    store.observe(p, before, report(p, 99n, 83n)),
  ).rejects.toMatchObject({ previousHeight: 100n, observedHeight: 99n });
  expect(store.records.get(networkObservationScope(p))?.highest).toEqual({
    fullnode: "102",
    archive: "82",
  });
});
it.each(["fullnode", "archive"] as const)(
  "新连接与较高好响应不能隐式清除%s隔离",
  async (role) => {
    const p = profile(),
      initial = row(p),
      before = captureNetworkObservation(p, initial);
    const decision = reconcileNetworkObservation(
      p,
      before,
      report(
        p,
        role === "fullnode" ? 99n : 101n,
        role === "archive" ? 79n : 81n,
      ),
      initial,
    );
    expect(decision.kind).toBe("reset-required");
    expect(() =>
      captureNetworkObservation(p, structuredClone(decision.next)),
    ).toThrow();
    const later = reconcileNetworkObservation(
      p,
      before,
      report(p, 200n, 200n),
      decision.next,
    );
    expect(later.kind).toBe("reset-required");
    expect(later.next).toBeUndefined();
  },
);
it.each([
  "schema",
  "scope",
  "h0",
  "generation",
  "missingFullnode",
  "foreignRole",
  "secret",
  "resetOnHealthy",
  "objectState",
  "badReset",
] as const)("损坏%s不能归零或重建水位", (fault) => {
  const p = profile(),
    value: any = structuredClone(row(p));
  switch (fault) {
    case "schema":
      value.schemaVersion = 2;
      break;
    case "scope":
      value.scope = "other";
      break;
    case "h0":
      value.genesisDigest = toBase58(new Uint8Array(32).fill(2));
      break;
    case "generation":
      value.generation = "other";
      break;
    case "missingFullnode":
      delete value.highest.fullnode;
      break;
    case "foreignRole":
      value.highest.graphql = "100";
      break;
    case "secret":
      value.signature = "not-a-signature";
      break;
    case "resetOnHealthy":
      value.reset = {};
      break;
    case "objectState":
      value.state = { toString: () => "observed" };
      break;
    case "badReset":
      value.state = "reset-required";
      value.reset = {
        role: "fullnode",
        previousHeight: "100",
        observedHeight: "100",
      };
      break;
  }
  expect(() => validateNetworkObservation(p, value)).toThrow();
});
it.each(["01", "-1", "1.0", "1e2", "18446744073709551616", 100, null])(
  "水位%j须为规范u64字符串",
  (invalid) => {
    const p = profile(),
      value = { ...row(p), highest: { fullnode: invalid } };
    expect(() => validateNetworkObservation(p, value)).toThrow();
  },
);
it("最大u64精度保留，记录与快照不能被外部修改", () => {
  const p = profile(),
    value = { ...row(p), highest: { fullnode: "18446744073709551615" } },
    record = validateNetworkObservation(p, value)!;
  expect(record.highest.fullnode).toBe("18446744073709551615");
  expect(Object.isFrozen(record)).toBe(true);
  expect(Object.isFrozen(record.highest)).toBe(true);
});
it.each([
  "binding",
  "missingRole",
  "duplicateRole",
  "digest",
  "height",
  "noFullnode",
] as const)("报告%s不能成为观察许可", (fault) => {
  const p = profile(),
    r: any = report(p),
    current = row(p);
  switch (fault) {
    case "binding":
      r.bindingKey = "other";
      break;
    case "missingRole":
      r.endpoints.pop();
      break;
    case "duplicateRole":
      r.endpoints[2].role = "fullnode";
      break;
    case "digest":
      r.endpoints[2].genesisDigest = toBase58(new Uint8Array(32).fill(2));
      break;
    case "height":
      r.endpoints[0].checkpointHeight = -1n;
      break;
    case "noFullnode":
      r.endpoints[0] = { role: "fullnode", state: "unavailable" };
      break;
  }
  expect(() =>
    reconcileNetworkObservation(
      p,
      captureNetworkObservation(p, current),
      r,
      current,
    ),
  ).toThrow();
});
it("探测前存在记录而事务内丢失／倒退不能重新bootstrap", () => {
  const p = profile(),
    current = row(p),
    before = captureNetworkObservation(p, current);
  expect(() =>
    reconcileNetworkObservation(p, before, report(p), undefined),
  ).toThrow();
  expect(() =>
    reconcileNetworkObservation(p, before, report(p), {
      ...current,
      highest: { fullnode: "99", archive: "80" },
    }),
  ).toThrow();
});
