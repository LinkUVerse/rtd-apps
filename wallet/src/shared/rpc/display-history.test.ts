// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
  deriveObjectID,
  normalizeStructTag,
  toBase58,
} from "rtd-typescript/utils";
import { describe, expect, it } from "vitest";

import {
  connection,
  displayCoverage,
  objectDigest,
  objectNode,
  snapshotDigest,
  snapshotFixture,
  txDigest,
  v1Basis,
} from "../../../tests/unit/rpc/fixtures";
import { WalletAssetReader } from "./asset-reader";
import { GraphQLSnapshot, SnapshotReadError } from "./graphql-snapshot";
import { StaleWalletSessionError } from "./session";
import {
  collectSnapshotPages,
  SnapshotPaginationError,
} from "./snapshot-pagination";

const dependencies = [{ type: "MoveValue", field: "display" }];
const differentDigest = toBase58(new Uint8Array(32).fill(9));

function capability(data: any) {
  return (
    data.walletDisplayService ?? data.walletSnapshot.query.walletDisplayService
  ).displayHistory;
}

function owned(basis: unknown = v1Basis()) {
  const object = objectNode();
  (object.contents.display as any).basis = basis;
  return { address: { address: "0xb", objects: connection([object]) } };
}

async function objects(read: () => Record<string, unknown>) {
  const f = snapshotFixture({ read });
  const reader = await WalletAssetReader.open(f.session, { fetch: f.fetch });
  return reader.ownedObjects("0xb");
}

