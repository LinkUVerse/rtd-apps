// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Actual guard/SDK control flow. Native storage proof is a separate Chromium harness.
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { toBase58 } from "rtd-typescript/utils";
import { networkIdentityFixture } from "../../../tests/unit/rpc/network-identity-fixture";
import { MemoryNetworkObservations } from "../../../tests/unit/rpc/network-observation-fixture";
import { MemoryNetworkAdmission } from "../../../tests/unit/rpc/network-admission-fixture";
import { assertTransactionNetworkIdentity as nativeIdentity } from "./transaction-network-identity";
import { WalletNetworkAdmissionStore } from "./network-admission-store";
import {
  WalletNetworkAdmissionStateError,
  reserveNetworkAdmissionObservation,
  completeNetworkAdmissionObservation,
  createNetworkAdmissionTicket,
} from "./network-admission-state";
import { networkBindingKey, validateNetworkProfile } from "./profile";
import { profileFixture } from "./profile-fixture";
import { WalletReadSession } from "./session";
const observations = new MemoryNetworkObservations(),
  admission = new MemoryNetworkAdmission(),
  sessions: WalletReadSession[] = [];
function session() {
  const s = new WalletReadSession(validateNetworkProfile(profileFixture()));
  sessions.push(s);
  return s;
}
function authorize(
  s: WalletReadSession,
  options: Parameters<typeof nativeIdentity>[1] = {},
) {
  return nativeIdentity(s, {
    ...options,
    observations: options.observations ?? observations,
    admission: options.admission ?? admission,
  });
}
beforeEach(() => {
  observations.clear();
  admission.clear();
  vi.unstubAllGlobals();
});
afterEach(() => {
  sessions.splice(0).forEach((s) => s.close());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it.each(["fullnode", "graphql", "archive"] as const)(
  "%s明确错链持久负面阻止新session的正常探测",
  async (role) => {
    const s = session(),
      bad = networkIdentityFixture((r) =>
        r === role ? { digest: toBase58(new Uint8Array(32).fill(9)) } : {},
      );
    await expect(authorize(s, { fetch: bad.fetch })).rejects.toMatchObject({
      role,
      reason: "chain-mismatch",
    });
    const row = admission.records.get(networkBindingKey(s.profile))!;
    expect(row.faults).toEqual([
      { kind: "identity", role, reason: "chain-mismatch" },
    ]);
    expect(row.pending).toHaveLength(0);
    const good = networkIdentityFixture();
    await expect(
      authorize(session(), { fetch: good.fetch }),
    ).rejects.toMatchObject({ reason: "quarantined" });
    expect(good.requests).toHaveLength(0);
  },
);
it("占位提交失败时没有SDK身份IO或授权", async () => {
  const s = session(),
    f = networkIdentityFixture();
  const fault = vi
    .spyOn(admission, "begin")
    .mockRejectedValueOnce(new WalletNetworkAdmissionStateError("unavailable"));
  await expect(authorize(s, { fetch: f.fetch })).rejects.toMatchObject({
    reason: "unavailable",
  });
  expect(f.requests).toHaveLength(0);
  expect(admission.records.size).toBe(0);
  fault.mockRestore();
});
it("必须等原占位返回后才开始SDK查询", async () => {
  const s = session(),
    f = networkIdentityFixture();
  let release!: () => void;
  const wait = new Promise<void>((resolve) => (release = resolve)),
    original = admission.begin.bind(admission);
  let entered = false;
  const hook = vi
    .spyOn(admission, "begin")
    .mockImplementation(async (...args) => {
      const ticket = await original(...args);
      entered = true;
      await wait;
      return ticket;
    });
  const pending = authorize(s, { fetch: f.fetch });
  await vi.waitFor(() => expect(entered).toBe(true));
  expect(f.requests).toHaveLength(0);
  release();
  await expect(pending).resolves.toMatchObject({ state: "identity-verified" });
  expect(f.requests).toHaveLength(3);
  hook.mockRestore();
});
it("缺native准入API不退到内存或已缓存身份成功", async () => {
  vi.stubGlobal("indexedDB", undefined);
  const f = networkIdentityFixture();
  await expect(
    authorize(session(), {
      fetch: f.fetch,
      admission: new WalletNetworkAdmissionStore(),
    }),
  ).rejects.toMatchObject({ reason: "unavailable" });
  expect(f.requests).toHaveLength(0);
});
it("明确负面完成写失败留下占位，新session不能以成功重试绕过", async () => {
  const s = session(),
    f = networkIdentityFixture((r) =>
      r === "graphql" ? { digest: toBase58(new Uint8Array(32).fill(9)) } : {},
    );
  const hook = vi
    .spyOn(admission, "complete")
    .mockRejectedValueOnce(new WalletNetworkAdmissionStateError("unavailable"));
  await expect(authorize(s, { fetch: f.fetch })).rejects.toMatchObject({
    reason: "unavailable",
  });
  const row = admission.records.get(networkBindingKey(s.profile))!;
  expect(row.pending).toHaveLength(1);
  expect(row.faults).toHaveLength(0);
  expect(hook).toHaveBeenCalledTimes(1);
  hook.mockRestore();
  const good = networkIdentityFixture();
  await expect(
    authorize(session(), { fetch: good.fetch }),
  ).rejects.toMatchObject({ reason: "reviewing" });
  expect(good.requests).toHaveLength(0);
});
it("普通完成失败catch不重复空决定清占位", async () => {
  const s = session(),
    f = networkIdentityFixture();
  const hook = vi
    .spyOn(admission, "complete")
    .mockRejectedValueOnce(new WalletNetworkAdmissionStateError("unavailable"));
  await expect(authorize(s, { fetch: f.fetch })).rejects.toMatchObject({
    reason: "unavailable",
  });
  expect(hook).toHaveBeenCalledTimes(1);
  hook.mockRestore();
  expect(
    admission.records.get(networkBindingKey(s.profile))!.pending,
  ).toHaveLength(1);
  const good = networkIdentityFixture();
  await expect(
    authorize(session(), { fetch: good.fetch }),
  ).rejects.toMatchObject({ reason: "reviewing" });
  expect(good.requests).toHaveLength(0);
});
it("已开始probe取消早于忽略abort的叶子settle，保留占位而不伪造错链", async () => {
  const s = session(),
    f = networkIdentityFixture(),
    controller = new AbortController();
  let release!: () => void;
  const wait = new Promise<void>((resolve) => (release = resolve));
  let entered = false;
  const fetch: typeof globalThis.fetch = async (...args) => {
    entered = true;
    await wait;
    return f.fetch(...args);
  };
  const pending = authorize(s, { fetch, signal: controller.signal });
  const rejected = expect(pending).rejects.toThrow();
  await vi.waitFor(() => expect(entered).toBe(true));
  controller.abort(new Error("controlled cancellation"));
  await rejected;
  const row = admission.records.get(networkBindingKey(s.profile))!;
  expect(row.pending).toHaveLength(1);
  expect(row.faults).toHaveLength(0);
  release();
  await vi.waitFor(() => expect(f.requests).toHaveLength(3));
  expect(
    admission.records.get(networkBindingKey(s.profile))!.pending,
  ).toHaveLength(1);
  const good = networkIdentityFixture();
  await expect(
    authorize(session(), { fetch: good.fetch }),
  ).rejects.toMatchObject({ reason: "reviewing" });
  expect(good.requests).toHaveLength(0);
});
it("在begin等待期间关闭且未开始probe，只完成自己的无IO占位", async () => {
  const s = session(),
    f = networkIdentityFixture();
  let release!: () => void;
  const wait = new Promise<void>((resolve) => (release = resolve)),
    original = admission.begin.bind(admission);
  let entered = false;
  const hook = vi
    .spyOn(admission, "begin")
    .mockImplementation(async (...args) => {
      const ticket = await original(...args);
      entered = true;
      await wait;
      return ticket;
    });
  const pending = authorize(s, { fetch: f.fetch }),
    rejected = expect(pending).rejects.toMatchObject({
      name: "StaleWalletSessionError",
    });
  await vi.waitFor(() => expect(entered).toBe(true));
  s.close();
  release();
  await rejected;
  hook.mockRestore();
  expect(f.requests).toHaveLength(0);
  const row = admission.records.get(networkBindingKey(s.profile))!;
  expect(row.pending).toHaveLength(0);
  expect(row.faults).toHaveLength(0);
});
it.each(["pending", "fault"] as const)(
  "accountHistory既存%s阻止三入口新授权，不伪造第四入口正例",
  async (state) => {
    const s = session(),
      area = { kind: "identity", role: "accountHistory" } as const,
      ticket = await admission.begin(s.profile, [area]);
    if (state === "fault")
      await admission.complete(s.profile, ticket, [
        { ...area, reason: "chain-mismatch" },
      ]);
    const f = networkIdentityFixture();
    await expect(authorize(s, { fetch: f.fetch })).rejects.toMatchObject({
      reason: state === "pending" ? "reviewing" : "quarantined",
    });
    expect(f.requests).toHaveLength(0);
  },
);
it("领域负面不伪造整个binding身份坏掉", async () => {
  const s = session(),
    area = { kind: "graphql-domain", domain: "assets" } as const,
    ticket = await admission.begin(s.profile, [area]);
  await admission.complete(s.profile, ticket, [{ ...area, reason: "schema" }]);
  const f = networkIdentityFixture();
  await expect(authorize(s, { fetch: f.fetch })).resolves.toMatchObject({
    state: "identity-verified",
  });
  expect(f.requests).toHaveLength(3);
  expect(
    admission.records.get(networkBindingKey(s.profile))!.faults,
  ).toHaveLength(1);
});
it("完成后重读发现其它身份负面，不返回旧正例", async () => {
  const s = session(),
    f = networkIdentityFixture(),
    key = networkBindingKey(s.profile),
    original = admission.assertClear.bind(admission);
  let calls = 0;
  const hook = vi
    .spyOn(admission, "assertClear")
    .mockImplementation(async (...args) => {
      if (++calls === 2) {
        const area = { kind: "identity", role: "accountHistory" } as const,
          ticket = createNetworkAdmissionTicket([area]);
        const row = reserveNetworkAdmissionObservation(
          s.profile,
          admission.records.get(key),
          ticket,
        );
        admission.records.set(
          key,
          completeNetworkAdmissionObservation(s.profile, row, ticket, [
            { ...area, reason: "chain-mismatch" },
          ]),
        );
      }
      return original(...args);
    });
  await expect(authorize(s, { fetch: f.fetch })).rejects.toMatchObject({
    reason: "quarantined",
  });
  expect(f.requests).toHaveLength(3);
  hook.mockRestore();
});
it("仅改profile revision不能绕过旧H0／generation高度reset", async () => {
  const s = session();
  await authorize(s, { fetch: networkIdentityFixture().fetch });
  await expect(
    authorize(s, {
      fetch: networkIdentityFixture(() => ({ height: 99n })).fetch,
    }),
  ).rejects.toMatchObject({ name: "TransactionNetworkResetError" });
  const p = profileFixture();
  p.revision++;
  const changed = new WalletReadSession(validateNetworkProfile(p));
  sessions.push(changed);
  const good = networkIdentityFixture();
  await expect(authorize(changed, { fetch: good.fetch })).rejects.toMatchObject(
    { name: "TransactionNetworkResetError" },
  );
  expect(good.requests).toHaveLength(0);
});
it("已知错链完成等待期间关闭session，也先保存负面才撤销当前结果", async () => {
  const s = session(),
    bad = networkIdentityFixture((r) =>
      r === "graphql" ? { digest: toBase58(new Uint8Array(32).fill(9)) } : {},
    );
  let release!: () => void;
  const wait = new Promise<void>((resolve) => (release = resolve)),
    original = admission.complete.bind(admission);
  let entered = false;
  const hook = vi
    .spyOn(admission, "complete")
    .mockImplementation(async (...args) => {
      entered = true;
      await wait;
      return original(...args);
    });
  const pending = authorize(s, { fetch: bad.fetch }),
    rejected = expect(pending).rejects.toMatchObject({
      name: "StaleWalletSessionError",
    });
  await vi.waitFor(() => expect(entered).toBe(true));
  s.close();
  release();
  await rejected;
  hook.mockRestore();
  const row = admission.records.get(networkBindingKey(s.profile))!;
  expect(row.faults).toHaveLength(1);
  expect(row.pending).toHaveLength(0);
  const good = networkIdentityFixture();
  await expect(
    authorize(session(), { fetch: good.fetch }),
  ).rejects.toMatchObject({ reason: "quarantined" });
  expect(good.requests).toHaveLength(0);
});
