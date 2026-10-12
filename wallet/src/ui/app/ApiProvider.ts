// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { API_ENV } from "_src/shared/api-env";

type EnvInfo = {
  name: string;
  env: API_ENV;
};

export const API_ENV_TO_INFO: Record<API_ENV, EnvInfo> = {
  [API_ENV.local]: { name: "Local", env: API_ENV.local },
  [API_ENV.devNet]: { name: "Devnet", env: API_ENV.devNet },
  [API_ENV.customRPC]: { name: "Custom RPC", env: API_ENV.customRPC },
  [API_ENV.testNet]: { name: "Testnet", env: API_ENV.testNet },
  [API_ENV.mainnet]: { name: "Mainnet", env: API_ENV.mainnet },
};

function getDefaultApiEnv() {
  const apiEnv = process.env.API_ENV;
  if (apiEnv && !Object.keys(API_ENV).includes(apiEnv)) {
    throw new Error(`Unknown environment variable API_ENV, ${apiEnv}`);
  }
  return apiEnv ? API_ENV[apiEnv as keyof typeof API_ENV] : API_ENV.devNet;
}

export const DEFAULT_API_ENV = getDefaultApiEnv();

type NetworkTypes = keyof typeof API_ENV;

export const generateActiveNetworkList = (): NetworkTypes[] => {
  return Object.values(API_ENV);
};
