// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach as beforeAdmissionFixture } from "vitest";
import { WalletNetworkAdmissionStore } from "./network-admission-store";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useWalletStoredReceipt } from "./stored-receipt-hook";
import { WalletRpcProvider } from "./WalletRpcProvider";
import { snapshotFixture } from "../../../tests/unit/rpc/fixtures";
import {
  executionFixture,
  sender,
} from "../../../tests/unit/rpc/execution-fixtures";
import type { ProfileSelection } from "./profile-registry";
const mocks = vi.hoisted(() => ({ account: vi.fn(), read: vi.fn() }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
describe("已确认记录实际Hook会话隔离", () => {
  const cleanup: (() => Promise<void>)[] = [];
  afterEach(async () => {
    for (const operation of cleanup.splice(0)) await operation();
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });
  async function mount() {
    const f = snapshotFixture(),
      tx = await executionFixture();
    vi.stubGlobal("fetch", f.fetch);
    mocks.account.mockReturnValue({ id: "account", address: sender });
    mocks.read.mockImplementation(async (args) => ({
      bindingKey: args.bindingKey,
      accountAddress: sender,
      receipt: tx.receipt(),
    }));
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      }),
      element = document.createElement("div");
    document.body.append(element);
    const root = createRoot(element);
    function Receipt() {
      const query = useWalletStoredReceipt(tx.digest, mocks.account(), {
        readStoredReceipt: mocks.read,
      });
      return createElement(
        "div",
        null,
        query.isError
          ? "error"
          : query.data
            ? `confirmed:${query.data.receipt.success}`
            : query.data === null
              ? "absent"
              : "loading",
      );
    }
    const render = async (selection: ProfileSelection) => {
      await act(async () =>
        root.render(
          createElement(
            QueryClientProvider,
            { client },
            createElement(WalletRpcProvider, {
              selection,
              children: createElement(Receipt),
            }),
          ),
        ),
      );
    };
    cleanup.push(async () => {
      await act(async () => root.unmount());
      client.clear();
      element.remove();
    });
    return { f, tx, client, element, render };
  }
  async function settle(check: () => void) {
    await vi.waitFor(async () => {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      check();
    });
  }
  it("profile/session/account/digest缓存禁持久化，独立于详情服务", async () => {
    const f = await mount();
    await f.render({ state: "configured", profile: f.f.profile });
    await settle(() => expect(f.element.textContent).toBe("confirmed:true"));
    const query = f.client
      .getQueryCache()
      .findAll({ queryKey: ["wallet-stored-receipt"] })
      .find((query) => query.state.data);
    expect(query!.queryKey).toEqual([
      "wallet-stored-receipt",
      f.f.session.bindingKey,
      expect.any(String),
      "account",
      sender,
      f.tx.digest,
    ]);
    expect(query!.meta?.skipPersistedCache).toBe(true);
  });
  it("切账户不复用以前记录；错账户回执是错误而非未知确认", async () => {
    const f = await mount();
    await f.render({ state: "configured", profile: f.f.profile });
    await settle(() => expect(f.element.textContent).toBe("confirmed:true"));
    mocks.account.mockReturnValue({ id: "second", address: "0x1" });
    await f.render({ state: "configured", profile: f.f.profile });
    await settle(() => expect(f.element.textContent).toBe("error"));
  });
  it("切网时迟到background回执不能提交旧成功缓存", async () => {
    const f = await mount();
    let release = () => {};
    mocks.read.mockImplementation(
      (args) =>
        new Promise((resolve) => {
          release = () =>
            resolve({
              bindingKey: args.bindingKey,
              accountAddress: sender,
              receipt: f.tx.receipt(),
            });
        }),
    );
    await f.render({ state: "configured", profile: f.f.profile });
    await settle(() => expect(mocks.read).toHaveBeenCalled());
    await f.render({ state: "unconfigured", message: "未配置" });
    await act(async () => release());
    expect(
      f.client
        .getQueryCache()
        .findAll({ queryKey: ["wallet-stored-receipt"] })
        .some((query) => query.state.data),
    ).toBe(false);
  });
});

// This existing SDK/React protocol fixture does not claim native-storage proof.
beforeAdmissionFixture(() => {
  vi.spyOn(WalletNetworkAdmissionStore.prototype, "capture").mockResolvedValue(
    undefined,
  );
});
