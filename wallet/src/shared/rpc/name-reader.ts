// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs, type BcsType } from "rtd-typescript/bcs";
import {
  deriveDynamicFieldID,
  fromBase64,
  toBase64,
} from "rtd-typescript/utils";
import type { WalletNameResolution } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { walletAddress } from "./asset-address";
import {
  decodeDynamicField,
  dynamicType,
  DYNAMIC_FIELD_SELECTION,
} from "./dynamic-fields";
import { WalletFullnodeReader } from "./fullnode-reader";
import { GraphQLSnapshot, responseRecord } from "./graphql-snapshot";
import { WalletReadSession } from "./session";

export const DOMAIN_BCS = bcs.struct("Domain", {
  labels: bcs.vector(bcs.string()),
});
export const NAME_RECORD_BCS = bcs.struct("NameRecord", {
  nft_id: bcs.Address,
  expiration_timestamp_ms: bcs.u64(),
  target_address: bcs.option(bcs.Address),
  data: bcs.struct("VecMap", {
    contents: bcs.vector(
      bcs.struct("Entry", { key: bcs.string(), value: bcs.string() }),
    ),
  }),
});
const CLOCK_BCS = bcs.struct("Clock", {
  id: bcs.Address,
  timestamp_ms: bcs.u64(),
});

export const NAME_COVERAGE = Object.freeze(
  [
    { type: "Query", field: "checkpoints" },
    { type: "Query", field: "object" },
    { type: "Address", field: "dynamicField" },
    { type: "MoveObject", field: "contents" },
  ].map((row) => Object.freeze(row)),
);

export class WalletNameReadError extends Error {
  constructor(
    readonly reason: "configuration" | "domain" | "lag" | "invalid-record",
  ) {
    super(
      {
        configuration: "当前网络尚未配置名称 registry",
        domain: "名称格式无效",
        lag: "名称索引记录尚未与当前 Fullnode 一致，请稍后重试",
        "invalid-record": "名称记录未通过完整性检查",
      }[reason],
    );
    this.name = "WalletNameReadError";
  }
}

/** Same ASCII label, separator and @ conversion rules as rtd-name-service::Domain. */
export function domainLabels(input: string): string[] {
  if (input.length > 200 || (input.includes(".") && input.includes("*")))
    throw new WalletNameReadError("domain");
  const separator = input.includes("*") ? "*" : ".";
  const parts = input.split("@");
  if (parts.length > 2) throw new WalletNameReadError("domain");
  let formatted = input;
  if (parts.length === 2) {
    if (!parts[1] || parts[1].includes(separator))
      throw new WalletNameReadError("domain");
    formatted = [...(parts[0] ? [parts[0]] : []), parts[1], "rtd"].join(
      separator,
    );
  }
  const labels = formatted.split(separator).reverse();
  if (
    labels.length < 2 ||
    labels[0] !== "rtd" ||
    labels.some(
      (label) =>
        label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
    )
  )
    throw new WalletNameReadError("domain");
  return labels;
}

function exact<T, Input>(codec: BcsType<T, Input>, bytes: Uint8Array): T {
  try {
    if (bytes.length > 65_536) throw new Error("name BCS budget");
    const result = codec.parse(bytes);
    if (
      toBase64(codec.serialize(result as unknown as Input).toBytes()) !==
      toBase64(bytes)
    )
      throw new Error("BCS suffix");
    return result;
  } catch {
    throw new WalletNameReadError("invalid-record");
  }
}

/** Explicit registry reads avoid the node's hard-coded mainnet/testnet NameService config. */
export class WalletNameReader {
  readonly #fullnode: WalletFullnodeReader;
  constructor(
    readonly session: WalletReadSession,
    readonly options: { fetch?: typeof fetch; timeoutMs?: number } = {},
  ) {
    this.#fullnode = new WalletFullnodeReader(session, options);
  }

  async resolve(
    name: string,
    callerSignal?: AbortSignal,
  ): Promise<WalletNameResolution | null> {
    return this.#read(domainLabels(name), undefined, callerSignal);
  }

  async defaultName(
    address: string,
    callerSignal?: AbortSignal,
  ): Promise<WalletNameResolution | null> {
    return this.#read(undefined, walletAddress(address), callerSignal);
  }

