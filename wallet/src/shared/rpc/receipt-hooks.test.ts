// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach as beforeAdmissionFixture } from "vitest";
import { WalletNetworkAdmissionStore } from "./network-admission-store";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GrpcTypes } from "rtd-typescript/grpc";
import { useWalletTransactionDetails } from "rtd-apps-core/src/rpc/receipt-hooks";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { WalletRpcProvider } from "./WalletRpcProvider";
import { profileFixture } from "./profile-fixture";
import { validateNetworkProfile } from "./profile";
import type { ProfileSelection } from "./profile-registry";
import {
  executionFixture,
  grpcResponse,
} from "../../../tests/unit/rpc/execution-fixtures";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
describe("Provider到现代收据Hook的实际集成", () => {
  const cleanups: (() => Promise<void>)[] = [];
  afterEach(async () => {
    for (const cleanup of cleanups.splice(0)) await cleanup();
    vi.unstubAllGlobals();
  });
  async function mount(
    options: {
      success?: boolean;
      status?: number;
      late?: boolean;
      graphqlWait?: boolean;
    } = {},
  ) {
    const profile = validateNetworkProfile({
      ...profileFixture(),
      endpoints: {
        fullnodeGrpcWeb: "http://127.0.0.1:9000/grpc",
        ...(options.graphqlWait
          ? { graphqlUrl: "https://localhost:9001/graphql" }
          : {}),
      },
    });
    const tx = await executionFixture();
    let release: () => void = () => {};
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fetch = vi.fn<typeof globalThis.fetch>(async (url, init) => {
      if (String(url).includes("/graphql") && options.graphqlWait) {
        return new Promise<Response>((_resolve, reject) => {
          if (init!.signal!.aborted) {
            reject(new DOMException("aborted", "AbortError"));
            return;
          }
          init!.signal!.addEventListener(
            "abort",
            () => reject(new DOMException("aborted", "AbortError")),
            { once: true },
          );
        });
      }
      expect(String(url)).not.toContain("/graphql");
      if (String(url).endsWith("/GetServiceInfo"))
        return grpcResponse(
          GrpcTypes.GetServiceInfoResponse.toBinary({
            chainId: profile.expectedGenesisDigest,
            checkpointHeight: 21n,
          }),
        );
      expect(String(url)).toContain("/GetTransaction");
      if (options.late) await barrier;
      return grpcResponse(
        GrpcTypes.GetTransactionResponse.toBinary({
          transaction: tx.result(options.success ?? true),
        }),
        options.status,
      );
    });
    vi.stubGlobal("fetch", fetch);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const element = document.createElement("div");
    document.body.append(element);
    const root = createRoot(element);
    function Receipt() {
      const rpc = useWalletRpc();
      const query = useWalletTransactionDetails(tx.digest);
      return createElement(
        "div",
        null,
        rpc.state === "unconfigured"
          ? "unconfigured"
          : query.isError
            ? "error"
            : query.data === null
              ? "unknown"
              : query.data
                ? `receipt:${query.data.transaction.status.success}`
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
                children: createElement(Receipt),
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
    return { profile, tx, fetch, client, element, render, release };
  }
  it.each([true, false])(
    "GraphQL未配置仍读取真实SDK Fullnode回执 %s；缓存不持久化",
    async (success) => {
      const f = await mount({ success });
      await f.render({ state: "configured", profile: f.profile });
      await vi.waitFor(async () => {
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
        });
        expect(f.element.textContent).toBe(`receipt:${success}`);
      });
      const query = f.client
        .getQueryCache()
        .findAll({ queryKey: ["wallet-transaction-details"] })
        .find((query) => query.state.data);
      expect(query!.meta?.skipPersistedCache).toBe(true);
      expect(query!.queryKey).toEqual([
        "wallet-transaction-details",
        expect.any(String),
        expect.any(String),
        expect.any(String),
        f.tx.digest,
      ]);
    },
  );
  it("GraphQL准入仍在等待时Fullnode收据立即独立读取", async () => {
    const f = await mount({ graphqlWait: true });
    await f.render({ state: "configured", profile: f.profile });
    await vi.waitFor(async () => {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      expect(f.element.textContent).toBe("receipt:true");
    });
    expect(
      f.fetch.mock.calls.some(([url]) => String(url).includes("/graphql")),
    ).toBe(true);
  });
  it("NotFound未知与服务失败区分，不构造失败链回执", async () => {
    const f = await mount({ status: 5 });
    await f.render({ state: "configured", profile: f.profile });
    await vi.waitFor(async () => {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      expect(f.element.textContent).toBe("unknown");
    });
  });
  it("网络变更期间迟到原回执不能进入新会话", async () => {
    const f = await mount({ late: true });
    await f.render({ state: "configured", profile: f.profile });
    await vi.waitFor(async () => {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      expect(
        f.fetch.mock.calls.some(([url]) =>
          String(url).endsWith("/GetTransaction"),
        ),
      ).toBe(true);
    });
    await f.render({ state: "unconfigured", message: "未配置" });
    await act(async () => f.release());
    expect(f.element.textContent).toBe("unconfigured");
    expect(
      f.client
        .getQueryCache()
        .findAll({ queryKey: ["wallet-transaction-details"] })
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
