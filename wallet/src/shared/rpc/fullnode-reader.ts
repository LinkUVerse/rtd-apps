// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { boundedGrpcFetch } from "./grpc-response-budget";
import { queuedServiceInfo } from "./service-info-queue";
import {
  queuedFullnodeRead,
  type FullnodeReadMethod,
} from "./fullnode-read-queue";

import type { RtdClientTypes } from "rtd-typescript/client";
import {
  GrpcStatusCode,
  RpcError,
  GrpcTypes,
  RtdGrpcClient,
} from "rtd-typescript/grpc";
import { normalizeStructTag, toBase64 } from "rtd-typescript/utils";

import {
  decodeFreshObject,
  FRESH_OBJECT_MASK,
  FreshObjectReadError,
} from "./fresh-object";
import { walletAddress } from "./asset-address";
import { dynamicType } from "./dynamic-fields";
import { NetworkIdentityError } from "./identity";
import { assertGenesisDigest } from "./profile";
import { WalletReadSession } from "./session";

export class FreshCoinReadError extends Error {
  constructor(readonly reason: "incompatible" | "pagination" | "budget") {
    super("发送 coin 的新鲜读取未通过完整性检查，请重新查询");
    this.name = "FreshCoinReadError";
  }
}

const MAX_U64 = 0xffffffffffffffffn;

function u64(value: unknown): bigint {
  if (typeof value !== "bigint" || value < 0n || value > MAX_U64)
    throw new FreshCoinReadError("incompatible");
  return value;
}

function decodeBalance(raw: GrpcTypes.Balance): RtdClientTypes.Balance {
  const coinType = dynamicType(raw.coinType);
  if (!coinType.startsWith("0x")) throw new FreshCoinReadError("incompatible");
  const total = u64(raw.balance);
  // render_balance omits zero components, but never the type or total.
  const coins = raw.coinBalance === undefined ? 0n : u64(raw.coinBalance);
  const funds = raw.addressBalance === undefined ? 0n : u64(raw.addressBalance);
  if (coins + funds !== total) throw new FreshCoinReadError("incompatible");
  return Object.freeze({
    coinType,
    balance: String(total),
    coinBalance: String(coins),
    addressBalance: String(funds),
  });
}

function decodeCoin(
  object: GrpcTypes.Object,
  owner: string,
  type: string,
): RtdClientTypes.Coin {
  const objectId = walletAddress(object.objectId);
  if (!object.owner || walletAddress(object.owner.address) !== owner)
    throw new FreshCoinReadError("incompatible");
  let decodedOwner: RtdClientTypes.ObjectOwner;
  if (object.owner.kind === GrpcTypes.Owner_OwnerKind.ADDRESS) {
    decodedOwner = { $kind: "AddressOwner", AddressOwner: owner };
  } else if (
    object.owner.kind === GrpcTypes.Owner_OwnerKind.CONSENSUS_ADDRESS
  ) {
    decodedOwner = {
      $kind: "ConsensusAddressOwner",
      ConsensusAddressOwner: Object.freeze({
        owner,
        startVersion: u64(object.owner.version).toString(),
      }),
    };
  } else throw new FreshCoinReadError("incompatible");
  if (dynamicType(object.objectType) !== type)
    throw new FreshCoinReadError("incompatible");
  return Object.freeze({
    objectId,
    version: u64(object.version).toString(),
    digest: assertGenesisDigest(object.digest),
    owner: Object.freeze(decodedOwner),
    type,
    balance: u64(object.balance).toString(),
  });
}

/** Live Fullnode reads never claim a GraphQL checkpoint snapshot or execution readiness. */
export class WalletFullnodeReader {
  readonly #client: RtdGrpcClient;
  readonly #timeoutMs: number;
  readonly #maxPages: number;
  readonly #maxCoins: number;
  readonly #transport: typeof fetch;

  constructor(
    readonly session: WalletReadSession,
    options: {
      fetch?: typeof fetch;
      timeoutMs?: number;
      maxPages?: number;
      maxCoins?: number;
    } = {},
  ) {
    this.#timeoutMs = options.timeoutMs ?? 10_000;
    this.#maxPages = options.maxPages ?? 256;
    this.#maxCoins = options.maxCoins ?? 10_000;
    for (const [value, limit] of [
      [this.#timeoutMs, 60_000],
      [this.#maxPages, 256],
      [this.#maxCoins, 10_000],
    ])
      if (!Number.isSafeInteger(value) || value < 1 || value > limit)
        throw new RangeError("Fullnode 查询预算不合法");
    this.#transport = options.fetch ?? globalThis.fetch;
    const fetchFn = boundedGrpcFetch(this.#transport);
    this.#client = new RtdGrpcClient({
      network: session.profile.sdkNetwork,
      baseUrl: session.profile.endpoints.fullnodeGrpcWeb,
      format: "binary",
      fetch: (input, init) =>
        fetchFn(input, { ...init, redirect: "error", credentials: "omit" }),
      mvr: { url: "" },
    });
  }

  async #verifiedInfo(signal: AbortSignal) {
    const response = await queuedServiceInfo(
      this.session,
      this.session.profile.endpoints.fullnodeGrpcWeb,
      this.#transport,
      this.#timeoutMs,
      signal,
    );
    let digest: string;
    try {
      digest = assertGenesisDigest(response.chainId);
      u64(response.checkpointHeight);
      for (const lower of [
        response.lowestAvailableCheckpoint,
        response.lowestAvailableCheckpointObjects,
      ])
        if (lower !== undefined && u64(lower) > response.checkpointHeight!)
          throw new Error("watermark");
    } catch {
      throw new NetworkIdentityError("fullnode", "incompatible");
    }
    if (digest !== this.session.profile.expectedGenesisDigest)
      throw new NetworkIdentityError("fullnode", "chain-mismatch");
    signal.throwIfAborted();
    this.session.assertActive();
    return response;
  }

  #queued<T>(
    method: FullnodeReadMethod,
    request: Uint8Array,
    signal: AbortSignal,
    send: (signal: AbortSignal) => Promise<T>,
  ) {
    return queuedFullnodeRead(
      this.session,
      this.#transport,
      this.#timeoutMs,
      method,
      request,
      signal,
      send,
    );
  }

