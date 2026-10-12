import { withCurrentBalances } from "../../../tests/unit/rpc/current-balances-fixture";
// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach as beforeAdmissionFixture } from "vitest";
import { WalletNetworkAdmissionStore } from "./network-admission-store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { toBase58 } from "rtd-typescript/utils";
import { WalletRpcProvider } from "./WalletRpcProvider";
import { validateNetworkProfile } from "./profile";
import { type ProfileSelection } from "./profile-registry";
import { useGetAllBalances } from "../../ui/app/hooks/useGetAllBalances";
import {
  balanceNode,
  connection,
  snapshotFixture,
} from "../../../tests/unit/rpc/fixtures";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const modes = [
  "account",
  "revision",
  "endpoint",
  "generation",
  "chain",
  "reenter",
] as const;
describe("实际Provider与TanStack在切换期间的取消及迟到结果隔离", () => {
  it.each(
    modes.flatMap((mode) =>
      [false, true].map((lateFailure) => ({ mode, lateFailure })),
    ),
  )(
    "$mode / old response fails=$lateFailure",
    async ({ mode, lateFailure }) => {
      let reads = 0;
      const source = snapshotFixture({
        read: (request) => ({
          address: {
            address: request.variables.owner,
            balances: connection([
              {
                ...balanceNode(),
                totalBalance: ++reads === 1 ? "111" : "222",
                coinBalance: reads === 1 ? "111" : "222",
                addressBalance: "0",
              },
            ]),
          },
        }),
      });
      let profile = source.profile;
      let finish!: () => void;
      let oldSignal: AbortSignal | undefined;
      let oldSettled = false;
      const transport = withCurrentBalances(
        async (input, init) => {
          const response = await source.fetch(input, init);
          const data = await response.json();
          data.data.walletGenesis.digest = profile.expectedGenesisDigest;
          const display =
            data.data.walletDisplayService ??
            data.data.walletSnapshot?.query?.walletDisplayService;
          if (display)
            display.displayHistory.coverage.genesisDigest =
              profile.expectedGenesisDigest;
          return Response.json(data);
        },
        () => profile.expectedGenesisDigest,
        async (_request, signal) => {
          const value = ++reads === 1 ? 111n : 222n;
          if (!oldSignal) {
            oldSignal = signal as AbortSignal;
            // Deliberately ignore cancellation to verify stale transport results are rejected.
            await new Promise<void>((resolve) => {
              finish = resolve;
            });
            oldSettled = true;
            if (lateFailure) throw new Error("late old-network failure");
          }
          return {
            balances: [
              { coinType: "0x2::rtd::RTD", balance: value, coinBalance: value },
            ],
          };
        },
      );
      vi.stubGlobal("fetch", transport);
      const element = document.createElement("div");
      document.body.append(element);
      const root = createRoot(element);
      const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const rendered: string[] = [];
      function Balance({ owner }: { owner: string }) {
        const query = useGetAllBalances(owner);
        const value = query.isError
          ? "error"
          : (query.data?.[0]?.balance ?? "pending");
        rendered.push(value);
        return createElement("pre", null, value);
      }
      const render = (selection: ProfileSelection, owner = "0xb") =>
        act(async () =>
          root.render(
            createElement(QueryClientProvider, {
              client,
              children: createElement(WalletRpcProvider, {
                selection,
                children: createElement(Balance, { owner }),
              }),
            }),
          ),
        );
      try {
        await render({ state: "configured", profile });
        await act(async () =>
          vi.waitFor(() => expect(oldSignal).toBeDefined()),
        );
        expect(oldSignal!.aborted).toBe(false);
        const oldQuery = client
          .getQueryCache()
          .findAll({ queryKey: ["wallet-current-balances"] })
          .find((query) => query.getObserversCount() > 0)!;
        expect(oldQuery.state.data).toBeUndefined();
        const oldSessionKey = oldQuery.queryKey[2];
        if (mode === "reenter") {
          await render({
            state: "unconfigured",
            message: "network not configured",
          });
          expect(oldSignal!.aborted).toBe(true);
        } else if (mode !== "account") {
          profile = validateNetworkProfile({
            ...profile,
            ...(mode === "revision" ? { revision: profile.revision + 1 } : {}),
            ...(mode === "generation" ? { generation: "next-generation" } : {}),
            ...(mode === "chain"
              ? { expectedGenesisDigest: toBase58(new Uint8Array(32).fill(17)) }
              : {}),
            ...(mode === "endpoint"
              ? {
                  endpoints: {
                    ...profile.endpoints,
                    fullnodeGrpcWeb: "http://127.0.0.1:9123",
                  },
                }
              : {}),
          });
        }
        await render(
          { state: "configured", profile },
          mode === "account" ? "0xc" : "0xb",
        );
        await act(async () =>
          vi.waitFor(() => expect(element.textContent).toBe("222")),
        );
        expect(oldSignal!.aborted).toBe(true);
        if (mode !== "account") {
          const current = client
            .getQueryCache()
            .findAll({ queryKey: ["wallet-current-balances"] })
            .find((query) => query.state.status === "success");
          expect(current?.queryKey[2]).not.toBe(oldSessionKey);
        }
        const beforeLateResponse = rendered.length;
        await act(async () => {
          finish();
          await vi.waitFor(() => expect(oldSettled).toBe(true));
        });
        expect(element.textContent).toBe("222");
        expect(rendered).not.toContain("111");
        expect(rendered.slice(beforeLateResponse)).not.toContain("error");
        if (mode === "account") {
          // A brief account switch may retain an inactive cache entry, but a
          // cancelled late response must never populate it or resume fetching.
          const retained = client
            .getQueryCache()
            .find({ queryKey: oldQuery.queryKey, exact: true });
          expect(retained?.state.data).toBeUndefined();
          if (retained) {
            expect(retained.getObserversCount()).toBe(0);
            expect(retained.state.fetchStatus).toBe("idle");
          }
        } else
          await act(async () =>
            vi.waitFor(() =>
              expect(
                client
                  .getQueryCache()
                  .find({ queryKey: oldQuery.queryKey, exact: true }),
              ).toBeUndefined(),
            ),
          );
      } finally {
        finish?.();
        await act(async () => root.unmount());
        client.clear();
        element.remove();
        source.session.close();
        vi.unstubAllGlobals();
      }
    },
  );
});

// This existing SDK/React protocol fixture does not claim native-storage proof.
beforeAdmissionFixture(() => {
  vi.spyOn(WalletNetworkAdmissionStore.prototype, "capture").mockResolvedValue(
    undefined,
  );
});
