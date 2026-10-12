// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it } from "vitest";
import {
  WalletRpcContext,
  type WalletRpc,
} from "rtd-apps-core/src/rpc/WalletRpcContext";
import { useStakingView } from "rtd-apps-core/src/rpc/staking-hooks";
import { WalletStakingSnapshotReader } from "./staking-snapshot-reader";
import { stakingFixture } from "../../../tests/unit/rpc/staking-fixture";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
});
describe("staking snapshot hook isolation", () => {
  it("uses actual admitted reader, scopes query to session/owner and withdraws failed data", async () => {
    const f = stakingFixture();
    let fail = false;
    const stakingReader = await WalletStakingSnapshotReader.open(f.session, {
      fetch: f.fetch,
    });
    const rpc = {
      state: "configured",
      bindingKey: "binding",
      readSessionKey: "session",
      assetSnapshotKey: "snapshot",
      hasFullnodeSession: true,
      readStakingView: async (owner: string, signal: AbortSignal) => {
        if (fail) throw new Error("coverage lost");
        return stakingReader.staking(owner, signal);
      },
    } as unknown as WalletRpc;
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    let latest: ReturnType<typeof useStakingView> | undefined;
    function View() {
      latest = useStakingView(f.owner);
      return h(
        "div",
        {},
        latest.data?.epoch ?? (latest.isError ? "error" : "loading"),
      );
    }
    cleanups.push(async () => {
      await act(async () => root.unmount());
      client.clear();
      host.remove();
    });
    await act(async () =>
      root.render(
        h(
          QueryClientProvider,
          { client },
          h(WalletRpcContext.Provider, { value: rpc }, h(View)),
        ),
      ),
    );
    for (let i = 0; i < 30 && !latest?.data; i++)
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
      });
    expect(latest?.data?.positions).toHaveLength(3);
    const query = client.getQueryCache().findAll()[0];
    expect(query.queryKey).toEqual([
      "wallet-staking",
      "binding",
      "session",
      f.owner,
    ]);
    expect(query.meta).toEqual({
      skipPersistedCache: true,
      walletReadOperation: "staking",
    });
    fail = true;
    await act(async () => {
      await latest!.refetch();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(latest?.data).toBeUndefined();
    expect(latest?.isError).toBe(true);
  });
});
