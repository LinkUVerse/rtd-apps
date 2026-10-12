// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach as beforeAdmissionFixture } from "vitest";
import { WalletNetworkAdmissionStore } from "./network-admission-store";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GrpcTypes } from "rtd-typescript/grpc";
import { toBase58 } from "rtd-typescript/utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useGetAllCoins } from "../../ui/app/hooks/useGetAllCoins";
import { useFreshBalance } from "../../ui/app/hooks/useFreshBalance";
import { WalletRpcProvider } from "./WalletRpcProvider";
import { validateNetworkProfile } from "./profile";
import { profileFixture } from "./profile-fixture";
import type { ProfileSelection } from "./profile-registry";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
function response(payload: Uint8Array) {
  const trailer = new TextEncoder().encode("grpc-status: 0\r\n");
  const buffer = new Uint8Array(10 + payload.length + trailer.length);
  new DataView(buffer.buffer).setUint32(1, payload.length, false);
  buffer.set(payload, 5);
  buffer[5 + payload.length] = 128;
  new DataView(buffer.buffer).setUint32(
    6 + payload.length,
    trailer.length,
    false,
  );
  buffer.set(trailer, 10 + payload.length);
  return new Response(buffer, {
    headers: { "content-type": "application/grpc-web+proto" },
  });
}
describe("WalletRpcProvider 到发送 coin Hook 的实际集成", () => {
  const cleanups: (() => Promise<void>)[] = [];
  afterEach(async () => {
    for (const cleanup of cleanups.splice(0)) await cleanup();
    vi.unstubAllGlobals();
  });
  function mount(funding = false) {
    const element = document.createElement("div");
    document.body.append(element);
    const root = createRoot(element);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    function Coins({ address }: { address: string }) {
      const query = useGetAllCoins("0x2::rtd::RTD", address);
      return createElement(
        "div",
        null,
        query.isError
          ? `error:${query.error.message}`
          : query.data
            ? `coins:${query.data.map((c) => c.balance).join(",")}`
            : "loading",
      );
    }
    function Funding({ address }: { address: string }) {
      const query = useFreshBalance("0x2::rtd::RTD", address);
      return createElement(
        "div",
        null,
        query.isError
          ? "error"
          : query.data
            ? `funds:${query.data.balance}:${query.data.addressBalance}`
            : "loading",
      );
    }
    cleanups.push(async () => {
      await act(async () => root.unmount());
      client.clear();
      element.remove();
    });
    return {
      element,
      client,
      render: async (selection: ProfileSelection, address = "0xb") => {
        await act(async () =>
          root.render(
            createElement(
              StrictMode,
              null,
              createElement(
                QueryClientProvider,
                { client },
                createElement(WalletRpcProvider, {
                  selection,
                  children: createElement(funding ? Funding : Coins, {
                    address,
                  }),
                }),
              ),
            ),
          ),
        );
      },
    };
  }
  function transport() {
    const profile = validateNetworkProfile({
      ...profileFixture(),
      endpoints: { fullnodeGrpcWeb: "http://127.0.0.1:9000/grpc" },
    });
    let wrongChain = false;
    const fetch = vi.fn<typeof globalThis.fetch>(async (url, init) => {
      // Fullnode role works without an archive/GraphQL role; no legacy endpoint is involved.
      expect(String(url)).not.toContain("/graphql");
      if (String(url).endsWith("/GetServiceInfo"))
        return response(
          GrpcTypes.GetServiceInfoResponse.toBinary({
            chainId: wrongChain
              ? toBase58(new Uint8Array(32).fill(2))
              : profile.expectedGenesisDigest,
            checkpointHeight: 20n,
          }),
        );
      if (String(url).endsWith("/GetBalance")) {
        const request = GrpcTypes.GetBalanceRequest.fromBinary(
          (init!.body as Uint8Array).subarray(5),
        );
        const balance = request.owner?.endsWith("a") ? 0n : 9007199254740993n;
        return response(
          GrpcTypes.GetBalanceResponse.toBinary({
            balance: {
              coinType: request.coinType,
              balance,
              addressBalance: balance,
            },
          }),
        );
      }
      expect(String(url)).toContain(
        "/rtd.rpc.v2.StateService/ListOwnedObjects",
      );
      const request = GrpcTypes.ListOwnedObjectsRequest.fromBinary(
        (init!.body as Uint8Array).subarray(5),
      );
      return response(
        GrpcTypes.ListOwnedObjectsResponse.toBinary({
          objects: [
            {
              objectId: "0xc",
              version: 11n,
              digest: toBase58(new Uint8Array(32).fill(9)),
              objectType: request.objectType,
              owner: {
                kind: GrpcTypes.Owner_OwnerKind.ADDRESS,
                address: request.owner,
              },
              balance: request.owner?.endsWith("a") ? 0n : 9007199254740993n,
            },
          ],
        }),
      );
    });
    return {
      profile,
      fetch,
      failIdentity: () => {
        wrongChain = true;
      },
    };
  }
  it("地址余额通过Provider和真实SDK读取，切账户及切网不复用旧资金", async () => {
    const source = transport();
    vi.stubGlobal("fetch", source.fetch);
    const view = mount(true);
    await view.render({ state: "configured", profile: source.profile });
    await act(async () =>
      vi.waitFor(() =>
        expect(view.element.textContent).toBe(
          "funds:9007199254740993:9007199254740993",
        ),
      ),
    );
    const cached = view.client
      .getQueryCache()
      .findAll({ queryKey: ["wallet-fresh-balance"] });
    expect(
      cached.some(
        (query) => query.state.data && query.meta?.skipPersistedCache,
      ),
    ).toBe(true);
    await view.render({ state: "configured", profile: source.profile }, "0xa");
    await act(async () =>
      vi.waitFor(() => expect(view.element.textContent).toBe("funds:0:0")),
    );
    await view.render({ state: "unconfigured", message: "missing" });
    source.failIdentity();
    await view.render({ state: "configured", profile: source.profile });
    await act(async () =>
      vi.waitFor(() => expect(view.element.textContent).toBe("error")),
    );
  });

  it("StrictMode 使用有效新会话；无 GraphQL 配置时仍可读取 Fullnode coin，查询无持久化", async () => {
    const source = transport();
    vi.stubGlobal("fetch", source.fetch);
    const view = mount();
    await view.render({ state: "configured", profile: source.profile });
    await act(async () =>
      vi.waitFor(() =>
        expect(view.element.textContent).toBe("coins:9007199254740993"),
      ),
    );
    const queries = view.client
      .getQueryCache()
      .getAll()
      .filter((q) => q.queryKey[0] === "wallet-fresh-coins");
    expect(queries).toHaveLength(1);
    expect(queries[0].options.meta).toEqual({
      skipPersistedCache: true,
      walletReadOperation: "freshCoins",
    });
    await view.render({ state: "configured", profile: source.profile }, "0xa");
    await act(async () =>
      vi.waitFor(() => expect(view.element.textContent).toBe("coins:0")),
    );
  });
  it("同 profile 重新进入但端点返回错链时，不能继续展示上一读会话 coin", async () => {
    const source = transport();
    vi.stubGlobal("fetch", source.fetch);
    const view = mount();
    await view.render({ state: "configured", profile: source.profile });
    await act(async () =>
      vi.waitFor(() =>
        expect(view.element.textContent).toBe("coins:9007199254740993"),
      ),
    );
    await view.render({ state: "unconfigured", message: "disabled" });
    expect(view.element.textContent).toBe("loading");
    source.failIdentity();
    await view.render({ state: "configured", profile: source.profile });
    await act(async () =>
      vi.waitFor(() => expect(view.element.textContent).toContain("error:")),
    );
    expect(view.element.textContent).not.toContain("9007199254740993");
  });
});

// This existing SDK/React protocol fixture does not claim native-storage proof.
beforeAdmissionFixture(() => {
  vi.spyOn(WalletNetworkAdmissionStore.prototype, "capture").mockResolvedValue(
    undefined,
  );
});
