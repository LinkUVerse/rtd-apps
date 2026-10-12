// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { WalletDappEgressPeerBroker } from "./dapp-egress-peer";
import {
  initializeWalletContext,
  walletDappEgressStore,
} from "./wallet-context-mutation";
let broker: WalletDappEgressPeerBroker | undefined;
/** Lazy and worker-only: importing an account helper in UI never starts a generation. */
export function getDappEgressBroker(): WalletDappEgressPeerBroker {
  if (typeof document !== "undefined")
    throw new Error("私有结果出口仅允许后台worker");
  return (broker ??= new WalletDappEgressPeerBroker(
    walletDappEgressStore,
    initializeWalletContext(),
  ));
}
