// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { ExplorerClientProvider } from "./explorer-client";
import { useGetNetworkMetrics } from "~/hooks/useGetNetworkMetrics";
import { useGetAddressMetrics } from "~/hooks/useGetAddressMetrics";
import { useGetAllEpochAddressMetrics } from "~/hooks/useGetAllEpochAddressMetrics";
import { AccountsCardGraph } from "~/components/AccountCardGraph";
import { TopPackagesCard } from "~/components/top-packages/TopPackagesCard";
import { Checkpoint } from "~/components/HomeMetrics/Checkpoint";

const clients: QueryClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.clear());
  vi.unstubAllGlobals();
});
function wrapped(children: ReactNode, network = "https://checkpoint.test") {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  clients.push(cache);
  // Old positive analytics caches must not masquerade as current service availability.
  cache.setQueryData(["home", "addresses"], { cumulativeAddresses: 12345 });
  cache.setQueryData(["top-packages", "3D"], { rank3Days: [] });
  return (
    <QueryClientProvider client={cache}>
      <ExplorerClientProvider network={network}>
        {children}
      </ExplorerClientProvider>
    </QueryClientProvider>
  );
}
it("unsupported analytics hooks expose availability without fetching or a synthetic dataset", () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const hook = renderHook(() => [
    useGetNetworkMetrics(),
    useGetAddressMetrics(),
    useGetAllEpochAddressMetrics({ descendingOrder: true }),
  ]);
  expect(
    hook.result.current.every(
      (row) =>
        row.phase === "unavailable" &&
        row.reason === "not-configured" &&
        !("data" in row),
    ),
  ).toBe(true);
  expect(fetchMock).not.toHaveBeenCalled();
});
it("account statistics ignore historical positive caches and show unavailable rather than empty history or zero", () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  render(wrapped(<AccountsCardGraph />));
  expect(screen.getByRole("status").textContent).toContain(
    "Statistics are unavailable on this network.",
  );
  expect(screen.queryByText("No historical data available")).toBeNull();
  expect(screen.queryByText("12,345")).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});
it("popular packages show unavailable without calling an undeployed analytics method", () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  render(wrapped(<TopPackagesCard />));
  expect(screen.getByRole("status").textContent).toContain(
    "Statistics are unavailable on this network.",
  );
  expect(screen.queryByRole("table")).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});
it.each(["0", "9007199254740993"])(
  "checkpoint %s uses the real supported SDK method and preserves integer precision",
  async (value) => {
    const methods: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (_url, init) => {
        const request = JSON.parse(String(init?.body));
        methods.push(request.method);
        expect(request.params).toEqual([]);
        return new Response(
          JSON.stringify({ jsonrpc: "2.0", id: request.id, result: value }),
        );
      }),
    );
    render(wrapped(<Checkpoint />));
    await waitFor(() =>
      expect(screen.getByText(BigInt(value).toLocaleString())).toBeDefined(),
    );
    expect(methods).toEqual(["rtd_getLatestCheckpointSequenceNumber"]);
  },
);
it("checkpoint failure displays unavailable rather than a cached analytics checkpoint or zero", async () => {
  const fetchMock = vi.fn<typeof fetch>(
    async () => new Response("", { status: 503 }),
  );
  vi.stubGlobal("fetch", fetchMock);
  render(wrapped(<Checkpoint />));
  await waitFor(() =>
    expect(screen.getByRole("status").textContent).toBe(
      "Checkpoint unavailable",
    ),
  );
  expect(screen.queryByText("0")).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
