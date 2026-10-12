// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { walletReadAllowed, walletReadKeyParts } from "./read-admission";

import { GrowthBookContext } from "@growthbook/growthbook-react";
import { useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { normalizeRtdAddress } from "rtd-typescript/utils";
import { useWalletRpc } from "./WalletRpcContext";

export function useRtdNSEnabled() {
  const context = useContext(GrowthBookContext);
  const rpc = useWalletRpc();
  return (
    !!rpc.packages.name &&
    (!context?.growthbook ||
      context.growthbook.getFeatureValue("rtdns", true) === true)
  );
}

export function useDefaultRtdNSName(address?: string | null) {
  const rpc = useWalletRpc();
  const enabled = useRtdNSEnabled();
  const owner = address ? normalizeRtdAddress(address) : null;
  const query = useQuery({
    queryKey: [
      "wallet-default-name",
      rpc.bindingKey,
      rpc.readSessionKey,
      ...walletReadKeyParts(rpc, "names"),
      owner,
    ],
    queryFn: ({ signal }) => rpc.readDefaultName(owner!, signal),
    enabled:
      walletReadAllowed(rpc, "names") &&
      enabled &&
      rpc.state === "configured" &&
      !!owner,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchInterval: enabled ? 20_000 : false,
    meta: { skipPersistedCache: true, walletReadOperation: "names" },
  });
  const [, expire] = useState(0);
  useEffect(() => {
    if (!query.data || !Number.isFinite(query.data.validUntilMonotonicMs))
      return;
    const timer = setTimeout(
      () => expire((value) => value + 1),
      Math.max(
        0,
        Math.ceil(query.data.validUntilMonotonicMs - performance.now()),
      ) + 1,
    );
    return () => clearTimeout(timer);
  }, [query.data]);
  return {
    ...query,
    data:
      !walletReadAllowed(rpc, "names") ||
      rpc.state !== "configured" ||
      query.isError ||
      !query.data ||
      !enabled ||
      query.data.readSessionKey !== rpc.readSessionKey ||
      query.data.snapshot.bindingKey !== rpc.bindingKey ||
      !Number.isFinite(query.data.validUntilMonotonicMs) ||
      performance.now() >= query.data.validUntilMonotonicMs
        ? undefined
        : query.data.name,
  };
}
