import { afterEach, expect, it, vi } from "vitest";
import {
  createRtdClient,
  Network,
} from "../../../../rtd-explorer/src/explorer/src/utils/api/DefaultRpcClient";

afterEach(() => vi.unstubAllGlobals());
it("Explorer factory uses gRPC/GraphQL transports, separates endpoint cache and performs no IO on creation", () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const first = createRtdClient("http://127.0.0.1:48101");
  const second = createRtdClient("http://127.0.0.1:48102");
  expect(first).toBe(createRtdClient("http://127.0.0.1:48101"));
  expect(second).not.toBe(first);
  expect(first.network).toBe("custom");
  expect(first.grpc).toBeDefined();
  expect(first.graphql).toBeDefined();
  expect(fetch).not.toHaveBeenCalled();
});
it.each([
  [Network.LOCAL, "localnet"],
  [Network.DEVNET, "devnet"],
  [Network.TESTNET, "testnet"],
  [Network.MAINNET, "mainnet"],
])(
  "Explorer built-in %s passes explicit SDK label %s without connecting",
  (network, label) => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(createRtdClient(network).network).toBe(label);
    expect(fetch).not.toHaveBeenCalled();
  },
);
