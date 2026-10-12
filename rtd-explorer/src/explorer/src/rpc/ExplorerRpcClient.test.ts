import { afterEach, describe, expect, it, vi } from "vitest";
import { ExplorerRpcClient } from "./ExplorerRpcClient";
import { epochPageSchema } from "./epoch-schema";

export const epoch = (value = "9007199254740993") => ({
  epoch: value,
  validators: [],
  epochTotalTransactions: "18446744073709551615",
  firstCheckpointId: "0",
  epochStartTimestamp: "1",
  endOfEpochInfo: null,
  referenceGasPrice: 1000,
});
afterEach(() => vi.unstubAllGlobals());
describe("RTD declared epoch extension, controlled HTTP contract only", () => {
  it("preserves decimal precision, selected validators and extra metadata on the actual SDK transport", async () => {
    const client = new ExplorerRpcClient({
      network: "custom",
      url: "https://epoch.test",
    });
    const signal = new AbortController().signal;
    const data = {
      ...epoch(),
      validators: [
        {
          name: "Validator",
          imageUrl: "",
          rtdAddress: "0x1",
          stakingPoolRtdBalance: "123",
          nextEpochGasPrice: "1000",
          commissionRate: "200",
          votingPower: "10000",
          extra: { nested: true },
        },
      ],
      extraEpoch: { enabled: true },
    };
    const fetch = vi.fn<typeof globalThis.fetch>(async (_url, init) => {
      const request = JSON.parse(String(init?.body));
      expect(request).toMatchObject({
        method: "rtdx_getEpochs",
        params: ["9007199254740993", 2, true],
      });
      expect(init?.signal).toBe(signal);
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: request.id,
          result: {
            data: [data],
            nextCursor: "9007199254740993",
            hasNextPage: true,
          },
        }),
      );
    });
    vi.stubGlobal("fetch", fetch);
    const page = await client.getEpochs({
      cursor: "9007199254740993",
      limit: 2,
      descendingOrder: true,
      signal,
    });
    expect(page.data[0]).toEqual(data);
    expect(fetch).toHaveBeenCalledOnce();
  });
  it("uses the declared current epoch method without inventing an SDK API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (_url, init) => {
        const request = JSON.parse(String(init?.body));
        expect(request).toMatchObject({
          method: "rtdx_getCurrentEpoch",
          params: [],
        });
        return new Response(
          JSON.stringify({ jsonrpc: "2.0", id: request.id, result: epoch() }),
        );
      }),
    );
    expect(
      (
        await new ExplorerRpcClient({
          network: "custom",
          url: "https://epoch.test",
        }).getCurrentEpoch()
      ).epoch,
    ).toBe("9007199254740993");
  });
  it.each(["garbage", "-1", "01", "18446744073709551616"])(
    "rejects invalid u64 cursor %s before dispatch",
    async (cursor) => {
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      await expect(
        new ExplorerRpcClient({
          network: "custom",
          url: "https://epoch.test",
        }).getEpochs({ cursor }),
      ).rejects.toThrow();
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it("preserves explicit pre-dispatch cancellation", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const controller = new AbortController();
    controller.abort();
    const client = new ExplorerRpcClient({
      network: "custom",
      url: "https://epoch.test",
    });
    await expect(
      client.getEpochs({ signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    await expect(
      client.getCurrentEpoch({ signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    { data: [], nextCursor: "1", hasNextPage: true },
    { data: [epoch()], nextCursor: null, hasNextPage: true },
    {
      data: [{ ...epoch(), referenceGasPrice: 9007199254740992 }],
      nextCursor: null,
      hasNextPage: false,
    },
  ])("rejects malformed pagination or unsafe numeric gas price", (value) => {
    expect(epochPageSchema.safeParse(value).success).toBe(false);
  });
  it("does not swallow a real method-not-found response into an empty page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(
        async () =>
          new Response(
            JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              error: { code: -32601, message: "Method not found" },
            }),
          ),
      ),
    );
    await expect(
      new ExplorerRpcClient({
        network: "custom",
        url: "https://epoch.test",
      }).getEpochs(),
    ).rejects.toThrow("Method not found");
  });
});
