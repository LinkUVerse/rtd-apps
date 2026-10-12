import { act, createElement as h, StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
import TransferCoinPage from "./index";
const m = vi.hoisted(() => ({
  recover: vi.fn(),
  execute: vi.fn(),
  revalidate: vi.fn(),
  toastError: vi.fn(),
  submit: undefined as undefined | ((value: any) => void),
  rpc: { state: "configured", bindingKey: "binding", readSessionKey: "first" },
  account: { id: "account", address: "0x1", type: "imported" },
}));
vi.mock("_src/ui/app/hooks/useActiveAccount", () => ({
  useActiveAccount: () => m.account,
}));
vi.mock("_src/ui/app/hooks/useUnlockedGuard", () => ({
  useUnlockedGuard: () => false,
}));
vi.mock("_src/ui/app/hooks/useBackgroundClient", () => {
  const background = { recoverPreparedTransaction: m.recover, executePreparedTransaction: m.execute };
  return { useBackgroundClient: () => background };
});
vi.mock("rtd-apps-core/src/rpc/WalletRpcContext", () => ({
  useWalletRpc: () => m.rpc,
}));
vi.mock("rtd-apps-core/src/rpc/coin", () => ({
  useCoinMetadata: () => ({ data: { decimals: 9 } }),
}));
vi.mock("_app/i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("_components/overlay", () => ({
  default: ({ children }: { children: ReactNode }) =>
    h("section", null, children),
}));
vi.mock("_components/active-coins-card", () => ({
  ActiveCoinsCard: () => null,
}));
vi.mock("_components/alert", () => ({
  default: ({ children }: { children: ReactNode }) =>
    h("div", { role: "alert" }, children),
}));
vi.mock("./SendTokenForm", () => ({
  SendTokenForm: ({ onSubmit }: any) => {
    m.submit = onSubmit;
    return h("div", null, "coin-form");
  },
}));
vi.mock("./PreviewTransfer", () => ({ PreviewTransfer: () => null }));
vi.mock("_src/shared/rpc/coin-transfer-preparation", () => ({
  revalidateCoinTransfer: m.revalidate,
}));
vi.mock("react-hot-toast", () => ({ toast: { error: m.toastError } }));
vi.mock("@sentry/react", () => ({
  startSpan: (_options: unknown, callback: (span: any) => unknown) =>
    callback({ setAttributes: vi.fn() }),
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
beforeEach(() => {
  m.recover.mockReset();
  m.execute.mockReset();
  m.revalidate.mockReset();
  m.toastError.mockReset();
  m.rpc.readSessionKey = "first";
});
it("StrictMode只共享同会话的只读恢复，避免重复请求争抢后台锁", async () => {
  let resolve!: (value: null) => void;
  m.recover.mockReturnValue(
    new Promise<null>((done) => {
      resolve = done;
    }),
  );
  const node = document.createElement("div"),
    root = createRoot(node),
    client = new QueryClient();
  try {
    await act(async () =>
      root.render(
        h(
          StrictMode,
          null,
          h(
            QueryClientProvider,
            { client },
            h(
              MemoryRouter,
              { initialEntries: ["/send?type=0x2::rtd::RTD"] },
              h(TransferCoinPage),
            ),
          ),
        ),
      ),
    );
    expect(m.recover).toHaveBeenCalledTimes(1);
    await act(async () => resolve(null));
    expect(node.textContent).toContain("coin-form");
    expect(node.querySelector("[role=alert]")).toBeNull();
  } finally {
    await act(async () => root.unmount());
    client.clear();
  }
});
it("会话切换重新恢复，旧会话失败不会污染新表单", async () => {
  let rejectOld!: (reason: Error) => void, resolveNew!: (value: null) => void;
  m.recover
    .mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectOld = reject;
      }),
    )
    .mockReturnValueOnce(
      new Promise<null>((resolve) => {
        resolveNew = resolve;
      }),
    );
  const node = document.createElement("div"),
    root = createRoot(node),
    client = new QueryClient();
  const tree = () =>
    h(
      StrictMode,
      null,
      h(
        QueryClientProvider,
        { client },
        h(
          MemoryRouter,
          { initialEntries: ["/send?type=0x2::rtd::RTD"] },
          h(TransferCoinPage),
        ),
      ),
    );
  try {
    await act(async () => root.render(tree()));
    expect(m.recover).toHaveBeenCalledTimes(1);
    m.rpc.readSessionKey = "second";
    await act(async () => root.render(tree()));
    expect(m.recover).toHaveBeenCalledTimes(2);
    await act(async () => {
      rejectOld(new Error("old-session-error"));
      resolveNew(null);
    });
    expect(node.textContent).toContain("coin-form");
    expect(node.querySelector("[role=alert]")).toBeNull();
  } finally {
    await act(async () => root.unmount());
    client.clear();
  }
});

