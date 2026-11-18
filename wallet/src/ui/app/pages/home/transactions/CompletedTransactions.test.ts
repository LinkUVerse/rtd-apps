// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { act, createElement as h, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import type {
  WalletAccountHistory,
  WalletHistoryTransaction,
} from "rtd-apps-core/src/rpc/WalletRpcContext";
import type { WalletReadAdmissionView } from "rtd-apps-core/src/rpc/read-admission";
import { historyFixture } from "../../../../../../tests/unit/rpc/history-fixtures";
import { sender } from "../../../../../../tests/unit/rpc/execution-fixtures";
import { CompletedTransactions } from "./CompletedTransactions";

const m = vi.hoisted(() => ({
  history: undefined as WalletAccountHistory | undefined,
  cached: undefined as any,
  error: null as Error | null,
  address: "",
  state: "configured",
  isPending: false,
  isFetching: false,
  readAdmission: undefined as WalletReadAdmissionView | undefined,
}));
const p = vi.hoisted(() => ({
  rows: [] as WalletHistoryTransaction[],
  pending: new Set<string>(),
  confirmed: new Set<string>(),
}));
vi.mock("_hooks", () => ({
  useQueryTransactionsByAddress: () => ({
    data: m.history,
    cached: m.cached,
    error: m.error,
    isPending: m.isPending,
    isFetching: m.isFetching,
  }),
}));
vi.mock("_src/ui/app/hooks/usePendingActivity", () => ({
  usePendingActivity: () => ({
    pendingRows: p.rows,
    pendingDigests: p.pending,
    confirmedDigests: p.confirmed,
  }),
}));
vi.mock("_src/ui/app/hooks/useActiveAddress", () => ({
  useActiveAddress: () => m.address,
}));
vi.mock("rtd-apps-core/src/rpc/WalletRpcContext", () => ({
  useWalletRpc: () => ({
    state: m.state,
    message: "unconfigured",
    readAdmission: m.readAdmission,
  }),
}));
vi.mock("_app/i18n", () => ({
  useI18n: () => ({
    t: (key: string, vars?: Record<string, string>) =>
      key + (vars ? JSON.stringify(vars) : ""),
  }),
}));
vi.mock("_components/alert", () => ({
  default: ({ children }: { children: ReactNode }) =>
    h("div", { role: "alert" }, children),
}));
vi.mock("_components/loading", () => ({
  default: ({
    children,
    loading,
  }: {
    children: ReactNode;
    loading: boolean;
  }) => (loading ? h("div", { role: "status" }, "loading") : children),
}));
vi.mock("_components/error-boundary", () => ({
  ErrorBoundary: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("_components/transactions-card/NoActivityCard", () => ({
  NoActivityCard: ({ message }: { message: string }) => h("div", null, message),
}));
vi.mock("_app/shared/date-card", () => ({
  DateCard: () => h("time", null, "timestamp"),
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
beforeEach(() => {
  m.history = undefined;
  m.cached = undefined;
  m.error = null;
  m.address = sender;
  m.state = "configured";
  m.isPending = false;
  m.isFetching = false;
  m.readAdmission = undefined;
  p.rows = [];
  p.pending = new Set();
  p.confirmed = new Set();
});
function pendingRow(digest = "pending-1"): WalletHistoryTransaction {
  return {
    digest,
    checkpoint: 0,
    sender,
    origins: ["sender"],
    transaction: null,
    status: "SUCCESS",
    timestampMs: 1_700_000_000_000,
    kind: "ProgrammableTransaction",
    nativeTransaction: null,
    eventFacts: null,
    kioskTransfers: null,
  };
}
async function render(check: (node: HTMLElement) => void) {
  const node = document.createElement("div"),
    root = createRoot(node);
  try {
    await act(async () =>
      root.render(h(MemoryRouter, { children: h(CompletedTransactions) })),
    );
    check(node);
  } finally {
    await act(async () => root.unmount());
  }
}
it("展示经reader准入的窗口与覆盖限制，交易卡保留真实sender和摘要详情链接", async () => {
  const fixture = await historyFixture({ lowestAvailableCheckpoint: 10 });
  m.history = await fixture.reader.read(sender);
  await render((node) => {
    expect(node.textContent).toContain("activity.window");
    expect(node.textContent).toContain("activity.limited");
    expect(node.textContent).toContain("activity.sender");
    expect(node.textContent).toContain("receipt.transaction");
    expect(node.querySelector("a")?.getAttribute("href")).toBe(
      `/receipt?txdigest=${m.history!.transactions[0].digest}`,
    );
    expect(node.textContent).not.toContain("activity.windowEmpty");
  });
});
it("刷新失败不展示缓存中的历史记录或空窗口结论", async () => {
  const fixture = await historyFixture();
  m.history = await fixture.reader.read(sender);
  m.error = new Error("coverage unavailable");
  await render((node) => {
    expect(node.textContent).toBe("查询失败，请稍后重新查询");
    expect(node.textContent).not.toContain("coverage unavailable");
    expect(node.querySelector("a")).toBeNull();
  });
});
it("成功空集合只表示当前受支持窗口为空，继续显示覆盖限制", async () => {
  const fixture = await historyFixture({ lowestAvailableCheckpoint: 10 });
  const history = await fixture.reader.read(sender);
  m.history = { ...history, transactions: [] };
  await render((node) => {
    expect(node.textContent).toContain("activity.windowEmpty");
    expect(node.textContent).toContain("activity.limited");
    expect(node.textContent).toContain("activity.window");
    expect(node.querySelector("a")).toBeNull();
  });
});
it.each(["checking", "observed", "unavailable"] as const)(
  "history被%s准入阻断时说明原因，不无限loading或展示旧历史",
  async (phase) => {
    const fixture = await historyFixture();
    m.history = await fixture.reader.read(sender);
    m.isPending = true;
    m.readAdmission = {
      phase,
      blocked: ["history"],
      keys: {} as WalletReadAdmissionView["keys"],
    };
    await render((node) => {
      expect(node.querySelector('[role="alert"]')?.textContent).toBe(
        "activity.admissionBlocked",
      );
      expect(node.textContent).not.toContain("loading");
      expect(node.textContent).not.toContain("activity.windowEmpty");
      expect(node.textContent).not.toContain("activity.window");
      expect(node.querySelector("a")).toBeNull();
    });
  },
);
it("其他读取被阻断不影响已准入历史窗口", async () => {
  const fixture = await historyFixture({ lowestAvailableCheckpoint: 10 });
  m.history = await fixture.reader.read(sender);
  m.readAdmission = {
    phase: "observed",
    blocked: ["balances"],
    keys: {} as WalletReadAdmissionView["keys"],
  };
  await render((node) => {
    expect(node.textContent).toContain("activity.window");
    expect(node.textContent).toContain("activity.limited");
    expect(node.textContent).not.toContain("activity.admissionBlocked");
  });
});
it("首次读取进行中时先展示上次缓存的活动，并在列表上方提示正在刷新", async () => {
  const fixture = await historyFixture();
  const h = await fixture.reader.read(sender);
  m.isPending = true;
  m.cached = {
    savedAt: 1_700_000_000_000,
    checkpointLo: h.checkpointLo,
    checkpointHi: h.checkpointHi,
    coverage: h.coverage,
    transactions: h.transactions,
  };
  await render((node) => {
    expect(node.textContent).not.toContain("loading");
    expect(
      node.querySelector('[data-testid="activity-cached-banner"]')?.textContent,
    ).toContain("activity.showingCached");
    expect(node.querySelector("a")?.getAttribute("href")).toBe(
      `/receipt?txdigest=${h.transactions[0].digest}`,
    );
    expect(node.querySelector('[data-testid="load-more-activity"]')).toBeNull();
  });
});
it("经验证的新结果到达后替换缓存并去掉提示", async () => {
  const fixture = await historyFixture();
  const h = await fixture.reader.read(sender);
  m.history = h;
  m.cached = {
    savedAt: 1,
    checkpointLo: 0,
    checkpointHi: 1,
    coverage: h.coverage,
    transactions: [],
  };
  await render((node) => {
    expect(
      node.querySelector('[data-testid="activity-cached-banner"]'),
    ).toBeNull();
    expect(node.querySelector("a")).not.toBeNull();
  });
});
it("读取失败时不展示缓存的旧活动", async () => {
  const fixture = await historyFixture();
  const h = await fixture.reader.read(sender);
  m.error = new Error("unavailable");
  m.cached = {
    savedAt: 1,
    checkpointLo: h.checkpointLo,
    checkpointHi: h.checkpointHi,
    coverage: h.coverage,
    transactions: h.transactions,
  };
  await render((node) => {
    expect(node.querySelector("a")).toBeNull();
    expect(
      node.querySelector('[data-testid="activity-cached-banner"]'),
    ).toBeNull();
  });
});
it("本地已验证成功的交易在检查点返回前立即展示为已完成", async () => {
  m.isPending = true;
  p.rows = [pendingRow()];
  p.confirmed = new Set(["pending-1"]);
  await render((node) => {
    expect(node.textContent).not.toContain("loading");
    expect(node.textContent).toContain("activity.complete");
    expect(
      node.querySelector('[data-testid="activity-complete-tag"]'),
    ).not.toBeNull();
    expect(node.querySelector("a")?.getAttribute("href")).toBe(
      "/receipt?txdigest=pending-1",
    );
    expect(node.textContent).not.toContain("activity.windowEmpty");
  });
});
it("检查点返回同一交易后本地确认中标签改为已完成", async () => {
  const fixture = await historyFixture();
  const h = await fixture.reader.read(sender);
  m.history = h;
  p.confirmed = new Set([h.transactions[0].digest]);
  await render((node) => {
    expect(
      node.querySelector('[data-testid="activity-confirming-tag"]'),
    ).toBeNull();
    expect(
      node.querySelector('[data-testid="activity-complete-tag"]')?.textContent,
    ).toContain("activity.complete");
    expect(node.querySelector("a")).not.toBeNull();
  });
});
it("刷新时按钮文案和检查点布局不变，仅图标旋转并保留读屏状态", async () => {
  const fixture = await historyFixture();
  m.history = await fixture.reader.read(sender);
  m.isFetching = true;
  await render((node) => {
    const button = node.querySelector('[data-testid="refresh-activity"]')!;
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.textContent).toBe("activity.refresh");
    expect(button.textContent).not.toContain("activity.refreshing");
    expect(button.className).toContain("bg-rtd/5");
    expect(button.className).toContain("border-rtd/40");
    expect(node.querySelector(".sr-only")?.textContent).toBe(
      "activity.refreshing",
    );
    expect(node.querySelector(".whitespace-nowrap")?.textContent).toContain(
      "activity.window",
    );
  });
});
