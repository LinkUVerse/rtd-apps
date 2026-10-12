// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import Browser from 'webextension-polyfill';
import { getAllAccounts } from './accounts';
import { accountsEvents } from './accounts/events';
import { recoverWalletExecution } from './execution';
import NetworkEnv from './NetworkEnv';

export const executionRecoveryAlarm = 'wallet-execution-recovery-v2';

/** Coalesce wakeups, but retain a wakeup that arrives during a stale session. */
export function createRecoveryWakeup(recover: () => Promise<void>) {
  let running: Promise<void> | undefined;
  let requested = false;
  return function wake(): Promise<void> {
    requested = true;
    if (!running) {
      running = (async () => {
        while (requested) {
          requested = false;
          try {
            await recover();
          } catch {
            // A failed lookup, unavailable profile or locked/deleted account cannot clear pending.
            // A future browser alarm or explicit wallet wakeup may retry the same digest.
          }
        }
      })().finally(() => {
        running = undefined;
        // A microtask may request another pass after the loop exits but before finalization.
        if (requested) return wake();
      });
    }
    return running;
  };
}

export async function recoverSelectedWalletExecution(): Promise<void> {
  const accounts = await getAllAccounts();
  const selected = [];
  for (const account of accounts) {
    if ((await account.toUISerialized()).selected) selected.push(account);
  }
  // Do not guess a scope when storage has no selected account or is inconsistent.
  if (selected.length !== 1) return;
  // This entry point allows a locked signing account and only invokes coordinator.recover.
  // It rechecks current profile/account before lookup and before persisting any receipt.
  await recoverWalletExecution(selected[0].id);
}

export function installExecutionRecoveryWakeups(): void {
  const wake = createRecoveryWakeup(recoverSelectedWalletExecution);
  const trigger = () => { void wake(); };
  Browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === executionRecoveryAlarm) trigger();
  });
  Browser.runtime.onStartup.addListener(trigger);
  Browser.runtime.onConnect.addListener(trigger);
  NetworkEnv.on('changed', trigger);
  accountsEvents.on('activeAccountChanged', trigger);
  accountsEvents.on('accountsChanged', trigger);
  accountsEvents.on('accountStatusChanged', trigger);
  // Register listeners synchronously on every worker evaluation. The alarm is only a wakeup:
  // IndexedDB remains the source of truth, and no in-memory flag grants permission to send.
  void (async () => {
    try {
      if (!(await Browser.alarms.get(executionRecoveryAlarm))) {
        await Browser.alarms.create(executionRecoveryAlarm, { periodInMinutes: 1 });
      }
    } catch {
      // Explicit connection/account/network wakeups remain usable if alarm setup fails.
    }
    await wake();
  })();
}