describe("历史 Display 能力与固定 S 模板依据准入", () => {
  it("固定窗口合并准入同时核验head与固定S的Display能力", async () => {
    const f = snapshotFixture();
    const snapshot = await GraphQLSnapshot.open(f.session, dependencies, {
      fetch:f.fetch, window:{lower:0,upper:8},
    });
    expect(snapshot.proof.checkpoint).toBe('8');
    expect(snapshot.proof.displayHistory).toBeDefined();
    expect(f.requests).toHaveLength(1);
    expect(f.requests[0].query).toContain('WalletSnapshotAdmissionAndPin');
    await snapshot.revalidate();
    expect(f.requests).toHaveLength(2);
  });
  it("v2 派生 ID 与 Rust registry 的固定向量一致", () => {
    const type = normalizeStructTag("0x42::nft::NFT");
    expect(
      deriveObjectID(
        "0xd",
        `0x2::display_registry::DisplayKey<${type}>`,
        new Uint8Array([0]),
      ),
    ).toBe(
      "0x740798106da92e9542250651d68bbd154073b8dbcfa98199598783becdfbc49f",
    );
  });
  it("能力在固定检查点内部查询，缓存保留独立历史 generation；非资产查询不增加依赖", async () => {
    const f = snapshotFixture();
    const snapshot = await GraphQLSnapshot.open(f.session, dependencies, {
      fetch: f.fetch,
    });
    expect(snapshot.proof.displayHistory?.coverage.generation).not.toBe(
      f.profile.generation,
    );
    expect(Object.isFrozen(snapshot.proof.displayHistory?.coverage)).toBe(true);
    await snapshot.read({ selection: "checkpoint { sequenceNumber }" });
    await snapshot.revalidate();
    for (const request of f.requests.slice(1)) {
      const ast = request.query;
      expect(ast).toMatch(
        /walletSnapshot: checkpoint\(sequenceNumber: 10\)[\s\S]*query\s*\{[\s\S]*walletDisplayService/,
      );
    }
    const plain = snapshotFixture();
    const other = await GraphQLSnapshot.open(
      plain.session,
      [{ type: "Address", field: "balances" }],
      { fetch: plain.fetch },
    );
    expect(other.proof.displayHistory).toBeUndefined();
    expect(
      plain.requests.every((r) => !r.query.includes("displayHistory")),
    ).toBe(true);
  });

  it.each([
    "missing",
    "version",
    "kinds",
    "missing-coverage",
    "genesis",
    "first",
    "lag",
    "future-snapshot",
    "snapshot-digest",
    "binding",
    "malformed-digest",
  ])("准入能力 %s 拒绝，空资产不能掩盖缺失历史", async (fault) => {
    const f = snapshotFixture({
      alter: (response) => {
        const data = response.data as any;
        const cap = capability(data);
        if (fault === "missing") delete data.walletDisplayService;
        if (fault === "version") cap.apiVersion = 2;
        if (fault === "kinds") cap.supportedTemplateKinds = ["V1", "V1"];
        if (fault === "missing-coverage") delete cap.coverage;
        if (fault === "genesis") cap.coverage.genesisDigest = differentDigest;
        if (fault === "first") cap.coverage.firstCheckpoint = 1;
        if (fault === "lag") cap.coverage.lastCheckpoint = 9;
        if (fault === "future-snapshot") cap.coverage.snapshotCheckpoint = 12;
        if (fault === "snapshot-digest")
          cap.coverage.snapshotCheckpointDigest = differentDigest;
        if (fault === "binding") cap.coverage.sourceId = "bad\nsource";
        if (fault === "malformed-digest")
          cap.coverage.lastCheckpointDigest = "bad";
        return response;
      },
    });
    await expect(
      WalletAssetReader.open(f.session, { fetch: f.fetch }),
    ).rejects.toBeInstanceOf(SnapshotReadError);
    expect(f.requests).toHaveLength(1);
  });

  it.each([
    "WalletSnapshotPin",
    "WalletSnapshotRead",
    "WalletSnapshotRevalidate",
  ])(
    "%s 的 source/generation 变化拒绝，不将服务 generation 当成网络 generation",
    async (phase) => {
      for (const field of ["sourceId", "generation"] as const) {
        const f = snapshotFixture({
          read: () => owned(),
          alter: (response, request) => {
            if (request.query.includes(phase))
              capability(response.data).coverage[field] = "other";
            return response;
          },
        });
        if (phase === "WalletSnapshotPin")
          await expect(
            WalletAssetReader.open(f.session, { fetch: f.fetch }),
          ).rejects.toMatchObject({ reason: "changed" });
        else {
          const reader = await WalletAssetReader.open(f.session, {
            fetch: f.fetch,
          });
          await expect(reader.ownedObjects("0xb")).rejects.toMatchObject({
            reason: "changed",
          });
        }
      }
    },
  );

  it("读取过程中真实覆盖上界可推进，S 的来源／摘要不变即可接纳", async () => {
    const f = snapshotFixture({
      read: () => owned(),
      alter: (response, request) => {
        if (
          request.query.includes("WalletSnapshotRead") ||
          request.query.includes("WalletSnapshotRevalidate")
        ) {
          const c = capability(response.data).coverage;
          c.lastCheckpoint = 30;
          c.lastCheckpointDigest = differentDigest;
        }
        return response;
      },
    });
    const reader = await WalletAssetReader.open(f.session, { fetch: f.fetch });
    expect(
      (await reader.ownedObjects("0xb")).value[0].display?.basis.kind,
    ).toBe("V1");
  });

  it.each([0, 32767, 32768, 65535])(
    "v1 发布版本 %s 保持完整 u16 语义及 basis",
    async (version) => {
      const b = v1Basis();
      b.publishedVersion = version;
      const result = await objects(() => owned(b));
      const display = result.value[0].display!;
      expect(display.basis).toMatchObject({
        kind: "V1",
        publishedVersion: version,
        snapshotCheckpoint: "10",
        sourceCheckpoint: "5",
      });
      expect(Object.isFrozen(display.basis)).toBe(true);
      expect(display.output?.attributes).toEqual({ rarity: 1 });
    },
  );

  it.each([
    "missing",
    "kind",
    "snapshot",
    "future",
    "type",
    "noncanonical-type",
    "id",
    "version",
    "position",
    "transaction",
    "sha",
    "source",
    "generation",
    "history-snapshot",
    "history-digest",
    "coverage",
    "source-digest",
  ])("v1 basis %s 拒绝整个资产集合", async (fault) => {
    const b: any = v1Basis();
    if (fault === "missing")
      return expect(objects(() => owned(null))).rejects.toThrow();
    if (fault === "kind") b.__typename = "OtherBasis";
    if (fault === "snapshot") b.snapshotCheckpoint = 9;
    if (fault === "future") b.sourceCheckpoint = 11;
    if (fault === "type")
      b.objectType = normalizeStructTag("0x2::example::Other");
    if (fault === "noncanonical-type") b.objectType = "0x2::example::NFT";
    if (fault === "id") b.templateId = "invalid";
    if (fault === "version") b.publishedVersion = 65536;
    if (fault === "position") b.eventIndex = Number.MAX_SAFE_INTEGER + 1;
    if (fault === "transaction") b.transactionDigest = "bad";
    if (fault === "sha") b.eventBcsSha256 = "f".repeat(63);
    if (fault === "source") b.historyCoverage.sourceId = "other";
    if (fault === "generation") b.historyCoverage.generation = "other";
    if (fault === "history-snapshot") b.historyCoverage.snapshotCheckpoint = 9;
    if (fault === "history-digest")
      b.historyCoverage.snapshotCheckpointDigest = differentDigest;
    if (fault === "coverage") b.historyCoverage.lastCheckpoint = 9;
    if (fault === "source-digest") {
      b.sourceCheckpoint = 10;
      b.sourceCheckpointDigest = differentDigest;
    }
    await expect(objects(() => owned(b))).rejects.toBeInstanceOf(
      SnapshotReadError,
    );
  });

  it("v2 使用 registry 派生 ID 和对象版本，不能套用 v1 u16 限制", async () => {
    const type = normalizeStructTag("0x2::example::NFT");
    const b = {
      __typename: "DisplayV2Basis",
      snapshotCheckpoint: 10,
      objectType: type,
      templateId: deriveObjectID(
        "0xd",
        `0x2::display_registry::DisplayKey<${type}>`,
        new Uint8Array([0]),
      ),
      objectVersion: 9007199254740991,
      objectDigest,
      sourceCheckpoint: 7,
      previousTransactionDigest: txDigest,
      contentsBcsSha256: "b".repeat(64),
      historyCoverage: displayCoverage(),
    };
    const result = await objects(() => owned(b));
    expect(result.value[0].display?.basis).toMatchObject({
      kind: "V2",
      objectVersion: "9007199254740991",
    });
    for (const change of [
      { templateId: "0xc" },
      { objectVersion: 0 },
      { objectVersion: 9007199254740992 },
      { objectDigest: "bad" },
      { previousTransactionDigest: "bad" },
      { contentsBcsSha256: "c" },
    ])
      await expect(
        objects(() => owned({ ...b, ...change })),
      ).rejects.toBeInstanceOf(SnapshotReadError);
  });

  it("覆盖成立且服务明确无模板时，null Display 有效", async () => {
    const result = await objects(() => {
      const node = objectNode();
      (node.contents as any).display = null;
      return { address: { address: "0xb", objects: connection([node]) } };
    });
    expect(result.value[0].display).toBeNull();
  });

  it("第二页模板来自未来时，第一页不得作为部分资产交付", async () => {
    const f = snapshotFixture({
      read: (request) => {
        const second = request.variables.cursor !== null;
        const node = objectNode(second ? "0xc" : "0xa");
        if (second) node.contents.display.basis.sourceCheckpoint = 11;
        return {
          address: {
            address: "0xb",
            objects: connection([node], second ? null : "next", !second),
          },
        };
      },
    });
    const reader = await WalletAssetReader.open(f.session, { fetch: f.fetch });
    await expect(reader.ownedObjects("0xb")).rejects.toMatchObject({
      reason: "changed",
    });
    expect(
      f.requests.filter((r) => r.query.includes("WalletSnapshotRead")),
    ).toHaveLength(2);
    expect(
      f.requests.some((r) => r.query.includes("WalletSnapshotRevalidate")),
    ).toBe(false);
  });

  it("带历史能力的集合仍遵守分页预算，不能交付预算内的前缀", async () => {
    const f = snapshotFixture();
    const snapshot = await GraphQLSnapshot.open(f.session, dependencies, {
      fetch: f.fetch,
    });
    let page = 0;
    await expect(
      collectSnapshotPages(
        snapshot,
        async () => {
          await snapshot.read({ selection: "checkpoint { sequenceNumber }" });
          return {
            items: [String(++page)],
            hasNextPage: true,
            cursor: String(page),
          };
        },
        (value) => value,
        { maxPages: 2 },
      ),
    ).rejects.toBeInstanceOf(SnapshotPaginationError);
    expect(page).toBe(2);
    expect(
      f.requests.some((r) => r.query.includes("WalletSnapshotRevalidate")),
    ).toBe(false);
  });

  it.each(["caller", "session", "timeout"])(
    "完整资产 %s 中断后，迟到有效模板仍不得交付",
    async (mode) => {
      const controller = new AbortController();
      const f = snapshotFixture({ read: () => owned() });
      const fetch: typeof globalThis.fetch = async (input, init) => {
        if (String(init?.body).includes("WalletSnapshotRead")) {
          if (mode === "caller") controller.abort();
          if (mode === "session") f.session.close();
          if (mode === "timeout")
            await new Promise((resolve) => setTimeout(resolve, 120));
        }
        return f.fetch(input, init);
      };
      const reader = await WalletAssetReader.open(f.session, {
        fetch,
        timeoutMs: 100,
      });
      const pending = reader.ownedObjects("0xb", { signal: controller.signal });
      if (mode === "session")
        await expect(pending).rejects.toBeInstanceOf(StaleWalletSessionError);
      else await expect(pending).rejects.toThrow();
      expect(
        f.requests.some((r) => r.query.includes("WalletSnapshotRevalidate")),
      ).toBe(false);
    },
  );
});
