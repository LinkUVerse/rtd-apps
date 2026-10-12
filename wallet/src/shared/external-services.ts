// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

declare const __WALLET_EXTERNAL_SERVICES_ENABLED__: boolean;

/** Build-owned ancillary services policy, independent of runtime profiles and dApp inputs. */
export const walletExternalServicesEnabled =
  typeof __WALLET_EXTERNAL_SERVICES_ENABLED__ !== "undefined" &&
  __WALLET_EXTERNAL_SERVICES_ENABLED__ === true;
