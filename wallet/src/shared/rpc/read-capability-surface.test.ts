// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { expect, it } from "vitest";
import {
  shouldObserveReadCapabilities,
  shouldPreloadAssetSnapshot,
} from "./read-capability-surface";

it.each([
  ["/dapp/connect/request", false, false],
  ["/dapp/approve/request", false, false],
  ["/dapp/approve/request/", false, false],
  ["/tokens", true, false],
  ["/stake", true, false],
  ["/tokens", false, true],
  ["/dapp/other/request", false, true],
  ["/dapp/approve/request/extra", false, true],
])(
  "surface %s popup=%s selects only passive observation=%s",
  (path, popup, expected) => {
    expect(shouldObserveReadCapabilities(path, popup)).toBe(expected);
  },
);

it.each([
  ["/", false],
  ["/tokens", false],
  ["/tokens/", false],
  ["/tokens/details", false],
  ["/stake/new", false],
  ["/stake/delegation-detail", false],
  ["/send/select", false],
  ["/accounts/manage", false],
  ["/apps/connected", false],
  ["/transactions", false],
  ["/transactions/pending", false],
  ["/receipt", false],
  ["/receipt/", false],
  ["/kiosk", true],
  ["/nft-transfer/0xa", true],
  ["/unknown-page", true],
  ["/nfts", true],
  ["/stake", false],
  ["/send", false],
  ["/dapp/approve/request", true],
])("asset preloading for %s is %s", (path, expected) => {
  expect(shouldPreloadAssetSnapshot(path as string)).toBe(expected);
});
