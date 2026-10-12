import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Transaction } from "rtd-typescript/transactions";
import { toBase64, toBase58 } from "rtd-typescript/utils";
import { executionFixture } from "../../../../../../tests/unit/rpc/execution-fixtures";
import {
  TransactionValidity,
  canApproveTransactionValidity,
} from "./TransactionValidity";
vi.mock("_src/ui/app/i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("./SummaryCard", () => ({
  SummaryCard: ({ children }: { children: React.ReactNode }) =>
    createElement("section", null, children),
}));
const render = (bytesBase64?: string) =>
  renderToStaticMarkup(createElement(TransactionValidity, { bytesBase64 }));
async function bytes(expiration: Parameters<Transaction["setExpiration"]>[0]) {
  const fixture = await executionFixture();
  const tx = Transaction.from(fixture.bytes);
  tx.setExpiration(expiration);
  return toBase64(await tx.build());
}
describe("最终bytes有效期展示", () => {
  it.each([undefined, "not-valid-bcs"])(
    "缺失或无效bytes不冒充无有效期 %#",
    (value) => {
      expect(canApproveTransactionValidity(value)).toBe(false);
      expect(render(value)).toContain("approval.gatherFailed");
      expect(render(value)).not.toContain("approval.noExpiration");
    },
  );
  it("显式None显示未设置有效期", async () => {
    expect(render(await bytes({ None: true }))).toContain(
      "approval.noExpiration",
    );
  });
  it("Epoch超过number安全范围仍精确展示最终bytes", async () => {
    const fixed = await bytes({ Epoch: "9007199254740993" });
    const mutable = Transaction.from(fixed);
    mutable.setExpiration({ Epoch: "4" });
    const html = render(fixed);
    expect(html).toContain("9007199254740993");
    expect(html).not.toContain("9007199254740992");
    expect(canApproveTransactionValidity(fixed)).toBe(true);
  });
  it("普通Epoch从固定bytes读取且可批准", async () => {
    const fixed = await bytes({ Epoch: "12" });
    expect(render(fixed)).toContain(">12<");
    expect(canApproveTransactionValidity(fixed)).toBe(true);
  });
  it("ValidDuring的epoch零值不会当作未设置", async () => {
    const html = render(
      await bytes({
        ValidDuring: {
          minEpoch: "0",
          maxEpoch: "1",
          minTimestamp: null,
          maxTimestamp: null,
          chain: toBase58(new Uint8Array(32).fill(7)),
          nonce: 0,
        },
      }),
    );
    expect(html).toContain("approval.minEpoch");
    expect(html).toContain(">0<");
    expect(html).not.toContain("approval.unbounded");
  });
  it("Validity展示委员会epoch及允许的提议者", async () => {
    const html = render(
      await bytes({
        Validity: {
          minEpoch: "1",
          maxEpoch: "2",
          minTimestamp: null,
          maxTimestamp: null,
          chain: toBase58(new Uint8Array(32).fill(7)),
          nonce: 0,
          allowedProposers: { epoch: "1", proposers: [0, 2] },
        },
      }),
    );
    expect(html).toContain("approval.proposerConstraint");
    expect(html).toContain("0, 2");
  });
  it("时间戳限制不伪造当前RTD支持或转换为日期", async () => {
    const html = render(
      await bytes({
        ValidDuring: {
          minEpoch: null,
          maxEpoch: null,
          minTimestamp: "1",
          maxTimestamp: "9007199254740993",
          chain: toBase58(new Uint8Array(32).fill(7)),
          nonce: 0,
        },
      }),
    );
    expect(html).toContain("approval.timeConstraintUnsupported");
    expect(html).not.toContain("Invalid Date");
  });
});
