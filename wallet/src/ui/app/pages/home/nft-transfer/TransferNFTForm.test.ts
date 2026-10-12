// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { executionFixture } from "../../../../../../tests/unit/rpc/execution-fixtures";
import { Transaction } from "rtd-typescript/transactions";
import { toBase64, toBase58 } from "rtd-typescript/utils";
let reviewedBytes: string;
import { act, createElement as h, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeRtdAddress as address } from "rtd-typescript/utils";
import { TransferNFTForm } from "./TransferNFTForm";

const f = vi.hoisted(() => ({
  account: { id: "account", address: "0xb" },
  rpc: {
    state: "configured",
    hasFullnodeSession: true,
    bindingKey: "binding",
    readSessionKey: "session",
  },
  recover: vi.fn(),
  execute: vi.fn(),
  prepare: vi.fn(),
  revalidate: vi.fn(),
  navigate: vi.fn(),
  invalidate: vi.fn(),
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
vi.mock("rtd-apps-core/src/rpc/name-hooks", () => ({
  useRtdNSEnabled: () => false,
}));
vi.mock("_src/ui/app/i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("react-router-dom", () => ({ useNavigate: () => f.navigate }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: f.invalidate }),
}));
vi.mock("_src/shared/analytics/ampli", () => ({
  ampli: { sentCollectible: vi.fn() },
}));
vi.mock("_src/shared/rpc/nft-transfer-preparation", () => ({
  prepareNftTransfer: f.prepare,
  revalidateNftTransfer: f.revalidate,
}));
vi.mock("./validation", async () => {
  const yup = await import("yup");
  return {
    createValidationSchema: () => yup.object({ to: yup.string().required() }),
  };
});
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
vi.mock("_components/address-input", async () => {
  const { createElement } = await import("react");
  return {
    AddressInput: ({ field, form }: any) =>
      createElement("input", {
        value: field.value,
        onChange: (event: any) =>
          form.setFieldValue(field.name, event.target.value),
        "data-recipient": true,
      }),
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
async function mount(onPreparationStateChange?: (active: boolean) => void, ownershipReady = true) {
  await act(async () =>
    root.render(
      h(TransferNFTForm, {
        objectId: address("0xd"),
        objectType: "0x3::nft::NFT",
        ownershipReady,
        onPreparationStateChange,
      }),
    ),
  );
  await flush();
}
async function preview() {
  const input = host.querySelector("input")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, address("0xe"));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await flush();
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
  f.account = { id: "account", address: "0xb" };
  f.rpc = {
    state: "configured",
    hasFullnodeSession: true,
    bindingKey: "binding",
    readSessionKey: "session",
  };
  f.recover.mockResolvedValue(null);
  f.execute.mockResolvedValue({ state: "pending", digest: "original-digest" });
  f.prepare.mockImplementation(async (_rpc, input) => ({
    input,
    sender: input.sender,
    bindingKey: "binding",
    readSessionKey: "session",
    bytesBase64: reviewedBytes,
    digest: "reviewedDigest",
    gasBudget: "100",
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
describe("NFT transfer page approval and recovery", () => {
  it("remembered draft and preview cannot prepare or approve until ownership is freshly admitted", async () => {
    await mount(undefined, false);
    expect(button("transfer.reviewAndSend").disabled).toBe(true);
    await click("transfer.reviewAndSend");
    expect(f.prepare).not.toHaveBeenCalled();
    await mount(undefined, true);
    await preview();
    expect(f.prepare).toHaveBeenCalledTimes(1);
    await mount(undefined, false);
    expect(host.textContent).toContain("reviewedDigest");
    expect(button("nft.sendNow").disabled).toBe(true);
    await click("nft.sendNow");
    expect(f.revalidate).not.toHaveBeenCalled();
    expect(f.execute).not.toHaveBeenCalled();
    await mount(undefined, true);
    expect(button("nft.sendNow").disabled).toBe(false);
    await click("nft.sendNow");
    expect(f.revalidate).toHaveBeenCalledTimes(1);
    expect(f.execute).toHaveBeenCalledTimes(1);
  });
  it("StrictMode's new owned lifetime shares initial readonly recovery and remains usable", async () => {
    const held = deferred<any>();
    f.recover.mockReturnValue(held.promise);
    await act(async () => root.render(h(StrictMode, null, h(TransferNFTForm, {
      objectId: address("0xd"), objectType: "0x3::nft::NFT", ownershipReady: true,
    }))));
    await flush();
    expect(f.recover).toHaveBeenCalledTimes(1);
    expect(host.querySelector("form")).toBeNull();
    await act(async () => held.resolve(null));
    await flush();
    expect(host.querySelector("form")).not.toBeNull();
    expect(f.execute).not.toHaveBeenCalled();
  });
  it("a negative read fence disables the retained approval until fresh reads are allowed", async () => {
    await mount();await preview();
    f.rpc = { ...f.rpc, hasFullnodeSession: false };
    await mount();
    expect(button("nft.sendNow").disabled).toBe(true);
    await click("nft.sendNow");
    expect(f.revalidate).not.toHaveBeenCalled();
    expect(f.execute).not.toHaveBeenCalled();
    f.rpc = { ...f.rpc, hasFullnodeSession: true };
    await mount();
    expect(button("nft.sendNow").disabled).toBe(false);
    await click("nft.sendNow");
    expect(f.revalidate).toHaveBeenCalledTimes(1);
    expect(f.execute).toHaveBeenCalledTimes(1);
    expect(f.recover).toHaveBeenCalledTimes(1);
  });
  it("asset snapshot loading preserves the original dispatched result and cannot start recovery again", async () => {
    await mount();
    await preview();
    const held = deferred<any>();
    f.execute.mockReturnValue(held.promise);
    await click("nft.sendNow");
    expect(f.execute).toHaveBeenCalledTimes(1);
    expect(f.recover).toHaveBeenCalledTimes(1);
    f.rpc = { ...f.rpc, state: "initializing" };
    await mount();
    expect(host.querySelector("form")).toBeNull();
    f.rpc = { ...f.rpc, state: "configured" };
    await mount();
    await act(async () => held.resolve({
      state: "confirmed", receipt: { digest: "reviewedDigest", success: true },
    }));
    await flush();
    expect(f.recover).toHaveBeenCalledTimes(1);
    expect(f.navigate).toHaveBeenCalledWith("/receipt?txdigest=reviewedDigest&from=nfts");
    expect(f.prepare).toHaveBeenCalledTimes(1);
    expect(f.execute).toHaveBeenCalledTimes(1);
  });
  it("revoking the original fullnode session retires a late dispatched UI result", async () => {
    await mount();
    await preview();
    const held = deferred<any>();
    f.execute.mockReturnValue(held.promise);
    await click("nft.sendNow");
    f.rpc = { ...f.rpc, state: "invalid", hasFullnodeSession: false,
      bindingKey: "wallet-rpc:invalid", readSessionKey: "wallet-rpc:invalid" };
    await mount();
    await act(async () => held.resolve({
      state: "confirmed", receipt: { digest: "retiredDigest", success: true },
    }));
    await flush();
    expect(f.navigate).not.toHaveBeenCalled();
    expect(f.execute).toHaveBeenCalledTimes(1);
    expect(host.querySelector("form")).toBeNull();
  });
  it("previews without execution, then dispatches reviewed bytes once and only recovers pending", async () => {
    await mount();
    await preview();
    expect(f.prepare).toHaveBeenCalledTimes(1);
    expect(f.execute).not.toHaveBeenCalled();
    expect(host.textContent).toContain("reviewedDigest");
    await click("nft.sendNow");
    expect(f.execute).toHaveBeenCalledTimes(1);
    expect(f.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: "account",
        bytesBase64: reviewedBytes,
        digest: "reviewedDigest",
      }),
    );
    expect(host.textContent).toContain("original-digest");
    expect(button("nft.sendNow")).toBeUndefined();
    f.recover.mockResolvedValue({
      state: "pending",
      digest: "original-digest",
    });
    await click("nft.transferRecover");
    expect(f.execute).toHaveBeenCalledTimes(1);
    expect(f.prepare).toHaveBeenCalledTimes(1);
  });
  it("double confirm and edit while simulation is running cannot dispatch twice", async () => {
    await mount();
    await preview();
    const pending = deferred<any>();
    f.revalidate.mockReturnValue(pending.promise);
    await click("nft.sendNow");
    expect(button("common.back").disabled).toBe(true);
    await click("nft.sendNow");
    expect(f.revalidate).toHaveBeenCalledTimes(1);
    const prepared = await f.prepare.mock.results[0].value;
    await act(async () => pending.resolve(prepared));
    await flush();
    expect(f.execute).toHaveBeenCalledTimes(1);
  });
  it("its own read fence cannot cancel original revalidation or restart recovery", async () => {
    await mount();
    await preview();
    const held = deferred<any>();
    f.revalidate.mockReturnValue(held.promise);
    await click("nft.sendNow");
    const prepared = await f.prepare.mock.results[0].value;
    f.rpc = { ...f.rpc, state: "initializing", hasFullnodeSession: false };
    await mount();
    f.rpc = { ...f.rpc, state: "configured", hasFullnodeSession: true };
    await mount();
    await act(async () => held.resolve(prepared));
    await flush();
    expect(f.revalidate).toHaveBeenCalledTimes(1);
    expect(f.recover).toHaveBeenCalledTimes(1);
    expect(f.execute).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain("original-digest");
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
    await click("nft.transferRecover");
    expect(host.querySelector("form")).not.toBeNull();
    expect(f.prepare).not.toHaveBeenCalled();
  });
  it("an ambiguous background response requires recovery before another preview", async () => {
    await mount();
    await preview();
    f.execute.mockRejectedValueOnce(new Error("port closed"));
    await click("nft.sendNow");
    expect(host.textContent).toContain("port closed");
    expect(host.querySelector("form")).toBeNull();
    expect(button("nft.sendNow")).toBeUndefined();
    f.recover.mockResolvedValue({
      state: "confirmed",
      receipt: { digest: "reviewedDigest", success: false },
    });
    await click("nft.transferRecover");
    expect(f.navigate).toHaveBeenCalledWith(
      "/receipt?txdigest=reviewedDigest&from=nfts",
    );
    expect(f.execute).toHaveBeenCalledTimes(1);
  });
  it("switching account while confirming aborts the old approval before background dispatch", async () => {
    await mount();
    await preview();
    const pending = deferred<any>();
    f.revalidate.mockReturnValue(pending.promise);
    await click("nft.sendNow");
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
});

it("renders the exact large epoch from the approved bytes", async () => {
  const tx = Transaction.from(reviewedBytes);
  tx.setExpiration({ Epoch: "9007199254740993" });
  reviewedBytes = toBase64(await tx.build());
  await mount();
  await preview();
  expect(host.textContent).toContain("9007199254740993");
  expect(button("nft.sendNow").disabled).toBe(false);
});
it.each(["invalid", "timestamp"])(
  "refuses approval for %s final validity",
  async (kind) => {
    if (kind === "invalid") reviewedBytes = "invalid-bcs";
    else {
      const tx = Transaction.from(reviewedBytes);
      tx.setExpiration({
        ValidDuring: {
          minEpoch: null,
          maxEpoch: null,
          minTimestamp: "1",
          maxTimestamp: null,
          chain: toBase58(new Uint8Array(32).fill(7)),
          nonce: 0,
        },
      });
      reviewedBytes = toBase64(await tx.build());
    }
    await mount();
    await preview();
    expect(host.textContent).toContain(
      kind === "invalid"
        ? "approval.gatherFailed"
        : "approval.timeConstraintUnsupported",
    );
    expect(button("nft.sendNow").disabled).toBe(true);
    await click("nft.sendNow");
    expect(f.revalidate).not.toHaveBeenCalled();
    expect(f.execute).not.toHaveBeenCalled();
  },
);

it("notifies actual preparation and approval lifetime, then releases on Back without execution", async () => {
  const onActive = vi.fn();
  await mount(onActive);
  expect(onActive.mock.calls.some((row) => row[0] === true)).toBe(false);
  const fast = f.prepare.getMockImplementation()!,
    held = deferred<any>();
  f.prepare.mockReturnValue(held.promise);
  await preview();
  expect(onActive).toHaveBeenLastCalledWith(true);
  expect(f.execute).not.toHaveBeenCalled();
  const args = f.prepare.mock.calls[0];
  await act(async () => held.resolve(await fast(...args)));
  await flush();
  expect(host.textContent).toContain("reviewedDigest");
  expect(onActive).toHaveBeenLastCalledWith(true);
  await click("common.back");
  expect(onActive).toHaveBeenLastCalledWith(false);
  expect(f.execute).not.toHaveBeenCalled();
});
it("failed preparation releases its rendering lifetime without any execution", async () => {
  const onActive = vi.fn();
  await mount(onActive);
  f.prepare.mockRejectedValue(new Error("fresh discovery failed"));
  await preview();
  expect(host.textContent).toContain("fresh discovery failed");
  expect(onActive).toHaveBeenLastCalledWith(false);
  expect(f.execute).not.toHaveBeenCalled();
});
