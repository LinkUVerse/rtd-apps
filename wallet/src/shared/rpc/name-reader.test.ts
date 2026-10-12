// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs, TypeTagSerializer } from "rtd-typescript/bcs";
import { GrpcTypes } from "rtd-typescript/grpc";
import {
  deriveDynamicFieldID,
  normalizeRtdAddress,
  toBase58,
  toBase64,
} from "rtd-typescript/utils";
import { describe, expect, it, vi } from "vitest";
import {
  snapshotFixture,
  type GraphQLRequest,
} from "../../../tests/unit/rpc/fixtures";
import {
  DOMAIN_BCS,
  NAME_RECORD_BCS,
  WalletNameReader,
  domainLabels,
} from "./name-reader";
import { dynamicType } from "./dynamic-fields";
import { validateNetworkProfile } from "./profile";
import { profileFixture } from "./profile-fixture";
import { WalletReadSession } from "./session";
import { freshObjectDigest } from "./fresh-object";

function grpcResponse(value: GrpcTypes.GetServiceInfoResponse) {
  return grpcPayload(GrpcTypes.GetServiceInfoResponse.toBinary(value));
}
function grpcPayload(payload: Uint8Array, status = 0) {
  const trailers = new TextEncoder().encode(`grpc-status: ${status}\r\n`);
  const bytes = new Uint8Array(10 + payload.length + trailers.length);
  new DataView(bytes.buffer).setUint32(1, payload.length, false);
  bytes.set(payload, 5);
  bytes[5 + payload.length] = 128;
  new DataView(bytes.buffer).setUint32(
    6 + payload.length,
    trailers.length,
    false,
  );
  bytes.set(trailers, 10 + payload.length);
  return new Response(bytes, {
    headers: { "content-type": "application/grpc-web+proto" },
  });
}
const clockCodec = bcs.struct("Clock", {
  id: bcs.Address,
  timestamp_ms: bcs.u64(),
});
const target = normalizeRtdAddress("0xb");
const nft = normalizeRtdAddress("0xc");
const record = (
  overrides: Partial<ReturnType<typeof NAME_RECORD_BCS.parse>> = {},
) => ({
  nft_id: nft,
  expiration_timestamp_ms: "999999",
  target_address: target,
  data: { contents: [] },
  ...overrides,
});
function nativeObject(
  id: string,
  type: string,
  contents: Uint8Array,
  parent?: string,
) {
  const tag = TypeTagSerializer.parseFromStr(type, true);
  if (!("struct" in tag)) throw new Error("fixture struct");
  const previousTransaction = toBase58(new Uint8Array(32).fill(2));
  const owner = parent
    ? { ObjectOwner: parent }
    : { Shared: { initialSharedVersion: "1" } };
  const bytes = bcs.Object.serialize({
    data: {
      Move: {
        type: { Other: tag.struct },
        hasPublicTransfer: false,
        version: "1",
        contents,
      },
    },
    owner,
    previousTransaction,
    storageRebate: "0",
  }).toBytes();
  return {
    objectId: id,
    objectType: dynamicType(type),
    version: 1n,
    digest: freshObjectDigest(bytes),
    bcs: { value: bytes },
    contents: { value: contents },
    previousTransaction,
    hasPublicTransfer: false,
    owner: parent
      ? { kind: GrpcTypes.Owner_OwnerKind.OBJECT, address: parent }
      : { kind: GrpcTypes.Owner_OwnerKind.SHARED, version: 1n },
  } satisfies GrpcTypes.Object;
}

