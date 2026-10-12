// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { executionFixture } from "../../../../../tests/unit/rpc/execution-fixtures";
import { Transaction } from "rtd-typescript/transactions";
import { toBase64, toBase58 } from "rtd-typescript/utils";
let reviewedBytes: string;
import { act, createElement as h, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StakingCard from "./StakingCard";

const f = vi.hoisted(() => ({
  route: "unstake=true&staked=position&address=validator",
  account: { id: "account", address: "0xb" },
  rpc: {
    state: "configured",
    bindingKey: "binding",
    readSessionKey: "session",
  },
  recover: vi.fn(),
  execute: vi.fn(),
  prepare: vi.fn(),
  revalidate: vi.fn(),
  navigate: vi.fn(),
  invalidate: vi.fn(),
  stakingPending: false,
  stakingError: false,
}));
vi.mock("_src/ui/app/hooks/useActiveAccount", () => ({
  useActiveAccount: () => f.account,
}));
vi.mock("_src/ui/app/hooks/useBackgroundClient", () => ({
  useBackgroundClient: () => ({
    recoverPreparedTransaction: f.recover,
    executePreparedTransaction: f.execute,
  }),
}));
vi.mock("rtd-apps-core/src/rpc/WalletRpcContext", () => ({
  useWalletRpc: () => f.rpc,
}));
vi.mock("rtd-apps-core/src/rpc/staking-hooks", () => ({
  useStakingView: () => ({
    isPending: f.stakingPending,
    isError: f.stakingError,
    data: {
      epoch: "2",
      positions: [
        {
          objectId: "position",
          validatorAddress: "validator",
          poolId: "pool",
          principal: "5",
          status: "pending",
        },
      ],
      validators: [{ address: "validator", poolId: "pool", active: true }],
    },
  }),
}));
vi.mock("rtd-apps-core/src/rpc/coin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("rtd-apps-core/src/rpc/coin")>()),
  useCoinMetadata: () => ({
    data: { decimals: 9, symbol: "RTD" },
    isPending: false,
    isError: false,
  }),
}));
vi.mock("_src/ui/app/hooks/useFreshBalance", async () => {
  const { RTD_TYPE_ARG } = await import("rtd-typescript/utils");
  return {
    useFreshBalance: () => ({
      data: {
        coinType: RTD_TYPE_ARG,
        balance: "10000000000",
        coinBalance: "0",
        addressBalance: "10000000000",
      },
      isPending: false,
      isError: false,
    }),
  };
});
vi.mock("./ValidatorFormDetail", () => ({ ValidatorFormDetail: () => null }));
vi.mock("./UnstakeForm", async () => {
  const { createElement } = await import("react");
  const { Form } = await import("formik");
  return { UnStakeForm: () => createElement(Form, {}) };
});
vi.mock("./StakeForm", async () => {
  const { createElement } = await import("react");
  const { Form, useFormikContext } = await import("formik");
  return {
    default: () => {
      const form = useFormikContext();
      return createElement(
        Form,
        {},
        createElement("output", { "data-testid": "draft-amount" }, (form.values as { amount: string }).amount),
        createElement(
          "button",
          { type: "button", onClick: () => form.setFieldValue("amount", "2") },
          "set amount",
        ),
      );
    },
  };
});
vi.mock("_src/ui/app/i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("react-router-dom", () => ({
  useNavigate: () => f.navigate,
  useSearchParams: () => [new URLSearchParams(f.route)],
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: f.invalidate }),
}));
vi.mock("_src/shared/analytics/ampli", () => ({
  ampli: { sentCollectible: vi.fn() },
}));
vi.mock("_src/shared/rpc/staking-preparation", () => ({
  prepareStaking: f.prepare,
  revalidateStaking: f.revalidate,
}));
vi.mock("_app/shared/bottom-menu-layout", async () => {
  const { createElement } = await import("react");
  const Box = ({ children }: any) => createElement("div", {}, children);
  return { default: Box, Content: Box, Menu: Box };
});
vi.mock("_components/alert", async () => {
  const { createElement } = await import("react");
  return {
    default: ({ children }: any) =>
      createElement("div", { role: "alert" }, children),
  };
});
vi.mock("_app/shared/ButtonUI", async () => {
  const { createElement } = await import("react");
  return {
    Button: ({ text, type, onClick, disabled, loading }: any) =>
      createElement(
        "button",
        { type, onClick, disabled: disabled || loading },
        text,
      ),
  };
});
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root, host: HTMLDivElement;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { resolve, promise };
}
async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
function button(text: string) {
  return Array.from(host.querySelectorAll("button")).find(
    (b) => b.textContent === text,
  )!;
}
async function click(text: string) {
  await act(async () => button(text).click());
  await flush();
}
async function mount() {
  await act(async () => root.render(h(StakingCard)));
  await flush();
}
async function preview() {
  await act(async () =>
    host
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  await flush();
}
beforeEach(async () => {
  reviewedBytes = toBase64((await executionFixture()).bytes);
  vi.clearAllMocks();
  f.route = "unstake=true&staked=position&address=validator";
  f.account = { id: "account", address: "0xb" };
  f.rpc = {
    state: "configured",
    bindingKey: "binding",
    readSessionKey: "session",
  };
  f.recover.mockResolvedValue(null);
  f.stakingPending = false;
  f.stakingError = false;
  f.execute.mockResolvedValue({ state: "pending", digest: "original-digest" });
  f.prepare.mockImplementation(async (_rpc, input) => ({
    input,
    sender: input.sender,
    bindingKey: "binding",
    readSessionKey: "session",
    bytesBase64: reviewedBytes,
    digest: "reviewedDigest",
    gasBudget: "100",
    withdrawal: { principal: "5", poolId: "pool", activationEpoch: "3" },
  }));
  f.revalidate.mockImplementation(async (_rpc, prepared) => prepared);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
describe("Staking page approval and recovery", () => {
  it.each(["pending", "error"])("retains unapproved amount through same-session read %s and prepares only after recovery", async (phase) => {
    f.route = "address=validator";
    await mount();
    await click("set amount");
    expect(host.querySelector('[data-testid="draft-amount"]')?.textContent).toBe("2");
    f.stakingPending = phase === "pending";
    f.stakingError = phase === "error";
    await mount();
    expect(host.querySelector("form")).toBeNull();
    expect(f.prepare).not.toHaveBeenCalled();
    expect(f.execute).not.toHaveBeenCalled();
    f.stakingPending = false;
    f.stakingError = false;
    await mount();
    expect(host.querySelector('[data-testid="draft-amount"]')?.textContent).toBe("2");
    await preview();
    expect(f.prepare).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ amount: "2000000000" }), expect.any(AbortSignal));
    expect(f.execute).not.toHaveBeenCalled();
  });
  it.each(["account", "session", "binding", "route"])("clears unapproved amount when %s changes", async (change) => {
    f.route = "address=validator";
    await mount();
    await click("set amount");
    if (change === "account") f.account = { id: "other", address: "0xf" };
    if (change === "session") f.rpc = { ...f.rpc, readSessionKey: "other" };
    if (change === "binding") f.rpc = { ...f.rpc, bindingKey: "other" };
    if (change === "route") f.route += "&view=other";
    await mount();
    expect(host.querySelector('[data-testid="draft-amount"]')?.textContent).toBe("");
    expect(f.prepare).not.toHaveBeenCalled();
    expect(f.execute).not.toHaveBeenCalled();
  });
  it("previews without execution, then dispatches reviewed bytes once and only recovers pending", async () => {
    await mount();
    await preview();
    expect(f.prepare).toHaveBeenCalledTimes(1);
    expect(f.execute).not.toHaveBeenCalled();
    expect(host.textContent).toContain("reviewedDigest");
    await click("staking.unstakeNow");
    expect(f.execute).toHaveBeenCalledTimes(1);
    expect(f.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: "account",
        bytesBase64: reviewedBytes,
        digest: "reviewedDigest",
      }),
    );
    expect(host.textContent).toContain("original-digest");
    expect(button("staking.unstakeNow")).toBeUndefined();
    f.recover.mockResolvedValue({
      state: "pending",
      digest: "original-digest",
    });
    await click("staking.recover");
    expect(f.execute).toHaveBeenCalledTimes(1);
    expect(f.prepare).toHaveBeenCalledTimes(1);
  });
  it("double confirm and edit while simulation is running cannot dispatch twice", async () => {
    await mount();
    await preview();
    const pending = deferred<any>();
    f.revalidate.mockReturnValue(pending.promise);
    await click("staking.unstakeNow");
    expect(button("common.back").disabled).toBe(true);
    await click("staking.unstakeNow");
    expect(f.revalidate).toHaveBeenCalledTimes(1);
    const prepared = await f.prepare.mock.results[0].value;
    await act(async () => pending.resolve(prepared));
    await flush();
    expect(f.execute).toHaveBeenCalledTimes(1);
  });
  it("initial pending blocks even preparation and late old-account recovery cannot navigate", async () => {
    const pending = deferred<any>();
    f.recover.mockReturnValueOnce(pending.promise);
    await mount();
    expect(host.querySelector("form")).toBeNull();
    f.account = { id: "other-account", address: "0xf" };
    await mount();
    await act(async () =>
      pending.resolve({
        state: "confirmed",
        receipt: { digest: "old-account", success: true },
      }),
    );
    await flush();
    expect(f.navigate).not.toHaveBeenCalled();
    expect(f.prepare).not.toHaveBeenCalled();
  });
  it("initial journal failure blocks preparation until explicit successful recovery", async () => {
    f.recover.mockRejectedValueOnce(new Error("journal unavailable"));
    await mount();
    expect(host.textContent).toContain("journal unavailable");
    expect(host.querySelector("form")).toBeNull();
    await click("staking.recover");
    expect(host.querySelector("form")).not.toBeNull();
    expect(f.prepare).not.toHaveBeenCalled();
  });
  it("an ambiguous background response requires recovery before another preview", async () => {
    await mount();
    await preview();
    f.execute.mockRejectedValueOnce(new Error("port closed"));
    await click("staking.unstakeNow");
    expect(host.textContent).toContain("port closed");
    expect(host.querySelector("form")).toBeNull();
    expect(button("staking.unstakeNow")).toBeUndefined();
    f.recover.mockResolvedValue({
      state: "confirmed",
      receipt: { digest: "reviewedDigest", success: false },
    });
    await click("staking.recover");
    expect(f.navigate).toHaveBeenCalledWith(
      "/receipt?txdigest=reviewedDigest&from=tokens",
    );
    expect(f.execute).toHaveBeenCalledTimes(1);
  });
  it("switching account while confirming aborts the old approval before background dispatch", async () => {
    await mount();
    await preview();
    const pending = deferred<any>();
    f.revalidate.mockReturnValue(pending.promise);
    await click("staking.unstakeNow");
    const old = f.prepare.mock.results[0].value;
    f.account = { id: "other-account", address: "0xf" };
    await mount();
    await act(async () => pending.resolve(await old));
    await flush();
    expect(f.execute).not.toHaveBeenCalled();
    expect(host.textContent).not.toContain("reviewedDigest");
  });
  it("switching read session discards a late preparation", async () => {
    await mount();
    const pending = deferred<any>();
    f.prepare.mockReturnValue(pending.promise);
    await preview();
    expect(f.prepare).toHaveBeenCalledTimes(1);
    f.rpc = { ...f.rpc, readSessionKey: "session-2" };
    await mount();
    await act(async () =>
      pending.resolve({ input: {}, digest: "stale-digest" }),
    );
    await flush();
    expect(host.textContent).not.toContain("stale-digest");
    expect(f.execute).not.toHaveBeenCalled();
  });
  it("stake review parses the amount once and dispatches the reviewed bytes", async () => {
    f.route = "address=validator";
    await mount();
    await click("set amount");
    await preview();
    expect(f.prepare).toHaveBeenCalledWith(
      expect.anything(),
      {
        kind: "stake",
        sender: "0xb",
        validator: "validator",
        amount: "2000000000",
      },
      expect.any(AbortSignal),
    );
    await click("staking.stakeNow");
    expect(f.execute).toHaveBeenCalledTimes(1);
  });
  it("pending position can reach withdrawal preparation", async () => {
    await mount();
    await preview();
    expect(f.prepare).toHaveBeenCalledWith(
      expect.anything(),
      { kind: "withdraw", sender: "0xb", objectId: "position" },
      expect.any(AbortSignal),
    );
  });
});

