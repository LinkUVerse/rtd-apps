// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createMessage } from "_messages";
import { WindowMessageStream } from "_messaging/WindowMessageStream";
import type { BasePayload, Payload } from "_payloads";
import type { GetAccount } from "_payloads/account/GetAccount";
import type { GetAccountResponse } from "_payloads/account/GetAccountResponse";
import type { SetNetworkPayload } from "_payloads/network";
import {
  ALL_PERMISSION_TYPES,
  type AcquirePermissionsRequest,
  type AcquirePermissionsResponse,
  type HasPermissionsRequest,
  type HasPermissionsResponse,
} from "_payloads/permissions";
import type {
  ExecuteTransactionResponse,
  SignTransactionResponse,
} from "_payloads/transactions";
import { walletStandardChain } from "_src/shared/api-env";
import type { NetworkEnvType } from "_src/shared/api-env";
import { type DisconnectApp } from "_src/shared/messaging/messages/payloads/permissions/DisconnectApp";
import {
  isQredoConnectPayload,
  type QredoConnectPayload,
} from "_src/shared/messaging/messages/payloads/QredoConnect";
import { type SignMessageRequest } from "_src/shared/messaging/messages/payloads/transactions/SignMessage";
import { isWalletStatusChangePayload } from "_src/shared/messaging/messages/payloads/wallet-status-change";
import { walletStandardExecutionResult } from "_src/shared/rpc/dapp-execution-result";
import { fromBase64, toBase64 } from "rtd-typescript/utils";
import {
  ReadonlyWalletAccount,
  RTD_CHAINS,
  type StandardConnectFeature,
  type StandardConnectMethod,
  type StandardDisconnectFeature,
  type StandardDisconnectMethod,
  type StandardEventsFeature,
  type StandardEventsListeners,
  type StandardEventsOnMethod,
  type RtdFeatures,
  type RtdSignAndExecuteTransactionMethod,
  type RtdSignPersonalMessageMethod,
  type RtdSignTransactionMethod,
  type Wallet,
} from "rtd-wallet-standard";
import mitt, { type Emitter } from "mitt";
import { filter, map, type Observable } from "rxjs";

import { mapToPromise } from "./utils";
import { cancellableRequest } from "./cancellable-request";

type WalletEventsMap = {
  [E in keyof StandardEventsListeners]: Parameters<
    StandardEventsListeners[E]
  >[0];
};

// NOTE: Because this runs in a content script, we can't fetch the manifest.
const name = process.env.APP_NAME || "Rtd Wallet";

export type QredoConnectInput = {
  service: string;
  apiUrl: string;
  token: string;
} & (
  | {
      /** @deprecated renamed to workspace, please use that */
      organization: string;
    }
  | {
      workspace: string;
    }
);

type QredoConnectFeature = {
  "qredo:connect": {
    version: "0.0.1";
    qredoConnect: (input: QredoConnectInput) => Promise<void>;
  };
};
/** Modern methods require the caller's explicit account; never choose one on its behalf. */
function requiredAccountAddress(account: unknown): string {
  const address =
    account && typeof account === "object" && "address" in account
      ? account.address
      : undefined;
  if (typeof address !== "string" || !/^0x[0-9a-fA-F]{1,64}$/.test(address))
    throw new Error("必须明确提供有效的钱包账户");
  return address;
}

function requiredTransactionChain(chain: unknown): string {
  if (
    typeof chain !== "string" ||
    !/^rtd:[A-Za-z0-9_-]+$/.test(chain) ||
    chain.length > 128
  )
    throw new Error("必须明确提供有效的交易链");
  return chain;
}

type ChainType = Wallet["chains"][number];
export class RtdWallet implements Wallet {
  readonly #events: Emitter<WalletEventsMap>;
  readonly #version = "1.0.0" as const;
  readonly #name = name;
  #accounts: ReadonlyWalletAccount[];
  #messagesStream: WindowMessageStream;
  #activeChain: ChainType | null = null;
  #stateRevision = 0;
  #refreshRevision = 0;
  #initialized = false;

  get version() {
    return this.#version;
  }

  get name() {
    return this.#name;
  }

