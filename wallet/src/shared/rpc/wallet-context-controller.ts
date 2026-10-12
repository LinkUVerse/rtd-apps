// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { type WalletEgressMutation } from "./dapp-egress-store";

export interface WalletContextStore {
  startEpoch(): Promise<unknown>;
  beginMutation(): Promise<WalletEgressMutation>;
  finishMutation(token: WalletEgressMutation): Promise<void>;
}

/** No startup IO at import/construction: UI imports account type predicates too. */
export class WalletContextController {
  #startup: Promise<unknown> | undefined;
  constructor(
    private readonly store: WalletContextStore,
    private readonly isWorker: () => boolean,
  ) {}
  initialize(): Promise<unknown> {
    if (!this.isWorker())
      return Promise.reject(new Error("钱包上下文只能由后台启动"));
    return (this.#startup ??= Promise.resolve().then(() =>
      this.store.startEpoch(),
    ));
  }
  async begin(): Promise<WalletEgressMutation> {
    await this.initialize();
    return this.store.beginMutation();
  }
  finish(token: WalletEgressMutation): Promise<void> {
    return this.store.finishMutation(token);
  }
  async mutate<T>(operation: () => Promise<T> | T): Promise<T> {
    const token = await this.begin();
    const result = await operation();
    // An unsuccessful/unknown external write must keep its durable pending.
    await this.finish(token);
    return result;
  }
}
