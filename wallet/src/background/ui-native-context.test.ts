import { expect, it, vi } from "vitest";
import type { Runtime } from "webextension-polyfill";
vi.mock("webextension-polyfill", () => ({ default: {} }));
import { assertNativeUiSource } from "./ui-native-context";
const origin = "chrome-extension://own-extension";
const sender = () => ({
  tab: {
    id: 9,
    index: 0,
    highlighted: false,
    active: true,
    pinned: false,
    incognito: false,
  },
  id: "own-extension",
  origin,
  url: origin + "/ui.html?type=popup#/",
  frameId: 0,
  documentId: "opaque-native-ui",
  documentLifecycle: "active",
});
const row = () => ({
  contextId: "opaque-native-context",
  contextType: "POPUP",
  documentOrigin: origin,
  documentUrl: origin + "/ui.html?type=popup",
  documentId: "opaque-native-ui",
  frameId: 0,
  tabId: -1,
});
it("accepts an exact native popup without inventing a sender tab", async () => {
  const { tab, frameId, documentId, documentLifecycle, ...popup } = sender();
  await assertNativeUiSource(popup, "own-extension", async () => [row()]);
});
it("accepts an exact own top tab", async () => {
  await assertNativeUiSource(
    { ...sender(), tab: { id: 9 } } as unknown as Runtime.MessageSender,
    "own-extension",
    async () => [{ ...row(), contextType: "TAB", tabId: 9 }],
  );
});
it.each([
  { frameId: 2 },
  { id: "other" },
  { documentId: "" },
  { documentLifecycle: "cached" },
  { url: origin + "/egress-gate.html" },
  { origin: "https://public.example" },
])("rejects unowned UI before privileged initialization %j", async (change) => {
  const contexts = vi.fn(async () => [row()]);
  await expect(
    assertNativeUiSource({ ...sender(), ...change }, "own-extension", contexts),
  ).rejects.toThrow();
  expect(contexts).not.toHaveBeenCalled();
});
it.each(
  [
    [],
    [row(), row()],
    [{ ...row(), frameId: 1 }],
    [{ ...row(), documentId: "other-doc" }],
    [{ ...row(), contextType: "BACKGROUND" }],
    [{ ...row(), tabId: 7 }],
  ].map((value) => [value] as const),
)("rejects missing/stale/embedded context %j", async (value) => {
  await expect(
    assertNativeUiSource(sender(), "own-extension", async () => value),
  ).rejects.toThrow();
});
