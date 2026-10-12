// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from "rtd-typescript/bcs";
import { StakeEventBcs } from "rtd-apps-core/src/rpc/transaction-view";
import { GrpcTypes } from "rtd-typescript/grpc";
import { toBase58 } from "rtd-typescript/utils";
import { describe, expect, it, vi } from "vitest";
import {
  executionFixture,
  grpcResponse,
  sender,
} from "../../../tests/unit/rpc/execution-fixtures";
import { serializeEventEnvelope, eventEnvelopeDigest } from "./event-envelope";
import { WalletExecutionReader } from "./execution-reader";
import { WalletReadSession } from "./session";
import { validateNetworkProfile } from "./profile";
import { profileFixture } from "./profile-fixture";

async function fixture(
  options: {
    success?: boolean;
    alter?: (raw: GrpcTypes.ExecutedTransaction) => void;
    status?: number;
    chain?: (call: number) => string;
    invalidSignature?: boolean;
    personalMessage?: Uint8Array;
  } = {},
) {
  const tx = await executionFixture();
  const session = new WalletReadSession(
    validateNetworkProfile(profileFixture()),
  );
  const requests: GrpcTypes.ExecuteTransactionRequest[] = [];
  let info = 0;
  const fetch = vi.fn<typeof globalThis.fetch>(async (url, init) => {
    expect(init?.redirect).toBe("error");
    expect(init?.credentials).toBe("omit");
    expect(init?.signal).toBeDefined();
    if (String(url).endsWith("/GetServiceInfo"))
      return grpcResponse(
        GrpcTypes.GetServiceInfoResponse.toBinary({
          chainId:
            options.chain?.(++info) ?? session.profile.expectedGenesisDigest,
          checkpointHeight: 21n,
        }),
      );
    if (String(url).endsWith("/VerifySignature")) {
      const request = GrpcTypes.VerifySignatureRequest.fromBinary(
        (init!.body as Uint8Array).subarray(5),
      );
      expect(request.message?.name).toBe(
        options.personalMessage ? "PersonalMessage" : "TransactionData",
      );
      expect(request.message?.value).toEqual(
        options.personalMessage
          ? bcs.vector(bcs.u8()).serialize(options.personalMessage).toBytes()
          : tx.bytes,
      );
      expect(request.address).toBe(sender);
      expect(request.jwks).toEqual([]);
      return grpcResponse(
        GrpcTypes.VerifySignatureResponse.toBinary({
          isValid: !options.invalidSignature,
        }),
      );
    }
    const raw = tx.result(options.success ?? true);
    options.alter?.(raw);
    if (String(url).endsWith("/ExecuteTransaction")) {
      requests.push(
        GrpcTypes.ExecuteTransactionRequest.fromBinary(
          (init!.body as Uint8Array).subarray(5),
        ),
      );
      return grpcResponse(
        GrpcTypes.ExecuteTransactionResponse.toBinary({ transaction: raw }),
        options.status,
      );
    }
    expect(String(url)).toContain("/GetTransaction");
    return grpcResponse(
      GrpcTypes.GetTransactionResponse.toBinary({ transaction: raw }),
      options.status,
    );
  });
  return {
    tx,
    session,
    requests,
    fetch,
    reader: new WalletExecutionReader(session, {
      fetch,
      finalDispatch: (send) => send(),
    }),
  };
}
describe("单次原生执行与Ledger回执", () => {
  it.each(["dispatch", "verify", "lookup"])(
    "%s等待读取名额时取消，零网络调用",
    async (mode) => {
      const f = await fixture();
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const active = Array.from({ length: 4 }, () =>
        f.session.request(f.session.signal, () => gate),
      );
      const controller = new AbortController();
      const pending =
        mode === "dispatch"
          ? f.reader.dispatch(
              f.tx.bytesBase64,
              sender,
              [f.tx.signed.signature],
              controller.signal,
            )
          : mode === "verify"
            ? f.reader.verifySignature(
                f.tx.bytesBase64,
                sender,
                f.tx.signed.signature,
                controller.signal,
              )
            : f.reader.lookup(f.tx.digest, controller.signal);
      const error = new Error("cancelled in queue");
      const assertion = expect(pending).rejects.toBe(error);
      await Promise.resolve();
      expect(f.fetch).not.toHaveBeenCalled();
      controller.abort(error);
      await assertion;
      release();
      await Promise.all(active);
      expect(f.fetch).not.toHaveBeenCalled();
      expect(f.requests).toHaveLength(0);
    },
  );
  it("读取队列恢复后只提交一次，恢复查询不重复提交", async () => {
    const f = await fixture();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const active = Array.from({ length: 4 }, () =>
      f.session.request(f.session.signal, () => gate),
    );
    const pending = f.reader.dispatch(f.tx.bytesBase64, sender, [
      f.tx.signed.signature,
    ]);
    await Promise.resolve();
    expect(f.fetch).not.toHaveBeenCalled();
    release();
    await Promise.all(active);
    const receipt = await pending;
    expect(f.requests).toHaveLength(1);
    expect(await f.reader.lookup(f.tx.digest)).toEqual(receipt);
    expect(f.requests).toHaveLength(1);
  });

  it.each([true, false])(
    "成功／链失败都返回验证过的终结回执 %s",
    async (success) => {
      const f = await fixture({ success });
      const receipt = await f.reader.dispatch(f.tx.bytesBase64, sender, [
        f.tx.signed.signature,
      ]);
      expect(receipt).toEqual(f.tx.receipt(success));
      expect(f.requests).toHaveLength(1);
      expect(f.requests[0].transaction?.bcs?.value).toEqual(f.tx.bytes);
      expect(f.requests[0].readMask?.paths).toContain("effects");
      expect(await f.reader.lookup(f.tx.digest)).toEqual(receipt);
    },
  );
  it("签名验证使用TransactionData、同一bytes、当前链JWK与授权地址", async () => {
    const f = await fixture();
    await f.reader.verifySignature(
      f.tx.bytesBase64,
      sender,
      f.tx.signed.signature,
    );
    const invalid = await fixture({ invalidSignature: true });
    await expect(
      invalid.reader.verifySignature(
        invalid.tx.bytesBase64,
        sender,
        invalid.tx.signed.signature,
      ),
    ).rejects.toThrow("签名与批准");
  });
  it.each(["digest", "bcs", "effects", "status", "signature", "gas", "epoch"])(
    "拒绝缺失或矛盾 %s",
    async (kind) => {
      const f = await fixture({
        alter: (raw) => {
          if (kind === "digest")
            raw.digest = toBase58(new Uint8Array(32).fill(4));
          if (kind === "bcs") raw.transaction!.bcs!.value = new Uint8Array([1]);
          if (kind === "effects") raw.effects!.bcs = undefined;
          if (kind === "status") raw.effects!.status = undefined;
          if (kind === "signature") raw.signatures = [];
          if (kind === "gas") raw.effects!.gasUsed!.storageCost = 99n;
          if (kind === "epoch") raw.effects!.epoch = 8n;
        },
      });
      await expect(
        f.reader.dispatch(f.tx.bytesBase64, sender, [f.tx.signed.signature]),
      ).rejects.toThrow();
      expect(f.requests).toHaveLength(1);
    },
  );
  it("NotFound只表示未查到，真实gRPC状态解析后不生成失败回执", async () => {
    const f = await fixture({ status: 5 });
    expect(await f.reader.lookup(f.tx.digest)).toBeNull();
    expect(f.requests).toHaveLength(0);
  });
  it("Unavailable不重试execute", async () => {
    const f = await fixture({ status: 14 });
    await expect(
      f.reader.dispatch(f.tx.bytesBase64, sender, [f.tx.signed.signature]),
    ).rejects.toThrow();
    expect(f.requests).toHaveLength(1);
  });
  it("提交前错链不发请求，提交后换链不接纳回执", async () => {
    const wrong = toBase58(new Uint8Array(32).fill(5));
    const f = await fixture({ chain: () => wrong });
    await expect(
      f.reader.dispatch(f.tx.bytesBase64, sender, [f.tx.signed.signature]),
    ).rejects.toThrow();
    expect(f.requests).toHaveLength(0);
    const end = await fixture({
      chain: (call) =>
        call === 1
          ? validateNetworkProfile(profileFixture()).expectedGenesisDigest
          : wrong,
    });
    await expect(
      end.reader.dispatch(end.tx.bytesBase64, sender, [
        end.tx.signed.signature,
      ]),
    ).rejects.toThrow();
    expect(end.requests).toHaveLength(1);
  });
  it("关闭会话或提前取消完全不dispatch", async () => {
    const f = await fixture();
    const abort = new AbortController();
    abort.abort();
    await expect(
      f.reader.dispatch(
        f.tx.bytesBase64,
        sender,
        [f.tx.signed.signature],
        abort.signal,
      ),
    ).rejects.toThrow();
    f.session.close();
    await expect(
      f.reader.dispatch(f.tx.bytesBase64, sender, [f.tx.signed.signature]),
    ).rejects.toThrow();
    expect(f.requests).toHaveLength(0);
  });
});

