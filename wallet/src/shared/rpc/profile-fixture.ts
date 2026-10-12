// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toBase58 } from "rtd-typescript/utils";
import type { WalletNetworkProfile } from "./profile";

export function profileFixture(): WalletNetworkProfile {
  return {
    schemaVersion: 2,
    id: "local",
    displayName: "RTD dev",
    sdkNetwork: "localnet",
    walletStandardChain: "rtd:localnet",
    expectedGenesisDigest: toBase58(new Uint8Array(32).fill(1)),
    generation: "dev-1",
    revision: 1,
    endpoints: {
      fullnodeGrpcWeb: "http://127.0.0.1:9000/fullnode/",
      graphqlUrl: "https://localhost:9001/graphql",
      archiveGrpcWeb: "https://localhost:9001/archive/",
      accountHistoryUrl: "https://localhost:9001/account/graphql",
    },
    packages: {
      kiosk: "0x2",
      personalKiosk: "0x3",
      name: {
        packageId: "0x4",
        forwardRegistry: "0x5",
        reverseRegistry: "0x6",
      },
    },
  };
}
