// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
  Transaction,
  TransactionDataBuilder,
} from "rtd-typescript/transactions";
import {
  normalizeRtdAddress,
  normalizeStructTag,
  toBase64,
  toBase58,
} from "rtd-typescript/utils";
import { GrpcTypes } from "rtd-typescript/grpc";
import {
  grpcPacket,
  movePackageFixtures,
} from "../shared/rpc/move-package-fixture";
import { KIOSK_BCS } from "../shared/rpc/kiosk-reader";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  executionFixture,
  sender,
} from "../../tests/unit/rpc/execution-fixtures";
import {
  validateNetworkProfile,
  networkBindingKey,
} from "../shared/rpc/profile";
import { profileFixture } from "../shared/rpc/profile-fixture";
import { API_ENV } from "../shared/api-env";
import {
  executeWalletPrepared,
  recoverWalletExecution,
  readWalletStoredReceipt,
  withExecutionAccount,
} from "./execution";

import { networkIdentityFixture } from "../../tests/unit/rpc/network-identity-fixture";
import { backgroundNetworkObservations } from "../../tests/unit/rpc/network-observation-fixture";
import { backgroundNetworkAdmission } from "../../tests/unit/rpc/network-admission-fixture";
import { WalletNetworkAdmissionStateError } from "../shared/rpc/network-admission-state";
import { WalletNetworkObservationError } from "../shared/rpc/network-observation-state";
vi.mock("../shared/rpc/network-observations", async () => {
  const { backgroundNetworkObservations: observations } =
    await import("../../tests/unit/rpc/network-observation-fixture");
  return {
    WalletNetworkObservations: class {
      capture(...args: Parameters<typeof observations.capture>) {
        return observations.capture(...args);
      }
      observe(...args: Parameters<typeof observations.observe>) {
        return observations.observe(...args);
      }
    },
  };
});
vi.mock("../shared/rpc/network-admission-store", async () => {
  const { backgroundNetworkAdmission: admission } =
    await import("../../tests/unit/rpc/network-admission-fixture");
  return {
    WalletNetworkAdmissionStore: class {
      runIfClear<T>(...args: Parameters<typeof admission.runIfClear<T>>) {
        return admission.runIfClear<T>(...args);
      }
      assertClear(...args: Parameters<typeof admission.assertClear>) {
        return admission.assertClear(...args);
      }
      begin(...args: Parameters<typeof admission.begin>) {
        return admission.begin(...args);
      }
      complete(...args: Parameters<typeof admission.complete>) {
        return admission.complete(...args);
      }
    },
  };
});

const mocks = vi.hoisted(() => ({
  getAccount: vi.fn(),
  network: vi.fn(),
  pending: vi.fn(),
  confirmedReceipt: vi.fn(),
  get: vi.fn(),
  commitPending: vi.fn(),
  commitReceipt: vi.fn(),
  dispatch: vi.fn(),
  lookup: vi.fn(),
  verify: vi.fn(),
  simulate: vi.fn(),
  resolve: vi.fn(),
  object: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
}));
vi.mock("./db", () => ({ getDB: vi.fn() }));
vi.mock("./auto-lock-accounts", () => ({ setupAutoLockAlarm: vi.fn() }));
vi.mock("./session-ephemeral-values", () => ({
  clearEphemeralValue: vi.fn(),
  getEphemeralValue: vi.fn(),
  setEphemeralValue: vi.fn(),
}));
vi.mock("./accounts", () => ({ getAccountByID: mocks.getAccount }));
vi.mock("./NetworkEnv", () => ({
  default: { getActiveNetwork: mocks.network, on: mocks.on, off: mocks.off },
}));
vi.mock("./accounts/events", () => ({
  accountsEvents: { on: mocks.on, off: mocks.off },
}));
vi.mock("../shared/rpc/execution-journal", async (original) => ({
  ...(await original<typeof import("../shared/rpc/execution-journal")>()),
  WalletExecutionJournal: class {
    get = mocks.get;
    pending = mocks.pending;
    confirmedReceipt = mocks.confirmedReceipt;
    commitPending = mocks.commitPending;
    commitReceipt = mocks.commitReceipt;
  },
}));
vi.mock("../shared/rpc/execution-reader", async (original) => ({
  ...(await original<typeof import("../shared/rpc/execution-reader")>()),
  WalletExecutionReader: class {
    dispatch = mocks.dispatch;
    lookup = mocks.lookup;
    verifySignature = mocks.verify;
  },
}));
vi.mock("../shared/rpc/transaction-reader", () => ({
  WalletTransactionReader: class {
    simulate = mocks.simulate;
  },
}));
vi.mock("../shared/rpc/name-reader", () => ({
  WalletNameReader: class {
    resolve = mocks.resolve;
  },
}));

vi.mock("../shared/rpc/fullnode-reader", () => ({
  WalletFullnodeReader: class {
    object = mocks.object;
  },
}));

