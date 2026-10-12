// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import {
  assetReadOperation,
  walletReadAllowed,
  walletReadKeyParts,
} from "./read-admission";

import { useQuery } from "@tanstack/react-query";
import {
  isValidRtdAddress,
  normalizeRtdAddress,
  normalizeStructTag,
  parseStructTag,
} from "rtd-typescript/utils";

import {
  type AssetSnapshotResult,
  type WalletAssetObject,
  useWalletRpc,
} from "./WalletRpcContext";

export interface OwnedAssetFilter {
  readonly includeTypes?: readonly string[];
  readonly excludeTypes?: readonly string[];
}

export function assetAddress(value: string) {
  if (!/^0x[0-9a-fA-F]{1,64}$/.test(value)) throw new Error("资产地址无效");
  const address = normalizeRtdAddress(value);
  if (!isValidRtdAddress(address)) throw new Error("资产地址无效");
  return address;
}

export function matchesAssetType(actual: string, pattern: string) {
  const tag = parseStructTag(pattern);
  const normalized = normalizeStructTag(pattern);
  return tag.typeParams.length
    ? normalizeStructTag(actual) === normalized
    : normalizeStructTag(actual).split("<")[0] === normalized;
}

export function filterOwnedAssets(
  objects: readonly WalletAssetObject[],
  filter?: OwnedAssetFilter,
) {
  return objects.filter(
    (object) =>
      (filter?.includeTypes === undefined ||
        filter.includeTypes.some((type) =>
          matchesAssetType(object.type, type),
        )) &&
      !filter?.excludeTypes?.some((type) =>
        matchesAssetType(object.type, type),
      ),
  );
}

export function useAssetQuery<T>(
  operation: string,
  parameters: unknown,
  enabled: boolean,
  read: (
    snapshot: Awaited<
      ReturnType<ReturnType<typeof useWalletRpc>["openAssetSnapshot"]>
    >,
    signal: AbortSignal,
  ) => Promise<AssetSnapshotResult<T>>,
) {
  const rpc = useWalletRpc();
  const readOperation = assetReadOperation(operation);
  const query = useQuery({
    queryKey: [
      "wallet-assets",
      rpc.bindingKey,
      rpc.readSessionKey,
      ...walletReadKeyParts(rpc, readOperation),
      rpc.assetSnapshotKey,
      operation,
      parameters,
    ],
    queryFn: async ({ signal }) =>
      read(await rpc.openAssetSnapshot(signal), signal),
    select: (result) => result.value,
    enabled:
      walletReadAllowed(rpc, readOperation) &&
      enabled &&
      rpc.state !== "initializing",
    retry: false,
    staleTime: Infinity,
    // Brief list/detail navigation may reuse only this exact admitted snapshot.
    // A new snapshot/session/admission key still requires a new read.
    gcTime: 5_000,
    meta: { skipPersistedCache: true, walletReadOperation: readOperation },
  });
  // Failed revalidation must not expose a previously admitted result as current.
  return {
    ...query,
    data:
      !enabled ||
      rpc.state === "initializing" ||
      !walletReadAllowed(rpc, readOperation) ||
      query.isError
        ? undefined
        : query.data,
  };
}

export function useGetObject(id?: string | null) {
  const objectId = id ? assetAddress(id) : null;
  return useAssetQuery(
    "object",
    objectId,
    !!objectId,
    async (reader, signal) => {
      const result = await reader.objects([objectId!], signal);
      const object = result.value[0];
      if (object instanceof Error) throw object;
      if (!object) throw new Error("对象查询缺少结果");
      return { snapshot: result.snapshot, value: object };
    },
  );
}

export function useMultiGetObjects(
  ids: readonly string[],
  options: { enabled?: boolean } = {},
) {
  const normalized = ids.map(assetAddress);
  return useAssetQuery(
    "objects",
    normalized,
    !!normalized.length && options.enabled !== false,
    (reader, signal) => reader.objects(normalized, signal),
  );
}

export function useGetOwnedObjects(
  owner?: string | null,
  filter?: OwnedAssetFilter,
  options: { enabled?: boolean } = {},
) {
  const address = owner ? assetAddress(owner) : null;
  const query = useAssetQuery(
    "owned-objects",
    address,
    !!address && options.enabled !== false,
    (reader, signal) => reader.ownedObjects(address!, { signal }),
  );
  return {
    ...query,
    data:
      query.data && !query.isError
        ? filterOwnedAssets(query.data, filter)
        : undefined,
  };
}

export function useAssetCoins(type: string, owner?: string | null) {
  const address = owner ? assetAddress(owner) : null;
  const coinType = normalizeStructTag(type);
  return useAssetQuery(
    "coin-objects",
    [address, coinType],
    !!address,
    (reader, signal) => reader.coinObjects(address!, coinType, signal),
  );
}
