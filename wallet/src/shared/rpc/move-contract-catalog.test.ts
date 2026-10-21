// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
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

function fixture() {
  const p = profileFixture();
  p.packages.originByte = { discoveryPackage: "0x7", executionPackage: "0x7" };
  return walletMoveContracts(validateNetworkProfile(p));
}
const groups = fixture();
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
