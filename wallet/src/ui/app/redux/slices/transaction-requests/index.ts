// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ApprovalRequest } from "_payloads/transactions/ApprovalRequest";
import type { RootState } from "_redux/RootReducer";
import { getSignerOperationErrorMessage } from "_src/ui/app/helpers/errorMessages";
import {
  type SignedMessage,
  type SignedTransaction,
} from "_src/shared/messaging/signed-results";
import type { AppThunkConfig } from "_store/thunk-extras";
import type { DappConfirmedResult } from "_src/shared/rpc/dapp-execution-result";
import {
  createAsyncThunk,
  createEntityAdapter,
  createSlice,
} from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

const txRequestsAdapter = createEntityAdapter<ApprovalRequest>({
  sortComparer: (a, b) => {
    const aDate = new Date(a.createdDate);
    const bDate = new Date(b.createdDate);
    return aDate.getTime() - bDate.getTime();
  },
});

export const respondToTransactionRequest = createAsyncThunk<
  {
    txRequestID: string;
    approved: boolean | null;
    txResponse: DappConfirmedResult | null;
  },
  {
    txRequestID: string;
    approved: boolean;
    accountId?: string;
    recoverOnly?: boolean;
    dappApproval?: import("../../../hooks/DappPreparationContext").DappApproval;
  },
  AppThunkConfig
>(
  "respond-to-transaction-request",
  async (
    { txRequestID, approved, accountId, dappApproval, recoverOnly },
    { extra: { background }, getState },
  ) => {
    const state = getState();
    const txRequest = txRequestsSelectors.selectById(state, txRequestID);
    if (!txRequest) {
      throw new Error(`TransactionRequest ${txRequestID} not found`);
    }
    let txSigned: SignedTransaction | undefined = undefined;
    let txResult: DappConfirmedResult | SignedMessage | undefined = undefined;
    let txResultError: string | undefined;
    let executionAttempted = false;
    if (approved) {
      try {
        if (txRequest.tx.type === "sign-message") {
          if (!accountId) throw new Error("消息签名账户不可用");
          txResult = await background.signDappPersonalMessage({
            requestId: txRequestID,
            accountId,
          });
        } else if (txRequest.tx.type === "transaction") {
          if (txRequest.tx.justSign) {
            if (
              !dappApproval ||
              dappApproval.requestId !== txRequestID ||
              dappApproval.expiresAt <= Date.now()
            )
              throw new Error("批准凭据已失效，请重新预览");
            const signed = await background.signDappPrepared({
              requestId: txRequestID,
              accountId: dappApproval.accountId,
              approvalToken: dappApproval.approvalToken,
            });
            txSigned = {
              signature: signed.signature,
              transactionBlockBytes: signed.bytes,
            };
          } else {
            const executionAccount = accountId ?? dappApproval?.accountId;
            if (!executionAccount) throw new Error('执行账户不可用');
            if (!recoverOnly && (!dappApproval || dappApproval.requestId !== txRequestID || dappApproval.expiresAt <= Date.now()))
              throw new Error("批准凭据已失效，请重新预览");
            executionAttempted = true;
            const result = recoverOnly
              ? await background.recoverDappExecution({ requestId: txRequestID, accountId: executionAccount })
              : await background.executeDappPrepared({
                  requestId: txRequestID, accountId: executionAccount,
                  approvalToken: dappApproval!.approvalToken,
                });
            if (!result || result.state === 'pending')
              return { txRequestID, approved: null, txResponse: null };
            txResult = {
              bytes: result.bytes,
              signature: result.signature,
              digest: result.digest,
              effects: result.effects,
            };
          }
        } else {
          throw new Error(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            `Unexpected type: ${(txRequest.tx as any).type}`,
          );
        }
      } catch (error) {
        // A lost response is not evidence of non-execution. Keep the original request alive.
        if (executionAttempted) return { txRequestID, approved: null, txResponse: null };
        txResultError = getSignerOperationErrorMessage(error);
      }
    }
    background.sendTransactionRequestResponse(
      txRequestID,
      approved,
      txResult,
      txResultError,
      txSigned,
    );
    return { txRequestID, approved: approved, txResponse: null };
  },
);

const slice = createSlice({
  name: "transaction-requests",
  initialState: txRequestsAdapter.getInitialState({
    initialized: false,
  }),
  reducers: {
    setTransactionRequests: (
      state,
      { payload }: PayloadAction<ApprovalRequest[]>,
    ) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      txRequestsAdapter.setAll(state, payload);
      state.initialized = true;
    },
  },
  extraReducers: (build) => {
    build.addCase(
      respondToTransactionRequest.fulfilled,
      (state, { payload }) => {
        const { txRequestID, approved: allowed, txResponse } = payload;
        txRequestsAdapter.updateOne(state, {
          id: txRequestID,
          changes: {
            approved: allowed,
            txResult: txResponse || undefined,
          },
        });
      },
    );
  },
});

export default slice.reducer;

export const { setTransactionRequests } = slice.actions;

export const txRequestsSelectors = txRequestsAdapter.getSelectors(
  (state: RootState) => state.transactionRequests,
);
