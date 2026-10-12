// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from "node:fs";
import { bcs } from "rtd-typescript/bcs";
import { GrpcTypes } from "rtd-typescript/grpc";
import {
  normalizeRtdAddress,
  normalizeStructTag,
  toBase58,
  toBase64,
} from "rtd-typescript/utils";
import { describe, expect, it, vi } from "vitest";
import { WalletFullnodeReader } from "./fullnode-reader";
import {
  decodeFreshObject,
  freshObjectDigest,
  FRESH_OBJECT_MASK,
} from "./fresh-object";
import { profileFixture } from "./profile-fixture";
import { validateNetworkProfile } from "./profile";
import { WalletReadSession } from "./session";

const id = normalizeRtdAddress("0xc"),
  address = normalizeRtdAddress("0xb");
const previous = toBase58(new Uint8Array(32).fill(9));
const contents = bcs.Address.serialize(id).toBytes();
function object(
  owner: Parameters<typeof bcs.Owner.serialize>[0] = { AddressOwner: address },
  kind: "move" | "package" = "move",
) {
  const bytes = bcs.Object.serialize({
    data:
      kind === "move"
        ? {
            Move: {
              type: {
                Other: {
                  address: "0xa",
                  module: "nft",
                  name: "NFT",
                  typeParams: [],
                },
              },
              hasPublicTransfer: false,
              version: "9007199254740993",
              contents,
            },
          }
        : {
            Package: {
              id,
              version: "9007199254740993",
              moduleMap: new Map(),
              typeOriginTable: [],
              linkageTable: new Map(),
            },
          },
    owner,
    previousTransaction: previous,
    storageRebate: "123",
  }).toBytes();
  const parsedOwner = bcs.Owner.parse(bcs.Owner.serialize(owner).toBytes());
  const proto = protoOwner(parsedOwner);
  return {
    objectId: id,
    version: 9007199254740993n,
    digest: freshObjectDigest(bytes),
    bcs: { value: bytes },
    contents: kind === "move" ? { value: contents } : undefined,
    owner: proto,
    objectType: kind === "move" ? "0xa::nft::NFT" : "package",
    previousTransaction: previous,
    hasPublicTransfer: kind === "move" ? false : undefined,
  } satisfies GrpcTypes.Object;
}

function protoOwner(
  parsedOwner: ReturnType<typeof bcs.Owner.parse>,
): GrpcTypes.Owner {
  return parsedOwner.$kind === "AddressOwner"
    ? {
        kind: GrpcTypes.Owner_OwnerKind.ADDRESS,
        address: parsedOwner.AddressOwner,
      }
    : parsedOwner.$kind === "ObjectOwner"
      ? {
          kind: GrpcTypes.Owner_OwnerKind.OBJECT,
          address: parsedOwner.ObjectOwner,
        }
      : parsedOwner.$kind === "Shared"
        ? {
            kind: GrpcTypes.Owner_OwnerKind.SHARED,
            version: BigInt(parsedOwner.Shared.initialSharedVersion),
          }
        : parsedOwner.$kind === "ConsensusAddressOwner"
          ? {
              kind: GrpcTypes.Owner_OwnerKind.CONSENSUS_ADDRESS,
              address: parsedOwner.ConsensusAddressOwner.owner,
              version: BigInt(parsedOwner.ConsensusAddressOwner.startVersion),
            }
          : { kind: GrpcTypes.Owner_OwnerKind.IMMUTABLE };
}

