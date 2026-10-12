// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from "vitest";
import type {
  WalletFreshObject,
  WalletRpc,
  WalletPreparedTransaction,
} from "rtd-apps-core/src/rpc/WalletRpcContext";
import { KioskClient, KioskTransaction } from "rtd-kiosk";
import { RtdGrpcClient } from "rtd-typescript/grpc";
import { Transaction } from "rtd-typescript/transactions";
import {
  deriveDynamicFieldID,
  normalizeRtdAddress as address,
  normalizeStructTag as tag,
  toBase58,
} from "rtd-typescript/utils";
import {
  KIOSK_BCS,
  KIOSK_CAP_BCS,
  KIOSK_ITEM_BCS,
  PERSONAL_CAP_BCS,
} from "./kiosk-reader";
import {
  prepareNftTransfer,
  revalidateNftTransfer,
} from "./nft-transfer-preparation";

function fixture(route: "direct" | "kiosk" | "personal" = "direct") {
  const sender = address("0xb"),
    id = address("0xd"),
    capId = address("0xa"),
    kioskId = address("0xc");
  const input = {
    sender,
    to: address("0xe"),
    objectId: id,
    objectType: tag("0x3::nft::NFT"),
  };
  const fieldId = deriveDynamicFieldID(
    kioskId,
    "0x2::dynamic_object_field::Wrapper<0x2::kiosk::Item>",
    KIOSK_ITEM_BCS.serialize({ id }).toBytes(),
  );
  const item: WalletFreshObject = {
    objectId: id,
    type: input.objectType,
    version: "9007199254740993",
    digest: toBase58(new Uint8Array(32).fill(1)),
    owner:
      route === "direct"
        ? { $kind: "AddressOwner", AddressOwner: sender }
        : { $kind: "ObjectOwner", ObjectOwner: fieldId },
    json: undefined,
    display: undefined,
    content: new Uint8Array(),
    objectBcs: new Uint8Array(),
    previousTransaction: toBase58(new Uint8Array(32).fill(2)),
    hasPublicTransfer: null,
  };
  const embedded = { id: capId, for: kioskId };
  const cap: WalletFreshObject = {
    ...item,
    objectId: capId,
    owner: { $kind: "AddressOwner", AddressOwner: sender },
    type: tag(
      route === "personal"
        ? "0x4::personal_kiosk::PersonalKioskCap"
        : "0x2::kiosk::KioskOwnerCap",
    ),
    content:
      route === "personal"
        ? PERSONAL_CAP_BCS.serialize({ id: capId, cap: embedded }).toBytes()
        : KIOSK_CAP_BCS.serialize(embedded).toBytes(),
  };
  const kiosk: WalletFreshObject = {
    ...item,
    objectId: kioskId,
    type: tag("0x2::kiosk::Kiosk"),
    owner: { $kind: "Shared", Shared: { initialSharedVersion: "42" } },
    content: KIOSK_BCS.serialize({
      id: kioskId,
      owner: sender,
      item_count: 1,
      profits: { value: "0" },
      allow_extensions: false,
    }).toBytes(),
  };
  const proof = {
    bindingKey: "binding",
    checkpoint: "10",
    digest: "cpDigest",
    cacheKey: "snapshot",
  };
  const discoveredItem = {
    ...item,
    kioskId,
    isLocked: false,
    listing: undefined as undefined | { isExclusive: boolean },
  };
  const discovery = {
    kind: "framework",
    kioskId,
    ownerCap: {
      objectId: capId,
      kioskId,
      isPersonal: route === "personal",
      version: "1",
      digest: "old",
    },
    items: [discoveredItem],
  };
  const snapshot = {
    proof,
    kiosks: vi.fn().mockResolvedValue({ snapshot: proof, value: [discovery] }),
  };
  const prepared = {
    bindingKey: "binding",
    readSessionKey: "session",
    sender,
    gasOwner: sender,
    gasBudget: "100",
    gasPrice: "1",
    gasPaymentKind: "coins",
    bytesBase64: "reviewedBytes",
    digest: "reviewedDigest",
  } as WalletPreparedTransaction;
  const rpc = {
    bindingKey: "binding",
    readSessionKey: "session",
    packages: { kiosk: address("0x2"), personalKiosk: address("0x4") },
    openAssetSnapshot: vi.fn().mockResolvedValue(snapshot),
    readFreshObject: vi.fn(
      async (key: string) =>
        ({ [id]: item, [capId]: cap, [kioskId]: kiosk })[key] ?? null,
    ),
    prepareTransaction: vi.fn().mockResolvedValue(prepared),
    simulateTransaction: vi.fn().mockResolvedValue({
      $kind: "Transaction",
      Transaction: { digest: prepared.digest },
    }),
    resolveRecipientName: vi.fn().mockResolvedValue({
      address: input.to,
      snapshot: proof,
      readSessionKey: "session",
      validUntilMonotonicMs: performance.now() + 20_000,
    }),
  } as unknown as WalletRpc;
  const tx = () =>
    vi.mocked(rpc.prepareTransaction).mock.calls[0][0] as Transaction;
  return {
    rpc,
    input,
    item,
    cap,
    kiosk,
    discovery,
    discoveredItem,
    snapshot,
    prepared,
    tx,
  };
}
describe("NFT approval and native Kiosk transfer", () => {
  it("direct transfer fixes a fresh exact u64 reference and never opens a snapshot", async () => {
    const f = fixture();
    const result = await prepareNftTransfer(f.rpc, f.input);
    expect(result.route).toBe("direct");
    expect(Object.isFrozen(result.input)).toBe(true);
    expect(f.tx().getData().inputs[0]).toMatchObject({
      Object: {
        ImmOrOwnedObject: {
          objectId: f.item.objectId,
          version: "9007199254740993",
          digest: f.item.digest,
        },
      },
    });
    expect(
      f
        .tx()
        .getData()
        .commands.map((x) => x.$kind),
    ).toEqual(["TransferObjects"]);
    expect(f.rpc.openAssetSnapshot).not.toHaveBeenCalled();
  });
  it.each(["direct", "kiosk"] as const)(
    "%s consensus inputs preserve startVersion instead of an owned reference",
    async (route) => {
      const f = fixture(route);
      const object = route === "direct" ? f.item : f.cap;
      object.owner = {
        $kind: "ConsensusAddressOwner",
        ConsensusAddressOwner: { owner: f.input.sender, startVersion: "12" },
      };
      await prepareNftTransfer(f.rpc, f.input);
      expect(f.tx().getData().inputs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            Object: expect.objectContaining({
              SharedObject: {
                objectId: object.objectId,
                initialSharedVersion: "12",
                mutable: true,
              },
            }),
          }),
        ]),
      );
      expect(JSON.stringify(f.tx().getData().inputs)).not.toContain(
        "ImmOrOwnedObject",
      );
    },
  );
  it.each(["kiosk", "personal"] as const)(
    "%s uses fresh capability refs and shared initial version, and returns personal borrow",
    async (route) => {
      const f = fixture(route);
      const result = await prepareNftTransfer(f.rpc, f.input);
      expect(result.route).toBe(
        route === "personal" ? "personal-kiosk" : "framework-kiosk",
      );
      const data = f.tx().getData();
      expect(data.inputs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            Object: expect.objectContaining({
              SharedObject: {
                objectId: f.kiosk.objectId,
                initialSharedVersion: "42",
                mutable: true,
              },
            }),
          }),
          expect.objectContaining({
            Object: expect.objectContaining({
              ImmOrOwnedObject: {
                objectId: f.cap.objectId,
                version: f.cap.version,
                digest: f.cap.digest,
              },
            }),
          }),
        ]),
      );
      expect(
        data.commands.map((x) =>
          x.$kind === "MoveCall" ? x.MoveCall.function : x.$kind,
        ),
      ).toEqual(
        route === "personal"
          ? ["borrow_val", "take", "TransferObjects", "return_val"]
          : ["take", "TransferObjects"],
      );
      expect(
        data.commands
          .filter((x) => x.$kind === "MoveCall")
          .map((x) => x.MoveCall.package),
      ).toEqual(
        route === "personal"
          ? [address("0x4"), address("0x2"), address("0x4")]
          : [address("0x2")],
      );
      expect(f.rpc.readFreshObject).toHaveBeenCalledTimes(3);
    },
  );
  it.each(["kiosk", "personal"] as const)(
    "%s command graph equals the real modern SDK without a lookup",
    async (route) => {
      const f = fixture(route);
      await prepareNftTransfer(f.rpc, f.input);
      const fetch = vi.fn(() => {
        throw new Error("unexpected SDK network lookup");
      });
      const client = new RtdGrpcClient({
        network: "unknown",
        baseUrl: "https://fullnode.example.test",
        mvr: { url: "" },
        fetch,
      });
      const kioskClient = new KioskClient({
        client,
        network: "unknown",
        packageIds: { personalKioskRulePackageId: address("0x4") },
      });
      const tx = new Transaction();
      tx.sharedObjectRef({
        objectId: f.kiosk.objectId,
        initialSharedVersion: "42",
        mutable: true,
      });
      tx.objectRef(f.cap);
      new KioskTransaction({
        transaction: tx,
        kioskClient,
        cap: {
          ...f.discovery.ownerCap,
          version: f.cap.version,
          digest: f.cap.digest,
        },
      })
        .transfer({
          itemType: f.item.type,
          itemId: f.item.objectId,
          address: f.input.to,
        })
        .finalize();
      expect(f.tx().getData().commands).toEqual(tx.getData().commands);
      expect(f.tx().getData().inputs).toEqual(tx.getData().inputs);
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it("ordinary listing may be taken, exclusive listing and locked items may not", async () => {
    for (const condition of ["ordinary", "exclusive", "locked"]) {
      const f = fixture("kiosk");
      f.discoveredItem.listing = { isExclusive: condition === "exclusive" };
      f.discoveredItem.isLocked = condition === "locked";
      if (condition === "ordinary") await prepareNftTransfer(f.rpc, f.input);
      else {
        await expect(prepareNftTransfer(f.rpc, f.input)).rejects.toThrow(
          "锁定或独占",
        );
        expect(f.rpc.prepareTransaction).not.toHaveBeenCalled();
      }
    }
  });
  it.each(["foreign", "immutable", "shared", "type", "missing"])(
    "direct %s does not reach simulation",
    async (failure) => {
      const f = fixture();
      if (failure === "foreign")
        f.item.owner = { $kind: "AddressOwner", AddressOwner: address("0xf") };
      if (failure === "immutable")
        f.item.owner = { $kind: "Immutable", Immutable: true };
      if (failure === "shared")
        f.item.owner = {
          $kind: "Shared",
          Shared: { initialSharedVersion: "1" },
        };
      if (failure === "type") f.item.type = tag("0x3::nft::Other");
      if (failure === "missing")
        vi.mocked(f.rpc.readFreshObject).mockResolvedValue(null);
      await expect(prepareNftTransfer(f.rpc, f.input)).rejects.toThrow();
      expect(f.rpc.prepareTransaction).not.toHaveBeenCalled();
    },
  );
  it.each([
    "foreign-cap",
    "other-kiosk",
    "field-owner",
    "unproved",
    "snapshot",
    "bad-kiosk",
    "bad-cap",
    "foreign-kiosk",
  ])("Kiosk %s rejects before build", async (failure) => {
    const f = fixture("kiosk");
    if (failure === "foreign-cap")
      f.cap.owner = { $kind: "AddressOwner", AddressOwner: address("0xf") };
    if (failure === "other-kiosk")
      f.cap.content = KIOSK_CAP_BCS.serialize({
        id: f.cap.objectId,
        for: address("0xf"),
      }).toBytes();
    if (failure === "field-owner")
      f.item.owner = { $kind: "ObjectOwner", ObjectOwner: f.kiosk.objectId };
    if (failure === "unproved") f.discovery.items = [];
    if (failure === "snapshot") f.snapshot.proof.bindingKey = "wrong";
    if (failure === "bad-kiosk")
      f.kiosk.content = new Uint8Array([...f.kiosk.content, 0]);
    if (failure === "bad-cap")
      f.cap.content = new Uint8Array([...f.cap.content, 0]);
    if (failure === "foreign-kiosk")
      f.kiosk.owner = { $kind: "AddressOwner", AddressOwner: address("0xf") };
    await expect(prepareNftTransfer(f.rpc, f.input)).rejects.toThrow();
    expect(f.rpc.prepareTransaction).not.toHaveBeenCalled();
  });
  it("rejects name expiry while confirmation simulation is pending", async () => {
    const f = fixture("personal");
    const prepared = await prepareNftTransfer(f.rpc, {
      ...f.input,
      recipientName: "alice.rtd",
    });
    const original = vi
      .mocked(f.rpc.simulateTransaction)
      .getMockImplementation()!;
    vi.mocked(f.rpc.simulateTransaction).mockImplementation(async (...args) => {
      const result = await original(...args);
      vi.spyOn(performance, "now").mockReturnValue(Number.MAX_SAFE_INTEGER);
      return result;
    });
    try {
      await expect(
        revalidateNftTransfer(f.rpc, prepared, f.input.sender),
      ).rejects.toThrow("校验已过期");
    } finally {
      vi.restoreAllMocks();
    }
  });
  it("confirmation only simulates reviewed bytes and resolves original name again", async () => {
    const f = fixture("personal");
    const prepared = await prepareNftTransfer(f.rpc, {
      ...f.input,
      recipientName: "alice.rtd",
    });
    vi.mocked(f.rpc.readFreshObject).mockClear();
    vi.mocked(f.rpc.prepareTransaction).mockClear();
    expect(await revalidateNftTransfer(f.rpc, prepared, f.input.sender)).toBe(
      prepared,
    );
    expect(f.rpc.simulateTransaction).toHaveBeenCalledWith(
      "reviewedBytes",
      f.input.sender,
      undefined,
    );
    expect(f.rpc.resolveRecipientName).toHaveBeenCalledTimes(2);
    expect(f.rpc.readFreshObject).not.toHaveBeenCalled();
    expect(f.rpc.prepareTransaction).not.toHaveBeenCalled();
  });
  it.each([
    "session",
    "sender",
    "name",
    "digest",
    "simulation-failure",
    "cancel",
  ])("confirmation %s cannot send replacement bytes", async (failure) => {
    const f = fixture();
    const prepared = await prepareNftTransfer(f.rpc, {
      ...f.input,
      recipientName: "alice.rtd",
    });
    let rpc = f.rpc;
    if (failure === "session") rpc = { ...rpc, readSessionKey: "other" };
    if (failure === "name")
      vi.mocked(rpc.resolveRecipientName).mockResolvedValue(null);
    if (failure === "digest")
      vi.mocked(rpc.simulateTransaction).mockResolvedValue({
        $kind: "Transaction",
        Transaction: { digest: "wrong" },
      } as never);
    if (failure === "simulation-failure")
      vi.mocked(rpc.simulateTransaction).mockResolvedValue({
        $kind: "FailedTransaction",
      } as never);
    await expect(
      revalidateNftTransfer(
        rpc,
        prepared,
        failure === "sender" ? "0xf" : f.input.sender,
        failure === "cancel" ? AbortSignal.abort() : undefined,
      ),
    ).rejects.toThrow();
    expect(rpc.prepareTransaction).toHaveBeenCalledTimes(1);
  });
  it("late preparation from a replaced session cannot become an approval", async () => {
    const f = fixture();
    vi.mocked(f.rpc.prepareTransaction).mockResolvedValue({
      ...f.prepared,
      readSessionKey: "new",
    });
    await expect(prepareNftTransfer(f.rpc, f.input)).rejects.toThrow(
      "不同钱包会话",
    );
  });
  it("one overall cancellation budget propagates into reads and preparation", async () => {
    const f = fixture();
    const abort = new AbortController();
    vi.mocked(f.rpc.readFreshObject).mockImplementation(async () => {
      abort.abort();
      return f.item;
    });
    await expect(
      prepareNftTransfer(f.rpc, f.input, abort.signal),
    ).rejects.toThrow();
    expect(f.rpc.prepareTransaction).not.toHaveBeenCalled();
  });
});

