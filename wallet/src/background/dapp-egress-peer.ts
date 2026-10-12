// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import Browser, { type Runtime } from "webextension-polyfill";
import { validateDappEgressMessage } from "../shared/rpc/dapp-egress-protocol";
import type { NetworkAdmissionArea } from "../shared/rpc/network-admission-state";
import {
  WalletDappEgressStore,
  type WalletEgressLease,
} from "../shared/rpc/dapp-egress-store";
import {
  validateNetworkProfile,
  type ValidatedNetworkProfile,
} from "../shared/rpc/profile";
import {
  nativeSource,
  httpTopSource,
  nativeSourceKey,
  assertCurrentHttpSource,
  assertCurrentGate,
  nativeContextApi,
  type NativeContextApi,
  type DappNativeSource,
} from "./dapp-native-context";

export const DAPP_EGRESS_SOURCE_CHANNEL = "rtd-egress-source";
export const DAPP_EGRESS_GATE_CHANNEL = "rtd-egress-gate";
const random = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
const refuse = (): never => {
  throw new Error("dApp私有结果通道已失效");
};
function exact(
  v: unknown,
  keys: readonly string[],
): v is Record<string, unknown> {
  return (
    !!v &&
    Object.getPrototypeOf(v) === Object.prototype &&
    Object.getOwnPropertySymbols(v).length === 0 &&
    Object.getOwnPropertyNames(v).length === keys.length &&
    keys.every(
      (k) =>
        Object.hasOwn(v, k) &&
        Object.hasOwn(Object.getOwnPropertyDescriptor(v, k)!, "value"),
    )
  );
}
interface Lifetime {
  closed: boolean;
  queued: unknown[];
  handler?: (message: unknown) => void;
  listen(handler: (message: unknown) => void): void;
}
interface Gate {
  port: Runtime.Port;
  source: DappNativeSource;
  owner: string;
  closed: () => boolean;
  challenge?: string;
  confirming: boolean;
}
interface Acknowledgement {
  resolve: () => void;
  reject: (error: Error) => void;
}
interface Peer {
  id: string;
  cap?: string;
  source: DappNativeSource;
  port: Runtime.Port;
  closed: boolean;
  gate?: Gate;
  provisional?: Gate;
  timer: ReturnType<typeof setTimeout>;
  paired: Promise<void>;
  confirm: () => void;
  reject: (error: Error) => void;
  revocation?: Promise<void>;
  acks: Map<string, Acknowledgement>;
}
type ClaimState = {
  peer: Peer;
  profile: ValidatedNetworkProfile;
  lease: WalletEgressLease;
  requestId: string;
};
export type WalletDappEgressClaim = Readonly<object>;