  get icon() {
    return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgiIGhlaWdodD0iMjgiIHZpZXdCb3g9IjAgMCAyOCAyOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICAgIDxyZWN0IHdpZHRoPSIyOCIgaGVpZ2h0PSIyOCIgZmlsbD0iIzRDQTNGRiIvPgogICAgPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xOC44MzI3IDEyLjM0MTNWMTIuMzQyMkMxOS42NDgyIDEzLjM2NTMgMjAuMTM2IDE0LjY2MTMgMjAuMTM2IDE2LjA3MDVDMjAuMTM2IDE3LjQ3OTggMTkuNjMzNyAxOC44MTQzIDE4Ljc5NTcgMTkuODQ0M0wxOC43MjM1IDE5LjkzM0wxOC43MDQ1IDE5LjgyMDNDMTguNjg4MiAxOS43MjQ1IDE4LjY2OSAxOS42Mjc1IDE4LjY0NyAxOS41M0MxOC4yMjc3IDE3LjY4NzUgMTYuODYxMiAxNi4xMDc1IDE0LjYxMjUgMTQuODI4MkMxMy4wOTQgMTMuOTY2OCAxMi4yMjQ3IDEyLjkyOTIgMTEuOTk2NSAxMS43NTA4QzExLjg0OSAxMC45ODg1IDExLjk1ODcgMTAuMjIzIDEyLjE3MDUgOS41NjcyNUMxMi4zODIyIDguOTExNzUgMTIuNjk3MiA4LjM2MjUgMTIuOTY0NyA4LjAzMkwxMy44Mzk1IDYuOTYyMjVDMTMuOTkzIDYuNzc0NzUgMTQuMjggNi43NzQ3NSAxNC40MzM1IDYuOTYyMjVMMTguODMzIDEyLjM0MTVMMTguODMyNyAxMi4zNDEzWk0yMC4yMTY1IDExLjI3MjVWMTEuMjcyTDE0LjM1MyA0LjEwMjc1QzE0LjI0MSAzLjk2NTc1IDE0LjAzMTUgMy45NjU3NSAxMy45MTk1IDQuMTAyNzVMOC4wNTYgMTEuMjcyM1YxMS4yNzI4TDguMDM3IDExLjI5NjVDNi45NTgyNSAxMi42MzUzIDYuMzEyNSAxNC4zMzY4IDYuMzEyNSAxNi4xODlDNi4zMTI1IDIwLjUwMjggOS44MTUyNSAyNCAxNC4xMzYzIDI0QzE4LjQ1NzIgMjQgMjEuOTYgMjAuNTAyOCAyMS45NiAxNi4xODlDMjEuOTYgMTQuMzM2OCAyMS4zMTQyIDEyLjYzNTMgMjAuMjM1MiAxMS4yOTYzTDIwLjIxNiAxMS4yNzI1SDIwLjIxNjVaTTkuNDU5MjUgMTIuMzE4TDkuOTgzNzUgMTEuNjc2NUw5Ljk5OTUgMTEuNzk1QzEwLjAxMiAxMS44ODg3IDEwLjAyNzIgMTEuOTgzIDEwLjA0NTIgMTIuMDc3OEMxMC4zODQ1IDEzLjg1ODIgMTEuNTk2NyAxNS4zNDI4IDEzLjYyMzUgMTYuNDkyNUMxNS4zODUyIDE3LjQ5NSAxNi40MTEgMTguNjQ4IDE2LjcwNjUgMTkuOTEyNUMxNi44Mjk4IDIwLjQ0MDMgMTYuODUxNyAyMC45NTk1IDE2Ljc5ODUgMjEuNDEzNUwxNi43OTUyIDIxLjQ0MTVMMTYuNzY5NyAyMS40NTRDMTUuOTc0NyAyMS44NDI1IDE1LjA4MDcgMjIuMDYwNSAxNC4xMzYgMjIuMDYwNUMxMC44MjI1IDIyLjA2MDUgOC4xMzYyNSAxOS4zNzg4IDguMTM2MjUgMTYuMDcwNUM4LjEzNjI1IDE0LjY1MDMgOC42MzE1IDEzLjM0NSA5LjQ1OSAxMi4zMTgzTDkuNDU5MjUgMTIuMzE4WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg==" as const;
  }

