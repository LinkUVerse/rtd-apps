// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { WalletNetworkAdmissionStore } from "./network-admission-store";

import { bcs } from "rtd-typescript/bcs";
import { GrpcTypes } from "rtd-typescript/grpc";
import {
  Transaction,
  TransactionDataBuilder,
} from "rtd-typescript/transactions";
import {
  fromBase64,
  normalizeRtdAddress,
  toBase58,
  toBase64,
} from "rtd-typescript/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  useWalletRpc,
  type WalletRpc,
} from "rtd-apps-core/src/rpc/WalletRpcContext";
import { WalletRpcProvider } from "./WalletRpcProvider";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import { BrowserExecutionLock } from "./execution-coordinator";
import {
  WalletExecutionJournal,
  type WalletJournalRecord,
} from "./execution-journal";
import { WalletTransactionReader } from "./transaction-reader";
import { WalletReadSession, StaleWalletSessionError } from "./session";
import { profileFixture } from "./profile-fixture";
import { validateNetworkProfile } from "./profile";

const owner = normalizeRtdAddress("0xb");
const digest = toBase58(new Uint8Array(32).fill(9));
function tx(resolved = false) {
  const transaction = new Transaction();
  const coin = transaction.splitCoins(transaction.gas, [1n]);
  transaction.transferObjects([coin], "0xa");
  transaction.setGasPayment([{ objectId: "0xc", version: "11", digest }]);
  if (resolved) {
    transaction.setSender(owner);
    transaction.setGasOwner(owner);
    transaction.setGasPrice(1n);
    transaction.setGasBudget(100n);
  }
  return transaction;
}
function reply(payload: Uint8Array, status = 0) {
  const trailer = new TextEncoder().encode(`grpc-status: ${status}\r\n`);
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
function effects(
  bytes: Uint8Array,
  success = true,
): GrpcTypes.TransactionEffects {
  const transactionDigest = TransactionDataBuilder.getDigestFromBytes(bytes);
  const gasUsed = {
    computationCost: 1n,
    storageCost: 2n,
    storageRebate: 0n,
    nonRefundableStorageFee: 0n,
  };
  return GrpcTypes.TransactionEffects.create({
    version: 2,
    lamportVersion: 12n,
    transactionDigest,
    epoch: 7n,
    gasUsed,
    status: success
      ? { success: true }
      : {
          success: false,
          error: {
            description: "Insufficient gas",
            kind: GrpcTypes.ExecutionError_ExecutionErrorKind.INSUFFICIENT_GAS,
            errorDetails: { oneofKind: undefined },
          },
        },
    bcs: {
      value: bcs.TransactionEffects.serialize({
        V2: {
          status: success
            ? { Success: true }
            : { Failure: { error: { InsufficientGas: true }, command: null } },
          executedEpoch: 7n,
          gasUsed,
          transactionDigest,
          gasObjectIndex: null,
          eventsDigest: null,
          dependencies: [],
          lamportVersion: 12n,
          changedObjects: [],
          unchangedConsensusObjects: [],
          auxDataDigest: null,
        },
      }).toBytes(),
    },
  });
}
function fixture(
  options: {
    alterResolution?: (value: GrpcTypes.SimulateTransactionResponse) => void;
    alterFinal?: (value: GrpcTypes.SimulateTransactionResponse) => void;
    failFinal?: boolean;
    identity?: (call: number) => Partial<GrpcTypes.GetServiceInfoResponse>;
    status?: number;
    timeoutMs?: number;
  } = {},
): {
  session: WalletReadSession;
  fetch: typeof globalThis.fetch;
  requests: GrpcTypes.SimulateTransactionRequest[];
  reader: WalletTransactionReader;
} {
  const session = new WalletReadSession(
    validateNetworkProfile({
      ...profileFixture(),
      endpoints: {
        fullnodeGrpcWeb: profileFixture().endpoints.fullnodeGrpcWeb,
      },
    }),
  );
  let info = 0;
  let resolvedProto: GrpcTypes.Transaction | undefined;
  const requests: GrpcTypes.SimulateTransactionRequest[] = [];
  const fetch = vi.fn<typeof globalThis.fetch>(
    async (url, init): Promise<Response> => {
      expect(init?.credentials).toBe("omit");
      expect(init?.redirect).toBe("error");
      expect(init?.signal).toBeDefined();
      if (String(url).endsWith("/GetServiceInfo"))
        return reply(
          GrpcTypes.GetServiceInfoResponse.toBinary({
            chainId: session.profile.expectedGenesisDigest,
            checkpointHeight: 20n,
            ...options.identity?.(++info),
          }),
        );
      expect(String(url)).toContain(
        "/rtd.rpc.v2.TransactionExecutionService/SimulateTransaction",
      );
      const request = GrpcTypes.SimulateTransactionRequest.fromBinary(
        (init!.body as Uint8Array).subarray(5),
      );
      requests.push(request);
      expect(request.checks).toBe(
        GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED,
      );
      if (!request.transaction?.bcs) {
        resolvedProto = GrpcTypes.Transaction.create(request.transaction!);
        resolvedProto.gasPayment = GrpcTypes.GasPayment.create({
          ...resolvedProto.gasPayment,
          owner,
          price: 1n,
          budget: 100n,
        });
        resolvedProto.expiration = {
          kind: GrpcTypes.TransactionExpiration_TransactionExpirationKind.NONE,
        };
        const response = GrpcTypes.SimulateTransactionResponse.create({
          transaction: {
            transaction: resolvedProto,
            effects: { status: { success: true }, epoch: 7n },
          },
        });
        options.alterResolution?.(response);
        resolvedProto = response.transaction?.transaction;
        return reply(
          GrpcTypes.SimulateTransactionResponse.toBinary(response),
          options.status,
        );
      }
      const bytes = request.transaction.bcs.value!;
      // Offline transactions skip resolver; their fixed proto is supplied by the same SDK builder test.
      if (!resolvedProto) {
        const temporary = fixture();
        await temporary.reader.prepare(tx(), owner);
        resolvedProto = GrpcTypes.Transaction.create(
          temporary.requests[0].transaction!,
        );
        resolvedProto.gasPayment = GrpcTypes.GasPayment.create({
          ...resolvedProto.gasPayment,
          owner,
          price: 1n,
          budget: 100n,
        });
        resolvedProto.expiration = {
          kind: GrpcTypes.TransactionExpiration_TransactionExpirationKind.NONE,
        };
      }
      const response = GrpcTypes.SimulateTransactionResponse.create({
        transaction: {
          digest: TransactionDataBuilder.getDigestFromBytes(bytes),
          transaction: { ...resolvedProto, bcs: { value: bytes } },
          effects: effects(bytes, !options.failFinal),
          balanceChanges: [
            { address: owner, coinType: "0x2::rtd::RTD", amount: "-3" },
          ],
        },
      });
      options.alterFinal?.(response);
      return reply(
        GrpcTypes.SimulateTransactionResponse.toBinary(response),
        options.status,
      );
    },
  );
  return {
    session,
    fetch,
    requests,
    reader: new WalletTransactionReader(session, {
      fetch,
      timeoutMs: options.timeoutMs,
    }),
  };
}
describe("Fullnode构建与最终bytes正式模拟", () => {
  function addressGasFixture(gasless = false, mutate = false) {
    const expiration = {
      kind: GrpcTypes.TransactionExpiration_TransactionExpirationKind.VALIDITY,
      epoch: 8n,
      minEpoch: 7n,
      chain: digest,
      nonce: 1,
      allowedProposers: { epoch: 7n, proposers: [0] },
    };
    const f = fixture({
      alterResolution: (response) => {
        const wire = response.transaction!.transaction!;
        wire.gasPayment!.objects = [];
        wire.gasPayment!.price = gasless ? 0n : 1n;
        wire.gasPayment!.budget = gasless ? 0n : 100n;
        wire.expiration = expiration;
      },
      alterFinal: mutate
        ? (response) => {
            const changed = Transaction.from(
              response.transaction!.transaction!.bcs!.value!,
            );
            changed.setGasPayment([{ objectId: "0xc", version: "11", digest }]);
            // A server-side re-selection may return self-consistent effects for different bytes.
            const bytes = new TransactionDataBuilder(changed.getData()).build();
            response.transaction!.transaction!.bcs!.value = bytes;
            response.transaction!.digest =
              TransactionDataBuilder.getDigestFromBytes(bytes);
            response.transaction!.effects = effects(bytes);
          }
        : undefined,
    });
    const transfer = new Transaction();
    transfer.transferObjects(
      [transfer.objectRef({ objectId: "0xd", version: "1", digest })],
      "0xa",
    );
    return { f, transfer };
  }

  it("地址余额支付gas的最终模拟和批准前复核禁用mock注入，保持原bytes", async () => {
    const { f, transfer } = addressGasFixture();
    const prepared = await f.reader.prepare(transfer, owner);
    expect(prepared.gasPaymentKind).toBe("addressBalance");
    await f.reader.simulate(prepared.bytesBase64, owner);
    expect(
      f.requests.slice(1).map((request) => request.doGasSelection),
    ).toEqual([true, true]);
    for (const request of f.requests.slice(1))
      expect(request.transaction!.bcs!.value).toEqual(
        fromBase64(prepared.bytesBase64),
      );
  });

  it("地址gas路径仍拒绝服务端重选为不同bytes，即使新effects自洽", async () => {
    const { f, transfer } = addressGasFixture(false, true);
    await expect(f.reader.prepare(transfer, owner)).rejects.toMatchObject({
      reason: "incompatible",
      stage: "final",
    });
    expect(f.requests[1].doGasSelection).toBe(true);
  });

  it("gasless空payment不启用资金选择", async () => {
    const { f, transfer } = addressGasFixture(true);
    const prepared = await f.reader.prepare(transfer, owner);
    expect(prepared.gasPaymentKind).toBe("gasless");
    await f.reader.simulate(prepared.bytesBase64, owner);
    expect(
      f.requests.slice(1).map((request) => request.doGasSelection),
    ).toEqual([false, false]);
  });

  it("准备器排队期间关闭会话不发送身份查询或模拟", async () => {
    const f = fixture();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const active = Array.from({ length: 4 }, () =>
      f.session.request(f.session.signal, () => gate),
    );
    const all = Promise.allSettled(active);
    const preparing = f.reader.prepare(tx(), owner);
    const rejected = expect(preparing).rejects.toBeInstanceOf(
      StaleWalletSessionError,
    );
    await Promise.resolve();
    expect(f.fetch).not.toHaveBeenCalled();
    f.session.close();
    await rejected;
    release();
    await all;
    expect(f.fetch).not.toHaveBeenCalled();
  });

  it("并行准备器内部身份查询和正式模拟共享四个名额，全部能完成", async () => {
    const shared = fixture().session;
    let active = 0,
      peak = 0;
    const readers = Array.from({ length: 6 }, () => {
      const f = fixture();
      return new WalletTransactionReader(shared, {
        fetch: async (input, init) => {
          active++;
          peak = Math.max(peak, active);
          try {
            await new Promise((resolve) => setTimeout(resolve, 5));
            return await f.fetch(input, init);
          } finally {
            active--;
          }
        },
      });
    });
    const results = await Promise.all(
      readers.map((reader) => reader.prepare(tx(), owner)),
    );
    expect(results).toHaveLength(6);
    expect(new Set(results.map((result) => result.digest)).size).toBe(1);
    expect(peak).toBe(4);
    expect(active).toBe(0);
  });

  it("真实SDK解析gas后冻结bytes，再checks-enabled模拟完全相同的bytes且禁止gas重选", async () => {
    const f = fixture();
    const original = tx();
    const prepared = await f.reader.prepare(original, owner);
    expect(prepared).toMatchObject({
      sender: owner,
      gasOwner: owner,
      gasBudget: "100",
      gasPrice: "1",
    });
    const bytes = fromBase64(prepared.bytesBase64);
    expect(prepared.digest).toBe(
      TransactionDataBuilder.getDigestFromBytes(bytes),
    );
    expect(prepared.simulation.$kind).toBe("Transaction");
    expect(
      prepared.simulation.Transaction?.effects.bcs?.length ?? 0,
    ).toBeGreaterThan(0);
    expect(f.requests).toHaveLength(2);
    expect(f.requests[0].doGasSelection).toBe(true);
    expect(f.requests[1].doGasSelection).toBe(false);
    expect(f.requests[1].transaction?.bcs?.value).toEqual(bytes);
    expect(f.requests[1].readMask?.paths).toEqual([
      "transaction",
      "command_outputs",
    ]);
    expect(original.getData().gasData.budget).toBeNull();
    expect(Object.isFrozen(prepared)).toBe(true);
  });
  it("已完全解析的交易仍做正式模拟，不因离线build略过核验", async () => {
    const f = fixture();
    const prepared = await f.reader.prepare(tx(true), owner);
    expect(prepared.gasBudget).toBe("100");
    expect(f.requests).toHaveLength(1);
  });
  it("显式sender不属于当前授权账户时，在任何网络请求之前拒绝", async () => {
    const f = fixture();
    const original = tx();
    original.setSender("0xd");
    await expect(f.reader.prepare(original, owner)).rejects.toMatchObject({
      reason: "sender",
    });
    expect(f.fetch).not.toHaveBeenCalled();
  });
  it.each(["owner", "price", "budget", "expiration"] as const)(
    "显式%s不能被服务器解析静默替换",
    async (field) => {
      const f = fixture();
      const original = tx();
      if (field === "owner") original.setGasOwner("0xd");
      if (field === "price") original.setGasPrice(2n);
      if (field === "budget") original.setGasBudget(200n);
      if (field === "expiration") original.setExpiration({ Epoch: "10" });
      await expect(f.reader.prepare(original, owner)).rejects.toMatchObject({
        reason: "incompatible",
        stage: "final",
      });
    },
  );
  it.each([42, "42", "9007199254740993", "18446744073709551615"])(
    "显式Epoch %s按BCS值核验，不因数字／字符串表示不同拒绝",
    async (epoch) => {
      const f = fixture({
        alterResolution: (response) => {
          response.transaction!.transaction!.expiration = {
            kind: GrpcTypes.TransactionExpiration_TransactionExpirationKind
              .EPOCH,
            epoch: BigInt(epoch),
          };
        },
      });
      const original = tx();
      original.setExpiration({ Epoch: epoch });
      const prepared = await f.reader.prepare(original, owner);
      expect(
        String(
          Transaction.from(prepared.bytesBase64).getData().expiration!.Epoch,
        ),
      ).toBe(String(epoch));
    },
  );
  it("不复制调用方可执行build插件", async () => {
    const f = fixture();
    const original = tx();
    const plugin = vi.fn();
    original.addBuildPlugin(async () => {
      plugin();
      throw new Error("unexpected plugin");
    });
    await f.reader.prepare(original, owner);
    expect(plugin).not.toHaveBeenCalled();
  });
  it.each([
    (r: GrpcTypes.SimulateTransactionResponse) => {
      r.transaction!.effects!.status = undefined;
    },
    (r: GrpcTypes.SimulateTransactionResponse) => {
      r.transaction!.effects!.status = {};
    },
    (r: GrpcTypes.SimulateTransactionResponse) => {
      r.transaction!.effects!.epoch = undefined;
    },
    (r: GrpcTypes.SimulateTransactionResponse) => {
      r.transaction!.transaction!.gasPayment!.price = undefined;
    },
    (r: GrpcTypes.SimulateTransactionResponse) => {
      r.transaction!.transaction!.gasPayment!.budget = undefined;
    },
    (r: GrpcTypes.SimulateTransactionResponse) => {
      r.transaction!.transaction!.gasPayment!.owner = undefined;
    },
  ])(
    "构建响应缺关键字段拒绝，不给SDK默认值冒充成功",
    async (alterResolution) => {
      const f = fixture({ alterResolution });
      await expect(f.reader.prepare(tx(), owner)).rejects.toBeInstanceOf(Error);
      expect(f.requests).toHaveLength(1);
    },
  );
  it("构建阶段模拟失败不能进入最终模拟或签名", async () => {
    const f = fixture({
      alterResolution: (r) => {
        r.transaction!.effects!.status = { success: false };
      },
    });
    await expect(f.reader.prepare(tx(), owner)).rejects.toMatchObject({
      stage: "resolution",
    });
    expect(f.requests).toHaveLength(1);
  });
  it("官方模拟可省略外层摘要，仍验证effects摘要与原生BCS", async () => {
    const f = fixture({
      alterFinal: (r) => {
        r.transaction!.digest = undefined;
      },
    });
    const prepared = await f.reader.prepare(tx(), owner);
    expect(prepared.simulation.Transaction?.digest).toBe(prepared.digest);
    const bad = fixture({
      alterFinal: (r) => {
        r.transaction!.digest = undefined;
        r.transaction!.effects!.transactionDigest = digest;
      },
    });
    await expect(bad.reader.prepare(tx(), owner)).rejects.toBeInstanceOf(Error);
  });
  it("最终模拟失败拒绝prepare，单独simulate保留FailedTransaction联合类型", async () => {
    const f = fixture({ failFinal: true });
    await expect(f.reader.prepare(tx(), owner)).rejects.toMatchObject({
      reason: "failed",
      stage: "final",
    });
    const good = await fixture().reader.prepare(tx(), owner);
    const result = await f.reader.simulate(good.bytesBase64, owner);
    expect(result.$kind).toBe("FailedTransaction");
    expect(result.FailedTransaction?.status.success).toBe(false);
  });
  it.each([
    (r: GrpcTypes.SimulateTransactionResponse) => {
      r.transaction!.digest = digest;
    },
    (r: GrpcTypes.SimulateTransactionResponse) => {
      r.transaction!.effects!.transactionDigest = digest;
    },
    (r: GrpcTypes.SimulateTransactionResponse) => {
      r.transaction!.transaction!.bcs = undefined;
    },
    (r: GrpcTypes.SimulateTransactionResponse) => {
      r.transaction!.effects!.bcs = undefined;
    },
    (r: GrpcTypes.SimulateTransactionResponse) => {
      r.transaction!.effects!.gasUsed!.storageCost = 3n;
    },
    (r: GrpcTypes.SimulateTransactionResponse) => {
      r.transaction!.effects!.status = { success: false };
    },
    (r: GrpcTypes.SimulateTransactionResponse) => {
      r.transaction!.transaction!.sender = "0xd";
    },
    (r: GrpcTypes.SimulateTransactionResponse) => {
      r.transaction!.balanceChanges[0].amount = "1.1";
    },
  ])("最终模拟摘要、BCS、状态或预览数据不一致全批拒绝", async (alterFinal) => {
    const f = fixture({ alterFinal });
    await expect(f.reader.prepare(tx(), owner)).rejects.toBeInstanceOf(Error);
  });
  it.each(["owner", "price", "budget", "payment", "expiration"] as const)(
    "最终模拟proto的%s与批准BCS不一致时拒绝，不采用服务器重建事实",
    async (field) => {
      const f = fixture({
        alterFinal: (response) => {
          const transaction = response.transaction!.transaction!;
          const gas = transaction.gasPayment!;
          if (field === "owner") gas.owner = "0xd";
          if (field === "price") gas.price = 2n;
          if (field === "budget") gas.budget = 200n;
          if (field === "payment")
            gas.objects[0].version = gas.objects[0].version! + 1n;
          if (field === "expiration")
            transaction.expiration = {
              kind: GrpcTypes.TransactionExpiration_TransactionExpirationKind
                .EPOCH,
              epoch: 10n,
            };
        },
      });
      await expect(f.reader.prepare(tx(), owner)).rejects.toMatchObject({
        reason: "incompatible",
        stage: "final",
      });
    },
  );
  it.each([
    "170141183460469231731687303715884105728",
    "-170141183460469231731687303715884105729",
    "-0",
  ])("balanceChanges必须为Rust定义的i128规范整数 %s", async (amount) => {
    const f = fixture({
      alterFinal: (r) => {
        r.transaction!.balanceChanges[0].amount = amount;
      },
    });
    await expect(f.reader.prepare(tx(), owner)).rejects.toMatchObject({
      reason: "incompatible",
    });
  });
  it.each([
    "170141183460469231731687303715884105727",
    "-170141183460469231731687303715884105728",
  ])("合法i128边界保持精度 %s", async (amount) => {
    const f = fixture({
      alterFinal: (r) => {
        r.transaction!.balanceChanges[0].amount = amount;
      },
    });
    expect(
      (await f.reader.prepare(tx(), owner)).simulation.Transaction
        ?.balanceChanges[0].amount,
    ).toBe(amount);
  });
  it.each([1, 2])("构建前或最终模拟后换链拒绝", async (call) => {
    const f = fixture({
      identity: (n) => (n === call ? { chainId: digest } : {}),
    });
    await expect(f.reader.prepare(tx(), owner)).rejects.toMatchObject({
      reason: "chain-mismatch",
    });
  });
  it("HTTP200失败trailer不能成为可签名预览", async () => {
    await expect(
      fixture({ status: 14 }).reader.prepare(tx(), owner),
    ).rejects.toBeInstanceOf(Error);
  });
  it("调用方取消及会话关闭拒绝迟到结果", async () => {
    const f = fixture();
    let release!: () => void;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const reader = new WalletTransactionReader(f.session, {
      fetch: async (...args) => {
        await hold;
        return f.fetch(...args);
      },
    });
    const pending = reader.prepare(tx(), owner);
    f.session.close();
    release();
    await expect(pending).rejects.toBeInstanceOf(StaleWalletSessionError);
    const g = fixture();
    const controller = new AbortController();
    controller.abort();
    await expect(
      g.reader.prepare(tx(), owner, controller.signal),
    ).rejects.toBeInstanceOf(Error);
    expect(g.fetch).not.toHaveBeenCalled();
  });
  it("simulate拒绝非规范BCS／不同sender，不重新选gas或重建", async () => {
    const f = fixture();
    const good = await f.reader.prepare(tx(), owner);
    await expect(
      f.reader.simulate(good.bytesBase64, "0xd"),
    ).rejects.toMatchObject({ reason: "sender" });
    await expect(
      f.reader.simulate(toBase64(new Uint8Array([1])), owner),
    ).rejects.toBeInstanceOf(Error);
  });
  it("真实Provider/StrictMode注入 Fullnode-only 构建与模拟领域，并在卸载后关闭会话", async () => {
    const f = fixture();
    const pending = vi
      .spyOn(WalletExecutionJournal.prototype, "pending")
      .mockResolvedValue(null);
    const lock = vi
      .spyOn(BrowserExecutionLock.prototype, "run")
      .mockImplementation(
        async <T>(_scope: string, operation: () => Promise<T>) => operation(),
      );
    vi.stubGlobal("fetch", f.fetch);
    const element = document.createElement("div");
    const root = createRoot(element);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    let rpc!: WalletRpc;
    function Capture() {
      rpc = useWalletRpc();
      return null;
    }
    try {
      await act(async () =>
        root.render(
          createElement(
            StrictMode,
            null,
            createElement(
              QueryClientProvider,
              { client },
              createElement(WalletRpcProvider, {
                selection: { state: "configured", profile: f.session.profile },
                children: createElement(Capture),
              }),
            ),
          ),
        ),
      );
      await act(async () =>
        vi.waitFor(() => expect(rpc.state).toBe("configured")),
      );
      const prepared = await rpc.prepareTransaction(tx(), owner);
      expect(prepared.readSessionKey).toBe(rpc.readSessionKey);
      const requestsBeforePending = vi.mocked(f.fetch).mock.calls.length;
      pending.mockResolvedValueOnce({
        state: "dispatch-pending",
      } as WalletJournalRecord);
      await expect(rpc.prepareTransaction(tx(), owner)).rejects.toThrow(
        "待确认",
      );
      expect(vi.mocked(f.fetch).mock.calls.length).toBe(requestsBeforePending);
      expect(
        (await rpc.simulateTransaction(prepared.bytesBase64, owner)).$kind,
      ).toBe("Transaction");
      await act(async () => root.unmount());
      await expect(
        rpc.simulateTransaction(prepared.bytesBase64, owner),
      ).rejects.toBeInstanceOf(StaleWalletSessionError);
    } finally {
      client.clear();
      pending.mockRestore();
      lock.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});

it("binds native fetch to the worker global instead of the reader instance", async () => {
  const f = fixture();
  const original = globalThis.fetch;
  globalThis.fetch = function (this: unknown, input, init) {
    // WorkerGlobalScope.fetch performs this native receiver check in real Chromium.
    expect(this).toBe(globalThis);
    return f.fetch(input, init);
  };
  try {
    const prepared = await new WalletTransactionReader(f.session).prepare(
      tx(),
      owner,
    );
    expect(prepared.simulation.$kind).toBe("Transaction");
  } finally {
    globalThis.fetch = original;
    f.session.close();
  }
});
it("keeps real simulated effects parseable after the background JSON message boundary", async () => {
  const { encodePreparedTransaction, decodePreparedTransaction } =
    await import("./prepared-wire");
  const { receiptObjectEffects } =
    await import("rtd-apps-core/src/rpc/transaction-view");
  const f = fixture();
  try {
    const prepared = await f.reader.prepare(tx(), owner);
    const restored = decodePreparedTransaction(
      JSON.parse(JSON.stringify(encodePreparedTransaction(prepared))),
    );
    expect(receiptObjectEffects(restored.simulation.Transaction!)).toEqual(
      receiptObjectEffects(prepared.simulation.Transaction!),
    );
    expect(restored.digest).toBe(prepared.digest);
  } finally {
    f.session.close();
  }
});

// Existing reader/Provider protocol fixtures do not claim native storage proof.
beforeEach(() => {
  vi.spyOn(WalletNetworkAdmissionStore.prototype, "capture").mockResolvedValue(
    undefined,
  );
});
