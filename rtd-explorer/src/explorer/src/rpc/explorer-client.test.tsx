import { afterEach, expect, it, vi } from "vitest";
import { render, renderHook, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import {
  ExplorerClientProvider,
  useExplorerQuery,
  useExplorerInfiniteQuery,
} from "./explorer-client";

const caches: QueryClient[] = [];
afterEach(() => {
  cleanup();
  caches.forEach((cache) => cache.clear());
  caches.length = 0;
  vi.unstubAllGlobals();
});
function wrapper({
  children,
  network = "https://query-a.test",
}: {
  children: ReactNode;
  network?: string;
}) {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  caches.push(cache);
  return (
    <QueryClientProvider client={cache}>
      <ExplorerClientProvider network={network}>
        {children}
      </ExplorerClientProvider>
    </QueryClientProvider>
  );
}
it("selects a typed SDK result and forwards the TanStack cancellation signal", async () => {
  let capturedSignal: AbortSignal | null | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (_url, init) => {
      capturedSignal = init?.signal;
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: {
            coinType: "0x2::rtd::RTD",
            totalBalance: "9007199254740993",
            coinObjectCount: 1,
          },
        }),
      );
    }),
  );
  const result = renderHook(
    () =>
      useExplorerQuery(
        "getBalance",
        { owner: "0x1" },
        { select: (data) => data.totalBalance },
      ),
    { wrapper },
  );
  await waitFor(() =>
    expect(result.result.current.data).toBe("9007199254740993"),
  );
  expect(capturedSignal).toBeInstanceOf(AbortSignal);
});
it("unmount aborts an outstanding query at the actual SDK HTTP boundary", async () => {
  let capturedSignal: AbortSignal | null | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (_url, init) => {
      capturedSignal = init?.signal;
      return new Promise((_resolve, reject) =>
        capturedSignal?.addEventListener(
          "abort",
          () => reject(new DOMException("Cancelled", "AbortError")),
          { once: true },
        ),
      );
    }),
  );
  const result = renderHook(
    () => useExplorerQuery("getBalance", { owner: "0x1" }),
    { wrapper },
  );
  await waitFor(() => expect(capturedSignal).toBeDefined());
  result.unmount();
  expect(capturedSignal?.aborted).toBe(true);
});
it("fetches the next epoch cursor and stops at the terminal page", async () => {
  const cursors: unknown[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (_url, init) => {
      const request = JSON.parse(String(init?.body));
      const cursor = request.params[0];
      cursors.push(cursor);
      const epoch = {
        epoch: cursor ?? "0",
        validators: [],
        epochTotalTransactions: "1",
        firstCheckpointId: "0",
        epochStartTimestamp: "1",
        endOfEpochInfo: null,
        referenceGasPrice: null,
      };
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: request.id,
          result: {
            data: [epoch],
            nextCursor: cursor === null ? "1" : null,
            hasNextPage: cursor === null,
          },
        }),
      );
    }),
  );
  const result = renderHook(
    () => useExplorerInfiniteQuery("getEpochs", { limit: 1 }),
    { wrapper },
  );
  await waitFor(() => expect(result.result.current.hasNextPage).toBe(true));
  await result.result.current.fetchNextPage();
  await waitFor(() => expect(result.result.current.hasNextPage).toBe(false));
  expect(cursors).toEqual([null, "1"]);
  expect(result.result.current.data?.pages).toHaveLength(2);
});
it("refuses a non-advancing cursor instead of retrying the same page indefinitely", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (_url, init) => {
      const request = JSON.parse(String(init?.body));
      const epoch = {
        epoch: "1",
        validators: [],
        epochTotalTransactions: "1",
        firstCheckpointId: "0",
        epochStartTimestamp: "1",
        endOfEpochInfo: null,
        referenceGasPrice: null,
      };
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: request.id,
          result: { data: [epoch], nextCursor: "1", hasNextPage: true },
        }),
      );
    }),
  );
  const result = renderHook(
    () => useExplorerInfiniteQuery("getEpochs", { cursor: "1", limit: 1 }),
    { wrapper },
  );
  await waitFor(() =>
    expect(result.result.current.error?.message).toBe(
      "Epoch cursor did not advance",
    ),
  );
});

it("separates the same read and owner across endpoint switches in one query cache", async () => {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  caches.push(cache);
  const urls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (url) => {
      urls.push(String(url));
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: {
            coinType: "0x2::rtd::RTD",
            totalBalance: String(url).includes("query-a") ? "111" : "222",
            coinObjectCount: 1,
          },
        }),
      );
    }),
  );
  function Consumer() {
    const read = useExplorerQuery("getBalance", { owner: "0x1" });
    return <span>{read.data?.totalBalance}</span>;
  }
  const tree = (network: string) => (
    <QueryClientProvider client={cache}>
      <ExplorerClientProvider network={network}>
        <Consumer />
      </ExplorerClientProvider>
    </QueryClientProvider>
  );
  const view = render(tree("https://query-a.test"));
  await waitFor(() => expect(view.container.textContent).toBe("111"));
  view.rerender(tree("https://query-b.test"));
  await waitFor(() => expect(view.container.textContent).toBe("222"));
  view.rerender(tree("https://query-a.test"));
  await waitFor(() => expect(view.container.textContent).toBe("111"));
  expect(urls).toEqual(["https://query-a.test", "https://query-b.test"]);
});
// Compile-time boundary: mutations cannot become automatically retried query functions.
if (false) {
  // @ts-expect-error Executing transactions is not a read query method.
  useExplorerQuery("executeTransactionBlock", {
    transactionBlock: "not-dispatched",
    signature: "not-dispatched",
  });
}