  async #verifyIdentity(signal: AbortSignal) {
    return (await this.#verifiedInfo(signal)).checkpointHeight!;
  }

  /** No historical fallback: a recipient check needs the current live object, if any. */
  async object(id: string, callerSignal?: AbortSignal) {
    return this.session.read(async (sessionSignal) => {
      const requested = walletAddress(id);
      const signal = AbortSignal.any([
        sessionSignal,
        AbortSignal.timeout(this.#timeoutMs),
        ...(callerSignal ? [callerSignal] : []),
      ]);
      signal.throwIfAborted();
      const before = await this.#verifyIdentity(signal);
      let raw: GrpcTypes.Object | undefined;
      let absent = false;
      try {
        const request = {
          objectId: requested,
          readMask: { paths: [...FRESH_OBJECT_MASK] },
        };
        const response = await this.#queued(
          "GetObject",
          GrpcTypes.GetObjectRequest.toBinary(request),
          signal,
          async (abort) =>
            (
              await this.#client.ledgerService.getObject(request, {
                abort,
                timeout: this.#timeoutMs,
              })
            ).response,
        );
        raw = response.object;
      } catch (error) {
        if (
          error instanceof RpcError &&
          error.code === GrpcStatusCode[GrpcStatusCode.NOT_FOUND]
        )
          absent = true;
        else throw error;
      }
      if (!absent && !raw) throw new FreshObjectReadError();
      const result = absent ? null : decodeFreshObject(raw!, requested);
      if ((await this.#verifyIdentity(signal)) < before)
        throw new NetworkIdentityError("fullnode", "incompatible");
      signal.throwIfAborted();
      this.session.assertActive();
      return result;
    });
  }

  /** Current spendable components, not a sum inferred from the Coin-object list. */
  async balance(
    address: string,
    coinType: string,
    callerSignal?: AbortSignal,
  ): Promise<RtdClientTypes.Balance> {
    return this.session.read(async (sessionSignal) => {
      const owner = walletAddress(address),
        type = dynamicType(coinType);
      if (!type.startsWith("0x")) throw new FreshCoinReadError("incompatible");
      const signal = AbortSignal.any([
        sessionSignal,
        AbortSignal.timeout(this.#timeoutMs),
        ...(callerSignal ? [callerSignal] : []),
      ]);
      signal.throwIfAborted();
      const before = await this.#verifyIdentity(signal);
      const request = { owner, coinType: type };
      const response = await this.#queued(
        "GetBalance",
        GrpcTypes.GetBalanceRequest.toBinary(request),
        signal,
        async (abort) =>
          (
            await this.#client.stateService.getBalance(request, {
              abort,
              timeout: this.#timeoutMs,
            })
          ).response,
      );
      const raw = response.balance;
      if (!raw || dynamicType(raw.coinType) !== type)
        throw new FreshCoinReadError("incompatible");
      const result = decodeBalance(raw);
      if ((await this.#verifyIdentity(signal)) < before)
        throw new NetworkIdentityError("fullnode", "incompatible");
      signal.throwIfAborted();
      return result;
    });
  }

