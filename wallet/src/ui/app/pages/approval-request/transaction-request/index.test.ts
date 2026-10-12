// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Transaction } from "rtd-typescript/transactions";
import { toBase64 } from "rtd-typescript/utils";
import { executionFixture } from "../../../../../../tests/unit/rpc/execution-fixtures";
import { TransactionRequest } from "./index";
const f = vi.hoisted(() => ({
  query: { prepared: undefined as any, isPending: false, isError: false },
  props: undefined as any,
  dispatch: vi.fn(),
  respond: vi.fn(),
}));
vi.mock("_src/ui/app/hooks/useBackgroundClient", () => ({
  useBackgroundClient: () => ({}),
}));
vi.mock("_hooks", () => ({
  useAppDispatch: () => f.dispatch,
  useTransactionData: () => f.query,
}));
vi.mock("_redux/slices/transaction-requests", () => ({
  respondToTransactionRequest: f.respond,
}));
vi.mock("_src/ui/app/hooks/useAccountByAddress", () => ({
  useAccountByAddress: () => ({ data: { id: "a", address: "0xb" } }),
}));
vi.mock("_src/ui/app/hooks/useSigner", () => ({ useSigner: () => ({}) }));
vi.mock("_src/ui/app/i18n", () => ({
  useI18n: () => ({ t: (s: string) => s }),
}));
vi.mock("_src/shared/analytics/ampli", () => ({
  ampli: { respondedToTransactionRequest: vi.fn() },
}));
vi.mock("_components/user-approve-container", async () => {
  const { createElement } = await import("react");
  return {
    UserApproveContainer: (props: any) => {
      f.props = props;
      return createElement("div", {}, props.children);
    },
  };
});
vi.mock("_src/ui/app/shared/page-main-layout/PageMainLayoutTitle", () => ({
  PageMainLayoutTitle: () => null,
}));
vi.mock("./DappRecoveryGate", () => ({
  DappRecoveryGate: (props: any) => props.children(async () => undefined),
}));
vi.mock("./SimulationPreview", () => ({ SimulationPreview: () => null }));
vi.mock("./GasFees", () => ({ GasFees: () => null }));
vi.mock("./TransactionDetails", () => ({ TransactionDetails: () => null }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
beforeEach(() => {
  vi.clearAllMocks();
  f.query = { prepared: undefined, isError: false, isPending: false };
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
async function render() {
  const txRequest: any = {
    id: "request",
    origin: "https://dapp.example",
    tx: { account: "0xb", data: new Transaction().serialize() },
  };
  await act(async () => root.render(h(TransactionRequest, { txRequest })));
}
it("missing preparation cannot be approved even by directly invoking submit", async () => {
  await render();
  expect(f.props.approveDisabled).toBe(true);
  await f.props.onSubmit(true);
  expect(f.respond).not.toHaveBeenCalled();
});
it("failed preparation never exposes a confirm-anyway route", async () => {
  f.query = { prepared: { digest: "old" }, isError: true, isPending: false };
  await render();
  expect(f.props.approveDisabled).toBe(true);
  await f.props.onSubmit(true);
  expect(f.respond).not.toHaveBeenCalled();
});
it("rejection remains available while preparing", async () => {
  f.query.isPending = true;
  await render();
  await f.props.onSubmit(false);
  expect(f.respond).toHaveBeenCalledWith(
    expect.objectContaining({ approved: false, txRequestID: "request" }),
  );
});

it("passes the registered approval token to submission", async () => {
  const dappApproval = {
    accountId: "a",
    requestId: "request",
    approvalToken: "token",
    expiresAt: Date.now() + 60000,
  };
  f.query = {
    prepared: {
      dappApproval,
      bytesBase64: toBase64((await executionFixture()).bytes),
    },
    isError: false,
    isPending: false,
  };
  await render();
  expect(f.props.approveDisabled).toBe(false);
  await f.props.onSubmit(true);
  expect(f.respond).toHaveBeenCalledWith(
    expect.objectContaining({ approved: true, dappApproval }),
  );
});
it("expired approval cannot be submitted even without a rerender", async () => {
  const dappApproval = {
    accountId: "a",
    requestId: "request",
    approvalToken: "token",
    expiresAt: Date.now() + 60000,
  };
  f.query = {
    prepared: {
      dappApproval,
      bytesBase64: toBase64((await executionFixture()).bytes),
    },
    isError: false,
    isPending: false,
  };
  await render();
  dappApproval.expiresAt = Date.now() - 1;
  await f.props.onSubmit(true);
  expect(f.respond).not.toHaveBeenCalled();
});

it("有效批准凭据不能绕过缺失或损坏的最终bytes", async () => {
  f.query = {
    prepared: {
      dappApproval: {
        accountId: "a",
        requestId: "request",
        approvalToken: "token",
        expiresAt: Date.now() + 60000,
      },
      bytesBase64: "bad",
    },
    isError: false,
    isPending: false,
  };
  await render();
  expect(f.props.approveDisabled).toBe(true);
  await f.props.onSubmit(true);
  expect(f.respond).not.toHaveBeenCalled();
});