import { ORIGINBYTE_OWNER_TOKEN_BCS } from "./originbyte-kiosk";
function originFixture(existingTarget = false) {
  const f = fixture("kiosk");
  const deployment = {
    discoveryPackage: address("0x88"),
    executionPackage: address("0x99"),
  };
  Object.assign(f.rpc.packages, { originByte: deployment });
  f.cap.type = tag(`${deployment.discoveryPackage}::ob_kiosk::OwnerToken`);
  f.cap.content = ORIGINBYTE_OWNER_TOKEN_BCS.serialize({
    id: f.cap.objectId,
    kiosk: f.kiosk.objectId,
    owner: f.input.sender,
  }).toBytes();
  f.kiosk.content = KIOSK_BCS.serialize({
    ...KIOSK_BCS.parse(f.kiosk.content),
    allow_extensions: true,
  }).toBytes();
  const discovered = {
    kind: "originbyte",
    kioskId: f.kiosk.objectId,
    ownerTokenId: f.cap.objectId,
    owner: f.input.sender,
    extensionVersion: "3",
    items: [
      {
        ...f.discoveredItem,
        originByteRegistered: true,
        originByteExclusive: false,
      },
    ],
  };
  const targetId = address("0xf");
  const target = {
    ...discovered,
    kioskId: targetId,
    owner: f.input.to,
    items: [],
  };
  const targetObject = {
    ...f.kiosk,
    objectId: targetId,
    owner: { $kind: "Shared", Shared: { initialSharedVersion: "77" } },
    content: KIOSK_BCS.serialize({
      ...KIOSK_BCS.parse(f.kiosk.content),
      id: targetId,
      owner: f.input.to,
      item_count: 0,
    }).toBytes(),
  };
  f.snapshot.kiosks.mockImplementation(async (owner) => ({
    snapshot: f.snapshot.proof,
    value:
      owner === f.input.sender ? [discovered] : existingTarget ? [target] : [],
  }));
  vi.mocked(f.rpc.readFreshObject).mockImplementation(
    async (id) =>
      (({
        [f.item.objectId]: f.item,
        [f.cap.objectId]: f.cap,
        [f.kiosk.objectId]: f.kiosk,
        [targetId]: targetObject,
      })[id] as WalletFreshObject) ?? null,
  );
  return { ...f, discovered, target, targetObject, deployment };
}
describe("OriginByte reviewed P2P preparation", () => {
  it.each([false, true])(
    "builds the configured execution-package call; existing target=%s",
    async (existingTarget) => {
      const f = originFixture(existingTarget);
      const result = await prepareNftTransfer(f.rpc, f.input);
      expect(result.route).toBe("originbyte-kiosk");
      expect(f.rpc.prepareTransaction).toHaveBeenCalledOnce();
      const commands = f.tx().getData().commands;
      expect(commands).toHaveLength(1);
      expect(commands[0]).toMatchObject({
        MoveCall: {
          package: f.deployment.executionPackage,
          module: "ob_kiosk",
          function: existingTarget
            ? "p2p_transfer"
            : "p2p_transfer_and_create_target_kiosk",
          typeArguments: [f.item.type],
        },
      });
      expect(JSON.stringify(commands)).not.toContain("take");
      const inputs = f.tx().getData().inputs;
      expect(inputs.filter((value) => value.Object?.SharedObject).length).toBe(
        existingTarget ? 2 : 1,
      );
      expect(JSON.stringify(inputs)).not.toContain(f.cap.objectId);
    },
  );
  it.each([
    "unregistered",
    "exclusive",
    "locked",
    "token-owner",
    "source-owner",
    "left-kiosk",
    "target-owner",
    "target-checkpoint",
  ])(
    "rejects invalid P2P admission %s before preparing bytes",
    async (failure) => {
      const f = originFixture(true);
      if (failure === "unregistered")
        f.discovered.items[0].originByteRegistered = false;
      if (failure === "exclusive")
        f.discovered.items[0].originByteExclusive = true;
      if (failure === "locked") f.discovered.items[0].isLocked = true;
      if (failure === "token-owner")
        f.cap.content = ORIGINBYTE_OWNER_TOKEN_BCS.serialize({
          id: f.cap.objectId,
          kiosk: f.kiosk.objectId,
          owner: f.input.to,
        }).toBytes();
      if (failure === "source-owner")
        f.kiosk.content = KIOSK_BCS.serialize({
          ...KIOSK_BCS.parse(f.kiosk.content),
          owner: f.input.to,
        }).toBytes();
      if (failure === "left-kiosk")
        f.item.owner = { $kind: "ObjectOwner", ObjectOwner: address("0x10") };
      if (failure === "target-owner")
        f.targetObject.content = KIOSK_BCS.serialize({
          ...KIOSK_BCS.parse(f.targetObject.content),
          owner: f.input.sender,
        }).toBytes();
      if (failure === "target-checkpoint")
        f.snapshot.kiosks.mockImplementation(async (owner) => ({
          snapshot: {
            ...f.snapshot.proof,
            cacheKey: owner === f.input.sender ? "snapshot" : "other",
          },
          value: owner === f.input.sender ? [f.discovered] : [f.target],
        }));
      await expect(prepareNftTransfer(f.rpc, f.input)).rejects.toThrow();
      expect(f.rpc.prepareTransaction).not.toHaveBeenCalled();
    },
  );
  it("propagates formal preparation failure without switching recipient route or rebuilding", async () => {
    const f = originFixture(true);
    vi.mocked(f.rpc.prepareTransaction).mockRejectedValue(
      new Error("Move abort: deposits restricted"),
    );
    await expect(prepareNftTransfer(f.rpc, f.input)).rejects.toThrow(
      "deposits restricted",
    );
    expect(f.rpc.prepareTransaction).toHaveBeenCalledOnce();
  });
});

