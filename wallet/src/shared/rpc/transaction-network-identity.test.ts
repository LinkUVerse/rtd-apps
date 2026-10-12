// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { toBase58 } from "rtd-typescript/utils";
import { networkIdentityFixture } from "../../../tests/unit/rpc/network-identity-fixture";
import { assertTransactionNetworkIdentity as nativeIdentity } from "./transaction-network-identity";
import { MemoryNetworkObservations } from "../../../tests/unit/rpc/network-observation-fixture";
import { WalletNetworkObservationError } from "./network-observation-state";
import { MemoryNetworkAdmission } from "../../../tests/unit/rpc/network-admission-fixture";
const observations = new MemoryNetworkObservations();
const admission = new MemoryNetworkAdmission();
function assertTransactionNetworkIdentity(
  session: WalletReadSession,
  options: Parameters<typeof nativeIdentity>[1] = {},
) {
  return nativeIdentity(session, {
    ...options,
    observations: options.observations ?? observations,
    admission: options.admission ?? admission,
  });
}
import { profileFixture } from "./profile-fixture";
import { validateNetworkProfile } from "./profile";
import { WalletReadSession } from "./session";
const sessions: WalletReadSession[] = [];
function session(minimal = false) {
  const p = profileFixture();
  if (minimal) p.endpoints = { fullnodeGrpcWeb: p.endpoints.fullnodeGrpcWeb };
  const s = new WalletReadSession(validateNetworkProfile(p));
  sessions.push(s);
  return s;
}
beforeEach(() => {
  vi.unstubAllGlobals();
  observations.clear();
  admission.clear();
});
afterEach(() => {
  sessions.splice(0).forEach((s) => s.close());
  vi.unstubAllGlobals();
});
it("每次授权经实际SDK重验三入口，不缓存客户端身份、不声明capability ready", async () => {
  const s = session(),
    f = networkIdentityFixture();
  const first = await assertTransactionNetworkIdentity(s, { fetch: f.fetch });
  expect(first.state).toBe("identity-verified");
  expect(first).not.toHaveProperty("ready");
  expect(first).not.toHaveProperty("fullnode");
  await assertTransactionNetworkIdentity(s, { fetch: f.fetch });
  expect(f.requests.map((r) => r.role)).toEqual([
    "fullnode",
    "graphql",
    "archive",
    "fullnode",
    "graphql",
    "archive",
  ]);
});
it("显式单Fullnode配置不猜未配置角色", async () => {
  const s = session(true),
    f = networkIdentityFixture();
  expect(
    (await assertTransactionNetworkIdentity(s, { fetch: f.fetch })).state,
  ).toBe("identity-verified");
  expect(f.requests.map((r) => r.role)).toEqual(["fullnode"]);
});
it.each(["fullnode", "graphql", "archive"] as const)(
  "已知%s错链优先于其他角色不可用且本会话保持隔离",
  async (role) => {
    const s = session(),
      f = networkIdentityFixture((r) =>
        r === role
          ? { digest: toBase58(new Uint8Array(32).fill(9)) }
          : { unavailable: true },
      );
    await expect(
      assertTransactionNetworkIdentity(s, { fetch: f.fetch }),
    ).rejects.toMatchObject({ role, reason: "chain-mismatch" });
    expect(f.requests).toHaveLength(3);
    const good = networkIdentityFixture();
    await expect(
      assertTransactionNetworkIdentity(s, { fetch: good.fetch }),
    ).rejects.toMatchObject({ role, reason: "chain-mismatch" });
    expect(good.requests).toHaveLength(0);
  },
);
it("不兼容或partial身份不能降级签名，后续好响应也不抹消", async () => {
  const s = session(),
    f = networkIdentityFixture((r) =>
      r === "graphql" ? { partial: true } : {},
    );
  await expect(
    assertTransactionNetworkIdentity(s, { fetch: f.fetch }),
  ).rejects.toMatchObject({ role: "graphql", reason: "incompatible" });
  const good = networkIdentityFixture();
  await expect(
    assertTransactionNetworkIdentity(s, { fetch: good.fetch }),
  ).rejects.toMatchObject({ reason: "incompatible" });
  expect(good.requests).toHaveLength(0);
});
it("同链Fullnode有效而其他入口暂不可用，身份降级独立于Display／覆盖", async () => {
  const s = session(),
    f = networkIdentityFixture((r) =>
      r !== "fullnode" ? { status: 14, unavailable: r === "graphql" } : {},
    );
  const result = await assertTransactionNetworkIdentity(s, { fetch: f.fetch });
  expect(result.state).toBe("identity-degraded");
  expect(result.report.endpoints.map((e) => e.state)).toEqual([
    "verified",
    "unavailable",
    "unavailable",
  ]);
  const good = networkIdentityFixture();
  expect(
    (await assertTransactionNetworkIdentity(s, { fetch: good.fetch })).state,
  ).toBe("identity-verified");
  expect(good.requests).toHaveLength(3);
});
it("Fullnode未验证不能用其余成功绕过，暂不可用恢复后重新探测", async () => {
  const s = session(),
    f = networkIdentityFixture((r) => (r === "fullnode" ? { status: 14 } : {}));
  await expect(
    assertTransactionNetworkIdentity(s, { fetch: f.fetch }),
  ).rejects.toMatchObject({ code: "UNAVAILABLE" });
  const good = networkIdentityFixture();
  expect(
    (await assertTransactionNetworkIdentity(s, { fetch: good.fetch })).state,
  ).toBe("identity-verified");
  expect(good.requests).toHaveLength(3);
});
it.each(["fullnode", "archive"] as const)(
  "同会话%s已观察水位倒退，保留隔离而不清配置／journal",
  async (role) => {
    const s = session(),
      f = networkIdentityFixture();
    await assertTransactionNetworkIdentity(s, { fetch: f.fetch });
    const lower = networkIdentityFixture((r) => ({
      height: r === role ? 99n : 101n,
    }));
    await expect(
      assertTransactionNetworkIdentity(s, { fetch: lower.fetch }),
    ).rejects.toMatchObject({
      name: "TransactionNetworkResetError",
      role,
      previousHeight: 100n,
      observedHeight: 99n,
    });
    const good = networkIdentityFixture(() => ({ height: 102n }));
    await expect(
      assertTransactionNetworkIdentity(s, { fetch: good.fetch }),
    ).rejects.toMatchObject({ name: "TransactionNetworkResetError" });
    expect(good.requests).toHaveLength(0);
    expect(s.profile.generation).toBe("dev-1");
    const newSession = session();
    await expect(
      assertTransactionNetworkIdentity(newSession, { fetch: good.fetch }),
    ).rejects.toMatchObject({ name: "TransactionNetworkResetError" });
    expect(good.requests).toHaveLength(0);
    const nextProfile = profileFixture();
    nextProfile.generation = "dev-2";
    const nextGeneration = new WalletReadSession(
      validateNetworkProfile(nextProfile),
    );
    sessions.push(nextGeneration);
    expect(
      (
        await assertTransactionNetworkIdentity(nextGeneration, {
          fetch: good.fetch,
        })
      ).state,
    ).toBe("identity-verified");
  },
);
it("已关闭会话零transport，取消期间迟到成功不接纳", async () => {
  const closed = session(),
    f = networkIdentityFixture();
  closed.close();
  await expect(
    assertTransactionNetworkIdentity(closed, { fetch: f.fetch }),
  ).rejects.toThrow();
  expect(f.requests).toHaveLength(0);
  const s = session();
  let release!: () => void;
  const wait = new Promise<void>((r) => {
    release = r;
  });
  let entered = false;
  const fetch: typeof globalThis.fetch = async (...args) => {
    entered = true;
    await wait;
    return f.fetch(...args);
  };
  const pending = assertTransactionNetworkIdentity(s, { fetch });
  const rejected = expect(pending).rejects.toMatchObject({
    name: "StaleWalletSessionError",
  });
  await vi.waitFor(() => expect(entered).toBe(true));
  s.close();
  release();
  await rejected;
});

