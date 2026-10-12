// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { API_ENV } from "./api-env";
import type { NetworkType } from "./qredo-api";
export const API_ENV_TO_QREDO_NETWORK: Partial<Record<API_ENV, NetworkType>> = {
  [API_ENV.mainnet]: "mainnet",
  [API_ENV.testNet]: "testnet",
  [API_ENV.devNet]: "devnet",
};
