// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, expect, it, vi } from "vitest";
import { toast } from "react-hot-toast";
import { ExplorerLinkType } from "../explorer-link/ExplorerLinkType";
import { ReceiptIdentifier } from "./ReceiptIdentifier";

const m = vi.hoisted(() => ({
  useExplorerLink: vi.fn(() => "https://explorer.test/txblock/example"),
}));

vi.mock("../../hooks/useExplorerLink", () => ({
  useExplorerLink: m.useExplorerLink,
}));
vi.mock("../../i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("react-hot-toast", () => ({ toast: { success: vi.fn() } }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const digest = `Ae${"1234567890abcdef".repeat(5)}`;
const address = `0x${"00665".padEnd(64, "a")}ac4b`;
const writeText = vi.fn(async () => undefined);

beforeEach(() => {
  writeText.mockClear();
  m.useExplorerLink.mockClear();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
});

it("交易 ID 默认缩写，可展开全文并恢复缩写，且两个操作始终可见", async () => {
  const node = document.createElement("div");
  const root = createRoot(node);
  try {
    await act(async () =>
      root.render(
        h(ReceiptIdentifier, {
          value: digest,
          type: "transaction",
          testId: "receipt-identifier",
          explorerLink: {
            type: ExplorerLinkType.transaction,
            transactionID: digest,
          },
        }),
      ),
    );
    const identifier = node.querySelector(
      '[data-testid="receipt-identifier"]',
    )!;
    const toggle = identifier.querySelector("button") as HTMLButtonElement;
    expect(toggle.textContent).toContain(
      `${digest.slice(0, 6)}…${digest.slice(-6)}`,
    );
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(identifier.querySelector('[data-action="copy"]')).not.toBeNull();
    expect(identifier.querySelector('[data-action="explorer"]')).not.toBeNull();

    await act(async () => toggle.click());
    expect(toggle.textContent).toContain(digest);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");

    await act(async () => toggle.click());
    expect(toggle.textContent).not.toContain(digest);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    await act(async () =>
      (identifier.querySelector('[data-action="copy"]') as HTMLElement).click(),
    );
    expect(writeText).toHaveBeenCalledWith(digest);
    expect(toast.success).toHaveBeenCalledWith("receipt.transactionIdCopied");

    const explorer = identifier.querySelector('[data-action="explorer"]');
    expect(explorer?.getAttribute("href")).toBe(
      "https://explorer.test/txblock/example",
    );
    expect(explorer?.getAttribute("target")).toBe("_blank");
    expect(explorer?.getAttribute("rel")).toBe("noreferrer");
  } finally {
    await act(async () => root.unmount());
  }
});

it("地址保留 0x 缩写格式，切换交易时恢复默认缩写", async () => {
  const node = document.createElement("div");
  const root = createRoot(node);
  const render = (value: string) =>
    h(ReceiptIdentifier, {
      value,
      type: "address",
      explorerLink: { type: ExplorerLinkType.address, address: value },
    });
  try {
    await act(async () => root.render(render(address)));
    const toggle = node.querySelector("button") as HTMLButtonElement;
    expect(toggle.textContent).toContain("0x0066…ac4b");
    await act(async () => toggle.click());
    expect(toggle.textContent).toContain(address);

    await act(async () => root.render(render(digest)));
    expect(toggle.textContent).not.toContain(address);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  } finally {
    await act(async () => root.unmount());
  }
});
