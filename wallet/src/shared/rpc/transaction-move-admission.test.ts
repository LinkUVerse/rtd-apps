// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Actual SDK/BCS and production guard; memory store controls timing only, not native persistence.
import { Transaction } from "rtd-typescript/transactions";
import { GrpcTypes } from "rtd-typescript/grpc";
import { toBase58, toBase64 } from "rtd-typescript/utils";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryNetworkAdmission } from "../../../tests/unit/rpc/network-admission-fixture";
import { reviewedDeploymentFixture } from "../../../tests/unit/rpc/reviewed-deployment-fixture";
import {
  assertTransactionMoveAdmission,
  createTransactionMoveAuthorizer,
} from "./transaction-move-admission";
import { WalletReadSession } from "./session";
import { profileFixture } from "./profile-fixture";
import {
  networkBindingKey,
  validateNetworkProfile,
  type ValidatedNetworkProfile,
} from "./profile";
import {
  consumeCapabilityTerminalFailure,
  type CapabilityTerminalFailure,
} from "./capability-observation-lifetime";
import type { NetworkAdmissionTicket } from "./network-admission-state";
import {
  grpcPacket,
  movePackageFixtures,
  packageObject,
} from "./move-package-fixture";
import { WalletNetworkAdmissionStore } from "./network-admission-store";
import { WalletNetworkAdmissionStateError } from "./network-admission-state";
import { selectReviewedDeployment } from "./reviewed-deployment-registry";
import * as releaseConfig from "./release-deployment-config";

const sender = "0xa",
  sessions: WalletReadSession[] = [];
