// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach as beforeAdmissionFixture } from "vitest";
import { WalletNetworkAdmissionStore } from "./network-admission-store";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useWalletAccountHistory } from "rtd-apps-core/src/rpc/history-hooks";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { historyFixture } from "../../../tests/unit/rpc/history-fixtures";
import {
  executionFixture,
  sender,
} from "../../../tests/unit/rpc/execution-fixtures";
import { WalletRpcProvider } from "./WalletRpcProvider";
import { WalletLedgerReader } from "./ledger-reader";
import type { ProfileSelection } from "./profile-registry";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
describe("Provider到账户历史Hook的实际接入", () => {
  const cleanups: (() => Promise<void>)[] = [];
  afterEach(async () => {
    for (const cleanup of cleanups.splice(0)) await cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  async function mount(options: { noHistory?: boolean; late?: boolean } = {}) {
    const fixture = await historyFixture({ noHistory: options.noHistory });
    const raw = (await executionFixture(1n)).result();
    raw.timestamp = { seconds: 1_700_000_000n, nanos: 0 };
    let release = () => {};
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.spyOn(WalletLedgerReader.prototype, "historyPage").mockImplementation(
      async function (this: WalletLedgerReader, address) {
        if (options.late) await barrier;
        return {
          bindingKey: this.session.bindingKey,
          readSessionKey: this.session.cacheKey,
          address,
          source: "archive" as const,
          checkpointHeight: 30,
          lowestAvailableCheckpoint: 1,
          transactions: [raw],
          hasNextPage: false,
          nextCursor: null,
        };
      },
    );
    vi.stubGlobal("fetch", fixture.fetch);
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      }),
      element = document.createElement("div");
    document.body.append(element);
    const root = createRoot(element);
    function History() {
      const rpc = useWalletRpc(),
        query = useWalletAccountHistory(sender);
      return createElement(
        "div",
        null,
        rpc.state === "unconfigured"
          ? "unconfigured"
          : query.isError
            ? "error"
            : query.data
              ? `history:${query.data.transactions.length}:${query.data.coverage.allAccountActivityCertified}`
              : "loading",
      );
    }
    const render = async (selection: ProfileSelection) => {
      await act(async () =>
        root.render(
          createElement(
            StrictMode,
            null,
            createElement(
              QueryClientProvider,
              { client },
              createElement(WalletRpcProvider, {
                selection,
                children: createElement(History),
              }),
            ),
          ),
        ),
      );
    };
    cleanups.push(async () => {
      await act(async () => root.unmount());
      client.clear();
      element.remove();
    });
    return { ...fixture, client, element, render, release };
  }
  async function settle(check: () => void) {
    await vi.waitFor(async () => {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      check();
    });
  }
  it("全绑定／账户缓存、禁持久化，范围限制旗标保留，不经过dApp Kit", async () => {
    const f = await mount();
    await f.render({ state: "configured", profile: f.native.profile });
    await settle(() => expect(f.element.textContent).toBe("history:1:false"));
    const query = f.client
      .getQueryCache()
      .findAll({ queryKey: ["wallet-account-history"] })
      .find((query) => query.state.data);
    expect(query!.queryKey).toEqual([
      "wallet-account-history",
      f.native.session.bindingKey,
      expect.any(String),
      expect.any(String),
      sender,
    ]);
    expect(query!.meta?.skipPersistedCache).toBe(true);
    expect(
      f.fetch.mock.calls.every(
        ([url]) => !String(url).includes("GetTransaction"),
      ),
    ).toBe(true);
  });
  it("配置归档 Ledger 时直接读取，不请求已退役扩展端点", async () => {
    const f = await mount({ noHistory: true });
    await f.render({ state: "configured", profile: f.native.profile });
    await settle(() => expect(f.element.textContent).toBe("history:1:false"));
    expect(f.requests).toHaveLength(0);
  });
  it("未配置不请求；切网迟到不进入新会话或旧成功缓存", async () => {
    const f = await mount({ late: true });
    await f.render({ state: "unconfigured", message: "未配置" });
    expect(f.fetch).not.toHaveBeenCalled();
    await f.render({ state: "configured", profile: f.native.profile });
    await settle(() => expect(f.element.textContent).toBe("loading"));
    await f.render({ state: "unconfigured", message: "未配置" });
    await act(async () => f.release());
    expect(f.element.textContent).toBe("unconfigured");
    expect(
      f.client
        .getQueryCache()
        .findAll({ queryKey: ["wallet-account-history"] })
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
