// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useWalletStoredReceipt } from "_src/shared/rpc/stored-receipt-hook";
import { useActiveAccount } from "./useActiveAccount";
import { useBackgroundClient } from "./useBackgroundClient";

export function useStoredTransactionReceipt(digest: string | null) {
  const account = useActiveAccount(),
    background = useBackgroundClient();
  return useWalletStoredReceipt(digest, account, background);
}