/** Background-only broker. Startup is supplied by the worker controller, never by a gate. */
export class WalletDappEgressPeerBroker {
  readonly #sessions = new Map<string, Peer>();
  readonly #sources = new Map<string, Peer>();
  readonly #gatePorts = new Set<Runtime.Port>();
  readonly #claims = new WeakMap<WalletDappEgressClaim, ClaimState>();
  constructor(
    private readonly store: WalletDappEgressStore,
    private readonly ready: Promise<unknown>,
    private readonly api: NativeContextApi = nativeContextApi,
    private readonly extensionId = Browser.runtime.id,
    private readonly gateUrl = Browser.runtime.getURL("egress-gate.html"),
  ) {}
  /** Register native lifetime and one-message inbox synchronously, before any readiness await. */
  accept(port: Runtime.Port): void {
    const lifetime: Lifetime = {
      closed: false,
      queued: [],
      listen(handler) {
        this.handler = handler;
        for (const m of this.queued.splice(0)) if (!this.closed) handler(m);
      },
    };
    const close = () => {
      lifetime.closed = true;
      lifetime.queued.length = 0;
      try {
        port.disconnect();
      } catch {}
    };
    port.onDisconnect.addListener(() => {
      lifetime.closed = true;
      lifetime.queued.length = 0;
    });
    port.onMessage.addListener((message) => {
      if (lifetime.closed) return;
      if (lifetime.handler) {
        lifetime.handler(message);
        return;
      }
      if (port.name !== DAPP_EGRESS_GATE_CHANNEL || lifetime.queued.length) {
        close();
        return;
      }
      lifetime.queued.push(message);
    });
    void this.#accept(port, lifetime).catch(close);
  }
  async #accept(port: Runtime.Port, lifetime: Lifetime) {
    await this.ready;
    if (lifetime.closed) return refuse();
    if (port.name === DAPP_EGRESS_SOURCE_CHANNEL) {
      const source = httpTopSource(port.sender, this.extensionId),
        key = nativeSourceKey(source);
      if (this.#sessions.size >= 32 || this.#sources.has(key)) return refuse();
      await assertCurrentHttpSource(source, this.api);
      if (lifetime.closed || this.#sources.has(key)) return refuse();
      let confirm!: () => void, reject!: (error: Error) => void;
      const paired = new Promise<void>((resolve, bad) => {
        confirm = resolve;
        reject = bad;
      });
      void paired.catch(() => undefined);
      const peer: Peer = {
        id: random(),
        cap: random(),
        source,
        port,
        closed: false,
        paired,
        confirm,
        reject,
        acks: new Map(),
        timer: setTimeout(() => {
          void this.#revoke(peer).catch(() => undefined);
        }, 30000),
      };
      this.#sessions.set(peer.id, peer);
      this.#sources.set(key, peer);
      port.onDisconnect.addListener(() => {
        void this.#revoke(peer).catch(() => undefined);
      });
      lifetime.listen((message) => {
        void (async () => {
          if (
            peer.gate &&
            !peer.closed &&
            !lifetime.closed &&
            exact(message, ["kind"]) &&
            message.kind === "rtd-egress-heartbeat"
          ) {
            const currentGate = peer.gate;
            if (currentGate.closed()) return refuse();
            await Promise.all([
              assertCurrentHttpSource(source, this.api),
              assertCurrentGate(currentGate.source, this.api),
            ]);
            if (peer.closed || lifetime.closed || currentGate.closed())
              return refuse();
            port.postMessage({ kind: "rtd-egress-alive" });
            return;
          }
          const gate = peer.provisional;
          if (
            peer.closed ||
            lifetime.closed ||
            peer.gate ||
            !gate ||
            gate.closed() ||
            gate.confirming ||
            !exact(message, ["kind", "session", "challenge"]) ||
            message.kind !== "rtd-egress-confirm" ||
            message.session !== peer.id ||
            message.challenge !== gate.challenge
          )
            return refuse();
          gate.confirming = true;
          await Promise.all([
            assertCurrentHttpSource(source, this.api),
            assertCurrentGate(gate.source, this.api),
          ]);
          if (peer.closed || lifetime.closed || gate.closed()) return refuse();
          gate.challenge = undefined;
          peer.gate = gate;
          peer.provisional = undefined;
          clearTimeout(peer.timer);
          gate.port.postMessage({
            kind: "rtd-egress-paired",
            parentOrigin: source.origin,
          });
          peer.confirm();
        })().catch(() => {
          void this.#revoke(peer).catch(() => undefined);
        });
      });
      port.postMessage({
        kind: "rtd-egress-private-init",
        session: peer.id,
        cap: peer.cap,
      });
      return;
    }
    if (port.name !== DAPP_EGRESS_GATE_CHANNEL || this.#gatePorts.size >= 32)
      return refuse();
    const source = nativeSource(port.sender, this.extensionId, this.gateUrl);
    if (
      source.frameId <= 0 ||
      source.origin !==
        this.gateUrl.slice(
          0,
          this.gateUrl.indexOf("/", "chrome-extension://".length),
        )
    )
      return refuse();
    this.#gatePorts.add(port);
    let claimed = false;
    const timer = setTimeout(() => {
      try {
        port.disconnect();
      } catch {}
    }, 30000);
    port.onDisconnect.addListener(() => {
      clearTimeout(timer);
      this.#gatePorts.delete(port);
    });
    lifetime.listen((message) => {
      void (async () => {
        if (lifetime.closed) return refuse();
        if (claimed) {
          if (
            !exact(message, ["kind", "requestId"]) ||
            message.kind !== "rtd-egress-delivered" ||
            typeof message.requestId !== "string"
          )
            return refuse();
          const peer = Array.from(this.#sessions.values()).find(
            (p) => p.gate?.port === port,
          );
          if (!peer || peer.closed || peer.gate?.closed()) return refuse();
          const ack = peer.acks.get(message.requestId);
          if (!ack) return refuse();
          peer.acks.delete(message.requestId);
          peer.port.postMessage({
            kind: "rtd-egress-request-finished",
            requestId: message.requestId,
          });
          ack.resolve();
          return;
        }
        if (
          !exact(message, ["kind", "session", "cap", "parentOrigin"]) ||
          message.kind !== "rtd-egress-claim" ||
          typeof message.session !== "string"
        )
          return refuse();
        claimed = true;
        const peer = this.#sessions.get(message.session);
        if (
          !peer ||
          peer.closed ||
          peer.gate ||
          peer.provisional ||
          peer.cap !== message.cap ||
          peer.source.origin !== message.parentOrigin ||
          peer.source.tabId !== source.tabId
        )
          return refuse();
        await Promise.all([
          assertCurrentGate(source, this.api),
          assertCurrentHttpSource(peer.source, this.api),
        ]);
        if (lifetime.closed || peer.closed || peer.gate || peer.provisional)
          return refuse();
        const gate: Gate = {
          port,
          source,
          owner: random(),
          challenge: random(),
          confirming: false,
          closed: () => lifetime.closed,
        };
        peer.provisional = gate;
        peer.cap = undefined;
        port.onDisconnect.addListener(() => {
          void this.#revoke(peer).catch(() => undefined);
        });
        port.postMessage({
          kind: "rtd-egress-challenge",
          challenge: gate.challenge,
        });
        // The source owns the already-paired private MessagePort and must answer there.
        void peer.paired.then(
          () => clearTimeout(timer),
          () => undefined,
        );
      })().catch(() => {
        try {
          port.disconnect();
        } catch {}
      });
    });
  }
  async #revoke(peer: Peer): Promise<void> {
    if (peer.revocation) return peer.revocation;
    peer.closed = true;
    clearTimeout(peer.timer);
    peer.reject(new Error("dApp私有通道已关闭"));
    for (const ack of peer.acks.values())
      ack.reject(new Error("dApp私有通道已关闭"));
    peer.acks.clear();
    peer.revocation = this.store.mutate(() => {
      this.#sessions.delete(peer.id);
      this.#sources.delete(nativeSourceKey(peer.source));
      try {
        peer.port.disconnect();
      } catch {}
      try {
        (peer.gate ?? peer.provisional)?.port.disconnect();
      } catch {}
    });
    return peer.revocation;
  }
  async capture(
    sender: Runtime.MessageSender | undefined,
    profile: ValidatedNetworkProfile,
    requestId: string,
    account: string,
    requiredAreas?: readonly NetworkAdmissionArea[],
  ): Promise<WalletDappEgressClaim> {
    await this.ready;
    const source = httpTopSource(sender, this.extensionId),
      peer = this.#sources.get(nativeSourceKey(source));
    if (!peer || peer.closed || peer.source.origin !== source.origin)
      return refuse();
    await peer.paired;
    const gate = peer.gate;
    if (peer.closed || !gate || gate.closed()) return refuse();
    await Promise.all([
      assertCurrentHttpSource(peer.source, this.api),
      assertCurrentGate(gate.source, this.api),
    ]);
    if (peer.closed || gate.closed()) return refuse();
    const pinnedProfile = validateNetworkProfile(profile);
    const lease = await this.store.capture(
      pinnedProfile,
      {
        origin: source.origin,
        tabId: source.tabId,
        frameId: source.frameId,
        documentId: source.documentId,
        requestId,
        account,
        gateOwner: gate.owner,
      },
      requiredAreas,
    );
    if (peer.closed || gate.closed()) return refuse();
    const claim = Object.freeze({});
    this.#claims.set(claim, { peer, profile: pinnedProfile, lease, requestId });
    return claim;
  }
  async runBeforeAction<T>(
    claim: WalletDappEgressClaim,
    stage: "sign" | "dispatch",
    signal: AbortSignal,
    start: () => Promise<T>,
  ): Promise<T> {
    const state = this.#claims.get(claim);
    if (
      !state ||
      state.peer.closed ||
      !state.peer.gate ||
      state.peer.gate.closed()
    )
      return refuse();
    const { peer } = state,
      gate = peer.gate!;
    signal.throwIfAborted();
    await Promise.all([
      assertCurrentHttpSource(peer.source, this.api),
      assertCurrentGate(gate.source, this.api),
    ]);
    return this.store.runBeforeAction(state.lease, stage, () => {
      signal.throwIfAborted();
      if (peer.closed || gate.closed()) return refuse();
      return start();
    });
  }
  /** Claim is captured before signing; publishing never recaptures a newer context for old bytes. */
  async publish(
    claim: WalletDappEgressClaim,
    message: unknown,
    signal: AbortSignal,
  ): Promise<void> {
    const state = this.#claims.get(claim);
    this.#claims.delete(claim);
    if (!state) return refuse();
    const { peer, profile, lease, requestId } = state,
      gate = peer.gate;
    signal.throwIfAborted();
    if (
      peer.closed ||
      !gate ||
      gate.closed() ||
      peer.acks.size >= 64 ||
      peer.acks.has(requestId)
    )
      return refuse();
    await Promise.all([
      assertCurrentHttpSource(peer.source, this.api),
      assertCurrentGate(gate.source, this.api),
    ]);
    signal.throwIfAborted();
    if (peer.closed || gate.closed()) return refuse();
    const payload = JSON.stringify(
      validateDappEgressMessage(message, requestId),
    );
    if (typeof payload !== "string") return refuse();
    const issued = await this.store.issue(lease, payload);
    signal.throwIfAborted();
    if (peer.closed || gate.closed()) return refuse();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const abort = () => {
      void this.#revoke(peer).catch(() => undefined);
    };
    signal.addEventListener("abort", abort, { once: true });
    try {
      await new Promise<void>((resolve, reject) => {
        const ack = { resolve, reject };
        peer.acks.set(requestId, ack);
        timer = setTimeout(() => {
          reject(new Error("dApp结果交付未确认"));
          abort();
        }, 30000);
        if (signal.aborted) {
          abort();
          reject(new Error("dApp请求已取消"));
          return;
        }
        try {
          gate.port.postMessage({
            kind: "rtd-egress-result",
            profile,
            ticket: issued.ticket,
            binding: issued.binding,
          });
        } catch {
          reject(new Error("dApp结果交付未确认"));
          abort();
        }
      });
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      peer.acks.delete(requestId);
    }
  }
}
