// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, expect, it, vi } from "vitest";
import { I18nProvider, useI18n } from "_app/i18n";
import { RtdAppEmpty } from "./RtdAppEmpty";
import ConnectedAppsCard from "./ConnectedAppsCard";

const state = vi.hoisted(() => ({
  initialized: true,
  permissions: [] as any[],
}));
vi.mock("_hooks", () => ({
  useAppSelector: (select: any) =>
    select({ permissions: { initialized: state.initialized } }),
}));
vi.mock("../../redux/slices/permissions", () => ({
  permissionsSelectors: { selectAll: () => state.permissions },
}));
vi.mock("../../hooks/useBackgroundClient", () => ({
  useBackgroundClient: () => ({ sendGetPermissionRequests: vi.fn() }),
}));
vi.mock("@growthbook/growthbook-react", () => ({
  useFeature: () => ({ value: [] }),
}));
vi.mock("_src/shared/experimentation/features", () => ({
  FEATURES: { WALLET_DAPPS: "wallet-dapps" },
}));
vi.mock("_src/shared/utils", () => ({
  prepareLinkToCompare: (url: string) => new URL(url).origin,
}));
vi.mock("./RtdApp", () => ({
  RtdApp: ({ name }: { name: string }) => h("article", null, name),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
beforeEach(() => {
  // Node's optional native localStorage can shadow Happy DOM's browser store.
  const values = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  window.localStorage.setItem("rtd-wallet.locale", "en");
  state.initialized = true;
  state.permissions = [];
});

function SwitchLocale() {
  const { setLocale } = useI18n();
  return h("button", { onClick: () => setLocale("zh-CN") }, "中文");
}

async function render(
  children: any,
  check: (node: HTMLElement) => Promise<void> | void,
) {
  const node = document.createElement("div"),
    root = createRoot(node);
  try {
    await act(async () => root.render(h(I18nProvider, null, children)));
    await check(node);
  } finally {
    await act(async () => root.unmount());
  }
}

it.each([
  ["catalog", "No apps to show", "暂无可展示的应用"],
  ["connections", "No connected apps", "暂无已连接应用"],
] as const)(
  "loaded empty %s has an accessible contextual message that follows locale changes",
  async (kind, english, chinese) => {
    await render(
      h(
        "div",
        null,
        h(RtdAppEmpty, { kind, displayType: "full" }),
        h(SwitchLocale),
      ),
      async (node) => {
        const status = node.querySelector('[role="status"]')!;
        expect(status.textContent).toContain(english);
        expect(status.getAttribute("aria-live")).toBe("polite");
        expect(status.querySelectorAll("p")).toHaveLength(2);
        expect(status.querySelector("a, button")).toBeNull();
        await act(async () => node.querySelector("button")!.click());
        expect(status.textContent).toContain(chinese);
        expect(status.textContent).not.toContain(english);
      },
    );
  },
);

it("permissions still loading must not be presented as a completed empty connection list", async () => {
  state.initialized = false;
  await render(h(ConnectedAppsCard), (node) =>
    expect(node.querySelector('[role="status"]')).toBeNull(),
  );
});

it("completed empty permissions show one clear connection message", async () => {
  await render(h(ConnectedAppsCard), (node) => {
    expect(node.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(node.textContent).toContain("No connected apps");
  });
});

it("approved applications still render while denied entries do not masquerade as connections", async () => {
  state.permissions = [
    {
      id: "yes",
      name: "Approved app",
      origin: "https://approved.example",
      allowed: true,
    },
    {
      id: "no",
      name: "Denied app",
      origin: "https://denied.example",
      allowed: false,
    },
  ];
  await render(h(ConnectedAppsCard), (node) => {
    expect(node.querySelector('[role="status"]')).toBeNull();
    expect(node.textContent).toContain("Approved app");
    expect(node.textContent).not.toContain("Denied app");
  });
});
