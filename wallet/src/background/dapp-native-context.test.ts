import { expect, it, vi } from "vitest";
vi.mock("webextension-polyfill", () => ({ default: {} }));
import {
  httpTopSource,
  nativeSource,
  assertCurrentHttpSource,
  assertCurrentGate,
  type NativeContextApi,
} from "./dapp-native-context";
const sender = () => ({
  id: "own-extension",
  tab: { id: 1 },
  frameId: 0,
  documentId: "opaque-native-doc",
  documentLifecycle: "active",
  origin: "https://public.example",
  url: "https://public.example/path",
});
it("requires current native HTTP top document and snapshots sender fields", () => {
  const raw = sender(),
    s = httpTopSource(raw, "own-extension");
  raw.documentId = "changed";
  expect(s.documentId).toBe("opaque-native-doc");
  expect(Object.isFrozen(s)).toBe(true);
});
it.each([
  { id: "other-extension" },
  { tab: { id: -1 } },
  { tab: null },
  { frameId: 1 },
  { documentId: "" },
  { documentId: "x".repeat(129) },
  { documentId: "x\n" },
  { documentLifecycle: "prerender" },
  { origin: "https://other.example" },
  { url: "file:///tmp/public" },
])("rejects unowned or non-current native sender %j", (change) => {
  expect(() =>
    httpTopSource({ ...sender(), ...change }, "own-extension"),
  ).toThrow();
});
it("gate sender must use exact extension URL", () => {
  expect(() =>
    nativeSource(
      sender(),
      "own-extension",
      "chrome-extension://own-extension/egress-gate.html",
    ),
  ).toThrow();
});
it("HTTP current lookup checks document/origin/lifecycle and permits same-document SPA paths", async () => {
  const s = httpTopSource(sender(), "own-extension");
  const api: NativeContextApi = {
    frame: vi.fn(async () => ({
      documentId: s.documentId,
      url: s.url,
      documentLifecycle: "active",
    })),
    contexts: vi.fn(),
  };
  await assertCurrentHttpSource(s, api);
  vi.mocked(api.frame).mockResolvedValueOnce({
    documentId: s.documentId,
    url: "https://public.example/new",
    documentLifecycle: "active",
  });
  await assertCurrentHttpSource(s, api);
  expect(api.frame).toHaveBeenCalledWith({
    tabId: 1,
    frameId: 0,
    documentId: s.documentId,
  });
  for (const changed of [
    { documentId: "new-doc" },
    { url: "https://other.example/new" },
    { url: "about:blank" },
    { documentLifecycle: "cached" },
  ]) {
    vi.mocked(api.frame).mockResolvedValueOnce({
      documentId: s.documentId,
      url: s.url,
      documentLifecycle: "active",
      ...changed,
    });
    await expect(assertCurrentHttpSource(s, api)).rejects.toThrow();
  }
});
it("gate uses precise runtime context instead of invented parentDocumentId", async () => {
  const s = nativeSource(
    {
      ...sender(),
      frameId: 2,
      origin: "chrome-extension://own-extension",
      url: "chrome-extension://own-extension/egress-gate.html",
    },
    "own-extension",
  );
  const row = {
    contextType: "TAB",
    documentId: s.documentId,
    documentOrigin: s.origin,
    documentUrl: s.url,
    tabId: s.tabId,
    frameId: s.frameId,
  };
  const api: NativeContextApi = {
    frame: vi.fn(async () => null),
    contexts: vi.fn(async () => [row]),
  };
  await assertCurrentGate(s, api);
  expect(api.frame).not.toHaveBeenCalled();
  for (const value of [
    [],
    [row, row],
    [{ ...row, contextType: "POPUP" }],
    [{ ...row, documentId: "new-doc" }],
    [{ ...row, documentOrigin: "https://public.example" }],
    [{ ...row, frameId: 0 }],
  ]) {
    vi.mocked(api.contexts).mockResolvedValueOnce(value);
    await expect(assertCurrentGate(s, api)).rejects.toThrow();
  }
});