it.each(["capture", "observe"] as const)(
  "%s存储不可用不能发布身份授权",
  async (stage) => {
    const s = session(),
      f = networkIdentityFixture();
    const fault = vi
      .spyOn(observations, stage)
      .mockRejectedValueOnce(new WalletNetworkObservationError("unavailable"));
    await expect(
      assertTransactionNetworkIdentity(s, { fetch: f.fetch }),
    ).rejects.toMatchObject({ reason: "unavailable" });
    expect(f.requests).toHaveLength(stage === "capture" ? 0 : 3);
    expect(observations.records.size).toBe(0);
    fault.mockRestore();
    // A transient failure requires a new probe, never authorization from the preceding success.
    const good = networkIdentityFixture();
    await expect(
      assertTransactionNetworkIdentity(s, { fetch: good.fetch }),
    ).resolves.toMatchObject({ state: "identity-verified" });
    expect(good.requests).toHaveLength(3);
  },
);
it.each(["capture", "observe"] as const)(
  "取消发生在%s存储等待期间，迟到complete不能发布准入",
  async (stage) => {
    const s = session(),
      f = networkIdentityFixture();
    let release!: () => void;
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    const original = observations[stage].bind(observations);
    let entered = false;
    const fault = vi
      .spyOn(observations, stage)
      .mockImplementation(async (...args: any[]) => {
        entered = true;
        await wait;
        return (original as (...args: any[]) => Promise<any>)(...args);
      });
    const pending = assertTransactionNetworkIdentity(s, { fetch: f.fetch });
    const rejected = expect(pending).rejects.toMatchObject({
      name: "StaleWalletSessionError",
    });
    await vi.waitFor(() => expect(entered).toBe(true));
    s.close();
    release();
    await rejected;
    fault.mockRestore();
    expect(f.requests).toHaveLength(stage === "capture" ? 0 : 3);
  },
);
