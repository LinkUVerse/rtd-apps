// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// IndexedDB state-machine coverage; Chrome acceptance supplies native evidence.
import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import { WalletDappEgressStore } from "./dapp-egress-store";
import { WalletNetworkAdmissionStore } from "./network-admission-store";
import { validateNetworkProfile } from "./profile";
import { profileFixture } from "./profile-fixture";

const source = {
  origin: "https://example.com",
  tabId: 1,
  frameId: 0,
  documentId: "original-document",
  requestId: "original-request",
  account: "0x" + "a".repeat(64),
  gateOwner: "b".repeat(64),
};
const area = { kind: "identity", role: "fullnode" } as const;
const message = {
  id: source.requestId,
  payload: {
    type: "execute-transaction-response",
    result: {
      digest: "A".repeat(43),
      bytes: "YQ==",
      signature: "Yg==",
      effects: "Yw==",
    },
  },
};
async function setup(stages: ("sign" | "dispatch")[] = ["sign", "dispatch"]) {
  const options = {
    indexedDB: new IDBFactory(),
    databaseName: "RtdWallet NetworkAdmission:test:result-lifetime",
  };
  const profile = validateNetworkProfile(profileFixture());
  const store = new WalletDappEgressStore(options);
  const admission = new WalletNetworkAdmissionStore(options);
  await store.startEpoch();
  const observation = await admission.begin(profile, [area]);
  await admission.complete(profile, observation, []);
  let now = 100_000;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  const lease = await store.capture(profile, source);
  const action = vi.fn(async () => undefined);
  for (const stage of stages) await store.runBeforeAction(lease, stage, action);
  return {
    profile,
    store,
    admission,
    lease,
    action,
    advance: (ms = 31_000) => {
      now += ms;
    },
  };
}

describe("已执行结果的交付时限与动作时限分离", () => {
  it("复现旧出口在 30 秒后拒绝已有结果", async () => {
    const { store, lease, advance } = await setup();
    advance();
    await expect(
      store.issue(lease, JSON.stringify(message)),
    ).rejects.toMatchObject({ reason: "corrupt" });
  });
  it("超时后仅交付一次原结果，不重签重发，不能复用 lease/ticket/receipt", async () => {
    const { profile, store, lease, advance, action } = await setup();
    advance();
    const issued = await store.issueConfirmedExecution(lease, message);
    const receipt = await store.consume(profile, issued.ticket, issued.binding);
    const posted: string[] = [];
    await store.deliver(profile, receipt, issued.binding, (payload) => {
      posted.push(payload);
    });
    expect(posted.map((payload) => JSON.parse(payload))).toEqual([message]);
    expect(action).toHaveBeenCalledTimes(2);
    await expect(
      store.issueConfirmedExecution(lease, message),
    ).rejects.toMatchObject({ reason: "stale" });
    await expect(
      store.runBeforeAction(lease, "sign", action),
    ).rejects.toMatchObject({ reason: "stale" });
    await expect(
      store.consume(profile, issued.ticket, issued.binding),
    ).rejects.toThrow();
    await expect(
      store.deliver(profile, receipt, issued.binding, () => {}),
    ).rejects.toThrow();
  });
  it.each([[], ["sign"], ["dispatch"]] as ("sign" | "dispatch")[][])(
    "未走完两项动作不能用结果通道 %#",
    async (...stages) => {
      const { store, lease, advance } = await setup(stages);
      advance();
      await expect(
        store.issueConfirmedExecution(lease, message),
      ).rejects.toThrow();
    },
  );
  it("过期前未开始的 dispatch 仍拒绝，拒绝动作不算已提交", async () => {
    const { store, lease, advance, action } = await setup(["sign"]);
    advance();
    await expect(
      store.runBeforeAction(lease, "dispatch", action),
    ).rejects.toThrow();
    expect(action).toHaveBeenCalledTimes(1);
    await expect(
      store.issueConfirmedExecution(lease, message),
    ).rejects.toThrow();
  });
  it.each(["epoch", "revision", "pending", "negative", "reviewing", "clock"])(
    "%s 改变继续阻断结果",
    async (change) => {
      const { store, lease, admission, profile, advance } = await setup();
      advance();
      if (change === "epoch") await store.startEpoch();
      if (change === "revision") await store.mutate(() => undefined);
      if (change === "pending") await store.beginMutation();
      if (change === "negative" || change === "reviewing") {
        const observation = await admission.begin(profile, [area]);
        if (change === "negative")
          await admission.complete(profile, observation, [
            { ...area, reason: "chain-mismatch" },
          ]);
      }
      if (change === "clock") advance(-40_000);
      await expect(
        store.issueConfirmedExecution(lease, message),
      ).rejects.toThrow();
    },
  );
  it.each(["request", "sign", "message"])(
    "拒绝 %s 结果借用执行出口",
    async (kind) => {
      const { store, lease, advance } = await setup();
      advance();
      const wrong =
        kind === "request"
          ? { ...message, id: "another" }
          : kind === "sign"
            ? {
                id: source.requestId,
                payload: {
                  type: "sign-transaction-response",
                  result: { transactionBlockBytes: "YQ==", signature: "Yg==" },
                },
              }
            : {
                id: source.requestId,
                payload: {
                  type: "sign-message-request",
                  return: { messageBytes: "YQ==", signature: "Yg==" },
                },
              };
      await expect(
        store.issueConfirmedExecution(lease, wrong),
      ).rejects.toThrow();
    },
  );
  it("新交付票据仍在 10 秒到期", async () => {
    const { store, profile, lease, advance } = await setup();
    advance();
    const issued = await store.issueConfirmedExecution(lease, message);
    advance(10_000);
    await expect(
      store.consume(profile, issued.ticket, issued.binding),
    ).rejects.toThrow();
  });
  it.each(["document", "account", "origin", "revoked"])(
    "交付前 %s 改变仍不泄漏结果",
    async (change) => {
      const { store, profile, lease, advance } = await setup();
      advance();
      const issued = await store.issueConfirmedExecution(lease, message);
      if (change === "revoked") {
        const receipt = await store.consume(
          profile,
          issued.ticket,
          issued.binding,
        );
        await store.mutate(() => undefined);
        const posted: string[] = [];
        await expect(
          store.deliver(profile, receipt, issued.binding, (payload) => {
            posted.push(payload);
          }),
        ).rejects.toThrow();
        expect(posted).toEqual([]);
      } else {
        const binding = { ...issued.binding };
        if (change === "document") binding.documentId = "new-document";
        if (change === "account") binding.account = "0x" + "c".repeat(64);
        if (change === "origin") binding.origin = "https://other.example";
        await expect(
          store.consume(profile, issued.ticket, binding),
        ).rejects.toThrow();
      }
    },
  );
});