describe("只读现代交易详情", () => {
  it.each([true, false])(
    "成功／链失败保留完整native模型，不冒充缺回执 %s",
    async (success) => {
      const f = await fixture({
        success,
        alter: (raw) => {
          raw.timestamp = { seconds: 123n, nanos: 999_000_000 };
        },
      });
      const detail = await f.reader.details(f.tx.digest);
      expect(detail).toMatchObject({
        source: "fullnode",
        bindingKey: f.session.bindingKey,
        readSessionKey: f.session.cacheKey,
        transaction: {
          digest: f.tx.digest,
          status: { success },
          checkpoint: "21",
          timestampMs: 123999,
          events: [],
        },
      });
      expect(detail!.transaction.bcs).toEqual(f.tx.bytes);
      expect(detail!.transaction.effects.bcs).toEqual(
        f.tx.result(success).effects!.bcs!.value,
      );
      expect(f.requests).toHaveLength(0);
    },
  );
  it("返回超过50个完整事件，明确events mask并使用BCS而非不稳定JSON", async () => {
    const f = await fixture({
      alter: (raw) => {
        const bytes = StakeEventBcs.serialize({
          poolId: "0x5",
          validatorAddress: "0x6",
          stakerAddress: sender,
          epoch: "7",
          amount: "9007199254740993",
        }).toBytes();
        const event = {
          packageId: "0x3",
          module: "validator",
          sender,
          eventType: "0x3::validator::StakingRequestEvent",
          contents: { value: bytes },
        };
        raw.events = { events: Array.from({ length: 55 }, () => event) };
        const envelope = serializeEventEnvelope(raw.events.events);
        const digest = eventEnvelopeDigest(envelope);
        raw.events.bcs = { value: envelope };
        raw.events.digest = digest;
        raw.effects!.eventsDigest = digest;
        const body = bcs.TransactionEffects.parse(raw.effects!.bcs!.value!);
        body.V2!.eventsDigest = digest;
        raw.effects!.bcs!.value =
          bcs.TransactionEffects.serialize(body).toBytes();
      },
    });
    const detail = await f.reader.details(f.tx.digest);
    expect(detail!.transaction.events).toHaveLength(55);
    expect(detail!.transaction.events[54].json).toBeNull();
    const requestCall = f.fetch.mock.calls.find(([url]) =>
      String(url).endsWith("/GetTransaction"),
    )!;
    const request = GrpcTypes.GetTransactionRequest.fromBinary(
      (requestCall[1]!.body as Uint8Array).subarray(5),
    );
    expect(request.readMask!.paths).toEqual(
      expect.arrayContaining([
        "transaction",
        "effects",
        "events",
        "timestamp",
        "balance_changes",
      ]),
    );
  });
  it("真正NotFound为null；缺字段／错digest／服务错误拒绝", async () => {
    const absent = await fixture({ status: 5 });
    expect(await absent.reader.details(absent.tx.digest)).toBeNull();
    const broken = await fixture({
      alter: (raw) => {
        raw.digest = toBase58(new Uint8Array(32).fill(99));
      },
    });
    await expect(broken.reader.details(broken.tx.digest)).rejects.toThrow();
    const unavailable = await fixture({ status: 14 });
    await expect(
      unavailable.reader.details(unavailable.tx.digest),
    ).rejects.toThrow();
  });
  it.each([
    (raw: GrpcTypes.ExecutedTransaction) => {
      raw.timestamp = { seconds: 1n, nanos: 1_000_000_000 };
    },
    (raw: GrpcTypes.ExecutedTransaction) => {
      raw.timestamp = { seconds: 9007199254740n, nanos: 999_000_000 };
    },
    (raw: GrpcTypes.ExecutedTransaction) => {
      raw.timestamp = { seconds: 1n, nanos: 0 };
      raw.checkpoint = undefined;
    },
    (raw: GrpcTypes.ExecutedTransaction) => {
      raw.effects!.eventsDigest = toBase58(new Uint8Array(32).fill(99));
    },
    (raw: GrpcTypes.ExecutedTransaction) => {
      raw.effects!.dependencies = [toBase58(new Uint8Array(32).fill(99))];
    },
    (raw: GrpcTypes.ExecutedTransaction) => {
      raw.events = {
        events: [
          {
            packageId: "0x3",
            module: "validator",
            sender,
            eventType: "0x3::validator::StakingRequestEvent",
            contents: { value: new Uint8Array() },
          },
        ],
      };
    },
  ])("拒绝时间／覆盖字段或effects索引事实不一致 %#", async (alter) => {
    const f = await fixture({ alter });
    await expect(f.reader.details(f.tx.digest)).rejects.toThrow();
  });
});