function frame(bytes: Uint8Array, trailer = false) {
  const data = new Uint8Array(bytes.length + 5);
  data[0] = trailer ? 128 : 0;
  new DataView(data.buffer).setUint32(1, bytes.length, false);
  data.set(bytes, 5);
  return data;
}
function response(bytes: Uint8Array, status = 0) {
  const msg = frame(bytes),
    trailer = frame(
      new TextEncoder().encode(`grpc-status: ${status}\r\n`),
      true,
    );
  const data = new Uint8Array(msg.length + trailer.length);
  data.set(msg);
  data.set(trailer, msg.length);
  return new Response(data, {
    headers: { "content-type": "application/grpc-web+proto" },
  });
}
function fixture(
  options: {
    object?: GrpcTypes.Object | null;
    status?: number;
    identity?: (call: number) => Partial<GrpcTypes.GetServiceInfoResponse>;
  } = {},
) {
  const session = new WalletReadSession(
    validateNetworkProfile(profileFixture()),
  );
  let info = 0;
  const requests: GrpcTypes.GetObjectRequest[] = [];
  const fetch = vi.fn<typeof globalThis.fetch>(async (url, init) => {
    expect(init?.redirect).toBe("error");
    expect(init?.credentials).toBe("omit");
    if (String(url).endsWith("/GetServiceInfo"))
      return response(
        GrpcTypes.GetServiceInfoResponse.toBinary({
          chainId: session.profile.expectedGenesisDigest,
          checkpointHeight: 20n,
          ...options.identity?.(++info),
        }),
      );
    expect(String(url)).toBe(
      `${session.profile.endpoints.fullnodeGrpcWeb.replace(/\/?$/, "/")}rtd.rpc.v2.LedgerService/GetObject`,
    );
    requests.push(
      GrpcTypes.GetObjectRequest.fromBinary(
        (init!.body as Uint8Array).subarray(5),
      ),
    );
    return response(
      GrpcTypes.GetObjectResponse.toBinary({
        object:
          options.object === null ? undefined : (options.object ?? object()),
      }),
      options.status,
    );
  });
  return {
    fetch,
    session,
    requests,
    reader: new WalletFullnodeReader(session, { fetch }),
  };
}

describe("收件人当前对象实际 Fullnode binary gRPC-Web", () => {
  it("并发相同对象只读取一次且每次读取保留身份前后验", async () => {
    const f = fixture();
    const [a, b] = await Promise.all([f.reader.object(id), f.reader.object(id)]);
    expect(a).toEqual(b);
    expect(f.requests).toHaveLength(1);
    expect(f.fetch).toHaveBeenCalledTimes(3);
    await f.reader.object(id);
    expect(f.requests).toHaveLength(2);
    expect(f.fetch).toHaveBeenCalledTimes(6);
  });
  it("不带历史 version；完整 BCS、摘要和引用一致并保留 bigint 精度", async () => {
    const f = fixture();
    const result = await f.reader.object("0xc");
    expect(result).toMatchObject({
      objectId: id,
      version: "9007199254740993",
      type: normalizeStructTag("0xa::nft::NFT"),
      owner: { $kind: "AddressOwner", AddressOwner: address },
      hasPublicTransfer: false,
    });
    expect(toBase64(result!.content)).toBe(toBase64(contents));
    expect(f.requests).toEqual([
      { objectId: id, readMask: { paths: [...FRESH_OBJECT_MASK] } },
    ]);
    expect(f.fetch).toHaveBeenCalledTimes(3);
  });
  it.each([
    { AddressOwner: address },
    { ObjectOwner: address },
    { Shared: { initialSharedVersion: "5" } },
    { ConsensusAddressOwner: { owner: address, startVersion: "7" } },
    { Immutable: null },
  ] satisfies Parameters<typeof bcs.Owner.serialize>[0][])(
    "保持原生 owner 类别 %j",
    async (owner) => {
      const f = fixture({ object: object(owner) });
      const result = await f.reader.object(id);
      expect(result!.owner.$kind).toBe(
        bcs.Owner.parse(bcs.Owner.serialize(owner).toBytes()).$kind,
      );
    },
  );
  it("当前 package 地址也必须报告为对象，不能误认为收款账户", async () => {
    const f = fixture({ object: object({ Immutable: null }, "package") });
    expect(await f.reader.object(id)).toMatchObject({
      type: "package",
      owner: { $kind: "Immutable" },
      hasPublicTransfer: null,
    });
  });
  it("只有真正 NOT_FOUND 且末尾 H0 通过才返回 null，不查 archive", async () => {
    const f = fixture({ object: null, status: 5 });
    expect(await f.reader.object(id)).toBeNull();
    expect(f.fetch).toHaveBeenCalledTimes(3);
    expect(
      f.fetch.mock.calls.every(([url]) => !String(url).includes("archive")),
    ).toBe(true);
  });
  it.each([14, 3, 13])("其他 gRPC 错误 %i 不成为不存在", async (status) => {
    const f = fixture({ object: null, status });
    await expect(f.reader.object(id)).rejects.toThrow();
  });
  it("成功但缺少 object 拒绝，不当成 NOT_FOUND", async () => {
    await expect(fixture({ object: null }).reader.object(id)).rejects.toThrow();
  });
  it.each([
    { objectId: "0xd" },
    { version: 1n },
    { digest: previous },
    { owner: { kind: GrpcTypes.Owner_OwnerKind.ADDRESS, address: id } },
    { objectType: "0xa::nft::OTHER" },
    { previousTransaction: toBase58(new Uint8Array(32).fill(8)) },
    { contents: undefined },
    { contents: { value: new Uint8Array([0]) } },
    { bcs: undefined },
    { hasPublicTransfer: true },
    { owner: undefined },
    { bcs: { value: Uint8Array.from([...object().bcs.value, 0]) } },
  ] satisfies Partial<GrpcTypes.Object>[])(
    "拒绝字段与完整 BCS 不一致 %#",
    async (override) => {
      const f = fixture({ object: { ...object(), ...override } });
      await expect(f.reader.object(id)).rejects.toThrow();
    },
  );
  it.each([1, 2])(
    "前/后 H0 换链第 %i 次拒绝，NOT_FOUND 也不能豁免",
    async (call) => {
      const f = fixture({
        object: null,
        status: 5,
        identity: (n) => (n === call ? { chainId: previous } : {}),
      });
      await expect(f.reader.object(id)).rejects.toMatchObject({
        reason: "chain-mismatch",
      });
    },
  );
  it("水位退高拒绝有效对象", async () => {
    const f = fixture({
      identity: (n) => ({ checkpointHeight: n === 1 ? 20n : 19n }),
    });
    await expect(f.reader.object(id)).rejects.toMatchObject({
      reason: "incompatible",
    });
  });
  it("调用前取消不发请求，关闭会话不接纳迟到对象", async () => {
    const f = fixture();
    const abort = new AbortController();
    abort.abort();
    await expect(f.reader.object(id, abort.signal)).rejects.toThrow();
    expect(f.fetch).not.toHaveBeenCalled();
    const late = new WalletFullnodeReader(f.session, {
      fetch: async (...args) => {
        const result = await f.fetch(...args);
        f.session.close();
        return result;
      },
    });
    await expect(late.object(id)).rejects.toThrow();
  });
  it("直接 decoder 也拒绝非 canonical BCS，不能仅验证合法前缀", () => {
    expect(() =>
      decodeFreshObject(
        {
          ...object(),
          bcs: { value: Uint8Array.from([...object().bcs.value, 0]) },
        },
        id,
      ),
    ).toThrow();
  });
});

