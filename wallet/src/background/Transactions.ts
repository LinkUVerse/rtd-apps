import { assertPersonalMessageChain } from "./personal-message-chain";
// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
  type ApprovalRequest,
  type TransactionDataType,
} from "_payloads/transactions/ApprovalRequest";
import type { RtdSignTransactionSerialized } from "_payloads/transactions/ExecuteTransactionRequest";
import { type SignMessageRequest } from "_payloads/transactions/SignMessage";
import type { TransactionRequestResponse } from "_payloads/transactions/ui/TransactionRequestResponse";
import type { ContentScriptConnection } from "_src/background/connections/ContentScriptConnection";
import { type SignedTransaction } from "_src/shared/messaging/signed-results";
import type { DappConfirmedResult } from "_src/shared/rpc/dapp-execution-result";
import { type RtdSignMessageOutput } from "rtd-wallet-standard";
import {
  filter,
  fromEvent,
  lastValueFrom,
  map,
  race,
  Subject,
  take,
} from "rxjs";
import { dappPreparedRegistry } from "./dapp-state";
import { v4 as uuidV4 } from "uuid";
import Browser from "webextension-polyfill";

import { Window } from "./Window";
import NetworkEnv from "./NetworkEnv";
import { accountsEvents } from "./accounts/events";
import { selectNetworkProfile } from "../shared/rpc/profile-registry";
import { bindDappRequest } from "../shared/rpc/dapp-request-binding";
import { getDappEgressBroker } from "./dapp-egress-runtime";
import type { WalletDappEgressClaim } from "./dapp-egress-peer";
import type { ValidatedNetworkProfile } from "../shared/rpc/profile";
import type { NetworkAdmissionArea } from "../shared/rpc/network-admission-state";
import {
  validateDappEgressMessage,
  type DappEgressPayload,
  type DappEgressMessage,
} from "../shared/rpc/dapp-egress-protocol";

const STALE_TRANSACTION_MILLISECONDS = 1000 * 60 * 60 * 3; // 3 hours
const TX_STORE_KEY = "transactions";

function openTxWindow(requestID: string) {
  return new Window(
    Browser.runtime.getURL("ui.html") +
      `#/dapp/approve/${encodeURIComponent(requestID)}`,
  );
}

class Transactions {
  private readonly outlets = new Map<
    string,
    {
      connection: ContentScriptConnection;
      publicId: string | undefined;
      claim?: WalletDappEgressClaim;
      capturing: boolean;
      sealed?: DappEgressMessage;
    }
  >();
  public async captureDappEgress(
    id: string,
    profile: ValidatedNetworkProfile,
    account: string,
    areas: readonly NetworkAdmissionArea[],
  ) {
    const outlet = this.outlets.get(id),
      signal = this.getRequestSignal(id);
    if (!outlet || !outlet.publicId || outlet.claim || outlet.capturing)
      throw new Error("dApp结果授权不存在或已使用");
    outlet.capturing = true;
    const claim = await getDappEgressBroker().capture(
      outlet.connection.nativeSender,
      profile,
      outlet.publicId,
      account,
      areas,
    );
    signal.throwIfAborted();
    if (this.outlets.get(id) !== outlet) throw new Error("dApp结果授权已关闭");
    outlet.claim = claim;
    return claim;
  }
  public runDappAction<T>(
    id: string,
    claim: WalletDappEgressClaim,
    stage: "sign" | "dispatch",
    start: () => Promise<T>,
  ): Promise<T> {
    const outlet = this.outlets.get(id);
    if (!outlet || outlet.claim !== claim || outlet.sealed)
      throw new Error("dApp动作授权已失效");
    return getDappEgressBroker().runBeforeAction(
      claim,
      stage,
      this.getRequestSignal(id),
      start,
    );
  }
  public sealDappEgress(
    id: string,
    claim: WalletDappEgressClaim,
    payload: DappEgressPayload,
  ) {
    const outlet = this.outlets.get(id);
    this.getRequestSignal(id).throwIfAborted();
    if (!outlet || outlet.claim !== claim || !outlet.publicId || outlet.sealed)
      throw new Error("dApp结果授权已失效");
    outlet.sealed = structuredClone(
      validateDappEgressMessage(
        { id: outlet.publicId, payload },
        outlet.publicId,
      ),
    );
  }
  private readonly requestSignals = new Map<string, AbortSignal>();
  public getRequestSignal(requestId: string): AbortSignal {
    const signal = this.requestSignals.get(requestId);
    if (!signal) throw new Error("dApp连接已失效，请重新发起请求");
    signal.throwIfAborted();
    return signal;
  }
  private _txResponseMessages = new Subject<TransactionRequestResponse>();

