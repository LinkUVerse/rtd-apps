// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import {
  CapabilityObservationLifetime,
  consumeCapabilityTerminalFailure,
  type CapabilityTerminalFailure,
} from "./capability-observation-lifetime";
import { createNetworkAdmissionTicket } from "./network-admission-state";
import { NetworkIdentityError } from "./identity";
import { WalletReadSession } from "./session";
import { validateNetworkProfile } from "./profile";
import { profileFixture } from "./profile-fixture";
const setup = () => {
  const session = new WalletReadSession(
    validateNetworkProfile(profileFixture()),
  );
  const ticket = createNetworkAdmissionTicket([
    { kind: "identity", role: "fullnode" },
  ]);
  return {
    session,
    ticket,
    life: new CapabilityObservationLifetime(session, ticket),
  };
};
describe("失败观察的实际工作收尾凭据", () => {
  it("abort/wrapper rejection 不结束 raw work，迟到负面在收尾前收集", async () => {
    const f = setup(),
      held = Promise.withResolvers<void>();
    const raw = f.life.track(held.promise);
    void raw.catch(() => undefined);
    f.session.close();
    let settled = false;
    const finished = f.life.fail(new DOMException("cancelled", "AbortError"));
    void finished.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
    held.reject(new NetworkIdentityError("fullnode", "chain-mismatch"));
    const receipt = await finished;
    expect(
      consumeCapabilityTerminalFailure(receipt, f.session.bindingKey, f.ticket),
    ).toEqual([
      { kind: "identity", role: "fullnode", reason: "chain-mismatch" },
    ]);
  });
  it("所有权来自原 ticket；克隆、别的绑定、重放均不能消费", async () => {
    const f = setup(),
      receipt = await f.life.fail(new Error());
    for (const [proof, key, ticket] of [
      [structuredClone(receipt), f.session.bindingKey, f.ticket],
      [receipt, f.session.bindingKey + "changed", f.ticket],
      [receipt, f.session.bindingKey, structuredClone(f.ticket)],
    ] as const)
      expect(() =>
        consumeCapabilityTerminalFailure(
          proof as CapabilityTerminalFailure,
          key,
          ticket,
        ),
      ).toThrow();
    expect(
      consumeCapabilityTerminalFailure(receipt, f.session.bindingKey, f.ticket),
    ).toEqual([]);
    expect(() =>
      consumeCapabilityTerminalFailure(receipt, f.session.bindingKey, f.ticket),
    ).toThrow();
  });
  it("聚合、body、cancel 清理各自保持；封闭后不能追加 IO", async () => {
    const f = setup(),
      body = Promise.withResolvers<void>(),
      cleanup = Promise.withResolvers<void>();
    f.life.track(body.promise);
    f.life.track(cleanup.promise);
    let settled = false;
    const done = f.life.fail(new Error());
    void done.then(() => {
      settled = true;
    });
    body.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);
    expect(() => f.life.assertOpen()).toThrow();
    cleanup.resolve();
    expect(
      consumeCapabilityTerminalFailure(
        await done,
        f.session.bindingKey,
        f.ticket,
      ),
    ).toEqual([]);
  });
});
