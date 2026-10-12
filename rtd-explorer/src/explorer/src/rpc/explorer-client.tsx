// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  useInfiniteQuery,
  useQuery,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { Network, createRtdClient } from "../utils/api/DefaultRpcClient";
import type { ExplorerRpcClient } from "./ExplorerRpcClient";

const Context = createContext<{
  client: ExplorerRpcClient;
  network: string;
} | null>(null);
export function ExplorerClientProvider({
  children,
  network,
  defaultNetwork = Network.DEVNET,
}: {
  children: ReactNode;
  network?: string;
  defaultNetwork?: string;
}) {
  const selected = network ?? defaultNetwork;
  const value = useMemo(
    () => ({ client: createRtdClient(selected), network: selected }),
    [selected],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useExplorerClientContext() {
  const value = useContext(Context);
  if (!value) throw new Error("缺少Explorer查询Provider");
  return value;
}
export function useExplorerClient() {
  return useExplorerClientContext().client;
}

type Method = {
  [K in keyof ExplorerRpcClient]: K extends `get${string}` | `query${string}`
    ? ExplorerRpcClient[K] extends (...args: never[]) => Promise<unknown>
      ? K
      : never
    : never;
}[keyof ExplorerRpcClient];
type Callable<K extends Method> = Extract<
  ExplorerRpcClient[K],
  (...args: never[]) => Promise<unknown>
>;
type Input<K extends Method> = Parameters<Callable<K>>[0];
type Result<K extends Method> = Awaited<ReturnType<Callable<K>>>;
type Options<K extends Method, Selected> = Omit<
  UseQueryOptions<Result<K>, Error, Selected>,
  "queryKey" | "queryFn"
>;

function invoke<K extends Method>(
  client: ExplorerRpcClient,
  method: K,
  params: Input<K>,
  signal: AbortSignal,
): Promise<Result<K>> {
  const call = client[method] as (params: Input<K>) => Promise<Result<K>>;
  // All selected SDK query inputs are optional records; preserve fields while forwarding cancellation.
  return call.call(client, { ...(params ?? {}), signal } as Input<K>);
}
export function useExplorerQuery<K extends Method, Selected = Result<K>>(
  method: K,
  ...[params, options]: undefined extends Input<K>
    ? [params?: Input<K>, options?: Options<K, Selected>]
    : [params: Input<K>, options?: Options<K, Selected>]
) {
  const { client, network } = useExplorerClientContext();
  return useQuery<Result<K>, Error, Selected>({
    ...options,
    queryKey: ["explorer-rpc", network, method, params],
    queryFn: ({ signal }) => invoke(client, method, params as Input<K>, signal),
  });
}
export function useExplorerInfiniteQuery(
  method: "getEpochs",
  params: Input<"getEpochs">,
) {
  const { client, network } = useExplorerClientContext();
  return useInfiniteQuery({
    queryKey: ["explorer-rpc", network, method, params],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }) => {
      const cursor = pageParam ?? params?.cursor;
      const page = await client.getEpochs({ ...params, cursor, signal });
      if (page.hasNextPage && page.nextCursor === cursor)
        throw new Error("Epoch cursor did not advance");
      return page;
    },
    getNextPageParam: (page) => (page.hasNextPage ? page.nextCursor : null),
  });
}
