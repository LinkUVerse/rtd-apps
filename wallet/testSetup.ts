// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { webcrypto } from "crypto";
import { exclusiveLockManager } from "./tests/unit/rpc/exclusive-lock-manager";

if (!globalThis.crypto) {
  globalThis.crypto = webcrypto as Crypto;
}

// Happy DOM has no Web Locks. Keep the production path fail-closed; model locks only here.
Object.defineProperty(navigator, "locks", {
  configurable: true,
  value: exclusiveLockManager(),
});

// Create a fake chrome object so that the webextension polyfill can load:
globalThis.chrome = {
  runtime: {
    id: "some-test-id-from-test-setup",
  },
};
