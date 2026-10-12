// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { walletReadAllowed, walletReadKeyParts } from "./read-admission";

import { useQuery } from "@tanstack/react-query";
import { GrowthBookContext } from "@growthbook/growthbook-react";
import { normalizeStructTag, parseStructTag } from "rtd-typescript/utils";
import BigNumber from "bignumber.js";
import { useContext, useMemo } from "react";

import { formatAmount } from "../utils/formatAmount";
import { useWalletRpc } from "./WalletRpcContext";

export enum CoinFormat {
  ROUNDED = "ROUNDED",
  FULL = "FULL",
}

export function atomicBalance(balance: bigint | number | string): string {
  if (
    (typeof balance === "number" && !Number.isSafeInteger(balance)) ||
    !/^-?(0|[1-9]\d*)$/.test(balance.toString())
  )
    throw new RangeError("原子金额必须是精确整数");
  return balance.toString();
}

export function formatBalance(
  balance: bigint | number | string,
  decimals: number,
  format = CoinFormat.ROUNDED,
) {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255)
    throw new RangeError("币种精度无效");
  const amount = new BigNumber(atomicBalance(balance)).shiftedBy(-decimals);
  return format === CoinFormat.FULL ? amount.toFormat() : formatAmount(amount);
}

export function getCoinSymbol(type: string) {
  try {
    return parseStructTag(type).name;
  } catch {
    return "";
  }
}

export function useCoinMetadata(
  coinType?: string | null,
  options: { enabled?: boolean } = {},
) {
  const rpc = useWalletRpc();
  const type = coinType ? normalizeStructTag(coinType) : null;
  const growthbook = useContext(GrowthBookContext)?.growthbook;
  const overrides =
    growthbook?.getFeatureValue<
      Record<string, { name?: string; symbol?: string; iconUrl?: string }>
    >("token-metadata-overrides", {}) ?? {};
  const query = useQuery({
    queryKey: [
      "wallet-coin-metadata",
      rpc.bindingKey,
      rpc.readSessionKey,
      ...walletReadKeyParts(rpc, "coinMetadata"),
      type,
    ],
    queryFn: ({ signal }) => {
      if (!rpc.readCoinMetadata) throw new Error("币种元数据查询服务尚未配置");
      return rpc.readCoinMetadata(type!, signal);
    },
    select: (result) => {
      if (result.value === null)
        return { value: null, snapshot: result.snapshot };
      const custom = type ? overrides[type] : undefined;
      const metadata = {
        ...result.value,
        name: custom?.name ?? result.value.name,
        symbol: custom?.symbol ?? result.value.symbol,
        iconUrl: custom?.iconUrl ?? result.value.iconUrl,
      };
      // Overrides affect labels only; never change the chain's decimals.
      return {
        value: {
          ...metadata,
          name:
            metadata.name.length > 10
              ? metadata.name.slice(0, 10) + "…"
              : metadata.name,
          symbol:
            metadata.symbol.length > 5
              ? metadata.symbol.slice(0, 5) + "…"
              : metadata.symbol,
        },
        snapshot: result.snapshot,
      };
    },
    retry: false,
    enabled:
      options.enabled !== false &&
      !!type &&
      (rpc.state !== "initializing" || rpc.hasFullnodeSession),
    staleTime: 5_000,
    refetchInterval: (query) =>
      query.state.fetchStatus === "idle" ? 20_000 : false,
    refetchOnWindowFocus: (query) => query.state.fetchStatus === "idle",
    refetchOnReconnect: (query) => query.state.fetchStatus === "idle",
    gcTime: 5_000,
    meta: { skipPersistedCache: true, walletReadOperation: "coinMetadata" },
  });
  // A failed read cannot authorize decimal conversion using an older snapshot.
  return {
    ...query,
    data:
      options.enabled === false ||
      !walletReadAllowed(rpc, "coinMetadata") ||
      query.isError
        ? undefined
        : query.data?.value,
    snapshot:
      options.enabled === false ||
      !walletReadAllowed(rpc, "coinMetadata") ||
      query.isError
        ? undefined
        : query.data?.snapshot,
  };
}

export function useFormatCoin(
  balance?: bigint | number | string | null,
  type?: string | null,
  format = CoinFormat.ROUNDED,
) {
  const query = useCoinMetadata(type);
  const fallback = type ? getCoinSymbol(type) : "";
  const formatted = useMemo(() => {
    if (balance === undefined || balance === null) return "";
    if (query.isError) return "—";
    if (!query.isSuccess) return "…";
    try {
      return query.data
        ? formatBalance(balance, query.data.decimals, format)
        : atomicBalance(balance);
    } catch {
      return "—";
    }
  }, [balance, format, query.data, query.isError, query.isSuccess]);
  const symbol = !query.isSuccess
    ? ""
    : (query.data?.symbol ?? `${fallback} (atomic units)`);
  return [formatted, symbol, query] as const;
}