function fixture(
  options: {
    records?: Record<string, ReturnType<typeof record> | null>;
    reverse?: string | null;
    height?: (call: number) => bigint;
    chain?: string;
    nativeRecords?: Record<string, ReturnType<typeof record> | null>;
    nativeReverse?: string | null;
    nativeClock?: string;
    alterNative?: (value: GrpcTypes.Object) => GrpcTypes.Object;
    nativeStatus?: number;
    alter?: (
      value: Record<string, unknown>,
      request: GraphQLRequest,
    ) => unknown;
  } = {},
) {
  const records = options.records ?? { "test.rtd": record() };
  const f = snapshotFixture({
    alter: options.alter,
    read: (request) => {
      if (request.query.includes('object(address: "0x6")'))
        return {
          object: {
            asMoveObject: {
              address: "0x6",
              contents: {
                type: { repr: "0x2::clock::Clock" },
                bcs: clockCodec
                  .serialize({
                    id: normalizeRtdAddress("0x6"),
                    timestamp_ms: "1000",
                  })
                  .toBase64(),
              },
            },
          },
        };
      const { parent, name } = request.variables as {
        parent: string;
        name: { type: string; bcs: string };
      };
      const config = f.profile.packages.name!;
      const nameBytes = Uint8Array.from(Buffer.from(name.bcs, "base64"));
      const domainType = dynamicType(`${config.packageId}::domain::Domain`);
      let value: string | null;
      let valueType: string;
      if (parent === config.reverseRegistry) {
        value =
          options.reverse === null
            ? null
            : DOMAIN_BCS.serialize({
                labels: domainLabels(options.reverse ?? "test.rtd"),
              }).toBase64();
        valueType = domainType;
      } else {
        const label = DOMAIN_BCS.parse(nameBytes).labels.reverse().join(".");
        const result = records[label];
        value = result ? NAME_RECORD_BCS.serialize(result).toBase64() : null;
        valueType = dynamicType(`${config.packageId}::name_record::NameRecord`);
      }
      return {
        address: {
          address: parent,
          field:
            value === null
              ? null
              : {
                  address: deriveDynamicFieldID(parent, name.type, nameBytes),
                  name: { bcs: name.bcs, type: { repr: name.type } },
                  value: {
                    __typename: "MoveValue",
                    type: { repr: valueType },
                    bcs: value,
                  },
                },
        },
      };
    },
  });
  const native = new Map<string, GrpcTypes.Object>();
  const config = f.profile.packages.name!;
  const domainType = dynamicType(`${config.packageId}::domain::Domain`);
  const add = (
    parent: string,
    nameType: string,
    name: Uint8Array,
    valueType: string,
    value: Uint8Array,
  ) => {
    const id = deriveDynamicFieldID(parent, nameType, name);
    native.set(
      id,
      nativeObject(
        id,
        `0x2::dynamic_field::Field<${nameType},${valueType}>`,
        new Uint8Array([
          ...bcs.Address.serialize(id).toBytes(),
          ...name,
          ...value,
        ]),
        parent,
      ),
    );
  };
  for (const [name, value] of Object.entries(
    options.nativeRecords ?? records,
  )) {
    if (value)
      add(
        config.forwardRegistry,
        domainType,
        DOMAIN_BCS.serialize({ labels: domainLabels(name) }).toBytes(),
        `${config.packageId}::name_record::NameRecord`,
        NAME_RECORD_BCS.serialize(value).toBytes(),
      );
  }
  const reverse =
    options.nativeReverse === undefined
      ? (options.reverse ?? "test.rtd")
      : options.nativeReverse;
  if (
    reverse !== null &&
    !(options.reverse === null && options.nativeReverse === undefined)
  )
    add(
      config.reverseRegistry,
      "address",
      bcs.Address.serialize(target).toBytes(),
      domainType,
      DOMAIN_BCS.serialize({ labels: domainLabels(reverse) }).toBytes(),
    );
  const clockId = normalizeRtdAddress("0x6");
  native.set(
    clockId,
    nativeObject(
      clockId,
      "0x2::clock::Clock",
      clockCodec
        .serialize({ id: clockId, timestamp_ms: options.nativeClock ?? "1000" })
        .toBytes(),
    ),
  );
  let info = 0;
  const fetch = vi.fn<typeof globalThis.fetch>(async (url, init) => {
    if (String(url).endsWith("/GetServiceInfo"))
      return grpcResponse({
        chainId: options.chain ?? f.profile.expectedGenesisDigest,
        checkpointHeight: options.height?.(++info) ?? 10n,
      });
    if (String(url).endsWith("/GetObject")) {
      const req = GrpcTypes.GetObjectRequest.fromBinary(
        (init!.body as Uint8Array).subarray(5),
      );
      expect(req.version).toBeUndefined();
      const value = native.get(req.objectId!);
      return grpcPayload(
        GrpcTypes.GetObjectResponse.toBinary(
          value ? { object: options.alterNative?.(value) ?? value } : {},
        ),
        options.nativeStatus ?? (value ? 0 : 5),
      );
    }
    return f.fetch(url, init);
  });
  const reader = new WalletNameReader(f.session, { fetch });
  return { ...f, reader, fetch };
}

