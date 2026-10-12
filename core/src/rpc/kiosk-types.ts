// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { KioskOwnerCap } from "rtd-kiosk";
import type { WalletAssetObject } from "./WalletRpcContext";

export type WalletKioskItem = WalletAssetObject & {
  readonly kioskId: string;
  readonly isLocked: boolean;
  readonly listing?: {
    readonly fieldId: string;
    readonly isExclusive: boolean;
    readonly price: string;
  };
};

export interface WalletNativeKiosk {
  readonly kind: "framework";
  readonly kioskId: string;
  readonly ownerCap: KioskOwnerCap;
  readonly items: readonly WalletKioskItem[];
  readonly profits: string;
  readonly owner: string;
  readonly allowExtensions: boolean;
}

export interface WalletOriginByteKiosk {
  readonly kind: "originbyte";
  readonly kioskId: string;
  readonly ownerTokenId: string;
  readonly owner: string;
  readonly items: readonly (WalletKioskItem & {
    readonly originByteRegistered: boolean;
    readonly originByteExclusive: boolean;
  })[];
  readonly extensionVersion: string;
}

export type WalletKiosk = WalletNativeKiosk | WalletOriginByteKiosk;
