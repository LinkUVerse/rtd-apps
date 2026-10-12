// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from "vitest";
import { bcs } from "rtd-typescript/bcs";
import { Transaction } from "rtd-typescript/transactions";
import {
  normalizeRtdAddress as address,
  normalizeStructTag as tag,
  toBase58,
  RTD_TYPE_ARG,
} from "rtd-typescript/utils";
import type {
  WalletFreshObject,
  WalletRpc,
  WalletPreparedTransaction,
} from "rtd-apps-core/src/rpc/WalletRpcContext";
import { STAKED_RTD_BCS, SYSTEM_WRAPPER_BCS } from "./staking-bcs";
import {
  prepareStaking,
  revalidateStaking,
  type StakingInput,
} from "./staking-preparation";
function fixture() {
  const sender = address("0xa"),
    objectId = address("0xb"),
    poolId = address("0xc");
  const common = {
    json: undefined,
    display: undefined,
    version: "9007199254740993",
    digest: toBase58(new Uint8Array(32).fill(1)),
    objectBcs: new Uint8Array(),
    previousTransaction: toBase58(new Uint8Array(32).fill(2)),
    hasPublicTransfer: null,
  };
  const system: WalletFreshObject = {
    ...common,
    objectId: address("0x5"),
    type: tag("0x3::rtd_system::RtdSystemState"),
    content: SYSTEM_WRAPPER_BCS.serialize({
      id: address("0x5"),
      version: "2",
    }).toBytes(),
    owner: { $kind: "Shared", Shared: { initialSharedVersion: "42" } },
  };
  const stake: WalletFreshObject = {
    ...common,
    objectId,
    type: tag("0x3::staking_pool::StakedRtd"),
    content: STAKED_RTD_BCS.serialize({
      id: objectId,
      pool_id: poolId,
      stake_activation_epoch: "99",
      principal: { value: "9007199254740993" },
    }).toBytes(),
    owner: { $kind: "AddressOwner", AddressOwner: sender },
  };
  const prepared = {
    bindingKey: "binding",
    readSessionKey: "session",
    sender,
    digest: "digest",
    bytesBase64: "reviewed",
  } as WalletPreparedTransaction;
  const read = vi.fn(async (id: string) =>
    id === system.objectId ? system : stake,
  );
  const build = vi.fn(async (_tx: Transaction) => prepared);
  const simulate = vi.fn(async () => ({
    $kind: "Transaction",
    Transaction: { digest: prepared.digest },
  }));
  const rpc = {
    bindingKey: "binding",
    readSessionKey: "session",
    readFreshObject: read,
    readFreshBalance: vi
      .fn()
      .mockResolvedValue({
        coinType: RTD_TYPE_ARG,
        balance: "18446744073709551615",
        coinBalance: "0",
        addressBalance: "18446744073709551615",
      }),
    prepareTransaction: build,
    simulateTransaction: simulate,
  } as unknown as WalletRpc;
  const input: StakingInput = {
    kind: "stake",
    sender,
    amount: "9007199254740993",
    validator: address("0xd"),
  };
  return {
    sender,
    objectId,
    poolId,
    system,
    stake,
    prepared,
    read,
    build,
    simulate,
    rpc,
    input,
  };
}
describe("staking preparation uses current Fullnode references", () => {
  it("rejects stale displayed funds before construction and does not require coins for address funds", async () => {
    const f = fixture();
    vi.mocked(f.rpc.readFreshBalance).mockResolvedValueOnce({
      coinType: RTD_TYPE_ARG,
      balance: "1",
      coinBalance: "0",
      addressBalance: "1",
    });
    await expect(prepareStaking(f.rpc, f.input)).rejects.toThrow(
      "当前可质押余额不足",
    );
    expect(f.build).not.toHaveBeenCalled();
    await prepareStaking(f.rpc, f.input);
    expect(f.build.mock.calls[0][0].getData().gasData.payment).toBeNull();
  });
  it("does not build when the live balance dependency fails", async () => {
    const f = fixture();
    vi.mocked(f.rpc.readFreshBalance).mockRejectedValueOnce(
      new Error("balance unavailable"),
    );
    await expect(prepareStaking(f.rpc, f.input)).rejects.toThrow(
      "balance unavailable",
    );
    expect(f.build).not.toHaveBeenCalled();
  });
  it("builds stake with current shared version and exact u64 amount", async () => {
    const f = fixture();
    const result = await prepareStaking(f.rpc, f.input);
    const tx = f.build.mock.calls[0][0].getData();
    expect(tx.inputs[0].Object?.SharedObject).toMatchObject({
      initialSharedVersion: "42",
      mutable: true,
    });
    expect(tx.commands[0].SplitCoins?.amounts).toHaveLength(1);
    expect(tx.inputs[1].Pure?.bytes).toBe(
      bcs.u64().serialize("9007199254740993").toBase64(),
    );
    expect(tx.commands[1].MoveCall).toMatchObject({
      package: address("0x3"),
      module: "rtd_system",
      function: "request_add_stake",
    });
    expect(result.input).toEqual(f.input);
    expect(result.withdrawal).toBeNull();
    expect(f.build.mock.calls).toHaveLength(1);
  });
  it.each(["0", "-1", "1.1", "01", "18446744073709551616"])(
    "rejects invalid amount %s before any request",
    async (amount) => {
      const f = fixture();
      await expect(
        prepareStaking(f.rpc, {
          ...f.input,
          kind: "stake",
          amount,
          validator: address("0xd"),
        }),
      ).rejects.toThrow();
      expect(f.read).not.toHaveBeenCalled();
    },
  );
  it("withdrawal uses current owned reference and does not infer an Active-only restriction", async () => {
    const f = fixture();
    const result = await prepareStaking(f.rpc, {
      kind: "withdraw",
      sender: f.sender,
      objectId: f.objectId,
    });
    expect(result.withdrawal).toEqual({
      principal: "9007199254740993",
      poolId: f.poolId,
      activationEpoch: "99",
    });
    const tx = f.build.mock.calls[0][0].getData();
    expect(tx.inputs[1].Object?.ImmOrOwnedObject).toMatchObject({
      objectId: f.objectId,
      version: f.stake.version,
      digest: f.stake.digest,
    });
    expect(tx.commands[0].MoveCall?.function).toBe("request_withdraw_stake");
  });
  it("consensus owner uses startVersion instead of owned ref", async () => {
    const f = fixture();
    f.stake.owner = {
      $kind: "ConsensusAddressOwner",
      ConsensusAddressOwner: { owner: f.sender, startVersion: "77" },
    };
    await prepareStaking(f.rpc, {
      kind: "withdraw",
      sender: f.sender,
      objectId: f.objectId,
    });
    expect(
      f.build.mock.calls[0][0].getData().inputs[1].Object?.SharedObject,
    ).toMatchObject({ initialSharedVersion: "77" });
  });
  it("rejects transferred stake before building", async () => {
    const f = fixture();
    f.stake.owner = { $kind: "AddressOwner", AddressOwner: address("0xee") };
    await expect(
      prepareStaking(f.rpc, {
        kind: "withdraw",
        sender: f.sender,
        objectId: f.objectId,
      }),
    ).rejects.toThrow("不拥有");
    expect(f.build).not.toHaveBeenCalled();
  });
  it("rejects noncanonical content and mismatched UID", async () => {
    for (const bytes of [
      new Uint8Array([...fixture().system.content, 0]),
      SYSTEM_WRAPPER_BCS.serialize({
        id: address("0xf"),
        version: "2",
      }).toBytes(),
    ]) {
      const f = fixture();
      f.system.content = bytes;
      await expect(prepareStaking(f.rpc, f.input)).rejects.toThrow();
      expect(f.build).not.toHaveBeenCalled();
    }
  });
  it("rejects changed session while resolving", async () => {
    const f = fixture();
    f.build.mockImplementation(async () => {
      Object.assign(f.rpc, { readSessionKey: "new" });
      return f.prepared;
    });
    await expect(prepareStaking(f.rpc, f.input)).rejects.toThrow("会话");
  });
  it("confirm simulates original bytes without rebuilding", async () => {
    const f = fixture();
    const prepared = await prepareStaking(f.rpc, f.input);
    f.build.mockClear();
    f.read.mockClear();
    expect(await revalidateStaking(f.rpc, prepared, f.sender)).toBe(prepared);
    expect(f.simulate).toHaveBeenCalledWith("reviewed", f.sender, undefined);
    expect(f.build).not.toHaveBeenCalled();
    expect(f.read).not.toHaveBeenCalled();
    f.simulate.mockResolvedValue({
      $kind: "Transaction",
      Transaction: { digest: "changed" },
    });
    await expect(revalidateStaking(f.rpc, prepared, f.sender)).rejects.toThrow(
      "原批准",
    );
  });
  it("cancelled preparation cannot issue a request", async () => {
    const f = fixture(),
      cancel = new AbortController();
    cancel.abort();
    await expect(
      prepareStaking(f.rpc, f.input, cancel.signal),
    ).rejects.toThrow();
    expect(f.read).not.toHaveBeenCalled();
  });
});