  async #read(
    labels: string[] | undefined,
    reverseAddress: string | undefined,
    callerSignal?: AbortSignal,
  ): Promise<WalletNameResolution | null> {
    const config = this.session.profile.packages.name;
    if (!config) throw new WalletNameReadError("configuration");
    return this.session.read(async (sessionSignal) => {
      const signal = AbortSignal.any([
        sessionSignal,
        AbortSignal.timeout(this.options.timeoutMs ?? 20_000),
        ...(callerSignal ? [callerSignal] : []),
      ]);
      const startHeight = await this.#fullnode.checkpoint(signal);
      const snapshot = await GraphQLSnapshot.open(this.session, NAME_COVERAGE, {
        ...this.options,
        signal,
      });
      // Index height alone cannot prove that a name is current. Keep the entire
      // indexed resolution at S, then compare every consulted field (including
      // absence) with the identity-checked Fullnode before exposing any result.
      const fields = new Map<
        string,
        {
          parent: string;
          type: string;
          name: Uint8Array;
          value: Uint8Array | null;
        }
      >();
      const finalize = async () => {
        await snapshot.revalidate(signal);
        const clockId = walletAddress("0x6");
        const ids = [...fields.keys(), clockId];
        const clockReadAt = performance.now();
        const objects = new Map<
          string,
          Awaited<ReturnType<WalletFullnodeReader["object"]>>
        >();
        for (let offset = 0; offset < ids.length; offset += 4) {
          await Promise.all(
            ids.slice(offset, offset + 4).map(async (id) => {
              objects.set(id, await this.#fullnode.object(id, signal));
            }),
          );
        }
        for (const [id, expected] of fields) {
          const current = objects.get(id)!;
          if (expected.value === null) {
            if (current !== null) throw new WalletNameReadError("lag");
            continue;
          }
          if (!current) throw new WalletNameReadError("lag");
          const content = new Uint8Array([
            ...bcs.Address.serialize(id).toBytes(),
            ...expected.name,
            ...expected.value,
          ]);
          if (
            dynamicType(current.type) !== expected.type ||
            current.owner.$kind !== "ObjectOwner" ||
            current.owner.ObjectOwner !== expected.parent ||
            toBase64(current.content) !== toBase64(content)
          )
            throw new WalletNameReadError("lag");
        }
        const currentClock = objects.get(clockId);
        if (
          !currentClock ||
          currentClock.owner.$kind !== "Shared" ||
          currentClock.type !== dynamicType("0x2::clock::Clock")
        )
          throw new WalletNameReadError("invalid-record");
        const clock = exact(CLOCK_BCS, currentClock.content);
        if (clock.id !== walletAddress("0x6"))
          throw new WalletNameReadError("invalid-record");
        const endHeight = BigInt(await this.#fullnode.checkpoint(signal));
        if (
          endHeight < BigInt(startHeight) ||
          endHeight < BigInt(snapshot.proof.checkpoint)
        )
          throw new WalletNameReadError("lag");
        signal.throwIfAborted();
        this.session.assertActive();
        return { timestampMs: BigInt(clock.timestamp_ms), readAt: clockReadAt };
      };
      const domainType = dynamicType(`${config.packageId}::domain::Domain`);
      const recordType = dynamicType(
        `${config.packageId}::name_record::NameRecord`,
      );
      const field = async (
        parent: string,
        type: string,
        bytes: Uint8Array,
        valueType: string,
      ) => {
        const data = await snapshot.read({
          selection: `address(address: $parent) { address field: dynamicField(name: $name) { ${DYNAMIC_FIELD_SELECTION} } }`,
          variableDefinitions: "$parent: RtdAddress!, $name: DynamicFieldName!",
          variables: { parent, name: { type, bcs: toBase64(bytes) } },
          signal,
        });
        const address = responseRecord(data.address);
        if (walletAddress(address.address) !== parent)
          throw new WalletNameReadError("invalid-record");
        const id = deriveDynamicFieldID(parent, type, bytes);
        const observed = {
          parent,
          type: dynamicType(`0x2::dynamic_field::Field<${type},${valueType}>`),
          name: bytes,
          value: null as Uint8Array | null,
        };
        if (address.field === null) {
          fields.set(id, observed);
          return null;
        }
        const result = decodeDynamicField(parent, address.field);
        if (
          result.$kind !== "DynamicField" ||
          result.name.type !== type ||
          toBase64(result.name.bcs) !== toBase64(bytes) ||
          result.value.type !== valueType
        )
          throw new WalletNameReadError("invalid-record");
        fields.set(id, { ...observed, value: result.value.bcs });
        return result.value.bcs;
      };
      let selected = labels;
      if (reverseAddress) {
        const reverse = await field(
          config.reverseRegistry,
          "address",
          bcs.Address.serialize(reverseAddress).toBytes(),
          domainType,
        );
        if (reverse === null) {
          await finalize();
          return null;
        }
        selected = exact(DOMAIN_BCS, reverse).labels;
      }
      if (
        !selected ||
        JSON.stringify(domainLabels([...selected].reverse().join("."))) !==
          JSON.stringify(selected)
      )
        throw new WalletNameReadError("domain");
      const clockReadAt = performance.now();
      const clockData = await snapshot.read({
        selection:
          'object(address: "0x6") { asMoveObject { address contents { bcs type { repr } } } }',
        signal,
      });
      const rawClock = responseRecord(
        responseRecord(clockData.object).asMoveObject,
      );
      const clockContent = responseRecord(rawClock.contents);
      if (
        walletAddress(rawClock.address) !== walletAddress("0x6") ||
        dynamicType(responseRecord(clockContent.type).repr) !==
          dynamicType("0x2::clock::Clock") ||
        typeof clockContent.bcs !== "string"
      )
        throw new WalletNameReadError("invalid-record");
      const clockBytes = fromBase64(clockContent.bcs);
      if (toBase64(clockBytes) !== clockContent.bcs)
        throw new WalletNameReadError("invalid-record");
      const clock = exact(CLOCK_BCS, clockBytes);
      if (clock.id !== walletAddress("0x6"))
        throw new WalletNameReadError("invalid-record");
      const readRecord = async (names: string[]) => {
        const bytes = await field(
          config.forwardRegistry,
          domainType,
          DOMAIN_BCS.serialize({ labels: names }).toBytes(),
          recordType,
        );
        return bytes === null ? null : exact(NAME_RECORD_BCS, bytes);
      };
      const record = await readRecord(selected);
      let expiry: string | undefined;
      if (record) {
        let current = record;
        let ancestorLabels = selected;
        while (
          current.expiration_timestamp_ms === "0" &&
          ancestorLabels.length > 2
        ) {
          ancestorLabels = ancestorLabels.slice(0, -1);
          const parent = await readRecord(ancestorLabels);
          if (!parent || parent.nft_id !== record.nft_id) {
            await finalize();
            return null;
          }
          current = parent;
        }
        if (current.expiration_timestamp_ms !== "0")
          expiry = current.expiration_timestamp_ms;
      }
      const currentClock = await finalize();
      const currentTimestamp =
        currentClock.timestampMs +
        BigInt(Math.ceil(performance.now() - currentClock.readAt));
      const timestamp =
        BigInt(clock.timestamp_ms) +
        BigInt(Math.ceil(performance.now() - clockReadAt));
      if (currentClock.timestampMs < BigInt(clock.timestamp_ms))
        throw new WalletNameReadError("invalid-record");
      const effectiveTimestamp =
        currentTimestamp > timestamp ? currentTimestamp : timestamp;
      if (
        !record ||
        !expiry ||
        BigInt(expiry) < effectiveTimestamp ||
        !record.target_address ||
        (reverseAddress && record.target_address !== reverseAddress)
      )
        return null;
      return Object.freeze({
        snapshot: snapshot.proof,
        readSessionKey: this.session.cacheKey,
        name: [...selected].reverse().join("."),
        address: record.target_address,
        expirationTimestampMs: expiry,
        validUntilMonotonicMs:
          performance.now() +
          Number(
            BigInt(expiry) - effectiveTimestamp > 20_000n
              ? 20_000n
              : BigInt(expiry) - effectiveTimestamp,
          ),
        registry: config.forwardRegistry,
      });
    });
  }
}