  public async executeOrSignTransaction(
    {
      tx,
      sign,
    }:
      | { tx: TransactionDataType; sign?: undefined }
      | {
          tx?: undefined;
          sign: RtdSignTransactionSerialized;
        },
    connection: ContentScriptConnection,
    signal?: AbortSignal,
    publicRequestId?: string,
  ): Promise<DappConfirmedResult | SignedTransaction> {
    const { txResultError, txResult, txSigned } = await this.requestApproval(
      tx ?? {
        type: "transaction",
        justSign: true,
        data: sign.transaction,
        account: sign.account,
        chain: sign.chain,
      },
      connection.origin,
      connection.originFavIcon,
      connection,
      signal,
      publicRequestId,
    );
    if (txResultError) {
      throw new Error(
        `Transaction failed with the following error. ${txResultError}`,
      );
    }
    if (sign && !txSigned) {
      throw new Error("Transaction signature is empty");
    }
    if (tx) {
      if (!txResult || !("digest" in txResult)) {
        throw new Error(`Transaction result is empty ${txResult}`);
      }
      return txResult;
    }
    return txSigned!;
  }

  public async signMessage(
    {
      accountAddress,
      message,
      chain,
    }: Required<Pick<SignMessageRequest, "args">>["args"],
    connection: ContentScriptConnection,
    signal?: AbortSignal,
    publicRequestId?: string,
  ): Promise<RtdSignMessageOutput> {
    const { txResult, txResultError } = await this.requestApproval(
      { type: "sign-message", accountAddress, message, chain },
      connection.origin,
      connection.originFavIcon,
      connection,
      signal,
      publicRequestId,
    );
    if (txResultError) {
      throw new Error(
        `Signing message failed with the following error ${txResultError}`,
      );
    }
    if (!txResult) {
      throw new Error("Sign message result is empty");
    }
    if (!("messageBytes" in txResult)) {
      throw new Error("Sign message error, unknown result");
    }
    return txResult;
  }

  public async getTransactionRequests(): Promise<
    Record<string, ApprovalRequest>
  > {
    return (await Browser.storage.local.get({ [TX_STORE_KEY]: {} }))[
      TX_STORE_KEY
    ] as Record<string, ApprovalRequest>;
  }

  public async getTransactionRequest(
    txRequestID: string,
  ): Promise<ApprovalRequest | null> {
    return (await this.getTransactionRequests())[txRequestID] || null;
  }

  public async handleMessage(msg: TransactionRequestResponse) {
    this._txResponseMessages.next(msg);
    // A restarted worker has no original approval listener to run its cleanup.
    // Closing that orphan removes request metadata; its durable journal stays intact.
    if (msg.approved === false && !this.requestSignals.has(msg.txID)) {
      dappPreparedRegistry.revokeRequest(msg.txID);
      await this.removeTransactionRequest(msg.txID);
    }
  }

  public async clearStaleTransactions() {
    return this.updateTransactionRequests((all) => {
      const now = Date.now();
      for (const [id, request] of Object.entries(all)) {
        const created = Date.parse(request.createdDate);
        if (
          request.approved !== null ||
          !Number.isFinite(created) ||
          now - created >= STALE_TRANSACTION_MILLISECONDS
        )
          delete all[id];
      }
    });
  }

  private async createTransactionRequest(
    tx: ApprovalRequest["tx"],
    origin: string,
    originFavIcon?: string,
  ): Promise<ApprovalRequest> {
    const id = uuidV4();
    let binding: ApprovalRequest["binding"];
    if (tx.type === "transaction") {
      const network = await NetworkEnv.getActiveNetwork();
      const selected = selectNetworkProfile(
        network,
        process.env.WALLET_NETWORK_PROFILES,
      );
      if (selected.state !== "configured") throw new Error(selected.message);
      binding = await bindDappRequest(id, origin, tx, selected.profile);
    } else {
      // requestApproval already observes disconnect before this asynchronous check.
      await assertPersonalMessageChain(tx.chain);
    }
    return {
      id,
      binding,
      approved: null,
      origin,
      originFavIcon,
      createdDate: new Date().toISOString(),
      tx,
    };
  }

  private async saveTransactionRequests(
    txRequests: Record<string, ApprovalRequest>,
  ) {
    await Browser.storage.local.set({ [TX_STORE_KEY]: txRequests });
  }

