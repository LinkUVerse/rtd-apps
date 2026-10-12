// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach as beforeAdmissionFixture } from "vitest";
import { WalletNetworkAdmissionStore } from "./network-admission-store";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { normalizeRtdAddress } from "rtd-typescript/utils";
import {
  useSentTransactions,
  useIndexedEvents,
} from "rtd-apps-core/src/rpc/indexed-hooks";
import { WalletRpcProvider } from "./WalletRpcProvider";
import { snapshotFixture, txDigest } from "../../../tests/unit/rpc/fixtures";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => vi.unstubAllGlobals());
it("实际Provider注入独立窗口查询，刷新失败撤下旧记录，错误不污染另一个集合", async () => {
  let fail = false;
  const connection = (nodes: unknown[]) => ({
    nodes,
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    },
  });
  const source = snapshotFixture({
    read: () => ({
      transactions: connection([
        {
          digest: txDigest,
          sender: { address: normalizeRtdAddress("0xb") },
          effects: { checkpoint: { sequenceNumber: 2 } },
        },
      ]),
      events: connection([]),
    }),
    alter: (response, request) =>
      fail && request.query.includes("transactions(filter:")
        ? { ...response, errors: [{ message: "unavailable" }] }
        : response,
  });
  vi.stubGlobal("fetch", source.fetch);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const node = document.createElement("div"),
    root = createRoot(node);
  function View() {
    const tx = useSentTransactions("0xb", {
      lower: 0,
      upper: 10,
      order: "descending",
    });
    const events = useIndexedEvents(
      { module: "0x3" },
      { lower: 0, upper: 10, order: "ascending" },
    );
    return h(
      "pre",
      null,
      JSON.stringify({
        tx: tx.data?.value.length ?? null,
        txError: tx.isError,
        events: events.data?.value.length ?? null,
      }),
    );
  }
  try {
    await act(async () =>
      root.render(
        h(QueryClientProvider, {
          client,
          children: h(WalletRpcProvider, {
            selection: { state: "configured", profile: source.profile },
            children: h(View),
          }),
        }),
      ),
    );
    await act(async () =>
      vi.waitFor(() =>
        expect(JSON.parse(node.textContent!)).toEqual({
          tx: 1,
          txError: false,
          events: 0,
        }),
      ),
    );
    const caches = client
      .getQueryCache()
      .getAll()
      .filter((q) => String(q.queryKey[0]).startsWith("wallet-indexed"));
    expect(caches).toHaveLength(2);
    expect(caches.every((q) => q.meta?.skipPersistedCache)).toBe(true);
    fail = true;
    await act(async () => {
      await client.invalidateQueries({
        queryKey: ["wallet-indexed-transactions"],
      });
    });
    await act(async () =>
      vi.waitFor(() =>
        expect(JSON.parse(node.textContent!)).toEqual({
          tx: null,
          txError: true,
          events: 0,
        }),
      ),
    );
  } finally {
    await act(async () => root.unmount());
    client.clear();
  }
});

// This existing SDK/React protocol fixture does not claim native-storage proof.
beforeAdmissionFixture(() => {
  vi.spyOn(WalletNetworkAdmissionStore.prototype, "capture").mockResolvedValue(
    undefined,
  );
});
