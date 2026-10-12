// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useQuery } from "@tanstack/react-query";
import BigNumber from "bignumber.js";
import { normalizeStructTag } from "rtd-typescript/utils";

import { useAppsBackend } from "../hooks/useAppsBackend";
import { atomicBalance, useCoinMetadata } from "./coin";
import { useWalletRpc } from "./WalletRpcContext";

/** Price is off-chain information, never a substitute for chain metadata or a balance. */
export function useBalanceInUSD(
  coinType: string,
  balance: bigint | string | number,
) {
  const rpc = useWalletRpc();
  const type = normalizeStructTag(coinType);
  const metadata = useCoinMetadata(type);
  const { request } = useAppsBackend();
  const price = useQuery({
    queryKey: ["wallet-price", rpc.bindingKey, type],
    queryFn: ({ signal }) =>
      request<{ price: string | null }>(`cetus/${type}`, undefined, { signal }),
    enabled: rpc.state === "configured",
    retry: false,
    staleTime: 60_000,
    gcTime: 60_000,
    meta: { skipPersistedCache: true },
  });
  if (
    !metadata.isSuccess ||
    !metadata.data ||
    !price.isSuccess ||
    price.data.price === null
  )
    return null;
  const quote = new BigNumber(price.data.price);
  if (!quote.isFinite() || quote.isNegative()) return null;
  try {
    const value = new BigNumber(atomicBalance(balance))
      .shiftedBy(-metadata.data.decimals)
      .multipliedBy(quote)
      .toNumber();
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}