  private storageQueue: Promise<void> = Promise.resolve();
  private updateTransactionRequests(
    change: (requests: Record<string, ApprovalRequest>) => void,
  ) {
    const mutation = this.storageQueue.then(async () => {
      const requests = await this.getTransactionRequests();
      change(requests);
      await this.saveTransactionRequests(requests);
    });
    this.storageQueue = mutation.catch(() => undefined);
    return mutation;
  }
  private storeTransactionRequest(request: ApprovalRequest) {
    return this.updateTransactionRequests((all) => {
      all[request.id] = request;
    });
  }
  private removeTransactionRequest(id: string) {
    return this.updateTransactionRequests((all) => {
      delete all[id];
    });
  }

  private async requestApproval(
    request: ApprovalRequest["tx"],
    origin: string,
    favIcon: string | undefined,
    connection: ContentScriptConnection,
    signal?: AbortSignal,
    publicRequestId?: string,
  ) {
    const lifetime = new AbortController();
    const networkChanged = () =>
      lifetime.abort(new Error("网络已改变，请重新发起请求"));
    NetworkEnv.on("changed", networkChanged);
    const accountChanged = () =>
      lifetime.abort(new Error("账户授权会话已改变，请重新发起请求"));
    accountsEvents.on("accountsChanged", accountChanged);
    accountsEvents.on("activeAccountChanged", accountChanged);
    const disconnected = connection.onDisconnect.subscribe(() =>
      lifetime.abort(new Error("dApp连接已断开")),
    );
    const cancel = () =>
      lifetime.abort(signal?.reason ?? new Error("dApp已取消交易请求"));
    signal?.addEventListener("abort", cancel, { once: true });
    if (signal?.aborted) cancel();
    let txRequest: ApprovalRequest | undefined;
    let popUp: Window | undefined;
    try {
      lifetime.signal.throwIfAborted();
      txRequest = await this.createTransactionRequest(request, origin, favIcon);
      lifetime.signal.throwIfAborted();
      this.requestSignals.set(txRequest.id, lifetime.signal);
      this.outlets.set(txRequest.id, {
        connection,
        publicId: publicRequestId,
        capturing: false,
      });
      await this.storeTransactionRequest(txRequest);
      lifetime.signal.throwIfAborted();
      popUp = openTxWindow(txRequest.id);
      const popUpClose = (await popUp.show()).pipe(
        take(1),
        map<number, false>(() => false),
      );
      lifetime.signal.throwIfAborted();
      const id = txRequest.id;
      const txResponseMessage = this._txResponseMessages.pipe(
        filter((msg) => msg.txID === id),
        take(1),
      );
      const disconnect = fromEvent(lifetime.signal, "abort").pipe(
        map(() => false as const),
      );
      const response = await lastValueFrom(
        race(popUpClose, txResponseMessage, disconnect).pipe(take(1)),
      );
      lifetime.signal.throwIfAborted();
      if (!response || !response.approved)
        throw new Error("Rejected from user");
      if (response.txResultError) throw new Error("后台签名或执行未成功");
      const outlet = this.outlets.get(id),
        sealed = outlet?.sealed;
      if (!outlet?.claim || !sealed)
        throw new Error("后台未提供经过验证的签名结果");
      const produced = sealed.payload;
      const expected =
        request.type === "sign-message"
          ? "sign-message-request"
          : request.justSign
            ? "sign-transaction-response"
            : "execute-transaction-response";
      if (produced.type !== expected)
        throw new Error("批准结果类型与后台固定结果不匹配");
      await getDappEgressBroker().publish(
        outlet.claim,
        sealed,
        lifetime.signal,
      );
      lifetime.signal.throwIfAborted();
      txRequest.approved = true;
      if (produced.type === "sign-transaction-response")
        txRequest.txSigned = produced.result;
      else
        txRequest.txResult =
          produced.type === "sign-message-request"
            ? produced.return
            : produced.result;
      return txRequest;
    } finally {
      lifetime.abort(new Error("dApp批准请求已结束"));
      disconnected.unsubscribe();
      NetworkEnv.off("changed", networkChanged);
      accountsEvents.off("accountsChanged", accountChanged);
      accountsEvents.off("activeAccountChanged", accountChanged);
      signal?.removeEventListener("abort", cancel);
      if (txRequest) {
        this.requestSignals.delete(txRequest.id);
        this.outlets.delete(txRequest.id);
        dappPreparedRegistry.revokeRequest(txRequest.id);
        await this.removeTransactionRequest(txRequest.id);
      }
      // This only closes the approval UI; durable journal state is never removed.
      if (popUp) await popUp.close().catch(() => undefined);
    }
  }
}

const transactions = new Transactions();
export default transactions;