it("PersonalMessage gRPC sends BCS vector rather than raw bytes or transaction intent", async () => {
  const bytes = new Uint8Array([1, 2, 3]);
  const f = await fixture({ personalMessage: bytes });
  await f.reader.verifyPersonalMessage(bytes, sender, f.tx.signed.signature);
  expect(f.requests).toHaveLength(0);
  expect(
    f.fetch.mock.calls.filter(([url]) =>
      String(url).endsWith("/VerifySignature"),
    ),
  ).toHaveLength(1);
});

it("身份探测等待后提交的Fault在实际Execute fetch前阻止发送", async () => {
  const f = await fixture();
  let blocked = false;
  const fault = new Error("durable admission fault");
  const finalDispatch = vi.fn(async (send: () => Promise<Response>) => {
    if (blocked) throw fault;
    return send();
  });
  const options = {
    fetch: async (...args: Parameters<typeof globalThis.fetch>) => {
      const response = await f.fetch(...args);
      if (String(args[0]).endsWith("/GetServiceInfo")) blocked = true;
      return response;
    },
    finalDispatch,
  };
  const reader = new WalletExecutionReader(f.session, options);
  await expect(
    reader.dispatch(f.tx.bytesBase64, sender, [f.tx.signed.signature]),
  ).rejects.toMatchObject({ message: fault.message });
  expect(finalDispatch).toHaveBeenCalledTimes(1);
  expect(f.requests).toHaveLength(0);
  f.session.close();
});

