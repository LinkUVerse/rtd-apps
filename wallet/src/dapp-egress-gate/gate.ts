// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import Browser from "webextension-polyfill";
import { WalletDappEgressStore } from "../shared/rpc/dapp-egress-store";
import { validateNetworkProfile } from "../shared/rpc/profile";
import {
  DAPP_EGRESS_GATE_CHANNEL,
  ownEgressObject,
  validateDappEgressMessage,
} from "../shared/rpc/dapp-egress-protocol";

/** The gate has no UI/bootstrap/approval capability. Options are compiler-fixture owned only. */
export function installDappEgressGate(
  options: { databaseName?: string } = {},
): void {
  if (window.top === window.self) return;
  const store = new WalletDappEgressStore(options);
  let initialized = false,
    closed = false,
    paired = false;
  let runtime: ReturnType<typeof Browser.runtime.connect> | undefined,
    privatePort: MessagePort | undefined,
    parentOrigin: string | undefined;
  const requests = new Set<string>();
  const close = () => {
    if (closed) return;
    closed = true;
    paired = false;
    privatePort?.close();
    try {
      runtime?.disconnect();
    } catch {}
  };
  const initialize = (event: MessageEvent) => {
    const input: unknown = event.data;
    if (
      initialized ||
      closed ||
      event.source !== parent ||
      event.ports.length !== 1 ||
      !ownEgressObject(input, ["kind", "session", "cap", "parentOrigin"]) ||
      input.kind !== "rtd-egress-private-init" ||
      typeof input.session !== "string" ||
      !/^[a-f0-9]{64}$/.test(input.session) ||
      typeof input.cap !== "string" ||
      !/^[a-f0-9]{64}$/.test(input.cap) ||
      typeof input.parentOrigin !== "string" ||
      event.origin !== input.parentOrigin
    )
      return;
    let parentUrl: URL;
    try {
      parentUrl = new URL(input.parentOrigin);
    } catch {
      return;
    }
    if (
      !["http:", "https:"].includes(parentUrl.protocol) ||
      parentUrl.origin !== input.parentOrigin
    )
      return;
    initialized = true;
    parentOrigin = input.parentOrigin;
    privatePort = event.ports[0];
    window.removeEventListener("message", initialize);
    runtime = Browser.runtime.connect({ name: DAPP_EGRESS_GATE_CHANNEL });
    runtime.onDisconnect.addListener(close);
    runtime.onMessage.addListener((message: unknown) => {
      void (async () => {
        if (closed || !runtime || !privatePort) return;
        if (
          ownEgressObject(message, ["kind", "challenge"]) &&
          message.kind === "rtd-egress-challenge" &&
          !paired &&
          typeof message.challenge === "string" &&
          /^[a-f0-9]{64}$/.test(message.challenge)
        ) {
          privatePort.postMessage(message);
          return;
        }
        if (
          ownEgressObject(message, ["kind", "parentOrigin"]) &&
          message.kind === "rtd-egress-paired" &&
          !paired &&
          message.parentOrigin === parentOrigin
        ) {
          paired = true;
          privatePort.postMessage({ kind: "rtd-egress-paired" });
          return;
        }
        if (
          !paired ||
          !ownEgressObject(message, ["kind", "profile", "ticket", "binding"]) ||
          message.kind !== "rtd-egress-result" ||
          typeof message.ticket !== "string" ||
          !/^[a-f0-9]{64}$/.test(message.ticket) ||
          !message.binding ||
          typeof message.binding !== "object"
        )
          throw new Error("结果通道消息无效");
        const profile = validateNetworkProfile(message.profile),
          binding = message.binding as Parameters<
            WalletDappEgressStore["consume"]
          >[2];
        if (
          binding.origin !== parentOrigin ||
          requests.has(binding.requestId) ||
          requests.size >= 64
        )
          throw new Error("结果来源或请求无效");
        requests.add(binding.requestId);
        const receipt = await store.consume(profile, message.ticket, binding);
        if (closed || !paired) throw new Error("结果通道已关闭");
        await store.deliver(profile, receipt, binding, (payload) => {
          if (closed || !paired || binding.origin !== parentOrigin)
            throw new Error("结果通道已关闭");
          const result = validateDappEgressMessage(
            JSON.parse(payload),
            binding.requestId,
          );
          parent.postMessage(
            { target: "rtd_in-page", payload: result },
            parentOrigin!,
          );
        });
        if (closed || !paired) throw new Error("结果交付未确认");
        runtime.postMessage({
          kind: "rtd-egress-delivered",
          requestId: binding.requestId,
        });
        requests.delete(binding.requestId);
      })().catch(close);
    });
    runtime.postMessage({
      kind: "rtd-egress-claim",
      session: input.session,
      cap: input.cap,
      parentOrigin,
    });
  };
  window.addEventListener("message", initialize);
  window.addEventListener("pagehide", close, { once: true });
  setTimeout(() => {
    if (!paired) close();
  }, 30000);
}