describe("显式 registry 名称读取和原生传输", () => {
  it.each(["@test", "test.rtd", "test*rtd"])(
    "正向解析 %s，保留网络快照与当前会话",
    async (name) => {
      const f = fixture();
      const result = await f.reader.resolve(name);
      expect(result).toMatchObject({
        name: "test.rtd",
        address: target,
        expirationTimestampMs: "999999",
        readSessionKey: f.session.cacheKey,
        snapshot: { bindingKey: f.session.bindingKey, checkpoint: "10" },
      });
      expect(Object.isFrozen(result)).toBe(true);
      expect(
        f.fetch.mock.calls.filter(([url]) =>
          String(url).endsWith("/GetServiceInfo"),
        ).length,
      ).toBeGreaterThanOrEqual(2);
      expect(
        f.requests.every((r) => !r.query.includes("nameRecord(name:")),
      ).toBe(true);
    },
  );
  it("默认反向名称必须正向回到同一地址", async () => {
    expect((await fixture().reader.defaultName(target))?.name).toBe("test.rtd");
    expect(
      await fixture({
        records: {
          "test.rtd": record({ target_address: normalizeRtdAddress("0xa") }),
        },
      }).reader.defaultName(target),
    ).toBeNull();
    expect(
      await fixture({ reverse: null }).reader.defaultName(target),
    ).toBeNull();
  });
  it("叶子继承最近非叶子祖先期限，必须匹配注册NFT", async () => {
    const records = {
      "leaf.node.test.rtd": record({ expiration_timestamp_ms: "0" }),
      "node.test.rtd": record({ expiration_timestamp_ms: "0" }),
      "test.rtd": record(),
    };
    expect(
      (await fixture({ records }).reader.resolve("leaf.node@test"))
        ?.expirationTimestampMs,
    ).toBe("999999");
    expect(
      await fixture({
        records: {
          ...records,
          "node.test.rtd": record({ nft_id: normalizeRtdAddress("0xd") }),
        },
      }).reader.resolve("leaf.node@test"),
    ).toBeNull();
    expect(
      await fixture({
        records: {
          ...records,
          "test.rtd": record({ expiration_timestamp_ms: "999" }),
        },
      }).reader.resolve("leaf.node@test"),
    ).toBeNull();
    expect(
      await fixture({
        records: { ...records, "test.rtd": null },
      }).reader.resolve("leaf.node@test"),
    ).toBeNull();
  });
  it.each([
    null,
    record({ expiration_timestamp_ms: "999" }),
    record({ target_address: null }),
    record({ expiration_timestamp_ms: "0" }),
  ])("缺失、过期、空目标、无合法父期限返回null", async (value) => {
    expect(
      await fixture({ records: { "test.rtd": value } }).reader.resolve("@test"),
    ).toBeNull();
  });
  it.each([
    "Test.rtd",
    "test.sui",
    "-test.rtd",
    "test-.rtd",
    "test..rtd",
    "test*rtd.rtd",
    "test@@other",
    "@test.rtd",
    "test",
    `${"a".repeat(64)}.rtd`,
    "汉字.rtd",
  ])("格式错误 %s 在网络之前拒绝", async (name) => {
    const f = fixture();
    await expect(f.reader.resolve(name)).rejects.toThrow("名称格式");
    expect(f.fetch).not.toHaveBeenCalled();
  });
  it("索引落后仍须逐字段核对当前Fullnode，记录一致才接纳", async () => {
    const f = fixture({ height: () => 1000n });
    expect((await f.reader.resolve("@test"))?.address).toBe(target);
    expect(
      f.fetch.mock.calls.some(([url]) => String(url).endsWith("/GetObject")),
    ).toBe(true);
  });
  it("查询结束高度倒退仍拒绝", async () => {
    await expect(
      fixture({
        height: (call) => (call === 1 ? 10n : 9n),
      }).reader.resolve("@test"),
    ).rejects.toThrow("名称索引");
  });
  it("反向记录不存在也必须完成终态身份和lag校验", async () => {
    await expect(
      fixture({
        reverse: null,
        height: (call) => (call === 1 ? 10n : 9n),
      }).reader.defaultName(target),
    ).rejects.toThrow("名称索引");
  });
  it.each([
    {
      nativeRecords: {
        "test.rtd": record({ target_address: normalizeRtdAddress("0xd") }),
      },
    },
    { nativeRecords: { "test.rtd": null } },
    { records: { "test.rtd": null }, nativeRecords: { "test.rtd": record() } },
    {
      nativeRecords: {
        "test.rtd": record({ expiration_timestamp_ms: "2000000" }),
      },
    },
  ])("新目标、删除、旧缺失和续期未入索引均拒绝旧结果", async (options) => {
    await expect(fixture(options).reader.resolve("@test")).rejects.toThrow(
      "名称索引",
    );
  });
  it("新链时间已过期，不能沿用旧快照时间", async () => {
    expect(
      await fixture({ nativeClock: "1000000" }).reader.resolve("@test"),
    ).toBeNull();
    await expect(
      fixture({ nativeClock: "999" }).reader.resolve("@test"),
    ).rejects.toThrow("完整性");
  });
  it("反向记录改变或祖先改变均拒绝", async () => {
    await expect(
      fixture({ nativeReverse: "other.rtd" }).reader.defaultName(target),
    ).rejects.toThrow("名称索引");
    const records = {
      "leaf.test.rtd": record({ expiration_timestamp_ms: "0" }),
      "test.rtd": record(),
    };
    await expect(
      fixture({
        records,
        nativeRecords: {
          ...records,
          "test.rtd": record({ nft_id: normalizeRtdAddress("0xd") }),
        },
      }).reader.resolve("leaf.test.rtd"),
    ).rejects.toThrow("名称索引");
  });
  it("Fullnode核验异常不当作缺失", async () => {
    await expect(
      fixture({ nativeStatus: 14 }).reader.resolve("@test"),
    ).rejects.toThrow();
    await expect(
      fixture({
        alterNative: (o) => ({ ...o, objectType: "0x2::wrong::Type" }),
      }).reader.resolve("@test"),
    ).rejects.toThrow();
  });
  it("Fullnode错链不读取名称", async () => {
    const f = fixture({ chain: toBase58(new Uint8Array(32).fill(9)) });
    await expect(f.reader.resolve("@test")).rejects.toThrow();
    expect(f.requests).toHaveLength(0);
  });
  it.each(["type", "bcs", "field", "name"])(
    "拒绝动态字段错%s",
    async (kind) => {
      const f = fixture({
        alter: (value, request) => {
          if (
            request.query.includes("WalletSnapshotRead") &&
            request.variables.parent
          ) {
            const raw = value as any;
            const field = raw.data.walletSnapshot.query.address.field;
            if (kind === "type")
              field.value.type.repr = "0x4::name_record::Other";
            if (kind === "bcs")
              field.value.bcs = toBase64(
                new Uint8Array([...Buffer.from(field.value.bcs, "base64"), 0]),
              );
            if (kind === "field") field.address = "0xdead";
            if (kind === "name") field.name.bcs = "AA==";
          }
          return value;
        },
      });
      await expect(f.reader.resolve("@test")).rejects.toThrow();
    },
  );
  it("GraphQL部分错误不得伪装名称不存在", async () => {
    const f = fixture({
      alter: (data, request) =>
        request.query.includes("WalletSnapshotRead")
          ? { ...data, errors: [{ message: "missing coverage" }] }
          : data,
    });
    await expect(f.reader.resolve("@test")).rejects.toThrow("未完整成功");
  });
  it("取消及网络会话失效后不能接纳数据", async () => {
    const f = fixture();
    const abort = new AbortController();
    abort.abort();
    await expect(f.reader.resolve("@test", abort.signal)).rejects.toThrow();
    f.session.close();
    await expect(f.reader.resolve("@test")).rejects.toThrow("会话已改变");
  });
  it("缺少显式registry配置完全不请求服务", async () => {
    const profile = profileFixture();
    delete profile.packages.name;
    const fetch = vi.fn<typeof globalThis.fetch>();
    const reader = new WalletNameReader(
      new WalletReadSession(validateNetworkProfile(profile)),
      { fetch },
    );
    await expect(reader.resolve("@test")).rejects.toThrow("尚未配置名称");
    expect(fetch).not.toHaveBeenCalled();
  });
});
