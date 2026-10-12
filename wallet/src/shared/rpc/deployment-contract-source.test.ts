// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GrpcTypes } from "rtd-typescript/grpc";
import { normalizeRtdAddress } from "rtd-typescript/utils";
import { auditWalletMoveCatalog } from "./move-contract-catalog";
import {
  nameRegistryMoveContract,
  nameRegistryFieldId,
} from "./deployment-contract";
import { validateNetworkProfile } from "./profile";
import { profileFixture } from "./profile-fixture";
import { walletMoveContracts } from "./wallet-move-contracts";

describe("Registry合同的独立固定来源", () => {
  const root = resolve("migrationToGRpcOrGraphQLDoc"),
    manifest: {
      official: { path: string; sha256: string }[];
      local: { path: string; sha256: string }[];
    } = JSON.parse(
      readFileSync(
        resolve(
          root,
          "evidence/official/20261005-deployment-contract/manifest.json",
        ),
        "utf8",
      ),
    );
  it.each(manifest.official)(
    "官方原文sha一致：$path",
    (row: { path: string; sha256: string }) => {
      expect(
        createHash("sha256")
          .update(readFileSync(resolve(root, row.path)))
          .digest("hex"),
      ).toBe(row.sha256);
    },
  );
  it.each(manifest.local)(
    "当前RTD原文sha一致：$path",
    (row: { path: string; sha256: string }) => {
      expect(
        createHash("sha256").update(readFileSync(row.path)).digest("hex"),
      ).toBe(row.sha256);
    },
  );
  it("官方Registry双Table与当前Rust嵌入handle相符，不要求GetObject Table", () => {
    const move = readFileSync(
      resolve(
        root,
        "evidence/official/20261005-deployment-contract/registry.move",
      ),
      "utf8",
    );
    expect(move).toMatch(
      /struct Registry has store\s*\{[\s\S]*?registry: Table<Domain, NameRecord>,[\s\S]*?reverse_registry: Table<address, Domain>,/,
    );
    const c = nameRegistryMoveContract("0x4"),
      registry = c.datatypes[0];
    expect(registry.abilities).toEqual([GrpcTypes.Ability.STORE]);
    expect(registry.fields.map((f) => [f.name, f.position])).toEqual([
      ["registry", 0],
      ["reverse_registry", 1],
    ]);
    expect(registry.fields[1].type!.typeParameterInstantiation[0].type).toBe(
      GrpcTypes.OpenSignatureBody_Type.ADDRESS,
    );
    expect(
      registry.fields[0].type!.typeParameterInstantiation.map((t) =>
        t.typeName?.split("::").slice(1).join("::"),
      ),
    ).toEqual(["domain::Domain", "name_record::NameRecord"]);
  });
  it("RegistryKey phantom与compiler LdFalse保证确定性key为0，type不默认mainnet", () => {
    const move = readFileSync(
      resolve(
        root,
        "evidence/official/20261005-deployment-contract/suins.move",
      ),
      "utf8",
    );
    expect(move).toMatch(
      /struct RegistryKey<phantom Config> has copy, drop, store \{\}/,
    );
    const compilerSource = manifest.local.find((r) =>
      r.path.endsWith("/translate.rs"),
    );
    if (!compilerSource)
      throw new Error("compiler source missing from audited manifest");
    const compiler = readFileSync(compilerSource.path, "utf8");
    expect(compiler).toMatch(
      /E::Pack\(s, tys, field_args\) if field_args.is_empty\(\)[\s\S]*?B::LdFalse/,
    );
    const key = nameRegistryMoveContract("0x4").datatypes[1];
    expect(key.typeParameters).toEqual([{ constraints: [], isPhantom: true }]);
    expect(key.fields[0].name).toBe("dummy_field");
    expect(nameRegistryFieldId("0x4", normalizeRtdAddress("0x8"))).not.toBe(
      nameRegistryFieldId("0x9", normalizeRtdAddress("0x8")),
    );
  });
  it("新锚contract追加后所有引用仍闭合，没有未审核类型", () => {
    const profile = validateNetworkProfile(profileFixture()),
      groups = walletMoveContracts(profile),
      names = groups.names;
    if (names.state !== "configured") throw new Error();
    const combined = {
      ...groups,
      names: {
        ...names,
        contracts: [
          ...names.contracts,
          nameRegistryMoveContract(profile.packages.name!.packageId),
        ],
      },
    };
    expect(auditWalletMoveCatalog(combined).datatypes).toBe(47);
  });
});
