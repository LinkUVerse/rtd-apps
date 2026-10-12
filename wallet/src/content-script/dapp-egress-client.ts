// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import Browser from "webextension-polyfill";
import {
  DAPP_EGRESS_SOURCE_CHANNEL,
  DAPP_EGRESS_GATE_PATH,
  ownEgressObject,
} from "../shared/rpc/dapp-egress-protocol";

/** Private isolated-world channel. Never forward init/challenge/ticket through the public stream. */
export function createDappEgressClient(): {
  ready: Promise<void>;
  readonly closed: boolean;
  close: () => void;
  beginRequest: (id: string) => () => void;
  finishRequest: (id: string) => void;
} {
  let resolve!: () => void, reject!: (error: Error) => void;
  const ready = new Promise<void>((ok, bad) => {
    resolve = ok;
    reject = bad;
  });
  void ready.catch(() => undefined);
  if (
    window.top !== window.self ||
    !["http:", "https:"].includes(location.protocol)
  ) {
    reject(new Error("页面不支持私有结果通道"));
    return {
      ready,
      closed: true,
      close: () => undefined,
      finishRequest: () => undefined,
      beginRequest: () => {
        throw new Error("页面不支持私有结果通道");
      },
    };
  }
  const runtime = Browser.runtime.connect({ name: DAPP_EGRESS_SOURCE_CHANNEL });
  let initialized = false,
    closed = false,
    paired = false,
    frame: HTMLIFrameElement | undefined,
    channel: MessageChannel | undefined;
  const active = new Set<string>();
  const deadlines = new Map<string, ReturnType<typeof setTimeout>>();
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  const stopHeartbeat = () => {
    if (!active.size) {
      clearInterval(heartbeat);
      heartbeat = undefined;
    }
  };
  const finishRequest = (id: string) => {
    clearTimeout(deadlines.get(id));
    deadlines.delete(id);
    active.delete(id);
    stopHeartbeat();
  };
  const timer = setTimeout(() => {
    close();
  }, 8000);
  const close = () => {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    active.clear();
    for (const deadline of deadlines.values()) clearTimeout(deadline);
    deadlines.clear();
    stopHeartbeat();
    reject(new Error("dApp私有通道已关闭"));
    channel?.port1.close();
    frame?.remove();
    try {
      runtime.disconnect();
    } catch {}
  };
  runtime.onDisconnect.addListener(close);
  runtime.onMessage.addListener((message: unknown) => {
    if (
      !closed &&
      paired &&
      ownEgressObject(message, ["kind", "requestId"]) &&
      message.kind === "rtd-egress-request-finished" &&
      typeof message.requestId === "string"
    ) {
      finishRequest(message.requestId);
      return;
    }
    if (
      !closed &&
      paired &&
      ownEgressObject(message, ["kind"]) &&
      message.kind === "rtd-egress-alive"
    )
      return;
    if (
      closed ||
      initialized ||
      !ownEgressObject(message, ["kind", "session", "cap"]) ||
      message.kind !== "rtd-egress-private-init" ||
      typeof message.session !== "string" ||
      !/^[a-f0-9]{64}$/.test(message.session) ||
      typeof message.cap !== "string" ||
      !/^[a-f0-9]{64}$/.test(message.cap)
    ) {
      close();
      return;
    }
    initialized = true;
    const attach = () => {
      if (closed) return;
      if (!document.body) {
        close();
        return;
      }
      frame = document.createElement("iframe");
      frame.style.display = "none";
      frame.src = Browser.runtime.getURL(DAPP_EGRESS_GATE_PATH);
      channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        if (closed) return;
        if (
          !paired &&
          ownEgressObject(event.data, ["kind", "challenge"]) &&
          event.data.kind === "rtd-egress-challenge" &&
          typeof event.data.challenge === "string" &&
          /^[a-f0-9]{64}$/.test(event.data.challenge)
        ) {
          runtime.postMessage({
            kind: "rtd-egress-confirm",
            session: message.session,
            challenge: event.data.challenge,
          });
          return;
        }
        if (
          !paired &&
          ownEgressObject(event.data, ["kind"]) &&
          event.data.kind === "rtd-egress-paired"
        ) {
          paired = true;
          clearTimeout(timer);
          resolve();
          return;
        }
        close();
      };
      frame.addEventListener(
        "load",
        () => {
          if (closed || !frame?.contentWindow || !channel) {
            close();
            return;
          }
          frame.contentWindow.postMessage(
            {
              kind: "rtd-egress-private-init",
              session: message.session,
              cap: message.cap,
              parentOrigin: location.origin,
            },
            Browser.runtime.getURL("").slice(0, -1),
            [channel.port2],
          );
        },
        { once: true },
      );
      document.body.appendChild(frame);
    };
    document.body
      ? attach()
      : document.addEventListener("DOMContentLoaded", attach, { once: true });
  });
  window.addEventListener("pagehide", close, { once: true });
  const beginRequest = (id: string) => {
    if (
      closed ||
      !paired ||
      !id ||
      id.length > 200 ||
      active.has(id) ||
      active.size >= 64
    )
      throw new Error("dApp请求通道未就绪或请求重复");
    active.add(id);
    if (!heartbeat)
      heartbeat = setInterval(() => {
        if (closed || !paired) {
          close();
          return;
        }
        try {
          runtime.postMessage({ kind: "rtd-egress-heartbeat" });
        } catch {
          close();
        }
      }, 20000);
    const deadline = setTimeout(() => {
      close();
    }, 10800000);
    deadlines.set(id, deadline);
    let ended = false;
    return () => {
      if (ended) return;
      ended = true;
      finishRequest(id);
    };
  };
  return {
    ready,
    get closed() {
      return closed;
    },
    close,
    beginRequest,
    finishRequest,
  };
}