afterEach(() => {
  sessions.splice(0).forEach((s) => s.close());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function bytes(move = true) {
  const t = new Transaction();
  t.setSender(sender);
  t.setGasOwner(sender);
  t.setGasPrice(1);
  t.setGasBudget(100);
  t.setGasPayment([
    {
      objectId: "0xc",
      version: "1",
      digest: toBase58(new Uint8Array(32).fill(2)),
    },
  ]);
  if (move) t.moveCall({ target: "0x3::rtd_system::request_add_stake" });
  else {
    const [c] = t.splitCoins(t.gas, [1]);
    t.transferObjects([c], "0xb");
  }
  return toBase64(await t.build());
}
function fixture() {
  const p = profileFixture();
  delete p.endpoints.graphqlUrl;
  delete p.endpoints.archiveGrpcWeb;
  delete p.endpoints.accountHistoryUrl;
  delete p.packages.name;
  delete p.packages.personalKiosk;
  const session = new WalletReadSession(validateNetworkProfile(p));
  sessions.push(session);
  const values = movePackageFixtures(session.profile),
    store = new MemoryNetworkAdmission();
  const fetch = vi.fn<typeof globalThis.fetch>(async (url, init) => {
    const method = String(url).split("/rtd.rpc.v2.")[1],
      data = (init!.body as Uint8Array).slice(5);
    if (method === "LedgerService/GetServiceInfo")
      return grpcPacket(
        GrpcTypes.GetServiceInfoResponse.toBinary({
          chainId: session.profile.expectedGenesisDigest,
          checkpointHeight: 100n,
          lowestAvailableCheckpoint: 0n,
          lowestAvailableCheckpointObjects: 0n,
        }),
      );
    if (method === "LedgerService/GetObject")
      return grpcPacket(
        GrpcTypes.GetObjectResponse.toBinary({
          object: values.objects.get(
            GrpcTypes.GetObjectRequest.fromBinary(data).objectId!,
          ),
        }),
      );
    if (method === "MovePackageService/GetPackage")
      return grpcPacket(
        GrpcTypes.GetPackageResponse.toBinary({
          package: values.packages.get(
            GrpcTypes.GetPackageRequest.fromBinary(data).packageId!,
          ),
        }),
      );
    throw new Error("Unexpected synthetic protocol method");
  });
  const run = (
    fixed: string,
    options: Parameters<typeof assertTransactionMoveAdmission>[3] = {},
  ) =>
    assertTransactionMoveAdmission(session, fixed, sender, {
      fetch,
      admission: store,
      ...options,
    });
  return { session, values, store, fetch, run };
}
function incompatible(
  f: ReturnType<typeof fixture>,
  module: string,
  datatype: string,
) {
  const pkg = [...f.values.packages.values()].find((p) =>
    p.modules.some((m) => m.name === module),
  )!;
  pkg.modules
    .find((m) => m.name === module)!
    .datatypes.find((d) => d.name === datatype)!.abilities = [];
  f.values.objects.set(pkg.storageId!, packageObject(pkg));
}
function managedFixture() {
  const f = fixture();
  const recoverable = vi.fn(
    (
      profile: ValidatedNetworkProfile,
      areas: Parameters<MemoryNetworkAdmission["begin"]>[1],
    ) => f.store.begin(profile, areas),
  );
  const finish = vi.fn(
    async (
      profile: ValidatedNetworkProfile,
      ticket: NetworkAdmissionTicket,
      receipt: CapabilityTerminalFailure,
    ) =>
      f.store.complete(
        profile,
        ticket,
        consumeCapabilityTerminalFailure(
          receipt,
          networkBindingKey(profile),
          ticket,
        ),
      ),
  );
  Object.assign(f.store, {
    beginRecoverable: recoverable,
    finishFailed: finish,
  });
  return { ...f, recoverable, finish };
}
it("managed authored Move observation reserves recoverable owner before actual SDK IO", async () => {
  const f = managedFixture();
  await expect(f.run(await bytes())).resolves.toMatchObject({
    state: "authored-target-contracts-checked",
  });
  expect(f.recoverable).toHaveBeenCalledOnce();
  expect(f.finish).not.toHaveBeenCalled();
  expect(f.store.records.get(f.session.bindingKey)!.pending).toHaveLength(0);
});
it("managed Move cancellation keeps original ticket until ignored raw fetch settles", async () => {
  const f = managedFixture(),
    caller = new AbortController();
  let entered = false,
    release!: () => void;
  const held = new Promise<void>((r) => {
    release = r;
  });
  const task = f.run(await bytes(), {
    signal: caller.signal,
    fetch: async (...args) => {
      entered = true;
      await held;
      return f.fetch(...args);
    },
  });
  const rejected = expect(task).rejects.toThrow();
  try {
    await vi.waitFor(() => expect(entered).toBe(true));
    const original = f.store.records.get(f.session.bindingKey)!.pending[0].id;
    caller.abort(new Error("controlled Move caller cancellation"));
    await rejected;
    expect(
      f.store.records.get(f.session.bindingKey)!.pending.map((t) => t.id),
    ).toEqual([original]);
    expect(f.finish).not.toHaveBeenCalled();
    release();
    await vi.waitFor(() => expect(f.finish).toHaveBeenCalledOnce());
    await vi.waitFor(() =>
      expect(f.store.records.get(f.session.bindingKey)!.pending).toHaveLength(
        0,
      ),
    );
    expect(f.store.records.get(f.session.bindingKey)!.faults).toHaveLength(0);
    await expect(f.run(await bytes())).resolves.toMatchObject({
      state: "authored-target-contracts-checked",
    });
  } finally {
    release();
  }
});
it("failed managed Move terminal commit keeps original pending and refuses new IO", async () => {
  const f = managedFixture(),
    caller = new AbortController();
  let entered = false,
    release!: () => void;
  const held = new Promise<void>((r) => {
    release = r;
  });
  f.finish.mockRejectedValueOnce(
    new WalletNetworkAdmissionStateError("unavailable"),
  );
  const task = f.run(await bytes(), {
    signal: caller.signal,
    fetch: async (...args) => {
      entered = true;
      await held;
      return f.fetch(...args);
    },
  });
  const rejected = expect(task).rejects.toThrow();
  try {
    await vi.waitFor(() => expect(entered).toBe(true));
    caller.abort();
    await rejected;
    release();
    await vi.waitFor(() => expect(f.finish).toHaveBeenCalledOnce());
    expect(f.store.records.get(f.session.bindingKey)!.pending).toHaveLength(1);
    const calls = f.fetch.mock.calls.length;
    await expect(f.run(await bytes())).rejects.toMatchObject({
      reason: "reviewing",
    });
    expect(f.fetch).toHaveBeenCalledTimes(calls);
  } finally {
    release();
  }
});
it("builtin无伪ABI；只重核持久负面，不请求Move包", async () => {
  const f = fixture(),
    complete = vi.spyOn(f.store, "complete");
  expect(await f.run(await bytes(false))).toMatchObject({
    state: "native-or-opaque-only",
    deployment: "not-required",
    dependencies: { groups: [] },
    executionSemantics: "not-verified",
  });
  expect(f.fetch).not.toHaveBeenCalled();
  expect(complete).not.toHaveBeenCalled();
});
it("实际SDK未审核pin的staking合同完成同原ticket，无执行证书", async () => {
  const f = fixture(),
    begin = vi.spyOn(f.store, "begin"),
    complete = vi.spyOn(f.store, "complete");
  const r = await f.run(await bytes());
  expect(r).toMatchObject({
    state: "authored-target-contracts-checked",
    deployment: "unreviewed",
    executionSemantics: "not-verified",
  });
  const ticket = await begin.mock.results[0].value;
  expect(ticket.areas).toHaveLength(13);
  expect(complete.mock.calls[0][1]).toBe(ticket);
  expect(
    f.store.records.get(networkBindingKey(f.session.profile)),
  ).toMatchObject({ pending: [], faults: [] });
  expect(f.fetch.mock.calls.length).toBeGreaterThan(10);
});
it("占位begin失败0 SDK且不造空完成", async () => {
  const f = fixture(),
    complete = vi.spyOn(f.store, "complete");
  vi.spyOn(f.store, "begin").mockRejectedValueOnce(
    new WalletNetworkAdmissionStateError("unavailable"),
  );
  await expect(f.run(await bytes())).rejects.toMatchObject({
    reason: "unavailable",
  });
  expect(f.fetch).not.toHaveBeenCalled();
  expect(complete).not.toHaveBeenCalled();
});
it("native API缺失不退到memory成功", async () => {
  vi.stubGlobal("indexedDB", undefined);
  const f = fixture();
  await expect(
    f.run(await bytes(), { admission: new WalletNetworkAdmissionStore() }),
  ).rejects.toMatchObject({ reason: "unavailable" });
  expect(f.fetch).not.toHaveBeenCalled();
});
it("目标coins ABI负面持久记录并拒绝staking；builtin保持独立", async () => {
  const f = fixture();
  incompatible(f, "coin", "Coin");
  await expect(f.run(await bytes())).rejects.toMatchObject({
    reason: "quarantined",
  });
  expect(
    f.store.records.get(networkBindingKey(f.session.profile)),
  ).toMatchObject({
    pending: [],
    faults: [{ kind: "move-group", group: "coins", reason: "abi" }],
  });
  const calls = f.fetch.mock.calls.length;
  await expect(f.run(await bytes(false))).resolves.toMatchObject({
    state: "native-or-opaque-only",
  });
  expect(f.fetch).toHaveBeenCalledTimes(calls);
});
it("无关Display ABI负面保存但不伤staking审核目标", async () => {
  const f = fixture();
  incompatible(f, "display_registry", "DisplayKey");
  await expect(f.run(await bytes())).resolves.toMatchObject({
    state: "authored-target-contracts-checked",
  });
  expect(
    f.store.records.get(networkBindingKey(f.session.profile))!.faults,
  ).toContainEqual({ kind: "move-group", group: "display", reason: "abi" });
});
it("完成写失败仅一次，原pending阻止第二次目标检查", async () => {
  const f = fixture(),
    hook = vi
      .spyOn(f.store, "complete")
      .mockRejectedValueOnce(
        new WalletNetworkAdmissionStateError("unavailable"),
      );
  await expect(f.run(await bytes())).rejects.toMatchObject({
    reason: "unavailable",
  });
  expect(hook).toHaveBeenCalledTimes(1);
  expect(
    f.store.records.get(networkBindingKey(f.session.profile))!.pending,
  ).toHaveLength(1);
  const calls = f.fetch.mock.calls.length;
  await expect(f.run(await bytes())).rejects.toMatchObject({
    reason: "reviewing",
  });
  expect(f.fetch).toHaveBeenCalledTimes(calls);
});
it("明确ABI完成写失败不重试空决定，局部保持quarantined", async () => {
  const f = fixture();
  incompatible(f, "coin", "Coin");
  const hook = vi
    .spyOn(f.store, "complete")
    .mockRejectedValueOnce(new WalletNetworkAdmissionStateError("unavailable"));
  await expect(f.run(await bytes())).rejects.toMatchObject({
    reason: "quarantined",
  });
  expect(hook).toHaveBeenCalledTimes(1);
  expect(hook.mock.calls[0][2]).toContainEqual({
    kind: "move-group",
    group: "coins",
    reason: "abi",
  });
  expect(
    f.store.records.get(networkBindingKey(f.session.profile))!.pending,
  ).toHaveLength(1);
});
it("typed H0错链先停止session，保存负面；写失败不改空", async () => {
  const f = fixture();
  f.fetch.mockImplementationOnce(async () =>
    grpcPacket(
      GrpcTypes.GetServiceInfoResponse.toBinary({
        chainId: toBase58(new Uint8Array(32).fill(8)),
        checkpointHeight: 100n,
        lowestAvailableCheckpoint: 0n,
        lowestAvailableCheckpointObjects: 0n,
      }),
    ),
  );
  const complete = vi.spyOn(f.store, "complete");
  await expect(f.run(await bytes())).rejects.toMatchObject({
    role: "fullnode",
    reason: "chain-mismatch",
  });
  expect(() => f.session.assertActive()).toThrow();
  expect(complete).toHaveBeenCalledTimes(1);
  expect(
    f.store.records.get(networkBindingKey(f.session.profile)),
  ).toMatchObject({
    pending: [],
    faults: [{ kind: "identity", role: "fullnode", reason: "chain-mismatch" }],
  });
});
it("HTTP503未完成不伪造Fault，不空complete", async () => {
  const f = fixture();
  f.fetch.mockResolvedValue(new Response(null, { status: 503 }));
  const complete = vi.spyOn(f.store, "complete");
  await expect(f.run(await bytes())).rejects.toBeDefined();
  expect(complete).not.toHaveBeenCalled();
  expect(
    f.store.records.get(networkBindingKey(f.session.profile)),
  ).toMatchObject({ faults: [] });
  expect(
    f.store.records.get(networkBindingKey(f.session.profile))!.pending,
  ).toHaveLength(1);
});
it("cancelled raw fetch忽略abort，迟到响应不空完成", async () => {
  const f = fixture(),
    entered = Promise.withResolvers<void>(),
    held = Promise.withResolvers<Response>(),
    controller = new AbortController();
  f.fetch.mockImplementationOnce(async () => {
    entered.resolve();
    return held.promise;
  });
  const complete = vi.spyOn(f.store, "complete"),
    run = f.run(await bytes(), { signal: controller.signal });
  await entered.promise;
  controller.abort();
  await expect(run).rejects.toBeDefined();
  expect(complete).not.toHaveBeenCalled();
  held.resolve(
    grpcPacket(
      GrpcTypes.GetServiceInfoResponse.toBinary({
        chainId: f.session.profile.expectedGenesisDigest,
        checkpointHeight: 100n,
      }),
    ),
  );
  await new Promise((r) => setTimeout(r, 10));
  expect(complete).not.toHaveBeenCalled();
  expect(
    f.store.records.get(networkBindingKey(f.session.profile))!.pending,
  ).toHaveLength(1);
});
it("begin后取消且无SDK，不将原ticket空完成", async () => {
  const f = fixture(),
    controller = new AbortController(),
    original = f.store.begin.bind(f.store),
    complete = vi.spyOn(f.store, "complete");
  vi.spyOn(f.store, "begin").mockImplementationOnce(async (...args) => {
    const ticket = await original(...args);
    controller.abort();
    return ticket;
  });
  await expect(
    f.run(await bytes(), { signal: controller.signal }),
  ).rejects.toBeDefined();
  expect(f.fetch).not.toHaveBeenCalled();
  expect(complete).not.toHaveBeenCalled();
  expect(
    f.store.records.get(networkBindingKey(f.session.profile))!.pending,
  ).toHaveLength(1);
});
it("invalid compile registry阻止相应Move操作，不造global Fault；builtin无需声明", async () => {
  const f = fixture();
  vi.spyOn(releaseConfig, "selectConfiguredDeployment").mockImplementation(
    (profile) => selectReviewedDeployment(profile, "not-json"),
  );
  await expect(f.run(await bytes())).rejects.toMatchObject({
    reason: "release-policy",
  });
  expect(f.fetch).not.toHaveBeenCalled();
  expect(f.store.records.size).toBe(0);
  await expect(f.run(await bytes(false))).resolves.toMatchObject({
    state: "native-or-opaque-only",
  });
});
it("真实selector核验合成release pin，仅目标packages精确匹配", async () => {
  const f = fixture(),
    release = await reviewedDeploymentFixture(f.session.profile);
  vi.spyOn(releaseConfig, "selectConfiguredDeployment").mockImplementation(
    (profile) => selectReviewedDeployment(profile, release.registry),
  );
  await expect(f.run(await bytes())).resolves.toMatchObject({
    deployment: "release-pin-matched",
    executionSemantics: "not-verified",
  });
});
it("完成末检并发identity负面阻止有限正面发布", async () => {
  const f = fixture(),
    original = f.store.complete.bind(f.store);
  vi.spyOn(f.store, "complete").mockImplementationOnce(async (...args) => {
    const row = await original(...args),
      ticket = await f.store.begin(f.session.profile, [
        { kind: "identity", role: "accountHistory" },
      ]);
    await original(f.session.profile, ticket, [
      { kind: "identity", role: "accountHistory", reason: "incompatible" },
    ]);
    return row;
  });
  await expect(f.run(await bytes())).rejects.toMatchObject({
    reason: "quarantined",
  });
});
it("未激活readonly只重查owner，不接Move库；激活后每次有限检查", async () => {
  const f = fixture(),
    owner = vi.fn(async () => {}),
    guard = createTransactionMoveAuthorizer(
      f.session,
      await bytes(),
      sender,
      owner,
      { admission: f.store, fetch: f.fetch },
    );
  await guard.authorize();
  expect(owner).toHaveBeenCalledTimes(1);
  expect(f.fetch).not.toHaveBeenCalled();
  await guard.activate();
  const calls = f.fetch.mock.calls.length;
  expect(calls).toBeGreaterThan(10);
  expect(owner).toHaveBeenCalledTimes(3);
  await guard.authorize();
  expect(f.fetch).toHaveBeenCalledTimes(calls * 2);
  expect(owner).toHaveBeenCalledTimes(5);
});
it("probe等待期间owner撤权，后置owner检查拒绝发布", async () => {
  const f = fixture(),
    owner = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("Owner authorization revoked")),
    guard = createTransactionMoveAuthorizer(
      f.session,
      await bytes(),
      sender,
      owner,
      { admission: f.store, fetch: f.fetch },
    );
  await expect(guard.activate()).rejects.toThrow("Owner authorization revoked");
  expect(owner).toHaveBeenCalledTimes(2);
});
it("后置owner核验期间新增目标Fault由最后native读取拒绝", async () => {
  const f = fixture();
  let round = 0;
  const owner = async () => {
    if (++round === 2) {
      const ticket = await f.store.begin(f.session.profile, [
        { kind: "move-group", group: "staking" },
      ]);
      await f.store.complete(f.session.profile, ticket, [
        { kind: "move-group", group: "staking", reason: "abi" },
      ]);
    }
  };
  const guard = createTransactionMoveAuthorizer(
    f.session,
    await bytes(),
    sender,
    owner,
    { admission: f.store, fetch: f.fetch },
  );
  await expect(guard.activate()).rejects.toMatchObject({
    reason: "quarantined",
  });
});
it("后置owner期间session关闭，不发布晚到成功", async () => {
  const f = fixture();
  let round = 0;
  const owner = async () => {
    if (++round === 2) f.session.close();
  };
  const guard = createTransactionMoveAuthorizer(
    f.session,
    await bytes(),
    sender,
    owner,
    { admission: f.store, fetch: f.fetch },
  );
  await expect(guard.activate()).rejects.toBeDefined();
});

it("activate未完成或失败不能直接启动最终动作", async () => {
  const f = fixture();
  const action = vi.fn(async () => "signature");
  const guard = createTransactionMoveAuthorizer(
    f.session,
    await bytes(false),
    sender,
    async () => {
      throw new Error("owner revoked");
    },
    { admission: f.store },
  );
  await expect(guard.runFinal(action)).rejects.toMatchObject({
    reason: "stale",
  });
  await expect(guard.activate()).rejects.toThrow("owner revoked");
  await expect(guard.runFinal(action)).rejects.toMatchObject({
    reason: "stale",
  });
  expect(action).not.toHaveBeenCalled();
});

it("最终动作重新读取激活后提交的负面，不复用最后一次正检查", async () => {
  const f = fixture();
  const guard = createTransactionMoveAuthorizer(
    f.session,
    await bytes(false),
    sender,
    async () => {},
    { admission: f.store },
  );
  await guard.activate();
  const area = { kind: "identity", role: "fullnode" } as const;
  const ticket = await f.store.begin(f.session.profile, [area]);
  await f.store.complete(f.session.profile, ticket, [
    { ...area, reason: "chain-mismatch" },
  ]);
  const action = vi.fn(async () => "signature");
  await expect(guard.runFinal(action)).rejects.toMatchObject({
    reason: "quarantined",
  });
  expect(action).not.toHaveBeenCalled();
  expect(f.store.records.get(f.session.bindingKey)?.faults).toHaveLength(1);
});

it("最终动作原生读取返回前session关闭，callback检查拒绝且零动作", async () => {
  const f = fixture();
  const guard = createTransactionMoveAuthorizer(
    f.session,
    await bytes(false),
    sender,
    async () => {},
    { admission: f.store },
  );
  await guard.activate();
  const original = f.store.runIfClear.bind(f.store);
  vi.spyOn(f.store, "runIfClear").mockImplementation(
    async (p, areas, start) => {
      f.session.close();
      return original(p, areas, start);
    },
  );
  const action = vi.fn(async () => "signature");
  await expect(guard.runFinal(action)).rejects.toBeDefined();
  expect(action).not.toHaveBeenCalled();
});

// C124: actual SDK frames change only service-window responses; no probe result mocks.
function changingNativeWindow(
  info: (round: number) => Partial<GrpcTypes.GetServiceInfoResponse>,
) {
  const f = managedFixture();
  let rounds = 0;
  const fetch = vi.fn<typeof globalThis.fetch>(async (url, init) => {
    if (String(url).endsWith("LedgerService/GetServiceInfo")) {
      return grpcPacket(
        GrpcTypes.GetServiceInfoResponse.toBinary({
          chainId: f.session.profile.expectedGenesisDigest,
          checkpointHeight: 100n,
          lowestAvailableCheckpoint: 0n,
          lowestAvailableCheckpointObjects: 0n,
          ...info(++rounds),
        }),
      );
    }
    return f.fetch(url, init);
  });
  return {
    ...f,
    windowFetch: fetch,
    rounds: () => rounds,
    runWindow: async (
      options: Parameters<typeof assertTransactionMoveAdmission>[3] = {},
    ) => f.run(await bytes(), { fetch, ...options }),
  };
}
it("C124 advances once then rereads all packages under one original ticket", async () => {
  const f = changingNativeWindow((n) => ({
    lowestAvailableCheckpoint: n === 1 ? 0n : 1n,
  }));
  const complete = vi.spyOn(f.store, "complete");
  await expect(f.runWindow()).resolves.toMatchObject({
    state: "authored-target-contracts-checked",
  });
  expect(f.rounds()).toBe(4);
  expect(f.recoverable).toHaveBeenCalledOnce();
  expect(complete).toHaveBeenCalledOnce();
  const ticket = await f.recoverable.mock.results[0].value;
  expect(complete.mock.calls[0][1]).toBe(ticket);
  const packages = f.fetch.mock.calls
    .filter(([url]) => String(url).endsWith("/GetPackage"))
    .map(
      ([, init]) =>
        GrpcTypes.GetPackageRequest.fromBinary(
          (init!.body as Uint8Array).slice(5),
        ).packageId,
    );
  expect(new Set(packages).size).toBeGreaterThan(0);
  for (const id of new Set(packages))
    expect(packages.filter((x) => x === id)).toHaveLength(2);
  expect(f.finish).not.toHaveBeenCalled();
  expect(f.store.records.get(f.session.bindingKey)).toMatchObject({
    pending: [],
    faults: [],
  });
});
it("C124 repeated movement stops after two complete attempts and drains original owner", async () => {
  const f = changingNativeWindow((n) => ({
    lowestAvailableCheckpoint: BigInt(Math.floor(n / 2)),
  }));
  await expect(f.runWindow()).rejects.toMatchObject({
    name: "WalletNativeReadWindowChangedError",
    code: "ABORTED",
  });
  expect(f.rounds()).toBe(4);
  expect(f.recoverable).toHaveBeenCalledOnce();
  await vi.waitFor(() => expect(f.finish).toHaveBeenCalledOnce());
  expect(f.store.records.get(f.session.bindingKey)).toMatchObject({
    pending: [],
    faults: [],
  });
});
it.each([
  "lowestAvailableCheckpoint",
  "lowestAvailableCheckpointObjects",
] as const)("C124 missing or decreasing %s never retries", async (field) => {
  for (const info of [
    (n: number) => ({ [field]: n === 1 ? 1n : 0n }),
    (_n: number) => ({ [field]: undefined }),
  ]) {
    const f = changingNativeWindow(info);
    await expect(f.runWindow()).rejects.toMatchObject({
      reason: "incompatible",
    });
    expect(f.rounds()).toBeLessThanOrEqual(2);
    expect(f.recoverable).toHaveBeenCalledOnce();
  }
});
it("C124 second attempt wrong H0 remains a persistent identity refusal", async () => {
  const f = changingNativeWindow((n) =>
    n === 3
      ? { chainId: toBase58(new Uint8Array(32).fill(9)) }
      : { lowestAvailableCheckpoint: n === 1 ? 0n : 1n },
  );
  await expect(f.runWindow()).rejects.toMatchObject({
    reason: "chain-mismatch",
  });
  expect(f.rounds()).toBe(3);
  expect(f.store.records.get(f.session.bindingKey)!.faults).toContainEqual({
    kind: "identity",
    role: "fullnode",
    reason: "chain-mismatch",
  });
  const count = f.windowFetch.mock.calls.length;
  await expect(f.runWindow()).rejects.toThrow();
  expect(f.windowFetch).toHaveBeenCalledTimes(count);
});
it("C124 fresh second attempt ABI negative cannot reuse first package report", async () => {
  const f = changingNativeWindow((n) => {
    if (n === 3) incompatible(f, "coin", "Coin");
    return { lowestAvailableCheckpoint: n === 1 ? 0n : 1n };
  });
  await expect(f.runWindow()).rejects.toMatchObject({ reason: "quarantined" });
  expect(f.rounds()).toBe(4);
  expect(f.store.records.get(f.session.bindingKey)!.faults).toContainEqual({
    kind: "move-group",
    group: "coins",
    reason: "abi",
  });
});
it("C124 fresh second attempt package version cannot reuse reviewed release pins", async () => {
  const f = changingNativeWindow((n) => {
    if (n === 3) {
      const pkg = [...f.values.packages.values()].find((p) =>
        p.storageId!.endsWith("3"),
      )!;
      pkg.version = 2n;
      f.values.objects.set(pkg.storageId!, packageObject(pkg));
    }
    return { lowestAvailableCheckpoint: n === 1 ? 0n : 1n };
  });
  const release = await reviewedDeploymentFixture(f.session.profile);
  vi.spyOn(releaseConfig, "selectConfiguredDeployment").mockImplementation(
    (profile) => selectReviewedDeployment(profile, release.registry),
  );
  await expect(f.runWindow()).rejects.toMatchObject({ reason: "package-pin" });
  expect(f.rounds()).toBe(4);
  expect(f.recoverable).toHaveBeenCalledOnce();
  expect(f.store.records.get(f.session.bindingKey)).toMatchObject({
    pending: [],
    faults: [],
  });
});
it("C124 cancellation before second package IO keeps the original cancellation", async () => {
  const controller = new AbortController();
  const reason = new Error("C124 caller cancellation during fresh window");
  const f = changingNativeWindow((n) => {
    if (n === 3) controller.abort(reason);
    return { lowestAvailableCheckpoint: n === 1 ? 0n : 1n };
  });
  await expect(f.runWindow({ signal: controller.signal })).rejects.toBe(reason);
  expect(f.rounds()).toBe(3);
  expect(f.recoverable).toHaveBeenCalledOnce();
  await vi.waitFor(() => expect(f.finish).toHaveBeenCalledOnce());
  expect(f.store.records.get(f.session.bindingKey)).toMatchObject({
    pending: [],
    faults: [],
  });
});
it("C124 retry shares original total deadline and waits for ignored raw response", async () => {
  const f = changingNativeWindow((n) => ({
    lowestAvailableCheckpoint: n === 1 ? 0n : 1n,
  }));
  let entered = false,
    release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const start = performance.now();
  const task = f.runWindow({
    timeoutMs: 1000,
    fetch: async (...args) => {
      if (
        String(args[0]).endsWith("LedgerService/GetServiceInfo") &&
        f.rounds() === 2
      ) {
        entered = true;
        await held;
      }
      return f.windowFetch(...args);
    },
  });
  const rejected = expect(task).rejects.toMatchObject({ name: "TimeoutError" });
  try {
    await vi.waitFor(() => expect(entered).toBe(true));
    await rejected;
    expect(performance.now() - start).toBeLessThan(1600);
    expect(f.rounds()).toBe(2);
    expect(f.finish).not.toHaveBeenCalled();
    expect(f.store.records.get(f.session.bindingKey)!.pending).toHaveLength(1);
    release();
    await vi.waitFor(() => expect(f.finish).toHaveBeenCalledOnce());
    expect(f.store.records.get(f.session.bindingKey)).toMatchObject({
      pending: [],
      faults: [],
    });
  } finally {
    release();
  }
});
