// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useExplorerQuery } from "~/rpc/explorer-client";

export function useGetTransaction(transactionId: string) {
  return useExplorerQuery(
    "getTransactionBlock",
    {
      digest: transactionId,
      options: {
        showInput: true,
        showEffects: true,
        showEvents: true,
        showBalanceChanges: true,
        showObjectChanges: true,
      },
    },
    {
      enabled: !!transactionId,
    },
  );
}
