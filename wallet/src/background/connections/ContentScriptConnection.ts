import { toPublicNetwork } from "../../shared/api-env";
// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createMessage } from "_messages";
import type { Message } from "_messages";
import type { PortChannelName } from "_messaging/PortChannelName";
import { isBasePayload, type ErrorPayload } from "_payloads";
import { isGetAccount } from "_payloads/account/GetAccount";
import type { GetAccountResponse } from "_payloads/account/GetAccountResponse";
import type { SetNetworkPayload } from "_payloads/network";
import {
  isAcquirePermissionsRequest,
  isHasPermissionRequest,
  type AcquirePermissionsResponse,
  type HasPermissionsResponse,
  type Permission,
  type PermissionType,
} from "_payloads/permissions";
import {
  isExecuteTransactionRequest,
  isSignTransactionRequest,
  type ExecuteTransactionResponse,
  type SignTransactionResponse,
} from "_payloads/transactions";
import Permissions from "_src/background/Permissions";
import Transactions from "_src/background/Transactions";
import {
  FEATURES,
  growthbook,
  loadWalletFeatures,
} from "_src/shared/experimentation/features";
import { isDisconnectApp } from "_src/shared/messaging/messages/payloads/permissions/DisconnectApp";
import { isQredoConnectPayload } from "_src/shared/messaging/messages/payloads/QredoConnect";
import {
  isSignMessageRequest,
  type SignMessageRequest,
} from "_src/shared/messaging/messages/payloads/transactions/SignMessage";
import { type SignedTransaction } from "_src/shared/messaging/signed-results";
import type { DappConfirmedResult } from "_src/shared/rpc/dapp-execution-result";
import Browser, { type Runtime } from "webextension-polyfill";

import { getAccountsStatusData } from "../accounts";
import NetworkEnv from "../NetworkEnv";
import { requestUserApproval } from "../qredo";
import { Connection } from "./Connection";
import { ConnectionRequests } from "../connection-requests";
import { httpTopSource } from "../dapp-native-context";
import { withWalletContextMutation } from "../wallet-context-mutation";

export class ContentScriptConnection extends Connection {
  private readonly transactionRequests = new ConnectionRequests();
  public static readonly CHANNEL: PortChannelName = "rtd_content<->background";
  public readonly origin: string;
  public readonly pagelink?: string | undefined;
  public readonly originFavIcon: string | undefined;
  public readonly nativeSender: Runtime.MessageSender;

  constructor(port: Runtime.Port) {
    super(port);
    const source = httpTopSource(port.sender, Browser.runtime.id);
    this.origin = source.origin;
    this.nativeSender = Object.freeze({
      ...port.sender!,
      tab: Object.freeze({ ...port.sender!.tab! }),
    });
    this.pagelink = this.getAppUrl(port);
    this.originFavIcon = port.sender?.tab?.favIconUrl;
    this.onDisconnect.subscribe(() => this.transactionRequests.disconnect());
  }