it('StrictMode replay shares pending recovery instead of racing its own execution lock', async () => {
 let finish!: (value: null) => void;
 f.recover.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 await act(async()=>root.render(h(StrictMode,{},h(StakingCard))));
 expect(f.recover).toHaveBeenCalledTimes(1);
 await act(async()=>{finish(null);await Promise.resolve();});
 expect(host.textContent).not.toContain('staking.recoveryCheck');
 expect(f.execute).not.toHaveBeenCalled();
});


it('renders the exact large epoch from the approved bytes', async () => {
  const tx=Transaction.from(reviewedBytes);tx.setExpiration({Epoch:'9007199254740993'});
  reviewedBytes=toBase64(await tx.build());
  await mount();await preview();
  expect(host.textContent).toContain('9007199254740993');
  expect(button('staking.unstakeNow').disabled).toBe(false);
});
it.each(['withdraw', 'stake'])('keeps the dispatched %s outcome through same-session asset initialization', async kind => {
  if (kind === 'stake') f.route = 'address=validator';
  await mount();
  if (kind === 'stake') await click('set amount');
  await preview();
  const result = deferred<any>();
  f.execute.mockReturnValueOnce(result.promise);
  await click(kind === 'stake' ? 'staking.stakeNow' : 'staking.unstakeNow');
  expect(f.execute).toHaveBeenCalledTimes(1);
  const initialRecoveryCount = f.recover.mock.calls.length;
  f.rpc = { ...f.rpc, state: 'initializing' };
  await mount();
  f.rpc = { ...f.rpc, state: 'configured' };
  await mount();
  expect(f.recover).toHaveBeenCalledTimes(initialRecoveryCount);
  expect(host.querySelector('form')).toBeNull();
  await act(async () => result.resolve({state:'confirmed',receipt:{digest:'reviewedDigest',success:true}}));
  await flush();
  expect(f.navigate).toHaveBeenCalledWith('/receipt?txdigest=reviewedDigest&from=tokens');
  expect(f.execute).toHaveBeenCalledTimes(1);
});
it.each(['account', 'read-session', 'binding'])('discards a dispatched result after a real %s change', async change => {
  await mount();await preview();
  const result=deferred<any>();f.execute.mockReturnValueOnce(result.promise);
  await click('staking.unstakeNow');
  if(change==='account')f.account={id:'new-account',address:'0xf'};
  if(change==='read-session')f.rpc={...f.rpc,readSessionKey:'new-session'};
  if(change==='binding')f.rpc={...f.rpc,bindingKey:'new-binding'};
  await mount();
  await act(async()=>result.resolve({state:'confirmed',receipt:{digest:'old-context',success:true}}));
  await flush();expect(f.navigate).not.toHaveBeenCalled();expect(f.execute).toHaveBeenCalledTimes(1);
});
it('keeps an unknown dispatched digest after asset initialization without re-opening the form', async()=>{
  await mount();await preview();const result=deferred<any>();f.execute.mockReturnValueOnce(result.promise);
  await click('staking.unstakeNow');f.rpc={...f.rpc,state:'initializing'};await mount();
  await act(async()=>result.resolve({state:'pending',digest:'original-pending'}));await flush();
  f.recover.mockResolvedValue({state:'pending',digest:'original-pending'});
  f.rpc={...f.rpc,state:'configured'};await mount();
  expect(host.textContent).toContain('original-pending');expect(host.querySelector('form')).toBeNull();expect(f.execute).toHaveBeenCalledTimes(1);
});
it.each(['invalid','timestamp'])('refuses approval for %s final validity', async kind => {
  if(kind==='invalid')reviewedBytes='invalid-bcs';
  else {
    const tx=Transaction.from(reviewedBytes);tx.setExpiration({ValidDuring:{minEpoch:null,maxEpoch:null,
      minTimestamp:'1',maxTimestamp:null,chain:toBase58(new Uint8Array(32).fill(7)),nonce:0}});
    reviewedBytes=toBase64(await tx.build());
  }
  await mount();await preview();
  expect(host.textContent).toContain(kind==='invalid'?'approval.gatherFailed':'approval.timeConstraintUnsupported');
  expect(button('staking.unstakeNow').disabled).toBe(true);
  await click('staking.unstakeNow');
  expect(f.revalidate).not.toHaveBeenCalled();expect(f.execute).not.toHaveBeenCalled();
});
