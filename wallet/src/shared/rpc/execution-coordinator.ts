// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { messageWithIntent } from "rtd-typescript/cryptography";
import { walletAddress } from "./asset-address";
import {
  createPendingRecord,
  WalletJournalError,
  type WalletExecutionJournal,
  type WalletExecutionReceipt,
  type WalletJournalRecord,
} from "./execution-journal";
import {
  approvedTransaction,
  type WalletExecutionReader,
} from "./execution-reader";
import { executionScopeKey, networkBindingKey } from "./profile";
import { WalletReadSession } from "./session";

export type WalletExecutionOutcome =
  | {
      readonly state: "confirmed";
      readonly recordId: string;
      readonly receipt: WalletExecutionReceipt;
    }
  | {
      readonly state: "pending";
      readonly recordId: string;
      readonly digest: string;
      readonly reason:
        | "dispatch-unknown"
        | "receipt-unavailable"
        | "storage-unavailable";
    };
export interface ApprovedExecutionRequest {
  readonly accountId: string;
  readonly accountAddress: string;
  readonly requestId: string;
  readonly originRef: string;
  readonly bindingKey: string;
  readonly bytesBase64: string;
  readonly digest: string;
}
export interface ExecutionLock {
  run<T>(
    scope: string,
    operation: () => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T>;
}
export class BrowserExecutionLock implements ExecutionLock {
  async run<T>(
    scope: string,
    operation: () => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    if (!globalThis.navigator?.locks)
      throw new Error("浏览器执行互斥不可用，禁止提交");
    signal?.throwIfAborted();
    return navigator.locks.request(
      `wallet-execution:${scope}`,
      { mode: "exclusive", ifAvailable: true },
      async (lock) => {
        if (!lock) throw new Error("当前链账户正在签名或恢复，请稍后查看结果");
        signal?.throwIfAborted();
        return operation();
      },
    );
  }
}
function outcome(record: WalletJournalRecord): WalletExecutionOutcome {
  return record.state === "dispatch-pending"
    ? {
        state: "pending",
        recordId: record.id,
        digest: record.digest,
        reason: "dispatch-unknown",
      }
    : { state: "confirmed", recordId: record.id, receipt: record.receipt! };
}

/** Runs in background. The durable scope outlives UI requests, Web Locks and service-worker memory. */
export class WalletExecutionCoordinator {
  constructor(
    readonly session: WalletReadSession,
    readonly journal: Pick<
      WalletExecutionJournal,
      "pending" | "get" | "commitPending" | "commitReceipt"
    >,
    readonly reader: Pick<
      WalletExecutionReader,
      "dispatch" | "lookup" | "verifySignature"
    >,
    readonly lock: ExecutionLock = new BrowserExecutionLock(),
  ) {}

  async execute(
    input: ApprovedExecutionRequest,
    callbacks: {
      /** Re-check live account, current profile and origin/request authorization at each boundary. */
      authorize: () => Promise<void>;
      simulate: (bytesBase64: string, sender: string) => Promise<void>;
      signData: (intent: Uint8Array) => Promise<string>;
    },
  ): Promise<WalletExecutionOutcome> {
    const approved = Object.freeze({
      ...input,
      accountAddress: walletAddress(input.accountAddress),
    });
    const data = approvedTransaction(
      approved.bytesBase64,
      approved.accountAddress,
    );
    if (
      data.digest !== approved.digest ||
      approved.bindingKey !== networkBindingKey(this.session.profile)
    )
      throw new Error("交易批准绑定或摘要已改变");
    // External gas signatures must have their own explicit authorization; never silently pay as sender.
    if (
      walletAddress(data.transaction.gasData.owner) !== approved.accountAddress
    )
      throw new Error("赞助交易需要完整多方签名授权，当前入口不能单独提交");
    const record = createPendingRecord(this.session.profile, approved);
    return this.lock.run(
      record.scope,
      async () => {
        this.session.assertActive();
        await callbacks.authorize();
        const previous = await this.journal.get(record.id);
        if (previous) {
          if (
            previous.digest !== approved.digest ||
            previous.accountId !== approved.accountId ||
            previous.originRef !== approved.originRef
          )
            throw new WalletJournalError("conflict");
          return outcome(previous);
        }
        const pending = await this.journal.pending(record.scope);
        if (pending) return outcome(pending);
        await callbacks.simulate(approved.bytesBase64, approved.accountAddress);
        this.session.assertActive();
        await callbacks.authorize();
        const signature = await callbacks.signData(
          messageWithIntent("TransactionData", Uint8Array.from(data.bytes)),
        );
        this.session.assertActive();
        await callbacks.authorize();
        await this.reader.verifySignature(
          approved.bytesBase64,
          approved.accountAddress,
          signature,
          this.session.signal,
        );
        this.session.assertActive();
        await callbacks.authorize();
        await this.journal.commitPending(record);
        // A process can die here. Recovery reads this digest and must never reconstruct or resend.
        try {
          this.session.assertActive();
          await callbacks.authorize();
          const receipt = await this.reader.dispatch(
            approved.bytesBase64,
            approved.accountAddress,
            [signature],
            this.session.signal,
          );
          this.session.assertActive();
          try {
            const terminal = await this.journal.commitReceipt(
              record.id,
              receipt,
            );
            return outcome(terminal);
          } catch {
            return {
              state: "pending",
              recordId: record.id,
              digest: record.digest,
              reason: "storage-unavailable",
            };
          }
        } catch {
          return {
            state: "pending",
            recordId: record.id,
            digest: record.digest,
            reason: "dispatch-unknown",
          };
        }
      },
      this.session.signal,
    );
  }

  async recover(
    accountAddress: string,
    authorize: () => Promise<void>,
  ): Promise<WalletExecutionOutcome | null> {
    const scope = executionScopeKey(this.session.profile, accountAddress);
    this.session.assertActive();
    const candidate = await this.journal.pending(scope);
    this.session.assertActive();
    // Connection/alarm wakeups with no durable work must not occupy the signing lock.
    // A candidate only admits recovery: the authoritative record is reread under the lock.
    if (!candidate) {
      await authorize();
      this.session.assertActive();
      return null;
    }
    return this.lock.run(
      scope,
      async () => {
        this.session.assertActive();
        await authorize();
        const record = await this.journal.pending(scope);
        if (!record) return null;
        try {
          const receipt = await this.reader.lookup(
            record.digest,
            this.session.signal,
          );
          this.session.assertActive();
          await authorize();
          if (!receipt)
            return {
              state: "pending",
              recordId: record.id,
              digest: record.digest,
              reason: "receipt-unavailable",
            };
          try {
            return outcome(
              await this.journal.commitReceipt(record.id, receipt),
            );
          } catch {
            return {
              state: "pending",
              recordId: record.id,
              digest: record.digest,
              reason: "storage-unavailable",
            };
          }
        } catch {
          return {
            state: "pending",
            recordId: record.id,
            digest: record.digest,
            reason: "receipt-unavailable",
          };
        }
      },
      this.session.signal,
    );
  }
}
