// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import Dexie from "dexie";
import { WalletDappEgressStore } from "../shared/rpc/dapp-egress-store";
import { WalletContextController } from "../shared/rpc/wallet-context-controller";

// Construction is inert. Only the real background worker starts this generation.
export const walletDappEgressStore = new WalletDappEgressStore();
const controller = new WalletContextController(
  walletDappEgressStore,
  () => typeof document === "undefined",
);
export const initializeWalletContext = () => controller.initialize();

export async function withWalletContextMutation<T>(
  operation: () => Promise<T> | T,
): Promise<T> {
  const transaction = Dexie.currentTransaction;
  if (!transaction) return controller.mutate(operation);

  // Wait only for the separate admission DB; never put account-table work inside waitFor.
  const token = await Dexie.waitFor(controller.begin(), 6000);
  let succeeded = false;
  transaction.on("complete", () => {
    if (succeeded) {
      void controller.finish(token).catch(() => {
        // The pending remains durable. Avoid persisting key/storage error contents.
        console.error("wallet-context-finalization-unconfirmed");
      });
    }
  });
  const result = await operation();
  succeeded = true;
  return result;
}