  protected async handleMessage(msg: Message) {
    const { payload } = msg;
    try {
      if (
        isBasePayload(payload) &&
        payload.type === "cancel-transaction-request"
      ) {
        await withWalletContextMutation(() =>
          this.transactionRequests.cancel(
            (payload as { requestId?: unknown }).requestId,
          ),
        );
      } else if (isGetAccount(payload)) {
        const { accounts } = await this.ensurePermissions(["viewAccount"]);
        await this.sendAccounts(accounts, msg.id);
      } else if (isHasPermissionRequest(payload)) {
        this.send(
          createMessage<HasPermissionsResponse>(
            {
              type: "has-permissions-response",
              result: await Permissions.hasPermissions(
                this.origin,
                payload.permissions,
              ),
            },
            msg.id,
          ),
        );
      } else if (isAcquirePermissionsRequest(payload)) {
        const permission = await Permissions.startRequestPermissions(
          payload.permissions,
          this,
          msg.id,
        );
        if (permission) {
          this.permissionReply(permission, msg.id);
        }
      } else if (isExecuteTransactionRequest(payload)) {
        if (!payload.transaction.account) {
          // make sure we don't execute transactions that doesn't have a specified account
          throw new Error("Missing account");
        }
        await this.withTransactionRequest(
          msg.id,
          payload.transaction.account,
          (signal) =>
            Transactions.executeOrSignTransaction(
              { tx: payload.transaction },
              this,
              signal,
              msg.id,
            ),
        );
      } else if (isSignTransactionRequest(payload)) {
        if (!payload.transaction.account) {
          // make sure we don't execute transactions that doesn't have a specified account
          throw new Error("Missing account");
        }
        await this.withTransactionRequest(
          msg.id,
          payload.transaction.account,
          (signal) =>
            Transactions.executeOrSignTransaction(
              { sign: payload.transaction },
              this,
              signal,
              msg.id,
            ),
        );
      } else if (isBasePayload(payload) && payload.type === "get-network") {
        this.send(
          createMessage<SetNetworkPayload>(
            {
              type: "set-network",
              network: toPublicNetwork(await NetworkEnv.getActiveNetwork()),
            },
            msg.id,
          ),
        );
      } else if (isSignMessageRequest(payload) && payload.args) {
        await this.withTransactionRequest(
          msg.id,
          payload.args.accountAddress,
          (signal) =>
            Transactions.signMessage(payload.args!, this, signal, msg.id),
        );
      } else if (isQredoConnectPayload(payload, "connect")) {
        if (!growthbook.ready) {
          await loadWalletFeatures();
        }
        if (growthbook.isOff(FEATURES.WALLET_QREDO)) {
          throw new Error("This feature is not implemented yet.");
        }
        await requestUserApproval(payload.args, this, msg);
      } else if (isDisconnectApp(payload)) {
        await Permissions.delete(this.origin);
        this.send(createMessage({ type: "done" }, msg.id));
      } else {
        throw new Error(`Unknown message, ${JSON.stringify(msg.payload)}`);
      }
    } catch (e) {
      this.sendError(
        {
          error: true,
          code: -1,
          message: (e as Error).message,
        },
        msg.id,
      );
    }
  }

  private async withTransactionRequest<T>(
    id: string,
    account: string,
    operation: (signal: AbortSignal) => Promise<T>,
  ) {
    // Register before the first permissions await so an immediate abort cannot be missed.
    const request = this.transactionRequests.begin(id);
    try {
      await this.ensurePermissions(
        ["viewAccount", "suggestTransactions"],
        account,
      );
      request.signal.throwIfAborted();
      return await operation(request.signal);
    } finally {
      request.finish();
    }
  }

  public permissionReply(permission: Permission, msgID?: string) {
    if (permission.origin !== this.origin) {
      return;
    }
    const requestMsgID = msgID || permission.requestMsgID;
    if (permission.allowed) {
      this.send(
        createMessage<AcquirePermissionsResponse>(
          {
            type: "acquire-permissions-response",
            result: !!permission.allowed,
          },
          requestMsgID,
        ),
      );
    } else {
      this.sendError(
        {
          error: true,
          message: "Permission rejected",
          code: -1,
        },
        requestMsgID,
      );
    }
  }

  private getOrigin(port: Runtime.Port) {
    if (port.sender?.origin) {
      return port.sender.origin;
    }
    if (port.sender?.url) {
      return new URL(port.sender.url).origin;
    }
    throw new Error("[ContentScriptConnection] port doesn't include an origin");
  }

  // optional field for the app link.
  private getAppUrl(port: Runtime.Port) {
    if (port.sender?.url) {
      return new URL(port.sender.url).href;
    }
    return undefined;
  }

  private sendError<Error extends ErrorPayload>(
    error: Error,
    responseForID?: string,
  ) {
    this.send(createMessage(error, responseForID));
  }

  private async sendAccounts(accounts: string[], responseForID?: string) {
    this.send(
      createMessage<GetAccountResponse>(
        {
          type: "get-account-response",
          accounts: await getAccountsStatusData(accounts),
        },
        responseForID,
      ),
    );
  }

  private async ensurePermissions(
    permissions: PermissionType[],
    account?: string,
  ) {
    const existingPermission = await Permissions.getPermission(this.origin);
    const allowed = await Permissions.hasPermissions(
      this.origin,
      permissions,
      existingPermission,
      account,
    );
    if (!allowed || !existingPermission) {
      throw new Error(
        "Operation not allowed, dapp doesn't have the required permissions",
      );
    }
    return existingPermission;
  }
}
