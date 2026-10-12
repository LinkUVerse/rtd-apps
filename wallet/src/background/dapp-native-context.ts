// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import Browser from "webextension-polyfill";

export interface DappNativeSource {
  readonly tabId: number;
  readonly frameId: number;
  readonly documentId: string;
  readonly origin: string;
  readonly url: string;
}
export interface NativeContextApi {
  frame(query: {
    tabId: number;
    frameId: number;
    documentId: string;
  }): Promise<unknown>;
  contexts(query: {
    documentIds: string[];
    tabIds: number[];
    frameIds: number[];
    documentUrls: string[];
  }): Promise<unknown>;
}
export const nativeContextApi: NativeContextApi = {
  frame: (query) => Browser.webNavigation.getFrame(query),
  contexts: (query) =>
    (
      Browser.runtime as unknown as {
        getContexts(query: unknown): Promise<unknown>;
      }
    ).getContexts(query),
};
const refuse = (): never => {
  throw new Error("dApp原生来源已失效");
};
const number = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const text = (value: unknown, limit: number): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= limit &&
  !/[\u0000-\u001f\u007f]/.test(value);
export function nativeSource(
  sender: unknown,
  extensionId: string,
  exactUrl?: string,
): DappNativeSource {
  if (!sender || typeof sender !== "object") return refuse();
  const s = sender as Record<string, unknown>,
    tab = s.tab as Record<string, unknown> | undefined;
  if (
    s.id !== extensionId ||
    !number(tab?.id) ||
    !number(s.frameId) ||
    !text(s.documentId, 128) ||
    s.documentLifecycle !== "active" ||
    !text(s.origin, 2048) ||
    !text(s.url, 4096) ||
    (exactUrl !== undefined && s.url !== exactUrl)
  )
    return refuse();
  return Object.freeze({
    tabId: tab.id,
    frameId: s.frameId,
    documentId: s.documentId,
    origin: s.origin,
    url: s.url,
  });
}
export function httpTopSource(
  sender: unknown,
  extensionId: string,
): DappNativeSource {
  const s = nativeSource(sender, extensionId),
    u = new URL(s.url);
  if (
    s.frameId !== 0 ||
    !["http:", "https:"].includes(u.protocol) ||
    u.origin !== s.origin
  )
    return refuse();
  return s;
}
async function bounded<T>(operation: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("dApp原生来源检查超时")),
          2000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
export async function assertCurrentHttpSource(
  s: DappNativeSource,
  api: NativeContextApi = nativeContextApi,
): Promise<void> {
  const raw = await bounded(() =>
    api.frame({ tabId: s.tabId, frameId: s.frameId, documentId: s.documentId }),
  );
  if (!raw || typeof raw !== "object") return refuse();
  const r = raw as Record<string, unknown>;
  if (
    r.documentId !== s.documentId ||
    r.documentLifecycle !== "active" ||
    typeof r.url !== "string" ||
    new URL(r.url).origin !== s.origin
  )
    return refuse();
}
export async function assertCurrentGate(
  s: DappNativeSource,
  api: NativeContextApi = nativeContextApi,
): Promise<void> {
  const raw = await bounded(() =>
    api.contexts({
      documentIds: [s.documentId],
      tabIds: [s.tabId],
      frameIds: [s.frameId],
      documentUrls: [s.url],
    }),
  );
  if (
    !Array.isArray(raw) ||
    raw.length !== 1 ||
    !raw[0] ||
    typeof raw[0] !== "object"
  )
    return refuse();
  const r = raw[0] as Record<string, unknown>;
  if (
    r.contextType !== "TAB" ||
    r.documentId !== s.documentId ||
    r.documentOrigin !== s.origin ||
    r.documentUrl !== s.url ||
    r.tabId !== s.tabId ||
    r.frameId !== s.frameId
  )
    return refuse();
}
export const nativeSourceKey = (s: DappNativeSource) =>
  JSON.stringify([s.tabId, s.frameId, s.documentId]);
