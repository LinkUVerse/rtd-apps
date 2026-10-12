// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/ban-types */

import { type AccountSourceSerializedUI } from "_src/background/account-sources/AccountSource";
import { type SerializedUIAccount } from "_src/background/accounts/Account";
import { type ZkLoginProvider } from "_src/background/accounts/zklogin/providers";
import { type Status } from "_src/background/legacy-accounts/storage-migration";

import type { ExecutePreparedArgs } from "_src/background/execution";
import type { WalletExecutionOutcome } from "_src/shared/rpc/execution-coordinator";

import { isBasePayload } from "./BasePayload";
import type { Payload } from "./Payload";

export type UIAccessibleEntityType = "accountSources" | "accounts";
export type LedgerAccountsPublicKeys = {
  accountID: string;
  publicKey: string;
}[];
export type PasswordRecoveryData = {
  type: "mnemonic";
  accountSourceID: string;
  entropy: string;
};

type MethodPayloads = {
  getStoredEntities: { type: UIAccessibleEntityType };
  storedEntitiesResponse: { entities: any; type: UIAccessibleEntityType };
  createAccountSource: {
    type: "mnemonic";
    params: {
      password: string;
      entropy?: string;
    };
  };
  accountSourceCreationResponse: { accountSource: AccountSourceSerializedUI };
  lockAccountSourceOrAccount: { id: string };
  unlockAccountSourceOrAccount: { id: string; password?: string };
  createAccounts:
    | { type: "mnemonic-derived"; sourceID: string }
    | { type: "imported"; keyPair: string; password: string }
    | {
        type: "zkLogin";
        provider: ZkLoginProvider;
      };
  accountsCreatedResponse: { accounts: SerializedUIAccount[] };
  getSavedCustomProfile: Record<string, never>;
  getSavedCustomProfileResponse: { result: import('_src/shared/rpc/profile').WalletNetworkProfile | null };
  prepareCustomProfile: { profile: unknown };
  prepareCustomProfileResponse: { result: import('_src/shared/rpc/custom-profile-review').CustomProfileReview };
  confirmCustomProfile: { token: string };
  confirmCustomProfileResponse: { result: import('_src/shared/api-env').NetworkEnvType };
  signDappPersonalMessage: import("_src/background/dapp-preparation").PrepareDappArgs;
  signDappPersonalMessageResponse: {
    result: { messageBytes: string; signature: string };
  };
  recoverDappExecution: import('_src/background/dapp-preparation').PrepareDappArgs;
  recoverDappExecutionResponse: { result: import('_src/background/dapp-execution').DappExecutionResult | null };
  executeDappPrepared: import("_src/background/dapp-signing").SignDappPreparedArgs;
  executeDappPreparedResponse: {
    result: import("_src/background/dapp-execution").DappExecutionResult;
  };
  signDappPrepared: import("_src/background/dapp-signing").SignDappPreparedArgs;
  signDappPreparedResponse: { result: { bytes: string; signature: string } };
  prepareDappTransaction: import("_src/background/dapp-preparation").PrepareDappArgs;
  prepareDappTransactionResponse: {
    result: Omit<Awaited<ReturnType<typeof import("_src/background/dapp-preparation").prepareDappTransaction>>, 'prepared'> & {
      prepared: import('_src/shared/rpc/prepared-wire').PreparedTransactionWire;
    };
  };
  executePreparedTransaction: ExecutePreparedArgs;
  executePreparedTransactionResponse: { result: WalletExecutionOutcome };
  recoverPreparedTransaction: { accountId: string };
  recoverPreparedTransactionResponse: { result: WalletExecutionOutcome | null };
  readStoredReceipt: import("_src/background/execution").ReadStoredReceiptArgs;
  readStoredReceiptResponse: {
    result:
      | import("_src/shared/rpc/execution-journal").WalletStoredReceipt
      | null;
  };
  entitiesUpdated: { type: UIAccessibleEntityType };
  getStorageMigrationStatus: null;
  storageMigrationStatus: { status: Status };
  doStorageMigration: { password: string };
  switchAccount: { accountID: string };
  setAccountNickname: { id: string; nickname: string | null };
  verifyPassword: { password: string; legacyAccounts?: boolean };
  storeLedgerAccountsPublicKeys: {
    publicKeysToStore: LedgerAccountsPublicKeys;
  };
  getAccountSourceEntropy: { accountSourceID: string; password?: string };
  getAccountSourceEntropyResponse: { entropy: string };
  clearWallet: {};
  getAutoLockMinutes: {};
  getAutoLockMinutesResponse: { minutes: number | null };
  setAutoLockMinutes: { minutes: number | null };
  notifyUserActive: {};
  getAccountKeyPair: { accountID: string; password: string };
  getAccountKeyPairResponse: { accountID: string; keyPair: string };
  resetPassword: {
    password: string;
    recoveryData: PasswordRecoveryData[];
  };
  verifyPasswordRecoveryData: {
    data: PasswordRecoveryData;
  };
  removeAccount: { accountID: string };
  acknowledgeZkLoginWarning: { accountID: string };
};

type Methods = keyof MethodPayloads;

export interface MethodPayload<M extends Methods> {
  type: "method-payload";
  method: M;
  args: MethodPayloads[M];
}

export function isMethodPayload<M extends Methods>(
  payload: Payload,
  method: M,
): payload is MethodPayload<M> {
  return (
    isBasePayload(payload) &&
    payload.type === "method-payload" &&
    "method" in payload &&
    payload.method === method &&
    "args" in payload
  );
}
