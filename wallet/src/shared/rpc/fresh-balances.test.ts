import { describe, expect, it, vi } from "vitest";
import { GrpcTypes } from "rtd-typescript/grpc";
import { normalizeStructTag } from "rtd-typescript/utils";
import { WalletFullnodeReader } from "./fullnode-reader";
import { WalletReadSession } from "./session";
import { validateNetworkProfile } from "./profile";
import { profileFixture } from "./profile-fixture";
import { grpcResponse } from "../../../tests/unit/rpc/execution-fixtures";

const type = normalizeStructTag("0x2::rtd::RTD"),
  other = normalizeStructTag("0x3::test::TEST");
const balance = {
  coinType: type,
  balance: 999869964544n,
  coinBalance: 999869964544n,
};
function fixture(
  pages: GrpcTypes.ListBalancesResponse[],
  options: {
    maxPages?: number;
    maxCoins?: number;
    timeoutMs?: number;
    afterPage?: (page: number) => void;
    badFinal?: "height" | "identity";
  } = {},
) {
  const session = new WalletReadSession(
    validateNetworkProfile(profileFixture()),
  );
  let identities = 0,
    index = 0;
  const requests: GrpcTypes.ListBalancesRequest[] = [];
  const fetch = vi.fn<typeof globalThis.fetch>(async (url, init) => {
    if (String(url).endsWith("/GetServiceInfo")) {
      identities++;
      return grpcResponse(
        GrpcTypes.GetServiceInfoResponse.toBinary({
          chainId:
            identities > 1 && options.badFinal === "identity"
              ? "11111111111111111111111111111111"
              : session.profile.expectedGenesisDigest,
          checkpointHeight:
            identities > 1 && options.badFinal === "height" ? 9n : 10n,
        }),
      );
    }
    expect(String(url)).toContain("/rtd.rpc.v2.StateService/ListBalances");
    const request = GrpcTypes.ListBalancesRequest.fromBinary(
      (init!.body as Uint8Array).subarray(5),
    );
    requests.push(request);
    expect(request.owner).toMatch(/^0x0+b$/);
    expect(request.pageSize).toBe(100);
    const page = pages[index++ % pages.length];
    options.afterPage?.(index);
    return grpcResponse(GrpcTypes.ListBalancesResponse.toBinary(page));
  });
  return {
    session,
    fetch,
    requests,
    reader: new WalletFullnodeReader(session, { fetch, ...options }),
  };
}
describe("live all-balances never masquerade as an indexed asset snapshot", () => {
  it("reads the current total/components once, checks H0 before and after, and shares only predispatch", async () => {
    const f = fixture([{ balances: [balance] }]);
    const [a, b] = await Promise.all([
      f.reader.balances("0xb"),
      f.reader.balances("0xb"),
    ]);
    expect(a).toEqual([
      {
        coinType: type,
        balance: "999869964544",
        coinBalance: "999869964544",
        addressBalance: "0",
      },
    ]);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    expect(Object.isFrozen(a)).toBe(true);
    expect(Object.isFrozen(a[0])).toBe(true);
    expect(f.fetch).toHaveBeenCalledTimes(3);
    await f.reader.balances("0xb");
    expect(f.fetch).toHaveBeenCalledTimes(6);
  });
  it("follows real page tokens including nonterminal empty pages; preserves exact decimal amounts", async () => {
    const one = Uint8Array.of(1),
      two = Uint8Array.of(2);
    const f = fixture([
      { balances: [balance], nextPageToken: one },
      { balances: [], nextPageToken: two },
      {
        balances: [
          {
            coinType: other,
            balance: 9007199254740993n,
            addressBalance: 9007199254740993n,
          },
        ],
      },
    ]);
    const got = await f.reader.balances("0xb");
    expect(got[1].balance).toBe("9007199254740993");
    expect(got[1].coinBalance).toBe("0");
    expect(f.requests.map((r) => r.pageToken)).toEqual([undefined, one, two]);
    expect(f.fetch).toHaveBeenCalledTimes(5);
  });
  it("an explicit terminal empty response is empty, never synthesized after an error", async () => {
    const f = fixture([{ balances: [] }]);
    expect(await f.reader.balances("0xb")).toEqual([]);
    expect(f.fetch).toHaveBeenCalledTimes(3);
    f.fetch.mockRejectedValue(new Error("offline"));
    await expect(f.reader.balances("0xb")).rejects.toThrow("offline");
  });
  it.each([
    {},
    { coinType: type },
    { balance: 0n },
    { coinType: type, balance: 1n },
    { coinType: type, balance: 1n, coinBalance: 2n },
    { coinType: "invalid", balance: 0n },
  ])(
    "rejects incomplete/invalid balance instead of inventing zero",
    async (raw) => {
      await expect(
        fixture([{ balances: [raw] }]).reader.balances("0xb"),
      ).rejects.toThrow();
    },
  );
  it.each(["height", "identity"] as const)(
    "rejects final %s change",
    async (badFinal) => {
      await expect(
        fixture([{ balances: [balance] }], { badFinal }).reader.balances("0xb"),
      ).rejects.toThrow();
    },
  );
  it("rejects duplicate normalized coin types across pages", async () => {
    const f = fixture([
      { balances: [balance], nextPageToken: Uint8Array.of(1) },
      { balances: [{ ...balance, coinType: "0x2::rtd::RTD" }] },
    ]);
    await expect(f.reader.balances("0xb")).rejects.toMatchObject({
      reason: "pagination",
    });
  });
  it.each([new Uint8Array(), Uint8Array.of(1)])(
    "rejects empty/repeated next tokens",
    async (token) => {
      await expect(
        fixture([{ balances: [], nextPageToken: token }]).reader.balances(
          "0xb",
        ),
      ).rejects.toMatchObject({ reason: "pagination" });
    },
  );
  it("never returns a partial list on page or item budget exhaustion", async () => {
    await expect(
      fixture([{ balances: [balance], nextPageToken: Uint8Array.of(1) }], {
        maxPages: 1,
      }).reader.balances("0xb"),
    ).rejects.toMatchObject({ reason: "budget" });
    await expect(
      fixture([{ balances: [balance, { coinType: other, balance: 0n }] }], {
        maxCoins: 1,
      }).reader.balances("0xb"),
    ).rejects.toMatchObject({ reason: "budget" });
  });
  it("rejects late pages after session replacement or caller cancellation", async () => {
    let f: ReturnType<typeof fixture>;
    f = fixture([{ balances: [balance] }], {
      afterPage: () => f.session.close(),
    });
    await expect(f.reader.balances("0xb")).rejects.toThrow();
    const c = new AbortController();
    f = fixture([{ balances: [balance] }], { afterPage: () => c.abort() });
    await expect(f.reader.balances("0xb", c.signal)).rejects.toThrow();
  });
});
