// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Real SDK/fetch/body ordering; memory admission is control-flow evidence only.
import { expect, it, vi } from "vitest";
import { MemoryNetworkAdmission } from "../../../tests/unit/rpc/network-admission-fixture";
import { MemoryNetworkObservations } from "../../../tests/unit/rpc/network-observation-fixture";
import { networkIdentityFixture } from "../../../tests/unit/rpc/network-identity-fixture";
import { assertTransactionNetworkIdentity } from "./transaction-network-identity";
import {
  consumeCapabilityTerminalFailure,
  type CapabilityTerminalFailure,
} from "./capability-observation-lifetime";
import {
  networkBindingKey,
  validateNetworkProfile,
  type ValidatedNetworkProfile,
} from "./profile";
import { profileFixture } from "./profile-fixture";
import { WalletReadSession } from "./session";
import {
  WalletNetworkAdmissionStateError,
  type NetworkAdmissionTicket,
} from "./network-admission-state";

class Store extends MemoryNetworkAdmission {
  beginRecoverable = vi.fn(
    (p: ValidatedNetworkProfile, areas: Parameters<Store["begin"]>[1]) =>
      this.begin(p, areas),
  );
  finishFailed = vi.fn(
    (
      p: ValidatedNetworkProfile,
      ticket: NetworkAdmissionTicket,
      receipt: CapabilityTerminalFailure,
    ) =>
      this.complete(
        p,
        ticket,
        consumeCapabilityTerminalFailure(receipt, networkBindingKey(p), ticket),
      ),
  );
}
function setup() {
  const session = new WalletReadSession(
    validateNetworkProfile(profileFixture()),
  );
  const admission = new Store(),
    observations = new MemoryNetworkObservations();
  const run = (fetch: typeof globalThis.fetch, signal?: AbortSignal) =>
    assertTransactionNetworkIdentity(session, {
      fetch,
      signal,
      admission,
      observations,
    });
  const row = () => admission.records.get(session.bindingKey)!;
  return { session, admission, run, row };
}
it("uses the recoverable read-owner entry before actual identity IO", async () => {
  const f = setup(),
    wire = networkIdentityFixture();
  try {
    await expect(f.run(wire.fetch)).resolves.toMatchObject({
      state: "identity-verified",
    });
    expect(f.admission.beginRecoverable).toHaveBeenCalledOnce();
    expect(f.admission.finishFailed).not.toHaveBeenCalled();
    expect(f.row().pending).toHaveLength(0);
  } finally {
    f.session.close();
  }
});
it("caller cancellation retains the original ticket until ignored fetch work ends", async () => {
  const f = setup(),
    wire = networkIdentityFixture(),
    caller = new AbortController();
  let release!: () => void,
    entered = false;
  const held = new Promise<void>((r) => {
    release = r;
  });
  const fetch: typeof globalThis.fetch = async (...args) => {
    entered = true;
    await held;
    return wire.fetch(...args);
  };
  const result = f.run(fetch, caller.signal),
    rejected = expect(result).rejects.toThrow("controlled caller cancellation");
  try {
    await vi.waitFor(() => expect(entered).toBe(true));
    const original = f.row().pending[0].id;
    caller.abort(new Error("controlled caller cancellation"));
    await rejected;
    expect(f.row().pending.map((t) => t.id)).toEqual([original]);
    expect(f.admission.finishFailed).not.toHaveBeenCalled();
    release();
    await vi.waitFor(() =>
      expect(f.admission.finishFailed).toHaveBeenCalledOnce(),
    );
    await vi.waitFor(() => expect(f.row().pending).toHaveLength(0));
    expect(f.row().faults).toHaveLength(0);
    await expect(f.run(networkIdentityFixture().fetch)).resolves.toMatchObject({
      state: "identity-verified",
    });
  } finally {
    release();
    f.session.close();
  }
});
it("raw body cancellation cleanup keeps the ticket after the caller has already failed", async () => {
  const f = setup(),
    wire = networkIdentityFixture(),
    caller = new AbortController();
  let bodyEntered = false,
    cancelEntered = false,
    releaseBody!: () => void,
    releaseCancel!: () => void;
  const cancel = new Promise<void>((r) => {
    releaseCancel = r;
  });
  const fetch: typeof globalThis.fetch = async (...args) => {
    const response = await wire.fetch(...args);
    if (
      !String(args[0]).startsWith(f.session.profile.endpoints.fullnodeGrpcWeb)
    )
      return response;
    const bytes = new Uint8Array(await response.arrayBuffer());
    let delivered = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.subarray(0, 1));
      },
      pull(controller) {
        if (delivered) return;
        delivered = true;
        bodyEntered = true;
        return new Promise<void>((resolve) => {
          releaseBody = () => {
            releaseBody = () => {};
            controller.enqueue(bytes.subarray(1));
            resolve();
          };
        });
      },
      cancel() {
        cancelEntered = true;
        return cancel;
      },
    });
    return new Response(body, {
      status: response.status,
      headers: response.headers,
    });
  };
  const result = f.run(fetch, caller.signal),
    rejected = expect(result).rejects.toThrow();
  try {
    await vi.waitFor(() => expect(bodyEntered).toBe(true));
    caller.abort(new Error("body caller cancelled"));
    await rejected;
    expect(f.row().pending).toHaveLength(1);
    releaseBody();
    await vi.waitFor(() => expect(cancelEntered).toBe(true));
    expect(f.row().pending).toHaveLength(1);
    expect(f.admission.finishFailed).not.toHaveBeenCalled();
    releaseCancel();
    await vi.waitFor(() => expect(f.row().pending).toHaveLength(0));
    expect(f.admission.finishFailed).toHaveBeenCalledOnce();
  } finally {
    releaseBody?.();
    releaseCancel();
    f.session.close();
  }
});
it("failed terminal storage keeps pending and prevents a new independent probe", async () => {
  const f = setup(),
    caller = new AbortController(),
    wire = networkIdentityFixture();
  let release!: () => void,
    entered = false;
  const held = new Promise<void>((r) => {
    release = r;
  });
  f.admission.finishFailed.mockRejectedValueOnce(
    new WalletNetworkAdmissionStateError("unavailable"),
  );
  const result = f.run(async (...args) => {
    entered = true;
    await held;
    return wire.fetch(...args);
  }, caller.signal);
  const rejected = expect(result).rejects.toThrow();
  try {
    await vi.waitFor(() => expect(entered).toBe(true));
    caller.abort(new Error("cancelled"));
    await rejected;
    release();
    await vi.waitFor(() =>
      expect(f.admission.finishFailed).toHaveBeenCalledOnce(),
    );
    expect(f.row().pending).toHaveLength(1);
    const next = networkIdentityFixture();
    await expect(f.run(next.fetch)).rejects.toMatchObject({
      reason: "reviewing",
    });
    expect(next.requests).toHaveLength(0);
  } finally {
    release();
    f.session.close();
  }
});