  get chains() {
    // Accounts may advertise a reviewed custom chain in addition to built-in networks.
    return [
      ...new Set<ChainType>([
        ...RTD_CHAINS,
        ...(this.#activeChain ? [this.#activeChain] : []),
      ]),
    ];
  }

  get features(): StandardConnectFeature &
    StandardEventsFeature &
    StandardDisconnectFeature &
    RtdFeatures &
    QredoConnectFeature {
    return {
      "standard:connect": {
        version: "1.0.0",
        connect: this.#connect,
      },
      "standard:events": {
        version: "1.0.0",
        on: this.#on,
      },
      "standard:disconnect": {
        version: "1.0.0",
        disconnect: this.#disconnect,
      },
      "rtd:signTransaction": {
        version: "2.0.0",
        signTransaction: this.#signTransaction,
      },
      "rtd:signAndExecuteTransaction": {
        version: "2.0.0",
        signAndExecuteTransaction: this.#signAndExecuteTransaction,
      },
      "rtd:signPersonalMessage": {
        version: "1.1.0",
        signPersonalMessage: this.#signPersonalMessage,
      },
      "qredo:connect": {
        version: "0.0.1",
        qredoConnect: this.#qredoConnect,
      },
    };
  }

  get accounts() {
    return this.#accounts;
  }

  #setAccounts(accounts: GetAccountResponse["accounts"]) {
    this.#accounts = accounts.map(
      ({ address, publicKey, nickname, features }) =>
        new ReadonlyWalletAccount({
          address,
          label: nickname || undefined,
          publicKey: publicKey ? fromBase64(publicKey) : new Uint8Array(),
          chains: this.#activeChain ? [this.#activeChain] : [],
          features: features ?? [],
        }),
    );
  }

  constructor(gateOrigin?: string) {
    this.#events = mitt();
    this.#accounts = [];
    this.#messagesStream = new WindowMessageStream(
      "rtd_in-page",
      "rtd_content-script",
      gateOrigin,
    );
    this.#messagesStream.messages.subscribe(({ payload }) => {
      if (isWalletStatusChangePayload(payload)) {
        this.#stateRevision++;
        const { network, accounts } = payload;
        if (network) {
          this.#setActiveChain(network);
          if (!accounts) {
            // in case an accounts change exists skip updating chains of current accounts
            // accounts will be updated in the if block below
            this.#accounts = this.#accounts.map(
              ({ address, features, icon, label, publicKey }) =>
                new ReadonlyWalletAccount({
                  address,
                  publicKey,
                  chains: this.#activeChain ? [this.#activeChain] : [],
                  features,
                  label,
                  icon,
                }),
            );
          }
        }
        if (accounts) {
          this.#setAccounts(accounts);
        }
        this.#events.emit("change", {
          accounts: this.accounts,
          chains: this.chains,
        });
        // Re-read authorization after events that may have interrupted the initial snapshot.
        if (this.#initialized) void this.#connected().catch(() => undefined);
      }
    });
  }

  #on: StandardEventsOnMethod = (event, listener) => {
    this.#events.on(event, listener);
    return () => this.#events.off(event, listener);
  };

  /** Registration restores existing authorization without prompting the user. */
  public async initialize() {
    this.#initialized = true;
    await this.#connected().catch(() => undefined);
  }

  #connected = async () => {
    const refresh = ++this.#refreshRevision;
    const state = this.#stateRevision;
    const current = () =>
      refresh === this.#refreshRevision && state === this.#stateRevision;
    try {
      const network = await this.#getActiveNetwork();
      const allowed = await this.#hasPermissions(["viewAccount"]);
      const accounts = allowed ? await this.#getAccounts() : [];
      // A newer event or refresh owns the visible state; never resurrect a revoked account.
      if (!current()) return;
      this.#setActiveChain(network);
      this.#setAccounts(accounts);
      this.#events.emit("change", {
        accounts: this.accounts,
        chains: this.chains,
      });
    } catch (error) {
      if (current()) {
        this.#setAccounts([]);
        this.#events.emit("change", { accounts: this.accounts });
      }
      throw error;
    }
  };

  #connect: StandardConnectMethod = async (input) => {
    if (!input?.silent) {
      await mapToPromise(
        this.#send<AcquirePermissionsRequest, AcquirePermissionsResponse>({
          type: "acquire-permissions-request",
          permissions: ALL_PERMISSION_TYPES,
        }),
        (response) => response.result,
      );
    }

    await this.#connected();

    return { accounts: this.accounts };
  };

  #disconnect: StandardDisconnectMethod = async () => {
    const refresh = ++this.#refreshRevision;
    await mapToPromise(
      this.#send<DisconnectApp, BasePayload>({
        type: "disconnect-app",
        origin: "",
      }),
      (response) => {
        if (response.type !== "done") throw new Error("断开连接响应无效");
      },
    );
    if (refresh === this.#refreshRevision) {
      this.#setAccounts([]);
      this.#events.emit("change", { accounts: this.accounts });
    }
  };

  #signTransaction: RtdSignTransactionMethod = async ({
    transaction,
    account,
    chain,
    signal,
  }) => {
    const address = requiredAccountAddress(account);
    const requestedChain = requiredTransactionChain(chain);
    const response = await cancellableRequest<SignTransactionResponse>(
      this.#messagesStream,
      async () => ({
        type: "sign-transaction-request",
        transaction: {
          account: address,
          chain: requestedChain,
          transaction: await transaction.toJSON(),
        },
      }),
      signal,
    );
    return {
      signature: response.result.signature,
      bytes: response.result.transactionBlockBytes,
    };
  };

  #signAndExecuteTransaction: RtdSignAndExecuteTransactionMethod = async (
    input,
  ) => {
    const address = requiredAccountAddress(input.account);
    const requestedChain = requiredTransactionChain(input.chain);
    const response = await cancellableRequest<ExecuteTransactionResponse>(
      this.#messagesStream,
      async () => ({
        type: "execute-transaction-request",
        transaction: {
          type: "transaction",
          data: await input.transaction.toJSON(),
          chain: requestedChain,
          account: address,
        },
      }),
      input.signal,
    );
    return walletStandardExecutionResult(response.result);
  };

  #signPersonalMessage: RtdSignPersonalMessageMethod = async ({
    message,
    account,
    chain,
  }) => {
    const address = requiredAccountAddress(account);
    return mapToPromise(
      this.#send<SignMessageRequest, SignMessageRequest>({
        type: "sign-message-request",
        args: {
          message: toBase64(message),
          accountAddress: address,
          chain,
        },
      }),
      (response) => {
        if (!response.return) {
          throw new Error("Invalid sign message response");
        }
        return {
          bytes: response.return.messageBytes,
          signature: response.return.signature,
        };
      },
    );
  };

  #hasPermissions(permissions: HasPermissionsRequest["permissions"]) {
    return mapToPromise(
      this.#send<HasPermissionsRequest, HasPermissionsResponse>({
        type: "has-permissions-request",
        permissions: permissions,
      }),
      ({ result }) => result,
    );
  }

  #getAccounts() {
    return mapToPromise(
      this.#send<GetAccount, GetAccountResponse>({
        type: "get-account",
      }),
      (response) => response.accounts,
    );
  }

  #getActiveNetwork() {
    return mapToPromise(
      this.#send<BasePayload, SetNetworkPayload>({
        type: "get-network",
      }),
      ({ network }) => network,
    );
  }

  #setActiveChain(network: NetworkEnvType) {
    this.#activeChain = walletStandardChain(network);
  }

  #qredoConnect = async (input: QredoConnectInput): Promise<void> => {
    const allowed = await mapToPromise(
      this.#send<
        QredoConnectPayload<"connect">,
        QredoConnectPayload<"connectResponse">
      >({
        type: "qredo-connect",
        method: "connect",
        args: { ...input },
      }),
      (response) => {
        if (!isQredoConnectPayload(response, "connectResponse")) {
          throw new Error("Invalid qredo connect response");
        }
        return response.args.allowed;
      },
    );
    if (!allowed) {
      throw new Error("Rejected by user");
    }
  };

  #send<
    RequestPayload extends Payload,
    ResponsePayload extends Payload | void = void,
  >(
    payload: RequestPayload,
    responseForID?: string,
  ): Observable<ResponsePayload> {
    const msg = createMessage(payload, responseForID);
    this.#messagesStream.send(msg);
    return this.#messagesStream.messages.pipe(
      filter(({ id }) => id === msg.id),
      map((msg) => msg.payload as ResponsePayload),
    );
  }
}
