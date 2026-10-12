// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { ZkLoginButtons } from "./ZkLoginButtons";
vi.mock("_app/i18n", () => ({
  useI18n: () => ({
    t: () => "当前RTD钱包不支持zkLogin，已有账户记录已保留。",
  }),
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it("creation entry displays unsupported status instead of active OAuth controls", async () => {
  const host = document.createElement("div");
  const root = createRoot(host);
  const onButtonClick = vi.fn();
  await act(async () =>
    root.render(
      h(ZkLoginButtons, {
        layout: "column",
        sourceFlow: "test",
        forcedZkLoginProvider: "google",
        onButtonClick,
      }),
    ),
  );
  expect(host.textContent).toContain("已有账户记录已保留");
  expect(host.querySelector("button")).toBeNull();
  expect(onButtonClick).not.toHaveBeenCalled();
  await act(async () => root.unmount());
});