  /** Current funds only. Pagination is not an atomic asset/checkpoint snapshot. */
  async balances(
    address: string,
    callerSignal?: AbortSignal,
  ): Promise<readonly RtdClientTypes.Balance[]> {
    return this.session.read(async (sessionSignal) => {
      const owner = walletAddress(address);
      const signal = AbortSignal.any([
        sessionSignal,
        AbortSignal.timeout(this.#timeoutMs),
        ...(callerSignal ? [callerSignal] : []),
      ]);
      signal.throwIfAborted();
      const before = await this.#verifyIdentity(signal);
      const balances: RtdClientTypes.Balance[] = [];
      const types = new Set<string>(),
        cursors = new Set<string>();
      let pageToken: Uint8Array | undefined;
      for (let page = 0; page < this.#maxPages; page++) {
        signal.throwIfAborted();
        this.session.assertActive();
        const request = { owner, pageSize: 100, pageToken };
        const response = await this.#queued(
          "ListBalances",
          GrpcTypes.ListBalancesRequest.toBinary(request),
          signal,
          async (abort) =>
            (
              await this.#client.stateService.listBalances(request, {
                abort,
                timeout: this.#timeoutMs,
              })
            ).response,
        );
        signal.throwIfAborted();
        this.session.assertActive();
        for (const raw of response.balances) {
          const balance = decodeBalance(raw);
          if (types.has(balance.coinType))
            throw new FreshCoinReadError("pagination");
          if (balances.length >= this.#maxCoins)
            throw new FreshCoinReadError("budget");
          types.add(balance.coinType);
          balances.push(balance);
        }
        pageToken = response.nextPageToken;
        if (pageToken === undefined) {
          if ((await this.#verifyIdentity(signal)) < before)
            throw new NetworkIdentityError("fullnode", "incompatible");
          signal.throwIfAborted();
          this.session.assertActive();
          return Object.freeze(balances);
        }
        const cursor = toBase64(pageToken);
        if (!cursor || cursors.has(cursor))
          throw new FreshCoinReadError("pagination");
        cursors.add(cursor);
      }
      throw new FreshCoinReadError("budget");
    });
  }

  async coins(
    address: string,
    coinType: string,
    callerSignal?: AbortSignal,
  ): Promise<readonly RtdClientTypes.Coin[]> {
    return this.session.read(async (sessionSignal) => {
      const owner = walletAddress(address);
      const parameter = dynamicType(coinType);
      if (!parameter.startsWith("0x"))
        throw new FreshCoinReadError("incompatible");
      const type = normalizeStructTag(`0x2::coin::Coin<${parameter}>`);
      // One deadline covers the entire scan, including the final identity check.
      const signal = AbortSignal.any([
        sessionSignal,
        AbortSignal.timeout(this.#timeoutMs),
        ...(callerSignal ? [callerSignal] : []),
      ]);
      signal.throwIfAborted();
      const startHeight = await this.#verifyIdentity(signal);
      let pageToken: Uint8Array | undefined;
      const cursors = new Set<string>();
      const ids = new Set<string>();
      const coins: RtdClientTypes.Coin[] = [];
      for (let page = 0; page < this.#maxPages; page++) {
        signal.throwIfAborted();
        this.session.assertActive();
        const request = {
          owner,
          objectType: type,
          pageSize: 100,
          pageToken,
          readMask: {
            paths: [
              "object_id",
              "version",
              "digest",
              "owner",
              "object_type",
              "balance",
            ],
          },
        };
        const response = await this.#queued(
          "ListOwnedObjects",
          GrpcTypes.ListOwnedObjectsRequest.toBinary(request),
          signal,
          async (abort) =>
            (
              await this.#client.stateService.listOwnedObjects(request, {
                abort,
                timeout: this.#timeoutMs,
              })
            ).response,
        );
        signal.throwIfAborted();
        this.session.assertActive();
        for (const object of response.objects) {
          const coin = decodeCoin(object, owner, type);
          if (ids.has(coin.objectId))
            throw new FreshCoinReadError("pagination");
          ids.add(coin.objectId);
          if (coins.length >= this.#maxCoins)
            throw new FreshCoinReadError("budget");
          coins.push(coin);
        }
        pageToken = response.nextPageToken;
        if (pageToken === undefined) {
          if ((await this.#verifyIdentity(signal)) < startHeight)
            throw new NetworkIdentityError("fullnode", "incompatible");
          return Object.freeze(coins);
        }
        const cursor = toBase64(pageToken);
        if (!cursor || cursors.has(cursor))
          throw new FreshCoinReadError("pagination");
        cursors.add(cursor);
        // Empty pages with an advancing token are scans, not terminal pages.
      }
      throw new FreshCoinReadError("budget");
    });
  }

  /** Current executed epoch from the same H0-verified service-info response. No time cache. */
  async currentEpoch(callerSignal?: AbortSignal): Promise<number> {
    return this.session.read(async (sessionSignal) => {
      const signal = AbortSignal.any([
        sessionSignal,
        AbortSignal.timeout(this.#timeoutMs),
        ...(callerSignal ? [callerSignal] : []),
      ]);
      signal.throwIfAborted();
      const info = await this.#verifiedInfo(signal);
      const epoch = u64(info.epoch);
      // zkLogin sets maxEpoch = epoch + 2; never silently lose integer precision.
      if (epoch > BigInt(Number.MAX_SAFE_INTEGER - 2))
        throw new FreshCoinReadError("incompatible");
      return Number(epoch);
    });
  }

  /** A verified live watermark, not a snapshot proof or execution capability. */
  async checkpoint(callerSignal?: AbortSignal): Promise<string> {
    return this.session.read(async (sessionSignal) => {
      const signal = AbortSignal.any([
        sessionSignal,
        AbortSignal.timeout(this.#timeoutMs),
        ...(callerSignal ? [callerSignal] : []),
      ]);
      return String(await this.#verifyIdentity(signal));
    });
  }
}