import { Transaction } from "rtd-typescript/transactions";
import { toBase64, toBase58 } from "rtd-typescript/utils";
import { executionFixture } from "../../../../../../tests/unit/rpc/execution-fixtures";
it.each(["invalid", "timestamp", "epoch"])(
  "coin approval displays and gates final validity: %s",
  async (kind) => {
    m.recover.mockResolvedValue(null);
    const tx = Transaction.from((await executionFixture()).bytes);
    tx.setExpiration(
      kind === "timestamp"
        ? {
            ValidDuring: {
              minEpoch: null,
              maxEpoch: null,
              minTimestamp: "1",
              maxTimestamp: null,
              chain: toBase58(new Uint8Array(32).fill(7)),
              nonce: 0,
            },
          }
        : { Epoch: "9007199254740993" },
    );
    const bytesBase64 =
      kind === "invalid" ? "invalid-bcs" : toBase64(await tx.build());
    const node = document.createElement("div"),
      root = createRoot(node),
      client = new QueryClient();
    try {
      await act(async () =>
        root.render(
          h(
            QueryClientProvider,
            { client },
            h(
              MemoryRouter,
              { initialEntries: ["/send?type=0x2::rtd::RTD"] },
              h(TransferCoinPage),
            ),
          ),
        ),
      );
      await act(async () =>
        m.submit!({
          amount: "1",
          to: "0xa",
          isPayAllRtd: false,
          gasBudgetEst: "1",
          prepared: {
            bytesBase64,
            digest: "preview-final-digest",
            bindingKey: "binding",
            readSessionKey: "first",
            input: {},
          },
        }),
      );
      expect(node.textContent).toContain("preview-final-digest");
      expect(node.textContent).toContain(
        kind === "epoch"
          ? "9007199254740993"
          : kind === "invalid"
            ? "approval.gatherFailed"
            : "approval.timeConstraintUnsupported",
      );
      const send = Array.from(node.querySelectorAll("button")).find((button) =>
        button.textContent?.includes("transfer.sendNow"),
      )!;
      expect(send).toBeDefined();
      expect(send.disabled).toBe(kind !== "epoch");
    } finally {
      await act(async () => root.unmount());
      client.clear();
    }
  },
);

it("failed final revalidation preserves visible approval, reports error once and never reaches the signer", async () => {
  m.recover.mockResolvedValue(null);
  const failure = new Error("已授权的交易模拟未通过，请重新预览并授权");
  m.revalidate.mockRejectedValue(failure);
  const fixture = await executionFixture();
  const prepared = {
    bytesBase64: toBase64(fixture.bytes),
    digest: "original-approved-digest",
    bindingKey: "binding",
    readSessionKey: "first",
    input: { to: "0xa" },
  };
  const node = document.createElement("div"), root = createRoot(node), client = new QueryClient();
  try {
    await act(async () => root.render(h(QueryClientProvider, { client }, h(MemoryRouter,
      { initialEntries: ["/send?type=0x2::rtd::RTD"] }, h(TransferCoinPage)))));
    await act(async () => m.submit!({ amount: "1", to: "0xa", isPayAllRtd: false,
      gasBudgetEst: "1", requestId: "original-request", prepared }));
    const send = Array.from(node.querySelectorAll("button")).find(button =>
      button.textContent?.includes("transfer.sendNow"))!;
    expect(send.disabled).toBe(false);
    await act(async () => {
      send.click();
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    expect(m.revalidate).toHaveBeenCalledExactlyOnceWith(m.rpc, prepared, m.account.address);
    expect(m.execute).not.toHaveBeenCalled();
    expect(m.toastError).toHaveBeenCalledTimes(1);
    expect(node.textContent).toContain("original-approved-digest");
    expect(node.contains(send)).toBe(true);
    expect(send.disabled).toBe(false);
  } finally {
    await act(async () => root.unmount());
    client.clear();
  }
});