const rustVectors = readFileSync(
  "migrationToGRpcOrGraphQLDoc/evidence/20261003-fresh-object-rust-vectors.jsonl",
  "utf8",
)
  .trim()
  .split("\n")
  .map(
    (line) =>
      JSON.parse(line) as {
        name: string;
        hex: string;
        digest: string;
        type: string;
        previousTransaction: string;
      },
  );
describe("当前 debug Rust Object 的跨语言 BCS 与摘要", () => {
  it.each(rustVectors.map((vector) => [vector.name, vector] as const))(
    "原生 %s 向量通过 canonical、Object::摘要和所有 wire 字段核验",
    (_name, vector) => {
      const bytes = Uint8Array.from(Buffer.from(vector.hex, "hex"));
      const parsed = bcs.Object.parse(bytes);
      if (parsed.data.$kind !== "Move") throw new Error("invalid fixture");
      const move = parsed.data.Move;
      expect(freshObjectDigest(bytes)).toBe(vector.digest);
      expect(toBase64(bcs.Object.serialize(parsed).toBytes())).toBe(
        toBase64(bytes),
      );
      const result = decodeFreshObject(
        {
          objectId: id,
          version: BigInt(move.version),
          digest: vector.digest,
          bcs: { value: bytes },
          contents: { value: Uint8Array.from(move.contents) },
          owner: protoOwner(parsed.owner),
          objectType: vector.type,
          previousTransaction: vector.previousTransaction,
          hasPublicTransfer: move.hasPublicTransfer,
        },
        id,
      );
      expect(result.type).toBe(normalizeStructTag(vector.type));
      expect(result.version).toBe("9007199254740993");
      expect(result.digest).toBe(vector.digest);
      expect(result.owner.$kind).toBe(parsed.owner.$kind);
    },
  );
});
