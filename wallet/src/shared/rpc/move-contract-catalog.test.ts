// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { GrpcTypes } from "rtd-typescript/grpc";
import { normalizeRtdAddress } from "rtd-typescript/utils";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { auditWalletMoveCatalog } from "./move-contract-catalog";
import { WalletMoveContractError } from "./move-contract-shape";
import { profileFixture } from "./profile-fixture";
import { validateNetworkProfile } from "./profile";
import { walletMoveContracts } from "./wallet-move-contracts";

const proof = JSON.parse(
  readFileSync(
    resolve(
      process.cwd(),
      "migrationToGRpcOrGraphQLDoc/evidence/official/20261005-move-contract-catalog/manifest.json",
    ),
    "utf8",
  ),
) as {
  localSources: { file: string; sha256: string }[];
  officialSources: { file: string; sha256: string }[];
  independentAuditModules: Record<string, string>;
};
function fixture() {
  const p = profileFixture();
  p.packages.originByte = { discoveryPackage: "0x7", executionPackage: "0x7" };
  return walletMoveContracts(validateNetworkProfile(p));
}
const groups = fixture();
const definitions = [
  ...new Map(
    Object.values(groups)
      .flatMap((g) =>
        g.state === "configured" ? g.contracts.flatMap((c) => c.datatypes) : [],
      )
      .filter((d) => {
        const parts = d.typeName!.split("::");
        return (
          proof.independentAuditModules[
            `0x${BigInt(parts[0]).toString(16)}::${d.module}`
          ] !== undefined
        );
      })
      .map((d) => [d.typeName!, d]),
  ).values(),
];
const aliases: Record<string, number> = { copy: 1, drop: 2, store: 3, key: 4 };
const abilities = (value: string) =>
  value.trim()
    ? value
        .split(/[+,]/)
        .map((s) => aliases[s.trim()])
        .sort()
    : [];
