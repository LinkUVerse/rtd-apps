// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import Browser, { type Runtime } from "webextension-polyfill";
import type { Message } from "../shared/messaging/messages";
const refuse = (): never => {
  throw new Error("UI native source is invalid");
};
export async function assertNativeUiSource(
  sender: Runtime.MessageSender | undefined,
  extensionId = Browser.runtime.id,
  contexts: (query: unknown) => Promise<unknown> = (query) =>
    (
      Browser.runtime as unknown as {
        getContexts(query: unknown): Promise<unknown>;
      }
    ).getContexts(query),
) {
  const s = sender as
    | (Runtime.MessageSender & {
        documentId?: string;
        documentLifecycle?: string;
      })
    | undefined;
  const origin = `chrome-extension://${extensionId}`;
  if (
    !s ||
    s.id !== extensionId ||
    s.origin !== origin ||
    typeof s.url !== "string" ||
    s.url.length > 2048
  )
    return refuse();
  const url = new URL(s.url);
  if (
    url.protocol !== "chrome-extension:" ||
    url.hostname !== extensionId ||
    url.port ||
    url.username ||
    url.password ||
    url.pathname !== "/ui.html"
  )
    return refuse();
  if (
    s.tab &&
    (s.frameId !== 0 ||
      s.documentLifecycle !== "active" ||
      typeof s.documentId !== "string" ||
      !s.documentId ||
      s.documentId.length > 128)
  )
    return refuse();
  if (
    !s.tab &&
    ((s.frameId !== undefined && s.frameId !== 0) ||
      (s.documentLifecycle !== undefined && s.documentLifecycle !== "active"))
  )
    return refuse();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      contexts(
        s.tab
          ? { documentIds: [s.documentId] }
          : { contextTypes: ["POPUP"], documentUrls: [s.url.split("#")[0]] },
      ),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("UI source check timed out")),
          2000,
        );
      }),
    ]);
    if (!Array.isArray(result) || result.length !== 1) return refuse();
    const r = result[0];
    if (
      !r ||
      typeof r.contextId !== "string" ||
      !r.contextId ||
      typeof r.documentId !== "string" ||
      !r.documentId ||
      r.documentOrigin !== origin ||
      r.frameId !== 0 ||
      typeof r.documentUrl !== "string" ||
      r.documentUrl.split("#")[0] !== s.url.split("#")[0] ||
      (s.tab
        ? r.contextType !== "TAB" ||
          r.tabId !== s.tab.id ||
          r.documentId !== s.documentId
        : r.contextType !== "POPUP" || r.tabId !== -1) ||
      (s.documentId !== undefined && r.documentId !== s.documentId)
    )
      return refuse();
    return Object.freeze({
      contextId: r.contextId as string,
      documentId: r.documentId as string,
    });
  } finally {
    clearTimeout(timer);
  }
}
/** No privileged handler runs until a fresh native context answers on this exact native port. */
export async function authorizeNativeUiPort(
  port: Runtime.Port,
): Promise<Message[]> {
  const messages: Message[] = [];
  let closed = false,
    nonce: string | undefined,
    settle: (() => void) | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const confirmed = new Promise<void>((resolve, reject) => {
    settle = resolve;
    timer = setTimeout(
      () => reject(new Error("UI source confirmation timed out")),
      5000,
    );
    port.onDisconnect.addListener(() => {
      closed = true;
      messages.length = 0;
      reject(new Error("UI source disconnected"));
    });
  });
  void confirmed.catch(() => undefined);
  const buffer = (message: unknown) => {
    if (closed) return;
    if (
      message &&
      typeof message === "object" &&
      Object.getOwnPropertyNames(message).length === 2 &&
      (message as { kind?: string }).kind === "rtd-ui-source-confirm" &&
      nonce &&
      (message as { nonce?: string }).nonce === nonce
    ) {
      nonce = undefined;
      settle?.();
      settle = undefined;
      return;
    }
    const m = message as Message;
    if (
      !m ||
      typeof m !== "object" ||
      Array.isArray(m) ||
      typeof m.id !== "string" ||
      !m.id ||
      m.id.length > 200 ||
      !m.payload ||
      typeof m.payload !== "object" ||
      Array.isArray(m.payload) ||
      messages.length >= 16 ||
      new TextEncoder().encode(JSON.stringify(m)).length > 131072
    ) {
      closed = true;
      port.disconnect();
      return;
    }
    messages.push(m);
  };
  port.onMessage.addListener(buffer);
  try {
    const before = await assertNativeUiSource(port.sender);
    if (closed) return refuse();
    nonce = Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
      n.toString(16).padStart(2, "0"),
    ).join("");
    port.postMessage({ kind: "rtd-ui-source-challenge", nonce });
    await confirmed;
    const after = await assertNativeUiSource(port.sender);
    if (
      closed ||
      after.contextId !== before.contextId ||
      after.documentId !== before.documentId
    )
      return refuse();
    return messages;
  } finally {
    clearTimeout(timer);
    port.onMessage.removeListener(buffer);
  }
}
