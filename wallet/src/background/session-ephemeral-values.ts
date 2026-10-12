// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { type Serializable } from "_shared/cryptography/keystore";
import {
  getEncryptedFromSessionStorage,
  isSessionStorageSupported,
  removeFromSessionStorage,
  setToSessionStorageEncrypted,
} from "_src/background/storage-utils";

import { withWalletContextMutation } from "./wallet-context-mutation";

export function getEphemeralValue<T extends Serializable>(id: string) {
  return getEncryptedFromSessionStorage<T>(id);
}

export function setEphemeralValue<T extends Serializable>(id: string, data: T) {
  if (!isSessionStorageSupported()) throw new Error("会话密钥存储不可用");
  return withWalletContextMutation(() =>
    setToSessionStorageEncrypted(id, data),
  );
}

export function clearEphemeralValue(id: string) {
  if (!isSessionStorageSupported()) throw new Error("会话密钥存储不可用");
  return withWalletContextMutation(() => removeFromSessionStorage(id));
}
