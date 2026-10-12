import { createElement, act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { RtdJsonRpcClient } from "rtd-typescript/jsonRpc";
import {
  ExplorerRpcContext,
  useExplorerRpcClient,
  useExplorerSystemState,
} from "rtd-apps-core/src/rpc/ExplorerRpcContext";
import { useGetObject } from "rtd-apps-core/src/hooks/useGetObject";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("共享core的Explorer客户端显式注入", () => {
  it("缺少Provider直接拒绝，不创建默认或公共网络客户端", () => {
    function Missing() {
      useExplorerRpcClient();
      return null;
    }
    expect(() => renderToStaticMarkup(createElement(Missing))).toThrow(
      "缺少 Explorer",
    );
  });

  it("既有对象hook和系统hook只调用注入客户端，系统状态按网络隔离", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const root = createRoot(document.createElement("div"));
    const object = { data: { objectId: "object-from-injected-client" } };
    const first = {
      getObject: vi.fn().mockResolvedValue(object),
      getLatestRtdSystemState: vi.fn().mockResolvedValue({ epoch: "11" }),
    };
    const second = {
      getObject: vi.fn().mockResolvedValue(object),
      getLatestRtdSystemState: vi.fn().mockResolvedValue({ epoch: "22" }),
    };
    let current: { epoch?: string; object?: unknown } = {};
    function Consumer() {
      const state = useExplorerSystemState();
      const result = useGetObject("0xa");
      current = { epoch: state.data?.epoch, object: result.data };
      return null;
    }
    async function render(client: typeof first, network: string) {
      await act(async () =>
        root.render(
          createElement(
            QueryClientProvider,
            { client: queryClient },
            createElement(
              ExplorerRpcContext.Provider,
              {
                value: {
                  client: client as unknown as RtdJsonRpcClient,
                  network,
                },
              },
              createElement(Consumer),
            ),
          ),
        ),
      );
    }
    try {
      await render(first, "network-one");
      await act(async () => {
        await vi.waitFor(() => expect(first.getObject).toHaveBeenCalledOnce());
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      expect(current).toEqual({ epoch: "11", object });
      expect(first.getObject).toHaveBeenCalledWith(
        expect.objectContaining({ id: `0x${"a".padStart(64, "0")}` }),
      );
      await render(second, "network-two");
      await act(async () => {
        await vi.waitFor(() =>
          expect(second.getLatestRtdSystemState).toHaveBeenCalledOnce(),
        );
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      expect(current.epoch).toBe("22");
      expect(
        queryClient.getQueryData(["explorer-system-state", "network-one"]),
      ).toEqual({ epoch: "11" });
      expect(
        queryClient.getQueryData(["explorer-system-state", "network-two"]),
      ).toEqual({ epoch: "22" });
    } finally {
      await act(async () => root.unmount());
      queryClient.clear();
    }
  });
});
