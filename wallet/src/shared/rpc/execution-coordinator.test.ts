// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";
import { GrpcTypes } from "rtd-typescript/grpc";
import { WalletExecutionReader } from "./execution-reader";
import { messageWithIntent } from "rtd-typescript/cryptography";
import {
  Transaction,
  TransactionDataBuilder,
} from "rtd-typescript/transactions";
import { verifyTransactionSignature } from "rtd-typescript/verify";
import { toBase58, toBase64 } from "rtd-typescript/utils";
import {
  executionFixture,
  grpcResponse,
  sender,
} from "../../../tests/unit/rpc/execution-fixtures";
import {
  WalletExecutionCoordinator,
  type ExecutionLock,
} from "./execution-coordinator";
import {
  assertExecutionReceipt,
  createPendingRecord,
  type WalletJournalRecord,
} from "./execution-journal";
import { profileFixture } from "./profile-fixture";
import { validateNetworkProfile } from "./profile";
import { WalletReadSession } from "./session";

async function fixture() {
  const tx = await executionFixture();
  const session = new WalletReadSession(
    validateNetworkProfile(profileFixture()),
  );
  const records = new Map<string, WalletJournalRecord>();
  const journal = {
    get: vi.fn(async (id: string) => records.get(id) ?? null),
    pending: vi.fn(
      async (scope: string) =>
        [...records.values()].find(
          (record) =>
            record.scope === scope && record.state === "dispatch-pending",
        ) ?? null,
    ),
    commitPending: vi.fn(async (record: WalletJournalRecord) => {
      records.set(record.id, record);
    }),
    commitReceipt: vi.fn(
      async (id: string, receipt: ReturnType<typeof tx.receipt>) => {
        assertExecutionReceipt(receipt);
        const prior = records.get(id)!;
        const next: WalletJournalRecord = {
          ...prior,
          state: receipt.success ? "confirmed-success" : "confirmed-failure",
          receipt,
        };
        records.set(id, next);
        return next;
      },
    ),
  };
  const reader = {
    dispatch: vi.fn().mockResolvedValue(tx.receipt()),
    lookup: vi.fn().mockResolvedValue(tx.receipt()),
    verifySignature: vi.fn(
      async (_bytes: string, owner: string, signature: string) => {
        await verifyTransactionSignature(tx.bytes, signature, {
          address: owner,
        });
      },
    ),
  };
  let locked = false;
  const lock: ExecutionLock = {
    run: async (_scope, operation) => {
      if (locked) throw new Error("busy");
      locked = true;
      try {
        return await operation();
      } finally {
        locked = false;
      }
    },
  };
  const coordinator = new WalletExecutionCoordinator(
    session,
    journal,
    reader,
    lock,
  );
  const input = {
    accountId: "account",
    accountAddress: sender,
    requestId: "request",
    originRef: "wallet-ui",
    bindingKey: session.bindingKey,
    bytesBase64: tx.bytesBase64,
    digest: tx.digest,
  };
  const callbacks = {
    authorize: vi.fn().mockResolvedValue(undefined),
    simulate: vi.fn().mockResolvedValue(undefined),
    signData: vi.fn(async (intent: Uint8Array) => {
      expect(intent).toEqual(messageWithIntent("TransactionData", tx.bytes));
      return tx.signed.signature;
    }),
  };
  return {
    tx,
    session,
    records,
    journal,
    reader,
    coordinator,
    lock,
    input,
    callbacks,
  };
}
describe("空恢复唤醒与正常准备并发", () => {
  it("读取空journal期间不占用执行锁，允许新窗口正常准备", async () => {
    const f = await fixture();
    let release!: () => void;
    let entered!: () => void;
    const entry = new Promise<void>((resolve) => {
      entered = resolve;
    });
    f.journal.pending.mockImplementationOnce(async () => {
      entered();
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return null;
    });
    const recovering = f.coordinator.recover(sender, f.callbacks.authorize);
    await entry;
    try {
      await expect(
        f.lock.run("preparation", async () => "prepared"),
      ).resolves.toBe("prepared");
    } finally {
      release();
      await expect(recovering).resolves.toBeNull();
      f.session.close();
    }
    expect(f.reader.lookup).not.toHaveBeenCalled();
    expect(f.reader.dispatch).not.toHaveBeenCalled();
    expect(f.callbacks.signData).not.toHaveBeenCalled();
    expect(f.journal.commitReceipt).not.toHaveBeenCalled();
  });

  it("已有正常准备占锁时空恢复返回null，有pending时仍拒绝竞争", async () => {
    const f = await fixture();
    await f.lock.run("preparation", async () => {
      await expect(
        f.coordinator.recover(sender, f.callbacks.authorize),
      ).resolves.toBeNull();
      const record = createPendingRecord(f.session.profile, f.input);
      f.records.set(record.id, record);
      await expect(
        f.coordinator.recover(sender, f.callbacks.authorize),
      ).rejects.toThrow("busy");
      expect(f.records.get(record.id)).toEqual(record);
    });
    expect(f.reader.lookup).not.toHaveBeenCalled();
    expect(f.reader.dispatch).not.toHaveBeenCalled();
    f.session.close();
  });

  it("预查有pending但锁内已终结时重新读取，不使用过期候选记录", async () => {
    const f = await fixture();
    const candidate = createPendingRecord(f.session.profile, f.input);
    f.journal.pending
      .mockResolvedValueOnce(candidate)
      .mockResolvedValueOnce(null);
    const locking = vi.spyOn(f.lock, "run");
    await expect(
      f.coordinator.recover(sender, f.callbacks.authorize),
    ).resolves.toBeNull();
    expect(locking).toHaveBeenCalledOnce();
    expect(f.journal.pending).toHaveBeenCalledTimes(2);
    expect(f.reader.lookup).not.toHaveBeenCalled();
    expect(f.journal.commitReceipt).not.toHaveBeenCalled();
    f.session.close();
  });

  it.each(["revoked", "closed", "storage"] as const)(
    "空恢复的%s错误不得成为成功或触发发送",
    async (failure) => {
      const f = await fixture();
      if (failure === "revoked")
        f.callbacks.authorize.mockRejectedValue(new Error("revoked"));
      if (failure === "closed")
        f.journal.pending.mockImplementationOnce(async () => {
          f.session.close();
          return null;
        });
      if (failure === "storage")
        f.journal.pending.mockRejectedValueOnce(new Error("storage"));
      await expect(
        f.coordinator.recover(sender, f.callbacks.authorize),
      ).rejects.toThrow();
      expect(f.reader.lookup).not.toHaveBeenCalled();
      expect(f.reader.dispatch).not.toHaveBeenCalled();
      expect(f.callbacks.signData).not.toHaveBeenCalled();
      expect(f.journal.commitReceipt).not.toHaveBeenCalled();
      f.session.close();
    },
  );
});

