// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  WalletRpcContext,
  type WalletRpc,
  type WalletNameResolution,
} from "rtd-apps-core/src/rpc/WalletRpcContext";
import { GrowthBook } from "@growthbook/growthbook";
import { GrowthBookProvider } from "@growthbook/growthbook-react";
import {
  useDefaultRtdNSName,
  useRtdNSEnabled,
} from "rtd-apps-core/src/rpc/name-hooks";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
function View() {
  const query = useDefaultRtdNSName("0xb");
  return createElement("div", null, query.data ?? "address");
}
describe("默认名称展示会话与过期边界", () => {
  const cleanups: (() => Promise<void>)[] = [];
  afterEach(async () => {
    for (const cleanup of cleanups.splice(0)) await cleanup();
  });
  async function fixture(validityMs = 20_000) {
    const result = {
      name: "test.rtd",
      address: "0xb",
      snapshot: { bindingKey: "binding" },
      readSessionKey: "session",
      validUntilMonotonicMs: performance.now() + validityMs,
    } as WalletNameResolution;
    const read = vi.fn().mockResolvedValue(result);
    let rpc = {
      state: "configured",
      bindingKey: "binding",
      readSessionKey: "session",
      packages: { name: {} },
      readDefaultName: read,
    } as unknown as WalletRpc;
    const node = document.createElement("div");
    document.body.append(node);
    const root = createRoot(node);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const render = async (next = rpc) => {
      rpc = next;
      await act(async () =>
        root.render(
          createElement(
            QueryClientProvider,
            { client },
            createElement(
              WalletRpcContext.Provider,
              { value: rpc },
              createElement(View),
            ),
          ),
        ),
      );
    };
    cleanups.push(async () => {
      await act(async () => root.unmount());
      client.clear();
      node.remove();
    });
    await render();
    return { node, client, read, rpc, render };
  }
  it("只展示当前绑定名称，查询禁止持久化", async () => {
    const f = await fixture();
    await act(async () =>
      vi.waitFor(() => expect(f.node.textContent).toBe("test.rtd")),
    );
    expect(f.client.getQueryCache().getAll()[0].meta?.skipPersistedCache).toBe(
      true,
    );
    expect(f.client.getQueryCache().getAll()[0].queryKey).toEqual([
      "wallet-default-name",
      "binding",
      "session",
      expect.any(String),
    ]);
  });
  it("名称TTL到期立即撤回，不等待轮询再次成功", async () => {
    const f = await fixture(200);
    await act(async () =>
      vi.waitFor(() => expect(f.node.textContent).toBe("test.rtd")),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250));
    });
    expect(f.node.textContent).toBe("address");
  });
  it("刷新失败撤回缓存名称", async () => {
    const f = await fixture();
    await act(async () =>
      vi.waitFor(() => expect(f.node.textContent).toBe("test.rtd")),
    );
    f.read.mockRejectedValue(new Error("lag"));
    await act(async () =>
      f.client.refetchQueries({ queryKey: ["wallet-default-name"] }),
    );
    await act(async () =>
      vi.waitFor(() => expect(f.node.textContent).toBe("address")),
    );
  });
  it("相同绑定进入初始化也立即撤下缓存名称", async () => {
    const f = await fixture();
    await act(async () =>
      vi.waitFor(() => expect(f.node.textContent).toBe("test.rtd")),
    );
    await f.render({ ...f.rpc, state: "initializing" });
    expect(f.node.textContent).toBe("address");
    expect(f.read).toHaveBeenCalledTimes(1);
  });
  it.each([NaN, Infinity, -Infinity])(
    "非法名称期限%s不得展示",
    async (deadline) => {
      const f = await fixture(deadline);
      await act(async () => {
        await vi.waitFor(() =>
          expect(f.client.getQueryCache().getAll()[0].state.status).toBe(
            "success",
          ),
        );
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      expect(f.node.textContent).toBe("address");
    },
  );
  it("旧会话返回值不得展示名称", async () => {
    const f = await fixture();
    await act(async () =>
      vi.waitFor(() => expect(f.node.textContent).toBe("test.rtd")),
    );
    await f.render({ ...f.rpc, readSessionKey: "new-session" });
    await act(async () =>
      vi.waitFor(() => expect(f.read).toHaveBeenCalledTimes(2)),
    );
    expect(f.node.textContent).toBe("address");
  });
});

describe("名称部署与远程功能开关", () => {
  it.each([
    {
      title: "空远程配置和已配置部署",
      configured: true,
      flag: undefined,
      enabled: true,
    },
    { title: "明确关闭", configured: true, flag: false, enabled: false },
    { title: "明确启用", configured: true, flag: true, enabled: true },
    {
      title: "远程启用不能创建缺失部署",
      configured: false,
      flag: true,
      enabled: false,
    },
    {
      title: "空远程配置不能创建缺失部署",
      configured: false,
      flag: undefined,
      enabled: false,
    },
    {
      title: "错误类型的远程开关拒绝启用",
      configured: true,
      flag: "true",
      enabled: false,
    },
  ])("$title", async ({ configured, flag, enabled }) => {
    const growthbook = new GrowthBook();
    growthbook.setFeatures(
      flag === undefined ? {} : { rtdns: { defaultValue: flag } },
    );
    const rpc = {
      packages: configured ? { name: {} } : {},
    } as unknown as WalletRpc;
    const node = document.createElement("div");
    document.body.append(node);
    const root = createRoot(node);
    function Gate() {
      return createElement("span", null, String(useRtdNSEnabled()));
    }
    try {
      await act(async () =>
        root.render(
          createElement(
            GrowthBookProvider,
            { growthbook },
            createElement(
              WalletRpcContext.Provider,
              { value: rpc },
              createElement(Gate),
            ),
          ),
        ),
      );
      expect(node.textContent).toBe(String(enabled));
    } finally {
      await act(async () => root.unmount());
      node.remove();
      growthbook.destroy();
    }
  });
});