beforeEach(() => {
  backgroundNetworkObservations.clear();
  backgroundNetworkAdmission.clear();
  vi.resetAllMocks();
  vi.stubEnv(
    "WALLET_NETWORK_PROFILES",
    JSON.stringify({ [API_ENV.local]: profileFixture() }),
  );
  vi.stubGlobal("navigator", {
    locks: {
      request: async (
        _name: string,
        _options: unknown,
        callback: (lock: object) => unknown,
      ) => callback({ name: "lock" }),
    },
  });
  mocks.network.mockResolvedValue({ env: API_ENV.local, customRpcUrl: null });
  mocks.get.mockResolvedValue(null);
  mocks.pending.mockResolvedValue(null);
  mocks.confirmedReceipt.mockResolvedValue(null);
  mocks.commitPending.mockResolvedValue(undefined);
  mocks.verify.mockResolvedValue(undefined);
  vi.stubGlobal("fetch", networkIdentityFixture().fetch);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
async function fixture() {
  const tx = await executionFixture();
  const account = {
    id: "account",
    canSign: true,
    type: "imported",
    address: Promise.resolve(sender),
    isLocked: vi.fn().mockResolvedValue(false),
    toUISerialized: vi.fn().mockResolvedValue({ selected: true }),
    signData: vi.fn().mockResolvedValue(tx.signed.signature),
  };
  mocks.getAccount.mockResolvedValue(account);
  mocks.simulate.mockResolvedValue({
    $kind: "Transaction",
    Transaction: { digest: tx.digest },
  });
  mocks.dispatch.mockResolvedValue(tx.receipt());
  mocks.commitReceipt.mockImplementation(async (id, receipt) => ({
    id,
    state: receipt.success ? "confirmed-success" : "confirmed-failure",
    receipt,
  }));
  return {
    tx,
    account,
    args: {
      accountId: account.id,
      bindingKey: networkBindingKey(validateNetworkProfile(profileFixture())),
      requestId: "ui-request",
      bytesBase64: tx.bytesBase64,
      digest: tx.digest,
    },
  };
}
describe("准备入口先检查持久互斥，再开始远程身份观察", () => {
  it("本地复验不发出远程请求，后续完整授权仍读取新身份并拒绝锁定", async () => {
    const f = await fixture(), network = networkIdentityFixture();
    vi.stubGlobal("fetch", network.fetch);
    await withExecutionAccount(f.account.id, async ({ authorize, authorizeLocal }) => {
      expect(network.requests).toHaveLength(3);
      await authorizeLocal();
      await authorizeLocal();
      expect(network.requests).toHaveLength(3);
      await authorize();
      expect(network.requests).toHaveLength(6);
      f.account.isLocked.mockResolvedValue(true);
      await expect(authorizeLocal()).rejects.toThrow("已锁定");
      await expect(authorize()).rejects.toThrow("已锁定");
      expect(network.requests).toHaveLength(6);
    });
    expect(f.account.signData).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
  it.each(["pending", "existing", "storage", "busy"] as const)(
    "%s拒绝时不开始身份请求、业务构建或签名",
    async (mode) => {
      const f = await fixture(),
        network = networkIdentityFixture(),
        operation = vi.fn();
      vi.stubGlobal("fetch", network.fetch);
      if (mode === "pending")
        mocks.pending.mockResolvedValue({ digest: f.tx.digest });
      if (mode === "existing")
        mocks.get.mockResolvedValue({ digest: f.tx.digest });
      if (mode === "storage")
        mocks.pending.mockRejectedValue(new Error("storage unavailable"));
      if (mode === "busy")
        vi.stubGlobal("navigator", {
          locks: {
            request: async (
              _name: string,
              _options: unknown,
              callback: (lock: null) => unknown,
            ) => callback(null),
          },
        });
      await expect(
        withExecutionAccount(f.account.id, operation, true, {
          preparationRequestId: "new-dapp-request",
        }),
      ).rejects.toThrow(
        mode === "pending"
          ? "待确认"
          : mode === "existing"
            ? "已有执行记录"
            : mode === "storage"
              ? "storage unavailable"
              : "正在签名或恢复",
      );
      expect(network.requests).toHaveLength(0);
      expect(operation).not.toHaveBeenCalled();
      expect(f.account.signData).not.toHaveBeenCalled();
      expect(mocks.commitPending).not.toHaveBeenCalled();
    },
  );
  it("互斥检查通过仍实际验证三个身份入口，且保留后续授权", async () => {
    const f = await fixture(),
      network = networkIdentityFixture();
    vi.stubGlobal("fetch", network.fetch);
    await withExecutionAccount(
      f.account.id,
      async ({ authorize }) => {
        await authorize();
      },
      true,
      {
        preparationRequestId: "new-dapp-request",
      },
    );
    expect(mocks.pending).toHaveBeenCalledTimes(2);
    expect(network.requests.map((r) => r.role)).toEqual([
      "fullnode",
      "graphql",
      "archive",
      "fullnode",
      "graphql",
      "archive",
    ]);
    expect(f.account.signData).not.toHaveBeenCalled();
  });
  it("空journal不能绕过真实错链检查", async () => {
    const f = await fixture(),
      network = networkIdentityFixture((r) =>
        r === "fullnode"
          ? { digest: toBase58(new Uint8Array(32).fill(9)) }
          : {},
      ),
      operation = vi.fn();
    vi.stubGlobal("fetch", network.fetch);
    await expect(
      withExecutionAccount(f.account.id, operation, true, {
        preparationRequestId: "new-dapp-request",
      }),
    ).rejects.toMatchObject({ reason: "chain-mismatch" });
    expect(network.requests).toHaveLength(3);
    expect(operation).not.toHaveBeenCalled();
  });
  it("账户本地锁定先于journal和远程身份请求", async () => {
    const f = await fixture(),
      network = networkIdentityFixture();
    f.account.isLocked.mockResolvedValue(true);
    vi.stubGlobal("fetch", network.fetch);
    await expect(
      withExecutionAccount(f.account.id, vi.fn(), true, {
        preparationRequestId: "new-dapp-request",
      }),
    ).rejects.toThrow("已锁定");
    expect(mocks.pending).not.toHaveBeenCalled();
    expect(network.requests).toHaveLength(0);
  });
  it("preflight期间账户锁定，不能随后开始远程身份观察", async () => {
    const f = await fixture(),
      network = networkIdentityFixture();
    vi.stubGlobal("fetch", network.fetch);
    mocks.pending.mockImplementation(async () => {
      f.account.isLocked.mockResolvedValue(true);
      return null;
    });
    await expect(
      withExecutionAccount(f.account.id, vi.fn(), true, {
        preparationRequestId: "new-dapp-request",
      }),
    ).rejects.toThrow("已锁定");
    expect(network.requests).toHaveLength(0);
  });
});
describe("实际background提交授权接入", () => {
  it("已确认journal独立读取：允许锁定、无Fullnode查询／签名／dispatch，范围含H0／generation／地址", async () => {
    const f = await fixture();
    f.account.isLocked.mockResolvedValue(true);
    mocks.confirmedReceipt.mockResolvedValue(f.tx.receipt(false));
    const result = await readWalletStoredReceipt({
      accountId: f.account.id,
      bindingKey: f.args.bindingKey,
      digest: f.tx.digest,
    });
    expect(result).toMatchObject({
      bindingKey: f.args.bindingKey,
      accountAddress: sender,
      receipt: { digest: f.tx.digest, success: false },
    });
    expect(mocks.confirmedReceipt).toHaveBeenCalledWith(
      JSON.stringify([
        2,
        validateNetworkProfile(profileFixture()).expectedGenesisDigest,
        "dev-1",
        sender,
      ]),
      f.tx.digest,
    );
    expect(f.account.signData).not.toHaveBeenCalled();
    expect(mocks.lookup).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
    expect(mocks.commitReceipt).not.toHaveBeenCalled();
    expect(mocks.off).toHaveBeenCalledTimes(4);
  });
  it("只读返回前账户删除／切换或地址变化拒绝迟到数据", async () => {
    const f = await fixture();
    mocks.confirmedReceipt.mockImplementation(async () => {
      f.account.address = Promise.resolve("0x1");
      return f.tx.receipt();
    });
    await expect(
      readWalletStoredReceipt({
        accountId: f.account.id,
        bindingKey: f.args.bindingKey,
        digest: f.tx.digest,
      }),
    ).rejects.toThrow();
    expect(mocks.commitReceipt).not.toHaveBeenCalled();
  });
  it("只读错误绑定不查journal；没有终态不会创建或清除pending", async () => {
    const f = await fixture();
    await expect(
      readWalletStoredReceipt({
        accountId: f.account.id,
        bindingKey: "wrong",
        digest: f.tx.digest,
      }),
    ).rejects.toThrow();
    expect(mocks.confirmedReceipt).not.toHaveBeenCalled();
    expect(
      await readWalletStoredReceipt({
        accountId: f.account.id,
        bindingKey: f.args.bindingKey,
        digest: f.tx.digest,
      }),
    ).toBeNull();
    expect(mocks.commitPending).not.toHaveBeenCalled();
    expect(mocks.commitReceipt).not.toHaveBeenCalled();
  });
  it("Qredo账户不能进入本地签名、模拟、journal或提交链路", async () => {
    const f = await fixture();
    mocks.getAccount.mockResolvedValue({
      id: f.account.id,
      type: "qredo",
      address: Promise.resolve(sender),
    });
    await expect(executeWalletPrepared(f.args)).rejects.toThrow(
      "不支持background签名",
    );
    await expect(recoverWalletExecution(f.account.id)).rejects.toThrow(
      "不支持background签名",
    );
    expect(f.account.signData).not.toHaveBeenCalled();
    expect(mocks.simulate).not.toHaveBeenCalled();
    expect(mocks.commitPending).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
    expect(mocks.lookup).not.toHaveBeenCalled();
  });
  it("本地账户Intent签名留在background，新模拟／journal／execute协调完成", async () => {
    const f = await fixture();
    expect((await executeWalletPrepared(f.args)).state).toBe("confirmed");
    expect(f.account.signData).toHaveBeenCalledTimes(1);
    expect([...f.account.signData.mock.calls[0][0]].slice(0, 3)).toEqual([
      0, 0, 0,
    ]);
    expect(mocks.commitPending).toHaveBeenCalledTimes(1);
    expect(mocks.dispatch).toHaveBeenCalledTimes(1);
    expect(mocks.simulate).toHaveBeenCalledWith(f.tx.bytesBase64, sender);
    expect(mocks.off).toHaveBeenCalledTimes(4);
  });
  it.each(["locked", "selected", "deleted", "binding"])(
    "账户或批准条件失效 %s 不签发",
    async (reason) => {
      const f = await fixture();
      if (reason === "locked") f.account.isLocked.mockResolvedValue(true);
      if (reason === "selected")
        f.account.toUISerialized.mockResolvedValue({ selected: false });
      if (reason === "deleted") mocks.getAccount.mockResolvedValue(null);
      if (reason === "binding") f.args.bindingKey = "changed";
      await expect(executeWalletPrepared(f.args)).rejects.toThrow();
      expect(f.account.signData).not.toHaveBeenCalled();
      expect(mocks.dispatch).not.toHaveBeenCalled();
    },
  );
  it("名称目标必须真的作为TransferObjects收款参数，不接受任意未使用Pure输入", async () => {
    const f = await fixture();
    mocks.resolve.mockResolvedValue({
      address: sender,
      validUntilMonotonicMs: performance.now() + 20_000,
    });
    await expect(
      executeWalletPrepared({
        ...f.args,
        recipientName: "test.rtd",
        recipientAddress: sender,
      }),
    ).rejects.toThrow("未包含在批准交易");
    expect(f.account.signData).not.toHaveBeenCalled();
  });
  it("名称目标与批准bytes匹配后才签名", async () => {
    const f = await fixture();
    const to = "0x" + "0".repeat(63) + "a";
    mocks.resolve.mockResolvedValue({
      address: to,
      validUntilMonotonicMs: performance.now() + 20_000,
    });
    expect(
      (
        await executeWalletPrepared({
          ...f.args,
          recipientName: "test.rtd",
          recipientAddress: to,
        })
      ).state,
    ).toBe("confirmed");
    expect(mocks.resolve).toHaveBeenCalledWith("test.rtd");
  });
  it.each(["authorize", "sign"])("名称在%s期间到期不得提交", async (stage) => {
    const f = await fixture();
    const to = "0x" + "0".repeat(63) + "a";
    const deadline = performance.now() + 20_000;
    let clock: ReturnType<typeof vi.spyOn> | undefined;
    const expire = () => {
      clock = vi.spyOn(performance, "now").mockReturnValue(deadline);
    };
    mocks.resolve.mockImplementation(async () => {
      if (stage === "authorize")
        f.account.isLocked.mockImplementation(async () => {
          expire();
          return false;
        });
      return { address: to, validUntilMonotonicMs: deadline };
    });
    if (stage === "sign")
      f.account.signData.mockImplementation(async () => {
        expire();
        return f.tx.signed.signature;
      });
    try {
      await expect(
        executeWalletPrepared({
          ...f.args,
          recipientName: "test.rtd",
          recipientAddress: to,
        }),
      ).rejects.toThrow("校验已过期");
      expect(f.account.signData).toHaveBeenCalledTimes(
        stage === "sign" ? 1 : 0,
      );
      expect(mocks.commitPending).not.toHaveBeenCalled();
      expect(mocks.dispatch).not.toHaveBeenCalled();
    } finally {
      clock?.mockRestore();
    }
  });
  it.each(["create", "existing", "wrong-owner", "unavailable"])(
    "OriginByte %s实际后台入口核对收款再进入提交",
    async (mode) => {
      const f = await fixture();
      const profile = profileFixture();
      profile.packages.originByte = {
        discoveryPackage: normalizeRtdAddress("0xd"),
        executionPackage: normalizeRtdAddress("0xe"),
      };
      vi.stubEnv(
        "WALLET_NETWORK_PROFILES",
        JSON.stringify({ [API_ENV.local]: profile }),
      );
      const protocol = movePackageFixtures(validateNetworkProfile(profile)),
        identity = networkIdentityFixture();
      vi.stubGlobal(
        "fetch",
        async (url: Parameters<typeof fetch>[0], init?: RequestInit) => {
          const method = String(url).split("/rtd.rpc.v2.")[1];
          if (method === "LedgerService/GetObject") {
            const id = GrpcTypes.GetObjectRequest.fromBinary(
              (init!.body as Uint8Array).slice(5),
            ).objectId!;
            return grpcPacket(
              GrpcTypes.GetObjectResponse.toBinary({
                object: protocol.objects.get(id),
              }),
            );
          }
          if (method === "MovePackageService/GetPackage") {
            const id = GrpcTypes.GetPackageRequest.fromBinary(
              (init!.body as Uint8Array).slice(5),
            ).packageId!;
            return grpcPacket(
              GrpcTypes.GetPackageResponse.toBinary({
                package: protocol.packages.get(id),
              }),
            );
          }
          return identity.fetch(url, init);
        },
      );
      const recipient = normalizeRtdAddress("0xa"),
        target = normalizeRtdAddress("0xb");
      const tx = new Transaction();
      const gas = Transaction.from(f.tx.bytesBase64).getData().gasData;
      tx.setSender(sender);
      tx.setGasOwner(sender);
      tx.setGasPrice(gas.price!);
      tx.setGasBudget(gas.budget!);
      tx.setGasPayment(gas.payment!);
      tx.moveCall({
        target: `${profile.packages.originByte.executionPackage}::ob_kiosk::${mode === "create" ? "p2p_transfer_and_create_target_kiosk" : "p2p_transfer"}`,
        typeArguments: ["0xf::nft::NFT"],
        arguments: [
          tx.sharedObjectRef({
            objectId: "0x1",
            initialSharedVersion: "1",
            mutable: true,
          }),
          mode === "create"
            ? tx.pure.address(recipient)
            : tx.sharedObjectRef({
                objectId: target,
                initialSharedVersion: "2",
                mutable: true,
              }),
          tx.pure.id("0x2"),
        ],
      });
      const bytes = await tx.build(),
        digest = TransactionDataBuilder.getDigestFromBytes(bytes);
      const args = {
        ...f.args,
        bytesBase64: toBase64(bytes),
        digest,
        bindingKey: networkBindingKey(validateNetworkProfile(profile)),
        recipientName: "test.rtd",
        recipientAddress: recipient,
      };
      mocks.simulate.mockResolvedValue({
        $kind: "Transaction",
        Transaction: { digest },
      });
      mocks.resolve.mockResolvedValue({
        address: recipient,
        validUntilMonotonicMs: performance.now() + 20_000,
      });
      mocks.object.mockResolvedValue({
        objectId: target,
        type: normalizeStructTag("0x2::kiosk::Kiosk"),
        owner: { $kind: "Shared", Shared: { initialSharedVersion: "2" } },
        content: KIOSK_BCS.serialize({
          id: target,
          owner: mode === "wrong-owner" ? sender : recipient,
          profits: { value: "0" },
          item_count: 0,
          allow_extensions: true,
        }).toBytes(),
      });
      if (mode === "unavailable")
        mocks.object.mockRejectedValue(new Error("unavailable"));
      mocks.dispatch.mockRejectedValue(new Error("transport interrupted"));
      if (mode === "wrong-owner" || mode === "unavailable") {
        await expect(executeWalletPrepared(args)).rejects.toThrow();
        expect(f.account.signData).not.toHaveBeenCalled();
        expect(mocks.commitPending).not.toHaveBeenCalled();
        expect(mocks.dispatch).not.toHaveBeenCalled();
      } else {
        expect(await executeWalletPrepared(args)).toMatchObject({
          state: "pending",
          digest,
          reason: "dispatch-unknown",
        });
        expect(f.account.signData).toHaveBeenCalledOnce();
        expect([...f.account.signData.mock.calls[0][0]]).toEqual([
          0,
          0,
          0,
          ...bytes,
        ]);
        expect(mocks.commitPending).toHaveBeenCalledOnce();
        expect(mocks.commitPending.mock.calls[0][0]).toMatchObject({
          bytesBase64: args.bytesBase64,
          digest,
        });
        expect(mocks.dispatch).toHaveBeenCalledExactlyOnceWith(
          args.bytesBase64,
          sender,
          [f.tx.signed.signature],
          expect.any(AbortSignal),
        );
        expect(mocks.commitPending.mock.invocationCallOrder[0]).toBeLessThan(
          mocks.dispatch.mock.invocationCallOrder[0],
        );
      }
      if (mode === "create") expect(mocks.object).not.toHaveBeenCalled();
      else
        expect(mocks.object).toHaveBeenCalledExactlyOnceWith(target, undefined);
    },
  );
  it("锁定账户仍可只读恢复原摘要，不能借恢复签名", async () => {
    const f = await fixture();
    f.account.isLocked.mockResolvedValue(true);
    mocks.pending.mockResolvedValue({
      id: "original",
      digest: f.tx.digest,
      state: "dispatch-pending",
    });
    mocks.lookup.mockResolvedValue(null);
    expect((await recoverWalletExecution(f.account.id))?.state).toBe("pending");
    expect(mocks.lookup).toHaveBeenCalledWith(
      f.tx.digest,
      expect.any(AbortSignal),
    );
    expect(f.account.signData).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
});

describe("初始化期间授权变化", () => {
  it.each(["network", "account", "address"] as const)(
    "读取%s期间切网再切回仍取消原请求",
    async (stage) => {
      const f = await fixture();
      const change = () =>
        mocks.on.mock.calls.find(([event]) => event === "changed")?.[1]();
      if (stage === "network")
        mocks.network.mockImplementationOnce(async () => {
          change();
          return { env: API_ENV.local, customRpcUrl: null };
        });
      if (stage === "account")
        mocks.getAccount.mockImplementationOnce(async () => {
          change();
          return f.account;
        });
      if (stage === "address")
        Object.defineProperty(f.account, "address", {
          get: () => {
            change();
            return Promise.resolve(sender);
          },
        });
      await expect(executeWalletPrepared(f.args)).rejects.toThrow(
        "授权会话已改变",
      );
      expect(f.account.signData).not.toHaveBeenCalled();
      expect(mocks.simulate).not.toHaveBeenCalled();
      expect(mocks.commitPending).not.toHaveBeenCalled();
      expect(mocks.dispatch).not.toHaveBeenCalled();
      expect(mocks.off).toHaveBeenCalledTimes(4);
    },
  );
  it.each(["accountsChanged", "accountStatusChanged", "activeAccountChanged"])(
    "首次账户读取期间%s取消原请求",
    async (event) => {
      const f = await fixture();
      mocks.getAccount.mockImplementationOnce(async () => {
        mocks.on.mock.calls.find(([name]) => name === event)?.[1]({
          accountID: event === "activeAccountChanged" ? "other" : f.account.id,
        });
        return f.account;
      });
      await expect(executeWalletPrepared(f.args)).rejects.toThrow(
        "授权会话已改变",
      );
      expect(f.account.signData).not.toHaveBeenCalled();
      expect(mocks.dispatch).not.toHaveBeenCalled();
    },
  );
  it.each(["network", "account"])(
    "初始%s读取失败也释放监听器",
    async (stage) => {
      const f = await fixture();
      (stage === "network"
        ? mocks.network
        : mocks.getAccount
      ).mockRejectedValueOnce(new Error("initial read failed"));
      await expect(executeWalletPrepared(f.args)).rejects.toThrow(
        "initial read failed",
      );
      expect(mocks.off).toHaveBeenCalledTimes(4);
      expect(mocks.dispatch).not.toHaveBeenCalled();
    },
  );
});

describe("后台恢复请求合并", () => {
  it("同链同账户并发唤醒只查一次journal，完成后新调用重新读取", async () => {
    const f = await fixture();
    let resolve!: (value: null) => void;
    mocks.pending.mockReturnValueOnce(
      new Promise<null>((done) => {
        resolve = done;
      }),
    );
    const first = recoverWalletExecution(f.account.id);
    const second = recoverWalletExecution(f.account.id);
    await vi.waitFor(() => expect(mocks.pending).toHaveBeenCalledTimes(1));
    resolve(null);
    await expect(Promise.all([first, second])).resolves.toEqual([null, null]);
    expect(mocks.pending).toHaveBeenCalledTimes(1);
    await expect(recoverWalletExecution(f.account.id)).resolves.toBeNull();
    expect(mocks.pending).toHaveBeenCalledTimes(2);
    expect(f.account.signData).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
  it("共享结果返回前逐调用方复核，账户切换不能获得旧结果", async () => {
    const f = await fixture();
    let resolve!: (value: null) => void;
    mocks.pending.mockReturnValueOnce(
      new Promise<null>((done) => {
        resolve = done;
      }),
    );
    const first = recoverWalletExecution(f.account.id);
    const second = recoverWalletExecution(f.account.id);
    const settled = Promise.allSettled([first, second]);
    await vi.waitFor(() => expect(mocks.pending).toHaveBeenCalledTimes(1));
    f.account.toUISerialized.mockResolvedValue({ selected: false });
    resolve(null);
    const results = await settled;
    expect(results.every((result) => result.status === "rejected")).toBe(true);
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
});
it("不同profile revision的恢复不共享旧结果", async () => {
  const f = await fixture();
  let resolve!: (value: null) => void;
  mocks.pending.mockReturnValueOnce(
    new Promise<null>((done) => {
      resolve = done;
    }),
  );
  const first = recoverWalletExecution(f.account.id);
  const firstSettled = Promise.allSettled([first]);
  await vi.waitFor(() => expect(mocks.pending).toHaveBeenCalledTimes(1));
  vi.stubEnv(
    "WALLET_NETWORK_PROFILES",
    JSON.stringify({ [API_ENV.local]: { ...profileFixture(), revision: 2 } }),
  );
  await expect(recoverWalletExecution(f.account.id)).resolves.toBeNull();
  expect(mocks.pending).toHaveBeenCalledTimes(2);
  resolve(null);
  expect((await firstSettled)[0].status).toBe("rejected");
  expect(mocks.dispatch).not.toHaveBeenCalled();
});
it("恢复合并不合并提交，恢复持锁时执行仍被互斥拒绝", async () => {
  const f = await fixture();
  const held = new Set<string>();
  let resolve!: (value: null) => void;
  vi.stubGlobal("navigator", {
    locks: {
      request: async (
        name: string,
        _options: unknown,
        callback: (lock: object | null) => unknown,
      ) => {
        if (held.has(name)) return callback(null);
        held.add(name);
        try {
          return await callback({ name });
        } finally {
          held.delete(name);
        }
      },
    },
  });
  mocks.pending
    .mockResolvedValueOnce({ digest: f.tx.digest })
    .mockReturnValueOnce(
      new Promise<null>((done) => {
        resolve = done;
      }),
    );
  const recovery = recoverWalletExecution(f.account.id);
  try {
    await vi.waitFor(() => expect(mocks.pending).toHaveBeenCalledTimes(2));
    await expect(executeWalletPrepared(f.args)).rejects.toThrow(
      "当前链账户正在签名或恢复",
    );
  } finally {
    resolve(null);
    await expect(recovery).resolves.toBeNull();
  }
  expect(f.account.signData).not.toHaveBeenCalled();
  expect(mocks.dispatch).not.toHaveBeenCalled();
});

describe("后台交易授权的实际SDK三入口身份边界", () => {
  it.each(["capture", "observe"] as const)(
    "%s持久存储失败，零模拟／签名／journal／dispatch",
    async (stage) => {
      const f = await fixture(),
        network = networkIdentityFixture();
      vi.stubGlobal("fetch", network.fetch);
      vi.spyOn(backgroundNetworkObservations, stage).mockRejectedValueOnce(
        new WalletNetworkObservationError("unavailable"),
      );
      await expect(executeWalletPrepared(f.args)).rejects.toMatchObject({
        reason: "unavailable",
      });
      expect(network.requests).toHaveLength(stage === "capture" ? 0 : 3);
      expect(mocks.simulate).not.toHaveBeenCalled();
      expect(f.account.signData).not.toHaveBeenCalled();
      expect(mocks.commitPending).not.toHaveBeenCalled();
      expect(mocks.dispatch).not.toHaveBeenCalled();
    },
  );
  it.each(["assertClear", "begin", "complete"] as const)(
    "%s准入存储失败，实际后台入口零模拟／签名／journal／dispatch",
    async (stage) => {
      const f = await fixture(),
        network = networkIdentityFixture();
      vi.stubGlobal("fetch", network.fetch);
      vi.spyOn(backgroundNetworkAdmission, stage).mockRejectedValueOnce(
        new WalletNetworkAdmissionStateError("unavailable"),
      );
      await expect(executeWalletPrepared(f.args)).rejects.toMatchObject({
        reason: "unavailable",
      });
      expect(network.requests).toHaveLength(stage === "complete" ? 3 : 0);
      expect(mocks.simulate).not.toHaveBeenCalled();
      expect(f.account.signData).not.toHaveBeenCalled();
      expect(mocks.commitPending).not.toHaveBeenCalled();
      expect(mocks.dispatch).not.toHaveBeenCalled();
    },
  );
  it.each(["fullnode", "graphql", "archive"] as const)(
    "已配置%s错链，禁止模拟／签名／journal／dispatch",
    async (role) => {
      const f = await fixture();
      const network = networkIdentityFixture((r) =>
        r === role ? { digest: toBase58(new Uint8Array(32).fill(9)) } : {},
      );
      vi.stubGlobal("fetch", network.fetch);
      await expect(executeWalletPrepared(f.args)).rejects.toMatchObject({
        role,
        reason: "chain-mismatch",
      });
      expect(network.requests).toHaveLength(3);
      expect(mocks.simulate).not.toHaveBeenCalled();
      expect(f.account.signData).not.toHaveBeenCalled();
      expect(mocks.commitPending).not.toHaveBeenCalled();
      expect(mocks.dispatch).not.toHaveBeenCalled();
    },
  );
  it("模拟之后其它入口转为错链，签名前再次拒绝", async () => {
    const f = await fixture();
    let changed = false;
    vi.stubGlobal(
      "fetch",
      networkIdentityFixture((r) =>
        r === "archive" && changed
          ? { digest: toBase58(new Uint8Array(32).fill(9)) }
          : {},
      ).fetch,
    );
    mocks.simulate.mockImplementation(async () => {
      changed = true;
      return { $kind: "Transaction", Transaction: { digest: f.tx.digest } };
    });
    await expect(executeWalletPrepared(f.args)).rejects.toMatchObject({
      role: "archive",
      reason: "chain-mismatch",
    });
    expect(mocks.simulate).toHaveBeenCalledOnce();
    expect(f.account.signData).not.toHaveBeenCalled();
    expect(mocks.commitPending).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
  it("Fullnode有效而GraphQL／归档暂不可用，仍经过正式模拟及原协调器", async () => {
    const f = await fixture();
    const network = networkIdentityFixture((r) =>
      r !== "fullnode" ? { unavailable: true } : {},
    );
    vi.stubGlobal("fetch", network.fetch);
    expect((await executeWalletPrepared(f.args)).state).toBe("confirmed");
    expect(network.requests.length).toBeGreaterThan(3);
    expect(f.account.signData).toHaveBeenCalledOnce();
    expect(mocks.commitPending).toHaveBeenCalledOnce();
    expect(mocks.dispatch).toHaveBeenCalledOnce();
  });
  it("Fullnode不可用不能用GraphQL同链替代交易授权", async () => {
    const f = await fixture();
    vi.stubGlobal(
      "fetch",
      networkIdentityFixture((r) => (r === "fullnode" ? { status: 14 } : {}))
        .fetch,
    );
    await expect(executeWalletPrepared(f.args)).rejects.toMatchObject({
      code: "UNAVAILABLE",
    });
    expect(f.account.signData).not.toHaveBeenCalled();
    expect(mocks.simulate).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
  it("同一操作中归档水位倒退，签名前停止，不清journal或更新绑定", async () => {
    const f = await fixture();
    let lower = false;
    vi.stubGlobal(
      "fetch",
      networkIdentityFixture((r) => ({
        height: r === "archive" && lower ? 99n : 100n,
      })).fetch,
    );
    mocks.simulate.mockImplementation(async () => {
      lower = true;
      return { $kind: "Transaction", Transaction: { digest: f.tx.digest } };
    });
    await expect(executeWalletPrepared(f.args)).rejects.toMatchObject({
      name: "TransactionNetworkResetError",
      role: "archive",
    });
    expect(f.account.signData).not.toHaveBeenCalled();
    expect(mocks.commitPending).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
    // A fresh operation with healthy responses cannot erase the committed reset.
    const good = networkIdentityFixture(() => ({ height: 102n }));
    vi.stubGlobal("fetch", good.fetch);
    await expect(
      executeWalletPrepared({ ...f.args, requestId: "another-operation" }),
    ).rejects.toMatchObject({
      name: "TransactionNetworkResetError",
      role: "archive",
    });
    expect(good.requests).toHaveLength(0);
    expect(mocks.simulate).toHaveBeenCalledOnce();
    expect(f.account.signData).not.toHaveBeenCalled();
    expect(mocks.commitPending).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
  it("本地终态与原摘要只读恢复不调用三入口授权探针", async () => {
    const f = await fixture();
    const fetch = vi
      .fn()
      .mockRejectedValue(
        new Error("No network identity permitted in local recovery"),
      );
    vi.stubGlobal("fetch", fetch);
    mocks.confirmedReceipt.mockResolvedValue(f.tx.receipt());
    expect(
      await readWalletStoredReceipt({
        accountId: f.account.id,
        bindingKey: f.args.bindingKey,
        digest: f.tx.digest,
      }),
    ).toBeTruthy();
    mocks.pending.mockResolvedValue({
      id: "original",
      digest: f.tx.digest,
      state: "dispatch-pending",
    });
    mocks.lookup.mockResolvedValue(null);
    expect((await recoverWalletExecution(f.account.id))?.state).toBe("pending");
    expect(fetch).not.toHaveBeenCalled();
    expect(f.account.signData).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
});

it.each(["changed", "accountStatusChanged", "selected-without-event"] as const)(
  "身份探测等待期间%s必须拒绝迟到成功",
  async (event) => {
    const f = await fixture(),
      transport = networkIdentityFixture();
    let release!: () => void;
    const wait = new Promise<void>((done) => {
      release = done;
    });
    let entered = false;
    vi.stubGlobal("fetch", async (...args: Parameters<typeof fetch>) => {
      entered = true;
      await wait;
      return transport.fetch(...args);
    });
    const pending = executeWalletPrepared(f.args);
    const rejected = expect(pending).rejects.toThrow();
    await vi.waitFor(() => expect(entered).toBe(true));
    if (event === "selected-without-event")
      f.account.toUISerialized.mockResolvedValue({ selected: false });
    else
      mocks.on.mock.calls.find(([name]) => name === event)?.[1](
        event === "changed" ? undefined : { accountID: f.account.id },
      );
    release();
    await rejected;
    expect(mocks.simulate).not.toHaveBeenCalled();
    expect(f.account.signData).not.toHaveBeenCalled();
    expect(mocks.commitPending).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
    expect(mocks.off).toHaveBeenCalledTimes(4);
  },
);

it("wallet-ui最终签名门槛之前提交Fault，零签名／pending／dispatch", async () => {
  const f = await fixture();
  const original = backgroundNetworkAdmission.runIfClear.bind(
    backgroundNetworkAdmission,
  );
  const hook = vi
    .spyOn(backgroundNetworkAdmission, "runIfClear")
    .mockImplementation(async (p, areas, start) => {
      const area = { kind: "identity", role: "fullnode" } as const;
      const ticket = await backgroundNetworkAdmission.begin(p, [area]);
      await backgroundNetworkAdmission.complete(p, ticket, [
        { ...area, reason: "chain-mismatch" },
      ]);
      return original(p, areas, start);
    });
  try {
    await expect(executeWalletPrepared(f.args)).rejects.toMatchObject({
      reason: "quarantined",
    });
    expect(f.account.signData).not.toHaveBeenCalled();
    expect(mocks.commitPending).not.toHaveBeenCalled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  } finally {
    hook.mockRestore();
  }
});
