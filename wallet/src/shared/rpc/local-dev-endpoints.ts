// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Fixed entry points of the local dev stack that `localDeploy/rtd-dev.sh` starts.
 * The stack publishes the same ports for every generation, so only the chain
 * identity changes when the chain is reset; these constants stay valid.
 *
 * These are the browser-facing loopback listeners. A browser validates TLS with
 * the platform trust store, and the dev stack signs a fresh local CA on every
 * reset, so `https://127.0.0.1` would fail with UNABLE_TO_VERIFY_LEAF_SIGNATURE
 * until that generation's CA is trusted by hand. The stack therefore serves the
 * wallet on plain loopback ports (the same pattern as the 43402 h2c front door)
 * while every upstream hop stays mTLS.
 *
 * Kept free of imports so the webpack config can read them while generating
 * manifest host permissions.
 */
export const LOCAL_DEV_ENDPOINTS = Object.freeze({
  fullnodeGrpcWeb: "http://127.0.0.1:43350",
  graphqlUrl: "http://127.0.0.1:43412/graphql",
  archiveGrpcWeb: "http://127.0.0.1:43404/archive",
  accountHistoryUrl: "http://127.0.0.1:43413/account/graphql",
});

export interface LocalDevEndpoints {
  fullnodeGrpcWeb: string;
  graphqlUrl?: string;
  archiveGrpcWeb?: string;
  accountHistoryUrl?: string;
}

/** The fixed dev-stack ports, widened to the profile endpoint shape. */
export const LOCAL_DEV_DEFAULTS: LocalDevEndpoints = LOCAL_DEV_ENDPOINTS;

/** Chain labels advertised by an unconfigured local dev deployment. */
export const LOCAL_DEV_CHAIN = Object.freeze({
  id: "local",
  displayName: "RTD Local Dev",
  sdkNetwork: "localnet",
  walletStandardChain: "rtd:localnet",
});
