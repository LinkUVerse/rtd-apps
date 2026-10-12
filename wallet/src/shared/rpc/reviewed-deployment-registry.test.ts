// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { beforeAll, describe, expect, it, vi } from "vitest";
import { reviewedDeploymentFixture } from "../../../tests/unit/rpc/reviewed-deployment-fixture";
import { networkCapabilitiesFixture } from "./network-capabilities-fixture";
import { selectReviewedDeployment } from "./reviewed-deployment-registry";
import { probeNetworkCapabilities } from "./network-capabilities";
import {
  networkBindingKey,
  validateNetworkProfile,
  type WalletNetworkProfile,
} from "./profile";
import { deploymentSha256 } from "./deployment-contract";

describe("受控发布registry精确选择", () => {
  let f: Awaited<ReturnType<typeof networkCapabilitiesFixture>>;
  let release: Awaited<ReturnType<typeof reviewedDeploymentFixture>>;
  const registry = (entries: unknown[]) =>
    JSON.stringify({ schemaVersion: 1, entries });
  beforeAll(async () => {
    f = await networkCapabilitiesFixture();
    release = await reviewedDeploymentFixture(f.profile);
  });
  it.each([undefined, ""])("未提供注册表保持unreviewed：%s", async (value) => {
    expect(await selectReviewedDeployment(f.profile, value)).toEqual({
      state: "unreviewed",
      reason: "registry-missing",
    });
  });
  it("空表／只有其它绑定不回退，完整条目选择不读取网络", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    try {
      expect(await selectReviewedDeployment(f.profile, registry([]))).toEqual({
        state: "unreviewed",
        reason: "binding-missing",
      });
      expect(
        await selectReviewedDeployment(
          f.profile,
          registry([{ ...release.entry, profileBindingKey: "other" }]),
        ),
      ).toEqual({ state: "unreviewed", reason: "binding-missing" });
      const selected = await selectReviewedDeployment(
        f.profile,
        registry([
          { ...release.entry, profileBindingKey: "other" },
          release.entry,
        ]),
      );
      expect(selected.state).toBe("reviewed");
      expect(spy).not.toHaveBeenCalled();
      if (selected.state !== "reviewed") throw new Error("fixture");
      expect(selected.authority).toBe("caller-pinned-release-config");
      expect(Object.isFrozen(selected)).toBe(true);
      expect(Object.isFrozen(selected.input)).toBe(true);
      expect(Object.isFrozen(selected.declaration.packages)).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });
  it.each(["revision", "generation", "endpoint", "packages"] as const)(
    "网络绑定任一受控字段不同不借用旧条目：%s",
    async (mode) => {
      const raw: WalletNetworkProfile = structuredClone(f.profile);
      if (mode === "revision") raw.revision++;
      else if (mode === "generation") raw.generation = "another-generation";
      else if (mode === "endpoint")
        raw.endpoints.fullnodeGrpcWeb = "https://another.example.invalid/grpc";
      else delete raw.packages.originByte;
      const p = validateNetworkProfile(raw);
      expect(networkBindingKey(p) === f.session.bindingKey).toBe(false);
      expect(await selectReviewedDeployment(p, release.registry)).toEqual({
        state: "unreviewed",
        reason: "binding-missing",
      });
    },
  );
  it.each([
    "{",
    "null",
    "[]",
    "{}",
    '{"schemaVersion":2,"entries":[]}',
    '{"schemaVersion":1,"entries":null}',
    '{"schemaVersion":1,"entries":[],"extra":true}',
    '{"schemaVersion":1,"schemaVersion":1,"entries":[]}',
    '{"schemaVersion":1.0,"entries":[]}',
    '{ "schemaVersion":1,"entries":[]}',
    '{"schemaVersion":1,"entries":[]}\n',
  ])("注册表格式不合法明确拒绝（case %s）", async (value) => {
    expect(await selectReviewedDeployment(f.profile, value)).toEqual({
      state: "rejected",
      reason: "format",
    });
  });
  it.each([
    "missing",
    "extra",
    "empty-binding",
    "wrong-json-type",
    "wrong-pin-type",
    "short-pin",
    "uppercase-pin",
  ] as const)("每个entry精确合同拒绝：%s", async (mode) => {
    const entry: Record<string, unknown> = { ...release.entry };
    if (mode === "missing") delete entry.json;
    else if (mode === "extra") entry.unknown = true;
    else if (mode === "empty-binding") entry.profileBindingKey = "";
    else if (mode === "wrong-json-type") entry.json = {};
    else if (mode === "wrong-pin-type") entry.trustedSha256 = 1;
    else if (mode === "short-pin") entry.trustedSha256 = "f".repeat(63);
    else entry.trustedSha256 = "A".repeat(64);
    expect(
      await selectReviewedDeployment(f.profile, registry([entry])),
    ).toEqual({ state: "rejected", reason: "format" });
  });
  it("当前或其它绑定重复均拒绝，未选择条目格式同样检查", async () => {
    for (const entries of [
      [release.entry, release.entry],
      [
        { ...release.entry, profileBindingKey: "other" },
        { ...release.entry, profileBindingKey: "other" },
        release.entry,
      ],
    ])
      expect(
        await selectReviewedDeployment(f.profile, registry(entries)),
      ).toEqual({ state: "rejected", reason: "duplicate-binding" });
    expect(
      await selectReviewedDeployment(
        f.profile,
        registry([{ profileBindingKey: "other" }, release.entry]),
      ),
    ).toEqual({ state: "rejected", reason: "format" });
  });
  it.each(["root", "entries", "key", "declaration-bytes"] as const)(
    "有限UTF8与entry预算拒绝：%s",
    async (mode) => {
      let json: string;
      if (mode === "root") json = " ".repeat(1024 * 1024 + 1);
      else if (mode === "entries")
        json = registry(
          Array.from({ length: 17 }, (_, i) => ({
            ...release.entry,
            profileBindingKey: `other-${i}`,
          })),
        );
      else if (mode === "key")
        json = registry([
          { ...release.entry, profileBindingKey: "文".repeat(5462) },
        ]);
      else json = registry([{ ...release.entry, json: "文".repeat(21846) }]);
      expect(await selectReviewedDeployment(f.profile, json)).toEqual({
        state: "rejected",
        reason: "budget",
      });
    },
  );
  it("16条、16KiB key、64KiB未选声明在上限可用且不验证为当前部署", async () => {
    const entries = Array.from({ length: 15 }, (_, i) => ({
      ...release.entry,
      profileBindingKey: `other-${i}`,
      json: "{}",
    }));
    entries[0] = {
      ...entries[0],
      profileBindingKey: "k".repeat(16384),
      json: "x".repeat(65536),
    };
    expect(
      (
        await selectReviewedDeployment(
          f.profile,
          registry([...entries, release.entry]),
        )
      ).state,
    ).toBe("reviewed");
  });
  it("只消费外部已有pin，不因声明改变重新生成可信SHA", async () => {
    expect(
      await selectReviewedDeployment(
        f.profile,
        registry([{ ...release.entry, trustedSha256: "0".repeat(64) }]),
      ),
    ).toEqual({ state: "rejected", reason: "trust" });
    expect(
      await selectReviewedDeployment(
        f.profile,
        registry([{ ...release.entry, json: release.entry.json + " " }]),
      ),
    ).toEqual({ state: "rejected", reason: "trust" });
  });
  it.each(["binding", "declaration", "malformed-json"] as const)(
    "pin吻合也必须验证声明自身：%s",
    async (mode) => {
      const declaration = structuredClone(release.declaration);
      if (mode === "binding") declaration.profileBindingKey = "foreign";
      else declaration.packages = [];
      const json =
        mode === "malformed-json" ? "{" : JSON.stringify(declaration);
      const entry = {
        ...release.entry,
        json,
        trustedSha256: await deploymentSha256(new TextEncoder().encode(json)),
      };
      expect(
        await selectReviewedDeployment(f.profile, registry([entry])),
      ).toEqual({
        state: "rejected",
        reason: mode === "binding" ? "binding" : "declaration",
      });
    },
  );
  it("名称锚必需且引用受审核配置，固定错误原因不携带原文", async () => {
    const g = await networkCapabilitiesFixture({
      profile: (p) => {
        p.packages.name = {
          packageId: "0x4",
          forwardRegistry: "0x5",
          reverseRegistry: "0x6",
        };
      },
    });
    const names = await reviewedDeploymentFixture(g.profile);
    expect(
      (await selectReviewedDeployment(g.profile, names.registry)).state,
    ).toBe("reviewed");
    names.declaration.nameRegistry!.registryFieldId =
      names.declaration.nameRegistry!.rootId;
    const result = await selectReviewedDeployment(
      g.profile,
      registry([
        { profileBindingKey: g.session.bindingKey, ...(await names.input()) },
      ]),
    );
    expect(result).toEqual({ state: "rejected", reason: "registry" });
    expect(Object.keys(result)).toEqual(["state", "reason"]);
    g.session.close();
  });
  it("选择的合成发布pin进入真实四族SDK探测，有限部署匹配仍不宣称网络ready", async () => {
    const selected = await selectReviewedDeployment(
      f.profile,
      release.registry,
    );
    if (selected.state !== "reviewed") throw new Error("fixture");
    const actual = await probeNetworkCapabilities(f.session, {
      fetch: f.fetch,
      declaration: selected.input,
    });
    expect(actual).toMatchObject({
      deployment: {
        state: "observed",
        value: {
          state: "reviewed-deployment-matched",
          declaration: { state: "release-pin-matched" },
          registry: { state: "unconfigured" },
        },
      },
      readiness: "not-assessed",
      serviceDeployment: "not-verified",
      execution: "not-probed",
    });
    expect(
      f.requests.every(
        (r) =>
          !r.method?.includes("Execute") && !r.method?.includes("Simulate"),
      ),
    ).toBe(true);
  });
});