describe("NFT 准备的复合期限与取消", () => {
  async function delayedDiscovery(delay: number, cancelAt?: number) {
    vi.useFakeTimers();
    const timers: ReturnType<typeof setTimeout>[] = [];
    const timeout = vi
      .spyOn(AbortSignal, "timeout")
      .mockImplementation((ms) => {
        const c = new AbortController();
        timers.push(
          setTimeout(
            () => c.abort(new DOMException("deadline", "TimeoutError")),
            ms,
          ),
        );
        return c.signal;
      });
    const f = fixture("kiosk");
    const fast = f.snapshot.kiosks.getMockImplementation()!;
    f.snapshot.kiosks.mockImplementation(
      async (_owner, signal?: AbortSignal) => {
        await new Promise<void>((resolve, reject) => {
          const abort = () => {
            clearTimeout(timer);
            reject(signal!.reason);
          };
          const timer = setTimeout(() => {
            signal!.removeEventListener("abort", abort);
            resolve();
          }, delay);
          signal!.addEventListener("abort", abort, { once: true });
          if (signal!.aborted) abort();
        });
        return fast();
      },
    );
    const caller = new AbortController();
    let settled = false;
    const result = prepareNftTransfer(f.rpc, f.input, caller.signal).then(
      (value) => ({ value, error: undefined }),
      (error) => ({ value: undefined, error }),
    );
    if (cancelAt !== undefined)
      timers.push(
        setTimeout(
          () => caller.abort(new DOMException("caller", "AbortError")),
          cancelAt,
        ),
      );
    try {
      void result.then(() => {
        settled = true;
      });
      if (cancelAt === undefined && delay > 120_000) {
        await vi.advanceTimersByTimeAsync(119_999);
        expect(settled).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
      } else await vi.advanceTimersByTimeAsync(cancelAt ?? delay + 1);
      return { result: await result, f };
    } finally {
      for (const timer of timers) clearTimeout(timer);
      timeout.mockRestore();
      vi.useRealTimers();
    }
  }
  it("21秒完整Kiosk发现后仍检查fresh能力并准备预览", async () => {
    const { result, f } = await delayedDiscovery(21_000);
    expect(result.error).toBeUndefined();
    expect(result.value!.route).toBe("framework-kiosk");
    expect(f.rpc.readFreshObject).toHaveBeenCalledWith(
      f.cap.objectId,
      expect.any(AbortSignal),
    );
    expect(f.rpc.prepareTransaction).toHaveBeenCalledOnce();
  });
  it("120秒总预算取消迟到发现，不触发最终构建或模拟", async () => {
    const { result, f } = await delayedDiscovery(125_000);
    expect(result.value).toBeUndefined();
    expect(result.error.name).toBe("TimeoutError");
    expect(f.rpc.prepareTransaction).not.toHaveBeenCalled();
    expect(f.rpc.simulateTransaction).not.toHaveBeenCalled();
  });
  it("发现等待中取消立即终止，不触发最终构建或模拟", async () => {
    const { result, f } = await delayedDiscovery(21_000, 1_000);
    expect(result.value).toBeUndefined();
    expect(result.error.name).toBe("AbortError");
    expect(f.rpc.prepareTransaction).not.toHaveBeenCalled();
    expect(f.rpc.simulateTransaction).not.toHaveBeenCalled();
  });
});
