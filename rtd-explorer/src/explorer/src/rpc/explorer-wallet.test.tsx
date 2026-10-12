import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode, type ReactNode } from "react";
import {
  useCurrentAccount,
  useDAppKit,
  type DAppKit,
} from "rtd-dapp-kit-react";
import { Transaction } from "rtd-typescript/transactions";
import { verifyTransactionSignature } from "rtd-typescript/verify";
import { fromBase64 } from "rtd-typescript/utils";
import { ExplorerClientProvider, useExplorerClient } from "./explorer-client";
import {
  ExplorerWalletProvider,
  useExplorerSignTransaction,
} from "./explorer-wallet";
import type { ExplorerRpcClient } from "./ExplorerRpcClient";

const caches: QueryClient[] = [];
afterEach(() => {
  cleanup();
  caches.forEach((cache) => cache.clear());
  caches.length = 0;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function wrapper(network: string, burner = false) {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  caches.push(cache);
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <StrictMode>
        <QueryClientProvider client={cache}>
          <ExplorerClientProvider network={network}>
            <ExplorerWalletProvider enableUnsafeBurner={burner}>
              {children}
            </ExplorerWalletProvider>
          </ExplorerClientProvider>
        </QueryClientProvider>
      </StrictMode>
    );
  };
}
function consumer() {
  return {
    kit: useDAppKit<DAppKit<string[], ExplorerRpcClient>>(),
    account: useCurrentAccount(),
    client: useExplorerClient(),
    sign: useExplorerSignTransaction(),
  };
}
function transaction(account: string) {
  const tx = new Transaction();
  tx.setSender(account);
  tx.setGasOwner(account);
  tx.setGasPrice(1);
  tx.setGasBudget(1000);
  tx.setGasPayment([
    {
      objectId: "0x1",
      version: "1",
      digest: "11111111111111111111111111111111",
    },
  ]);
  return tx;
}
it("reuses the Kit under StrictMode and keeps explicit lower-case SDK network/client without a public wallet", () => {
  const fetch = vi.fn(() => {
    throw new Error("Unexpected network call");
  });
  vi.stubGlobal("fetch", fetch);
  const result = renderHook(consumer, { wrapper: wrapper("LOCAL") });
  const kit = result.result.current.kit;
  expect(kit.networks).toEqual(["localnet"]);
  expect(kit.getClient()).toBe(result.result.current.client);
  expect(kit.stores.$wallets.get()).toHaveLength(0);
  result.rerender();
  expect(result.result.current.kit).toBe(kit);
  expect(fetch).not.toHaveBeenCalled();
});
it("disconnected signing is rejected before invoking a wallet", async () => {
  const result = renderHook(consumer, { wrapper: wrapper("DEVNET") });
  const sign = vi.spyOn(result.result.current.kit, "signTransaction");
  await expect(
    result.result.current.sign.mutateAsync({ transaction: new Transaction() }),
  ).rejects.toThrow("请先连接");
  expect(sign).not.toHaveBeenCalled();
});
it("signs using actual modern Kit and burner feature with explicit account/network/signal and no execution", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Unexpected network call");
    }),
  );
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const result = renderHook(consumer, { wrapper: wrapper("LOCAL", true) });
  await waitFor(() =>
    expect(
      result.result.current.kit.stores.$wallets
        .get()
        .some((wallet) => wallet.name === "Unsafe Burner Wallet"),
    ).toBe(true),
  );
  const kit = result.result.current.kit;
  const wallet = kit.stores.$wallets
    .get()
    .find((wallet) => wallet.name === "Unsafe Burner Wallet")!;
  await act(async () => {
    await kit.connectWallet({ wallet });
  });
  await waitFor(() => expect(result.result.current.account).toBeDefined());
  const account = result.result.current.account!;
  const tx = transaction(account.address);
  const signal = new AbortController().signal;
  const sign = vi.spyOn(kit, "signTransaction");
  const execute = vi.spyOn(kit, "signAndExecuteTransaction");
  const signed = await result.result.current.sign.mutateAsync({
    transaction: tx,
    signal,
  });
  expect(sign).toHaveBeenCalledWith({
    transaction: tx,
    account,
    network: "localnet",
    signal,
  });
  expect(execute).not.toHaveBeenCalled();
  expect(
    (
      await verifyTransactionSignature(
        fromBase64(signed.bytes),
        signed.signature,
      )
    ).toRtdAddress(),
  ).toBe(account.address);
  expect(globalThis.fetch).not.toHaveBeenCalled();
  await act(async () => {
    await kit.disconnectWallet();
  });
});
it("custom endpoint rejects signing even after the Kit connects to an account", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const result = renderHook(consumer, {
    wrapper: wrapper("https://unbound-network.test", true),
  });
  await waitFor(() =>
    expect(
      result.result.current.kit.stores.$wallets
        .get()
        .some(
          (wallet) =>
            wallet.name === "Unsafe Burner Wallet" &&
            wallet.chains.includes("rtd:custom"),
        ),
    ).toBe(true),
  );
  const kit = result.result.current.kit;
  const wallet = kit.stores.$wallets
    .get()
    .find(
      (wallet) =>
        wallet.name === "Unsafe Burner Wallet" &&
        wallet.chains.includes("rtd:custom"),
    )!;
  await act(async () => {
    await kit.connectWallet({ wallet });
  });
  await waitFor(() => expect(result.result.current.account).toBeDefined());
  const sign = vi.spyOn(kit, "signTransaction");
  await expect(
    result.result.current.sign.mutateAsync({ transaction: new Transaction() }),
  ).rejects.toThrow("自定义网络");
  expect(sign).not.toHaveBeenCalled();
  await act(async () => {
    await kit.disconnectWallet();
  });
});
