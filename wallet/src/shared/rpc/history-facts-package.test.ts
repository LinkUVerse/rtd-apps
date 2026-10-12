// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { blake2b } from "@noble/hashes/blake2.js";
import { describe, expect, it } from "vitest";
import { bcs } from "rtd-typescript/bcs";
import { GrpcTypes } from "rtd-typescript/grpc";
import { fromBase64, toBase58, toBase64 } from "rtd-typescript/utils";
import {
  historyFixture,
  historyRow,
} from "../../../tests/unit/rpc/history-fixtures";
import { sender } from "../../../tests/unit/rpc/execution-fixtures";
import { receiptObjectEffects } from "rtd-apps-core/src/rpc/transaction-view";
import { admitHistoryTransaction } from "./history-facts";
import { probeAccountHistoryCapabilities } from "./account-history-capabilities";

const id = "0x" + "0".repeat(62) + "ee";
const objectDigest = toBase58(new Uint8Array(32).fill(13));
/** Public protocol fixture, not a signed dev deployment or Move execution proof. */
async function typedRow(packageWrite = true) {
  const f = await historyRow();
  const wire = bcs.TransactionEffects.parse(f.raw.effects!.bcs!.value!);
  if (wire.$kind !== "V2") throw new Error("fixture version");
  wire.V2.changedObjects = [
    [
      id,
      {
        inputState: { $kind: "NotExist", NotExist: true },
        outputState: packageWrite
          ? { $kind: "PackageWrite", PackageWrite: ["1", objectDigest] }
          : {
              $kind: "ObjectWrite",
              ObjectWrite: [
                objectDigest,
                { $kind: "AddressOwner", AddressOwner: sender },
              ],
            },
        idOperation: { $kind: "Created", Created: true },
      },
    ],
  ];
  const bytes = bcs.TransactionEffects.serialize(wire).toBytes();
  const prefix = new TextEncoder().encode("TransactionEffects::");
  const typed = new Uint8Array(prefix.length + bytes.length);
  typed.set(prefix);
  typed.set(bytes, prefix.length);
  const effects = f.raw.effects!;
  effects.bcs = { value: bytes };
  effects.digest = toBase58(blake2b(typed, { dkLen: 32 }));
  effects.changedObjects = [
    GrpcTypes.ChangedObject.create({
      objectId: id,
      inputState: GrpcTypes.ChangedObject_InputObjectState.DOES_NOT_EXIST,
      outputState: packageWrite
        ? GrpcTypes.ChangedObject_OutputObjectState.PACKAGE_WRITE
        : GrpcTypes.ChangedObject_OutputObjectState.OBJECT_WRITE,
      outputVersion: packageWrite ? 1n : 12n,
      outputDigest: objectDigest,
      outputOwner: packageWrite
        ? { kind: GrpcTypes.Owner_OwnerKind.IMMUTABLE }
        : { kind: GrpcTypes.Owner_OwnerKind.ADDRESS, address: sender },
      idOperation: GrpcTypes.ChangedObject_IdOperation.CREATED,
      objectType: packageWrite ? "package" : "0x2::coin::Coin<0x2::rtd::RTD>",
    }),
  ];
  Object.assign(f.row.transaction.effects, {
    effectsBcs: toBase64(bytes),
    effectsDigest: effects.digest,
    effectsJson: GrpcTypes.TransactionEffects.toJson(effects),
  });
  return f.row;
}
function editType(row: Awaited<ReturnType<typeof typedRow>>, type: unknown) {
  const json = row.transaction.effects.effectsJson as Record<string, any>;
  json.changedObjects[0].objectType = type;
}
describe("账户历史原生package标记与权威BCS输出对应", () => {
  it("包发布保留package及BCS独立版本／immutable输出，不按Move tag解析", async () => {
    const r = await admitHistoryTransaction(await typedRow(), 0, 25);
    expect(r.transaction!.objectTypes[id]).toBe("package");
    expect(receiptObjectEffects(r.transaction!)[0]).toMatchObject({
      outputState: "PackageWrite",
      outputOwner: "Immutable",
      version: "1",
      objectDigest,
    });
  });
  it("普通ObjectWrite保持原Move类型规范化", async () => {
    const r = await admitHistoryTransaction(await typedRow(false), 0, 25);
    expect(r.transaction!.objectTypes[id]).toContain("::coin::Coin<");
    expect(receiptObjectEffects(r.transaction!)[0]).toMatchObject({
      outputState: "ObjectWrite",
      version: "12",
    });
  });
  it("PackageWrite缺少索引类型不能被SDK省略后冒作完整事实", async () => {
    const row = await typedRow();
    const json = row.transaction.effects.effectsJson as Record<string, any>;
    delete json.changedObjects[0].objectType;
    await expect(admitHistoryTransaction(row, 0, 25)).rejects.toMatchObject({
      reason: "incompatible",
    });
  });
  it.each(["", "Package", "package ", "0x2::coin::Coin<0x2::rtd::RTD>"])(
    "PackageWrite的错误类型%s拒绝",
    async (type) => {
      const row = await typedRow();
      editType(row, type);
      await expect(admitHistoryTransaction(row, 0, 25)).rejects.toMatchObject({
        reason: "incompatible",
      });
    },
  );
  it("ObjectWrite伪称package，即使protobuf输出也伪称PackageWrite仍由BCS拒绝", async () => {
    const row = await typedRow(false);
    editType(row, "package");
    const json = row.transaction.effects.effectsJson as Record<string, any>;
    json.changedObjects[0].outputState = "OUTPUT_OBJECT_STATE_PACKAGE_WRITE";
    await expect(admitHistoryTransaction(row, 0, 25)).rejects.toMatchObject({
      reason: "incompatible",
    });
  });
  it("增加package支持不放松effects BCS摘要及逐字一致要求", async () => {
    const row = await typedRow();
    const bytes = fromBase64(row.transaction.effects.effectsBcs);
    bytes[bytes.length - 1] ^= 1;
    row.transaction.effects.effectsBcs = toBase64(bytes);
    await expect(admitHistoryTransaction(row, 0, 25)).rejects.toBeDefined();
  });
  it("完整生产reader混合包／普通事实全页通过，报告限定union且无交易payload", async () => {
    const a = await typedRow(),
      b = (await historyRow(2n, false, 20)).row;
    const f = await historyFixture({ rows: [a, b] });
    const r = await probeAccountHistoryCapabilities(f.native.session, {
      address: sender,
      fetch: f.fetch,
      pageSize: 1,
    });
    expect(r).toMatchObject({
      state: "scoped-window-verified",
      totalTransactions: 2,
      allAccountHistoryVerified: false,
    });
    expect(r).not.toHaveProperty("transactions");
    expect(
      f.requests.filter((p) => p.query.includes("WalletAccountHistory")),
    ).toHaveLength(2);
  });
});