it("最终发送门槛仅包围一次Execute，不包围身份／验签／恢复读取", async () => {
  const f = await fixture();
  const finalDispatch = vi.fn((send: () => Promise<Response>) => send());
  const options = { fetch: f.fetch, finalDispatch };
  const reader = new WalletExecutionReader(f.session, options);
  await reader.verifySignature(f.tx.bytesBase64, sender, f.tx.signed.signature);
  await reader.lookup(f.tx.digest);
  expect(finalDispatch).not.toHaveBeenCalled();
  await reader.dispatch(f.tx.bytesBase64, sender, [f.tx.signed.signature]);
  expect(finalDispatch).toHaveBeenCalledTimes(1);
  expect(f.requests).toHaveLength(1);
  f.session.close();
});

it("等待最终门槛时session关闭，实际Execute仍为零", async () => {
  const f = await fixture();
  const finalDispatch = vi.fn(async (send: () => Promise<Response>) => {
    f.session.close();
    return send();
  });
  const reader = new WalletExecutionReader(f.session, {
    fetch: f.fetch,
    finalDispatch,
  });
  await expect(
    reader.dispatch(f.tx.bytesBase64, sender, [f.tx.signed.signature]),
  ).rejects.toBeDefined();
  expect(finalDispatch).toHaveBeenCalledTimes(1);
  expect(f.requests).toHaveLength(0);
  expect(f.fetch).toHaveBeenCalledTimes(1);
});

it("未注入最终准入门槛的reader不能发送，不退为直接fetch", async () => {
  const f = await fixture();
  const reader = new WalletExecutionReader(f.session, { fetch: f.fetch });
  await expect(
    reader.dispatch(f.tx.bytesBase64, sender, [f.tx.signed.signature]),
  ).rejects.toMatchObject({ reason: "unavailable" });
  expect(f.fetch).not.toHaveBeenCalled();
  expect(f.requests).toHaveLength(0);
  f.session.close();
});
