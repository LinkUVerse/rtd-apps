// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { normalizeStructTag } from "rtd-typescript/utils";
const policy = vi.hoisted(() => ({ enabled: false }));
const request = vi.hoisted(() => vi.fn());
vi.mock("_src/shared/external-services", () => ({
  get walletExternalServicesEnabled() {
    return policy.enabled;
  },
}));
vi.mock("rtd-apps-core/src/hooks/useAppsBackend", () => ({
  useAppsBackend: () => ({ request }),
}));
import { useBlockedObjectList } from "./useBlockedObjectList";
let client: QueryClient;
let root: Root | undefined;
let host: HTMLDivElement;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
beforeEach(() => {
  policy.enabled = false;
  request.mockReset();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
  host?.remove();
  client.clear();
});
async function waitFor(check: () => void) {
  await act(async () => vi.waitFor(check));
}
async function mount() {
  const result = {} as { current: ReturnType<typeof useBlockedObjectList> };
  function View() {
    result.current = useBlockedObjectList();
    return null;
  }
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(
      createElement(QueryClientProvider, { client }, createElement(View)),
    );
  });
  return { result };
}
it("closed build has no automatic request and does not report a ready empty list", async () => {
  const { result } = await mount();
  expect(request).not.toHaveBeenCalled();
  expect(result.current.riskState).toBe("disabled");
  expect(result.current.data).toBeUndefined();
});
it("closed build rejects manual refetch without requesting the default URL", async () => {
  const { result } = await mount();
  await act(async () => {
    await result.current.refetch();
  });
  expect(request).not.toHaveBeenCalled();
  expect(result.current.riskState).toBe("disabled");
  expect(result.current.data).toBeUndefined();
});
it("closed build does not expose a cached enabled-build blocklist", async () => {
  client.setQueryData(["apps-backend", "guardian", "object-list"], {
    blocklist: ["0x2::coin::Coin<0x2::rtd::RTD>"],
  });
  const { result } = await mount();
  expect(result.current.data).toBeUndefined();
  expect(result.current.riskState).toBe("disabled");
  await act(async () => {
    await result.current.refetch();
  });
  expect(request).not.toHaveBeenCalled();
  expect(result.current.data).toBeUndefined();
});
it("explicit enabled service requests and normalizes a complete real query result", async () => {
  policy.enabled = true;
  request.mockResolvedValue({ blocklist: ["0x2::coin::Coin<0x2::rtd::RTD>"] });
  const { result } = await mount();
  await waitFor(() => expect(result.current.riskState).toBe("ready"));
  expect(request).toHaveBeenCalledOnce();
  expect(request).toHaveBeenCalledWith("guardian/object-list");
  expect(result.current.data).toEqual([
    normalizeStructTag("0x2::coin::Coin<0x2::rtd::RTD>"),
  ]);
});
it("an enabled service can explicitly return an empty complete list", async () => {
  policy.enabled = true;
  request.mockResolvedValue({ blocklist: [] });
  const { result } = await mount();
  await waitFor(() => expect(result.current.riskState).toBe("ready"));
  expect(result.current.data).toEqual([]);
});
it.each([{}, { blocklist: ["0x2::rtd::RTD", 42] }, { blocklist: ["broken"] }])(
  "malformed blocklists never become a ready empty risk verdict (%j)",
  async (data) => {
    policy.enabled = true;
    request.mockResolvedValue(data);
    const { result } = await mount();
    await waitFor(() => expect(result.current.riskState).toBe("error"));
    expect(result.current.data).toBeUndefined();
    expect(result.current.isError).toBe(true);
  },
);
it("service transport failure remains visibly unavailable", async () => {
  policy.enabled = true;
  request.mockRejectedValue(new Error("offline"));
  const { result } = await mount();
  await waitFor(() => expect(result.current.riskState).toBe("error"));
  expect(result.current.data).toBeUndefined();
});