describe("批准bytes提交与保守恢复协调", () => {
  it.each([true, false])(
    "签名同一Intent，durable pending后只dispatch一次，链终态 %s",
    async (success) => {
      const f = await fixture();
      f.reader.dispatch.mockResolvedValue(f.tx.receipt(success));
      const result = await f.coordinator.execute(f.input, f.callbacks);
      expect(result.state).toBe("confirmed");
      expect(f.reader.dispatch).toHaveBeenCalledTimes(1);
      expect(f.callbacks.signData).toHaveBeenCalledTimes(1);
      expect(f.journal.commitPending.mock.invocationCallOrder[0]).toBeLessThan(
        f.reader.dispatch.mock.invocationCallOrder[0],
      );
      expect([...f.records.values()][0].state).toBe(
        success ? "confirmed-success" : "confirmed-failure",
      );
      await f.coordinator.execute(f.input, f.callbacks);
      expect(f.reader.dispatch).toHaveBeenCalledTimes(1);
      expect(f.callbacks.signData).toHaveBeenCalledTimes(1);
    },
  );
  it("pending事务未完成前不得广播", async () => {
    const f = await fixture();
    let release!: () => void;
    let entered!: () => void;
    const entry = new Promise<void>((resolve) => {
      entered = resolve;
    });
    f.journal.commitPending.mockImplementation(async (record) => {
      f.records.set(record.id, record);
      entered();
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    });
    const executing = f.coordinator.execute(f.input, f.callbacks);
    await entry;
    expect(f.reader.dispatch).not.toHaveBeenCalled();
    release();
    await executing;
    expect(f.reader.dispatch).toHaveBeenCalledTimes(1);
  });
  it("durable写失败完全不dispatch", async () => {
    const f = await fixture();
    f.journal.commitPending.mockRejectedValue(new Error("quota"));
    await expect(f.coordinator.execute(f.input, f.callbacks)).rejects.toThrow(
      "quota",
    );
    expect(f.reader.dispatch).not.toHaveBeenCalled();
  });
  it("已提交pending但会话在dispatch前关闭，恢复窗口保持未知", async () => {
    const f = await fixture();
    f.journal.commitPending.mockImplementation(async (record) => {
      f.records.set(record.id, record);
      f.session.close();
    });
    expect((await f.coordinator.execute(f.input, f.callbacks)).state).toBe(
      "pending",
    );
    expect(f.reader.dispatch).not.toHaveBeenCalled();
    expect([...f.records.values()][0].state).toBe("dispatch-pending");
  });
  it("网络异常保持pending，下次不simulate、不签名、不重发", async () => {
    const f = await fixture();
    f.reader.dispatch.mockRejectedValue(new Error("timeout"));
    expect((await f.coordinator.execute(f.input, f.callbacks)).state).toBe(
      "pending",
    );
    expect(
      (
        await f.coordinator.execute(
          { ...f.input, requestId: "new-request" },
          f.callbacks,
        )
      ).state,
    ).toBe("pending");
    expect(f.callbacks.simulate).toHaveBeenCalledTimes(1);
    expect(f.callbacks.signData).toHaveBeenCalledTimes(1);
    expect(f.reader.dispatch).toHaveBeenCalledTimes(1);
  });
  it("终结回执写失败保持pending，恢复只查原摘要", async () => {
    const f = await fixture();
    f.journal.commitReceipt.mockRejectedValueOnce(new Error("quota"));
    expect(await f.coordinator.execute(f.input, f.callbacks)).toMatchObject({
      state: "pending",
      reason: "storage-unavailable",
    });
    const result = await f.coordinator.recover(sender, f.callbacks.authorize);
    expect(result?.state).toBe("confirmed");
    expect(f.reader.lookup).toHaveBeenCalledWith(f.tx.digest, f.session.signal);
    expect(f.reader.dispatch).toHaveBeenCalledTimes(1);
    expect(f.callbacks.signData).toHaveBeenCalledTimes(1);
  });
  it.each([null, "error"])(
    "NotFound或恢复错误不释放pending %s",
    async (value) => {
      const f = await fixture();
      const record = createPendingRecord(f.session.profile, f.input);
      f.records.set(record.id, record);
      if (value === null) f.reader.lookup.mockResolvedValue(null);
      else f.reader.lookup.mockRejectedValue(new Error("Unavailable"));
      expect(
        (await f.coordinator.recover(sender, f.callbacks.authorize))?.state,
      ).toBe("pending");
      expect(f.journal.commitReceipt).not.toHaveBeenCalled();
      expect(f.reader.dispatch).not.toHaveBeenCalled();
      expect(f.callbacks.signData).not.toHaveBeenCalled();
    },
  );
  it("同scope并发在签名前互斥", async () => {
    const f = await fixture();
    let release!: () => void;
    let entered!: () => void;
    const entry = new Promise<void>((resolve) => {
      entered = resolve;
    });
    f.callbacks.simulate.mockImplementation(async () => {
      entered();
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    });
    const first = f.coordinator.execute(f.input, f.callbacks);
    await entry;
    await expect(
      f.coordinator.execute({ ...f.input, requestId: "other" }, f.callbacks),
    ).rejects.toThrow("busy");
    expect(f.callbacks.signData).not.toHaveBeenCalled();
    release();
    await first;
  });
  it("错批准digest在任何构建、签名和网络前拒绝", async () => {
    const f = await fixture();
    await expect(
      f.coordinator.execute(
        { ...f.input, digest: toBase58(new Uint8Array(32).fill(9)) },
        f.callbacks,
      ),
    ).rejects.toThrow("摘要");
    expect(f.callbacks.simulate).not.toHaveBeenCalled();
    expect(f.callbacks.signData).not.toHaveBeenCalled();
  });
  it("签名bytes被替换不能进入pending", async () => {
    const f = await fixture();
    f.callbacks.signData.mockResolvedValue(
      toBase58(new Uint8Array(32).fill(9)),
    );
    await expect(f.coordinator.execute(f.input, f.callbacks)).rejects.toThrow();
    expect(f.journal.commitPending).not.toHaveBeenCalled();
    expect(f.reader.dispatch).not.toHaveBeenCalled();
  });
  it("赞助交易不能借发送方单签入口提交，不改gasOwner且不写pending", async () => {
    const f = await fixture();
    const sponsored = Transaction.from(f.tx.bytes);
    sponsored.setGasOwner("0x9");
    const bytes = await sponsored.build();
    await expect(
      f.coordinator.execute(
        {
          ...f.input,
          bytesBase64: toBase64(bytes),
          digest: TransactionDataBuilder.getDigestFromBytes(bytes),
        },
        f.callbacks,
      ),
    ).rejects.toThrow("赞助");
    expect(f.callbacks.authorize).not.toHaveBeenCalled();
    expect(f.callbacks.simulate).not.toHaveBeenCalled();
    expect(f.callbacks.signData).not.toHaveBeenCalled();
    expect(f.reader.verifySignature).not.toHaveBeenCalled();
    expect(f.reader.dispatch).not.toHaveBeenCalled();
    expect(f.journal.get).not.toHaveBeenCalled();
    expect(f.journal.commitPending).not.toHaveBeenCalled();
    expect(f.records.size).toBe(0);
    expect(sponsored.getData().gasData.owner).not.toBe(sender);
    f.session.close();
  });
  it("账户授权在签名后撤回时不写pending、不dispatch", async () => {
    const f = await fixture();
    f.callbacks.authorize
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValue(new Error("locked"));
    await expect(f.coordinator.execute(f.input, f.callbacks)).rejects.toThrow(
      "locked",
    );
    expect(f.journal.commitPending).not.toHaveBeenCalled();
    expect(f.reader.dispatch).not.toHaveBeenCalled();
  });
  it.each([1, 2, 3, 4, 5])(
    "授权在第%s个边界撤回：未落盘不提交，已落盘只保留原摘要",
    async (boundary) => {
      const f = await fixture();
      let authorizations = 0;
      f.callbacks.authorize.mockImplementation(async () => {
        if (++authorizations === boundary)
          throw new Error("authorization revoked");
      });
      const result = f.coordinator.execute(f.input, f.callbacks);
      if (boundary < 5) {
        await expect(result).rejects.toThrow("authorization revoked");
        expect(f.records.size).toBe(0);
        expect(f.journal.commitPending).not.toHaveBeenCalled();
      } else {
        await expect(result).resolves.toMatchObject({
          state: "pending",
          digest: f.tx.digest,
        });
        expect([...f.records.values()][0].state).toBe("dispatch-pending");
        f.callbacks.authorize.mockResolvedValue(undefined);
        f.reader.lookup.mockResolvedValue(null);
        await expect(
          f.coordinator.recover(sender, f.callbacks.authorize),
        ).resolves.toMatchObject({
          state: "pending",
          reason: "receipt-unavailable",
          digest: f.tx.digest,
        });
        await expect(
          f.coordinator.execute(
            { ...f.input, requestId: "successor" },
            f.callbacks,
          ),
        ).resolves.toMatchObject({
          state: "pending",
          digest: f.tx.digest,
        });
        expect(f.callbacks.simulate).toHaveBeenCalledTimes(1);
        expect(f.callbacks.signData).toHaveBeenCalledTimes(1);
        expect(f.reader.lookup).toHaveBeenCalledWith(
          f.tx.digest,
          f.session.signal,
        );
        expect(f.journal.commitReceipt).not.toHaveBeenCalled();
      }
      expect(f.reader.dispatch).not.toHaveBeenCalled();
      f.session.close();
    },
  );
  it.each(["simulation", "signing", "verification"] as const)(
    "%s等待完成前会话关闭，迟到结果不能写pending或dispatch",
    async (phase) => {
      const f = await fixture();
      if (phase === "simulation")
        f.callbacks.simulate.mockImplementation(async () => {
          f.session.close();
        });
      if (phase === "signing")
        f.callbacks.signData.mockImplementation(async () => {
          f.session.close();
          return f.tx.signed.signature;
        });
      if (phase === "verification")
        f.reader.verifySignature.mockImplementation(async () => {
          f.session.close();
        });
      await expect(
        f.coordinator.execute(f.input, f.callbacks),
      ).rejects.toThrow();
      expect(f.journal.commitPending).not.toHaveBeenCalled();
      expect(f.reader.dispatch).not.toHaveBeenCalled();
      expect(f.records.size).toBe(0);
    },
  );
  it.each(["simulation", "signing"] as const)(
    "%s期间调用方篡改原input，固定批准bytes／sender／request／origin不随之变化",
    async (phase) => {
      const f = await fixture();
      const approved = { ...f.input };
      const alter = () =>
        Object.assign(f.input, {
          bytesBase64: "AA==",
          digest: toBase58(new Uint8Array(32).fill(9)),
          accountAddress: "0x9",
          originRef: "unapproved-origin",
          requestId: "replacement",
        });
      if (phase === "simulation")
        f.callbacks.simulate.mockImplementation(async () => {
          alter();
        });
      else
        f.callbacks.signData.mockImplementation(async () => {
          alter();
          return f.tx.signed.signature;
        });
      await expect(
        f.coordinator.execute(f.input, f.callbacks),
      ).resolves.toMatchObject({ state: "confirmed" });
      expect(f.reader.dispatch).toHaveBeenCalledWith(
        approved.bytesBase64,
        approved.accountAddress,
        [f.tx.signed.signature],
        f.session.signal,
      );
      const stored = [...f.records.values()][0];
      expect(stored).toMatchObject({
        accountAddress: approved.accountAddress,
        requestId: approved.requestId,
        originRef: approved.originRef,
        digest: approved.digest,
      });
      f.session.close();
    },
  );
  it.each(["accountId", "originRef", "digest"] as const)(
    "同requestId的既有%s冲突在模拟、签名和网络之前拒绝",
    async (field) => {
      const f = await fixture();
      const record = createPendingRecord(f.session.profile, f.input);
      f.records.set(record.id, {
        ...record,
        [field]:
          field === "digest"
            ? toBase58(new Uint8Array(32).fill(9))
            : "different-identity",
      });
      await expect(f.coordinator.execute(f.input, f.callbacks)).rejects.toThrow(
        "冲突",
      );
      expect(f.callbacks.simulate).not.toHaveBeenCalled();
      expect(f.callbacks.signData).not.toHaveBeenCalled();
      expect(f.reader.verifySignature).not.toHaveBeenCalled();
      expect(f.reader.dispatch).not.toHaveBeenCalled();
      expect(f.journal.commitPending).not.toHaveBeenCalled();
      expect(f.journal.commitReceipt).not.toHaveBeenCalled();
      expect(f.records.get(record.id)?.state).toBe("dispatch-pending");
      f.session.close();
    },
  );
  it.each(["before-lookup", "after-lookup", "closed-session"] as const)(
    "恢复期间%s撤销，迟到回执不能终结或释放原pending",
    async (phase) => {
      const f = await fixture();
      const record = createPendingRecord(f.session.profile, f.input);
      f.records.set(record.id, record);
      if (phase === "before-lookup")
        f.callbacks.authorize.mockRejectedValue(new Error("revoked"));
      else if (phase === "after-lookup")
        f.callbacks.authorize
          .mockResolvedValueOnce(undefined)
          .mockRejectedValue(new Error("revoked"));
      else
        f.reader.lookup.mockImplementation(async () => {
          f.session.close();
          return f.tx.receipt();
        });
      const result = f.coordinator.recover(sender, f.callbacks.authorize);
      if (phase === "before-lookup") {
        await expect(result).rejects.toThrow("revoked");
        expect(f.reader.lookup).not.toHaveBeenCalled();
      } else {
        await expect(result).resolves.toMatchObject({
          state: "pending",
          digest: f.tx.digest,
          reason: "receipt-unavailable",
        });
        expect(f.reader.lookup).toHaveBeenCalledExactlyOnceWith(
          f.tx.digest,
          f.session.signal,
        );
      }
      expect(f.records.get(record.id)).toEqual(record);
      expect(f.journal.commitReceipt).not.toHaveBeenCalled();
      expect(f.callbacks.simulate).not.toHaveBeenCalled();
      expect(f.callbacks.signData).not.toHaveBeenCalled();
      expect(f.reader.dispatch).not.toHaveBeenCalled();
      f.session.close();
    },
  );
});

