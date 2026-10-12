// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import {
  walletReadAllowed,
  walletReadKeyParts,
} from "rtd-apps-core/src/rpc/read-admission";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";

export function useRestrictedGuard() {
  const rpc = useWalletRpc(),
    navigate = useNavigate(),
    location = useLocation();
  const query = useQuery({
    queryKey: [
      "wallet-entry-access",
      rpc.bindingKey,
      rpc.readSessionKey,
      ...walletReadKeyParts(rpc, "entry"),
    ],
    queryFn: ({ signal }) => rpc.probeEntryAccess(signal),
    enabled: walletReadAllowed(rpc, "entry") && rpc.hasFullnodeSession,
    gcTime: 0,
    staleTime: 0,
    retry: false,
    meta: { skipPersistedCache: true, walletReadOperation: "entry" },
  });
  const access =
    walletReadAllowed(rpc, "entry") && rpc.hasFullnodeSession && !query.isError
      ? query.data
      : undefined;
  useEffect(() => {
    if (access?.state === "restricted" && location.pathname !== "/restricted")
      navigate("/restricted", { replace: true });
    else if (
      access?.state === "accessible" &&
      location.pathname === "/restricted"
    )
      navigate("/", { replace: true });
  }, [access, location.pathname, navigate]);
  // An unknown/new session cannot clear a previously displayed restriction.
  return (
    access?.state === "restricted" ||
    (location.pathname === "/restricted" && access?.state !== "accessible")
  );
}
