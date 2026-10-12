// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DehydrateOptions, DehydratedState } from '@tanstack/react-query';

import type { PersistedClient } from '@tanstack/react-query-persist-client';

// Do not hydrate pre-migration chain facts or pending actions from queryClient.v1.
// Durable transaction recovery belongs exclusively to the execution journal.
export const QUERY_CACHE_KEY = 'queryClient.wallet-grpc.v2';
export const QUERY_CACHE_BUSTER = 'wallet-grpc-v2';
function allowedQuery(query: {
  queryKey: readonly unknown[];
  state: { status: string };
  meta?: Record<string, unknown>;
}): boolean {
  return query.state.status === 'success' &&
    !query.meta?.skipPersistedCache &&
    !(typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('wallet-'));
}

export const queryDehydrateOptions: DehydrateOptions = {
  shouldDehydrateMutation: () => false,
  shouldDehydrateQuery: allowedQuery,
};

/** Saving filters do not apply during hydration. Reapply the boundary to stored snapshots. */
export function filterPersistedQueries(client: PersistedClient | undefined): PersistedClient | undefined {
  if (!client || typeof client.buster !== 'string' ||
    !Number.isFinite(client.timestamp) || !Array.isArray(client.clientState?.queries)) return undefined;
  const queries = client.clientState.queries.filter((query): query is DehydratedState['queries'][number] =>
    !!query && Array.isArray(query.queryKey) && typeof query.queryHash === 'string' &&
    !!query.state && allowedQuery(query));
  return {
    ...client,
    clientState: { mutations: [], queries },
  };
}