describe("coordinator with actual gRPC execution reader", () => {
  it.each(
    [
      "transport",
      "trailer",
      "missing",
      "wrong-digest",
      "session-close",
    ].flatMap((failure) =>
      [true, false].map((success) => ({ failure, success })),
    ),
  )(
    "$failure after dispatch preserves pending and recovers success=$success without another send",
    async ({ failure, success }) => {
      const f = await fixture();
      let recovering = false;
      const requests: GrpcTypes.ExecuteTransactionRequest[] = [];
      const lookups: string[] = [];
      const fetch = vi.fn<typeof globalThis.fetch>(async (url, init) => {
        const path = new URL(String(url)).pathname;
        if (path.endsWith("/GetServiceInfo"))
          return grpcResponse(
            GrpcTypes.GetServiceInfoResponse.toBinary({
              chainId: f.session.profile.expectedGenesisDigest,
              checkpointHeight: 21n,
            }),
          );
        if (path.endsWith("/VerifySignature"))
          return grpcResponse(
            GrpcTypes.VerifySignatureResponse.toBinary({ isValid: true }),
          );
        if (path.endsWith("/GetTransaction")) {
          const request = GrpcTypes.GetTransactionRequest.fromBinary(
            (init!.body as Uint8Array).subarray(5),
          );
          lookups.push(request.digest!);
          expect(recovering).toBe(true);
          return grpcResponse(
            GrpcTypes.GetTransactionResponse.toBinary({
              transaction: f.tx.result(success),
            }),
          );
        }
        expect(path).toMatch(/\/ExecuteTransaction$/);
        // This is the actual wire request, after the real reader's identity/signature checks.
        const request = GrpcTypes.ExecuteTransactionRequest.fromBinary(
          (init!.body as Uint8Array).subarray(5),
        );
        requests.push(request);
        expect(
          await f.journal.pending([...f.records.values()][0].scope),
        ).not.toBeNull();
        expect(request.transaction?.bcs?.value).toEqual(f.tx.bytes);
        if (failure === "transport")
          throw new TypeError("connection lost after send");
        if (failure === "session-close") f.session.close();
        const transaction = f.tx.result(success);
        if (failure === "wrong-digest")
          transaction.digest = toBase58(new Uint8Array(32).fill(4));
        return grpcResponse(
          GrpcTypes.ExecuteTransactionResponse.toBinary({
            transaction: failure === "missing" ? undefined : transaction,
          }),
          failure === "trailer" ? 14 : 0,
        );
      });
      const reader = new WalletExecutionReader(f.session, {
        fetch,
        finalDispatch: (send) => send(),
      });
      const coordinator = new WalletExecutionCoordinator(
        f.session,
        f.journal,
        reader,
        f.lock,
      );
      const outcome = await coordinator.execute(f.input, f.callbacks);
      expect(outcome).toMatchObject({ state: "pending", digest: f.tx.digest });
      expect(requests).toHaveLength(1);
      expect([...f.records.values()][0].state).toBe("dispatch-pending");
      recovering = true;
      const nextSession = new WalletReadSession(f.session.profile);
      const next = new WalletExecutionCoordinator(
        nextSession,
        f.journal,
        new WalletExecutionReader(nextSession, { fetch }),
        f.lock,
      );
      // A second execute is served by pending journal state before simulation/signing/dispatch.
      expect(
        await next.execute(
          { ...f.input, requestId: "second-request" },
          f.callbacks,
        ),
      ).toMatchObject({ state: "pending", digest: f.tx.digest });
      expect(await next.recover(sender, f.callbacks.authorize)).toMatchObject({
        state: "confirmed",
        receipt: { digest: f.tx.digest, success },
      });
      expect(lookups).toEqual([f.tx.digest]);
      expect(requests).toHaveLength(1);
      expect(f.callbacks.simulate).toHaveBeenCalledTimes(1);
      expect(f.callbacks.signData).toHaveBeenCalledTimes(1);
      expect([...f.records.values()][0].state).toBe(
        success ? "confirmed-success" : "confirmed-failure",
      );
      nextSession.close();
      f.session.close();
    },
  );
});