function source(path: string) {
  const bytes = readFileSync(path),
    row =
      proof.localSources.find((r) => r.file === path) ??
      proof.officialSources.find((r) => path.endsWith(r.file));
  expect(row).toBeDefined();
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(row!.sha256);
  return bytes
    .toString()
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
}
function split(value: string) {
  let depth = 0,
    start = 0;
  const parts = [];
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "<") depth++;
    if (value[i] === ">") depth--;
    if (value[i] === "," && depth === 0) {
      parts.push(value.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(value.slice(start));
  return parts.map((p) => p.trim()).filter(Boolean);
}
function pretty(
  body: GrpcTypes.OpenSignatureBody,
  parameters: string[],
): string {
  if (body.type === GrpcTypes.OpenSignatureBody_Type.TYPE_PARAMETER)
    return parameters[body.typeParameter!];
  if (body.type === GrpcTypes.OpenSignatureBody_Type.DATATYPE) {
    const name = body.typeName!.split("::").at(-1)!;
    return (
      name +
      (body.typeParameterInstantiation.length
        ? `<${body.typeParameterInstantiation.map((a) => pretty(a, parameters)).join(",")}>`
        : "")
    );
  }
  if (body.type === GrpcTypes.OpenSignatureBody_Type.VECTOR)
    return `vector<${pretty(body.typeParameterInstantiation[0], parameters)}>`;
  return GrpcTypes.OpenSignatureBody_Type[body.type!].toLowerCase();
}
const compact = (s: string) =>
  s.replace(/\s/g, "").replace(/(?:rtd|rtd_system|std)::\w+::/g, "");

describe("独立固定Move原文审核，而非运行时descriptor生成期望", () => {
  it.each(definitions.map((d) => [d.typeName!, d] as const))(
    "逐字段／泛型／abilities来源一致：%s",
    (_, d) => {
      const module = `0x${BigInt(d.typeName!.split("::")[0]).toString(16)}::${d.module}`;
      const text = source(proof.independentAuditModules[module]);
      const match = text.match(
        new RegExp(
          `(?:public\\s+)?struct\\s+${d.name}\\b([^{};]*)(?:\\{([^}]*)\\}|;)`,
        ),
      );
      expect(match).toBeTruthy();
      const head = match![1],
        fieldText = match![2] ?? "";
      const generics = split(head.match(/<([^>]*)>/)?.[1] ?? "").map((p) => {
        const m = p.match(/^(phantom\s+)?(\w+)(?:\s*:(.*))?$/)!;
        return {
          name: m[2],
          isPhantom: !!m[1],
          constraints: abilities(m[3] ?? ""),
        };
      });
      expect(d.typeParameters).toEqual(
        generics.map(({ isPhantom, constraints }) => ({
          isPhantom,
          constraints,
        })),
      );
      expect([...d.abilities].sort()).toEqual(
        abilities(head.split(/\bhas\b/)[1]),
      );
      const fields = split(fieldText).map((field) => {
        const m = field.match(/^(\w+)\s*:\s*([\s\S]+)$/)!;
        return [m[1], compact(m[2])];
      });
      const expected = fields.length ? fields : [["dummy_field", "bool"]];
      expect(
        d.fields.map((f) => [
          f.name,
          pretty(
            f.type!,
            generics.map((p) => p.name),
          ),
        ]),
      ).toEqual(expected);
      expect(d.fields.map((f) => f.position)).toEqual(
        expected.map((_, i) => i),
      );
    },
  );
  it("Url明确ASCII包装，ValidatorMetadata取实际Move名而非扁平BCS标签", () => {
    const support = groups.readerSupport,
      staking = groups.staking;
    if (support.state !== "configured" || staking.state !== "configured")
      throw new Error();
    expect(
      support.contracts[0].datatypes.find((d) => d.name === "Url")!.fields[0]
        .type!.typeName,
    ).toMatch(/::ascii::String$/);
    const metadata = staking.contracts[0].datatypes.find(
      (d) => d.name === "ValidatorMetadata",
    )!;
    expect(metadata.fields[4].name).toBe("proof_of_possession");
    expect(metadata.fields.at(-1)!.type!.typeName).toMatch(/::bag::Bag$/);
    expect(metadata.fields[7].type!.typeName).toMatch(/::url::Url$/);
  });
  it("当前RTD200与最新SuiNS235明确不同，不从同ABI推导相同域名语法", () => {
    const rust = proof.localSources.find((r) =>
      r.file.endsWith("rtd-name-service/src/lib.rs"),
    )!;
    expect(source(rust.file)).toMatch(/MAX_DOMAIN_LENGTH:\s*usize\s*=\s*200/);
    expect(source(proof.independentAuditModules["0x4::domain"])).toMatch(
      /MAX_DOMAIN_LENGTH:\s*u64\s*=\s*235/,
    );
  });
  it.each(["redeem_funds", "request_add_stake", "request_withdraw_stake"])(
    "显式调用的完整函数取源码：%s",
    (name) => {
      const group = name === "redeem_funds" ? groups.coins : groups.staking;
      if (group.state !== "configured") throw new Error();
      const c = group.contracts[0],
        fn = c.functions.find((f) => f.descriptor.name === name)!;
      const key = `0x${BigInt(c.packageId).toString(16)}::${fn.module}`,
        text = source(proof.independentAuditModules[key]);
      const m = text.match(
        new RegExp(
          `public\\s+(entry\\s+)?fun\\s+${name}(?:<([^>]*)>)?\\s*\\(([^)]*)\\)\\s*(?::\\s*([^{}]+))?\\{`,
        ),
      )!;
      expect(m).toBeTruthy();
      expect(fn.descriptor.visibility).toBe(
        GrpcTypes.FunctionDescriptor_Visibility.PUBLIC,
      );
      expect(fn.descriptor.isEntry).toBe(!!m[1]);
      const typeParameters = split(m[2] ?? "");
      expect(fn.descriptor.typeParameters).toEqual(
        typeParameters.map(() => ({ constraints: [] })),
      );
      const params = split(m[3]).map((p) =>
        compact(p.slice(p.indexOf(":") + 1)),
      );
      const signature = (s: GrpcTypes.OpenSignature) =>
        `${s.reference === GrpcTypes.OpenSignature_Reference.MUTABLE ? "&mut" : s.reference === GrpcTypes.OpenSignature_Reference.IMMUTABLE ? "&" : ""}${pretty(s.body!, typeParameters)}`;
      expect(fn.descriptor.parameters.map(signature)).toEqual(params);
      expect(fn.descriptor.returns.map(signature)).toEqual(
        m[4] ? [compact(m[4])] : [],
      );
    },
  );
});

describe("钱包内置合同目录闭包", () => {
  it("整个产品源码的显式MoveCall与审核函数一一对应，新增调用不能遗漏目录", () => {
    const known = new Set(
      Object.values(groups).flatMap((g) =>
        g.state === "configured"
          ? g.contracts.flatMap((c) =>
              c.functions.map(
                (f) => `${c.packageId}::${f.module}::${f.descriptor.name}`,
              ),
            )
          : [],
      ),
    );
    const calls = new Set<string>();
    const configured: Record<string, string> = {
      "${rpc.packages.kiosk}": "0x2",
      "${rpc.packages.personalKiosk}": "0x3",
      "${rpc.packages.originByte.executionPackage}": "0x7",
    };
    const walk = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) {
          walk(path);
          continue;
        }
        if (
          !/\.tsx?$/.test(entry.name) ||
          /\.(test|spec)\.tsx?$/.test(entry.name)
        )
          continue;
        const file = ts.createSourceFile(
          path,
          readFileSync(path, "utf8"),
          ts.ScriptTarget.Latest,
          true,
          entry.name.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
        );
        const visit = (node: ts.Node) => {
          if (
            ts.isCallExpression(node) &&
            ts.isPropertyAccessExpression(node.expression) &&
            node.expression.name.text === "moveCall"
          ) {
            const input = node.arguments[0];
            expect(input && ts.isObjectLiteralExpression(input), path).toBe(
              true,
            );
            if (!input || !ts.isObjectLiteralExpression(input))
              throw new Error("显式MoveCall需要可审核target");
            const target = input.properties.find(
              (p) =>
                ts.isPropertyAssignment(p) &&
                (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) &&
                p.name.text === "target",
            );
            if (!target || !ts.isPropertyAssignment(target))
              throw new Error("未审核的MoveCall target");
            const value = target.initializer;
            let text: string;
            if (
              ts.isStringLiteral(value) ||
              ts.isNoSubstitutionTemplateLiteral(value)
            )
              text = value.text;
            else if (ts.isTemplateExpression(value))
              text = value.getText(file).slice(1, -1);
            else throw new Error("动态target必须先纳入审核目录");
            const parts = text.split("::");
            const id = parts[0].startsWith("${")
              ? configured[parts[0]]
              : parts[0];
            expect(id, path).toBeDefined();
            expect(parts, path).toHaveLength(3);
            const selector = `${normalizeRtdAddress(id)}::${parts[1]}::${parts[2]}`;
            expect(known.has(selector), path).toBe(true);
            calls.add(selector);
          }
          ts.forEachChild(node, visit);
        };
        visit(file);
      }
    };
    walk(resolve(process.cwd(), "src"));
    expect([...calls].sort()).toEqual([...known].sort());
  });
  it("所有类型引用有已审核声明，固定调用和版本均覆盖而用户payload仍opaque", () => {
    expect(auditWalletMoveCatalog(groups)).toEqual({
      datatypes: 50,
      functions: 8,
      referencedDatatypes: expect.any(Number),
      customMoveTypes: "opaque",
      protocolEnvelopes: "sdk-pinned",
    });
    const g = groups.staking;
    if (g.state !== "configured") throw new Error();
    expect(
      g.contracts[0].datatypes
        .filter((d) => d.name?.includes("SystemStateInner"))
        .map((d) => d.name),
    ).toEqual(["RtdSystemStateInner", "RtdSystemStateInnerV2"]);
  });
  it("未配置可选包也闭合当前原生reader，不能推导可选部署存在", () => {
    const p = profileFixture();
    p.packages = {};
    const g = walletMoveContracts(validateNetworkProfile(p));
    expect(auditWalletMoveCatalog(g)).toMatchObject({
      datatypes: 36,
      functions: 3,
    });
    expect(g.names.state).toBe("unconfigured");
    expect(g.originByteExecution.state).toBe("unconfigured");
  });
  it("名称未知嵌套类型不能从ABI同名或字段数猜过", () => {
    const g = structuredClone(fixture());
    if (g.names.state !== "configured") throw new Error();
    g.names.contracts[0].datatypes[1].fields[3].type!.typeName =
      "0xdead::name::Unknown";
    expect(() => auditWalletMoveCatalog(g)).toThrow(WalletMoveContractError);
  });
  it("同名不同模板必须拒绝，不能保留第一个掩盖来源冲突", () => {
    const g = structuredClone(fixture());
    if (g.kiosk.state !== "configured") throw new Error();
    g.kiosk.contracts[0].datatypes[0].abilities.push(GrpcTypes.Ability.DROP);
    expect(() => auditWalletMoveCatalog(g)).toThrow(WalletMoveContractError);
  });
  it("非法generic索引与递归循环均拒绝", () => {
    const g = structuredClone(fixture());
    if (g.coins.state !== "configured") throw new Error();
    const signature = g.coins.contracts[0].datatypes[0].fields[1].type!;
    signature.typeParameterInstantiation[0].typeParameter = 2;
    expect(() => auditWalletMoveCatalog(g)).toThrow();
    signature.typeParameterInstantiation = [signature];
    expect(() => auditWalletMoveCatalog(g)).toThrow(
      expect.objectContaining({ reason: "budget" }),
    );
  });
});
