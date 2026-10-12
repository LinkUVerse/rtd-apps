// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { parseGrpcTransactionResponse } from "rtd-typescript/grpc";
import { describe, expect, it, vi } from "vitest";
import {
  executionFixture,
  sender,
} from "../../../tests/unit/rpc/execution-fixtures";
import { readStoredReceipt, selectReceiptFacts } from "./stored-receipt";
import type { WalletTransactionDetails } from "rtd-apps-core/src/rpc/WalletRpcContext";
import type { WalletStoredReceipt } from "./execution-journal";

async function fixture(success = true) {
  const tx = await executionFixture();
  const result = parseGrpcTransactionResponse(tx.result(success), {
    include: {
      effects: true,
      transaction: true,
      bcs: true,
      balanceChanges: true,
      objectTypes: true,
      events: true,
    },
  });
  const details: WalletTransactionDetails = {
    bindingKey: "binding",
    readSessionKey: "session",
    source: "fullnode",
    transaction: result.Transaction ?? result.FailedTransaction!,
  };
  const stored: WalletStoredReceipt = {
    bindingKey: "binding",
    accountAddress: sender,
    receipt: tx.receipt(success),
  };
  const request = {
    accountId: "account",
    accountAddress: sender,
    bindingKey: "binding",
    digest: tx.digest,
  };
  return { tx, details, stored, request };
}
describe("已确认记录与详情的独立呈现", () => {
  it.each([true, false])(
    "富详情暂缺仍保留经核验成功／失败终态 %s",
    async (success) => {
      const f = await fixture(success);
      expect(selectReceiptFacts(null, f.stored)).toMatchObject({
        confirmed: success,
        conflict: false,
        transaction: undefined,
      });
      expect(selectReceiptFacts(undefined, f.stored)).toMatchObject({
        confirmed: success,
      });
      expect(selectReceiptFacts(f.details, f.stored)).toMatchObject({
        confirmed: success,
        transaction: f.details.transaction,
        conflict: false,
      });
      const call = vi.fn(async () => f.stored);
      expect(
        await readStoredReceipt(
          { readStoredReceipt: call },
          f.request,
          new AbortController().signal,
        ),
      ).toEqual(f.stored);
      expect(call).toHaveBeenCalledWith({
        accountId: "account",
        bindingKey: "binding",
        digest: f.tx.digest,
      });
    },
  );
  it("没有持久终态不能凭空确认；经验证的新详情可以单独展示", async () => {
    const f = await fixture();
    expect(selectReceiptFacts(null, null).confirmed).toBeUndefined();
    expect(selectReceiptFacts(f.details, null).confirmed).toBe(true);
  });
  it.each(["binding", "address", "digest", "bcs", "state"])(
    "background返回%s不一致拒绝",
    async (failure) => {
      const f = await fixture();
      const stored = structuredClone(f.stored);
      if (failure === "binding") Object.assign(stored, { bindingKey: "wrong" });
      if (failure === "address")
        Object.assign(stored, { accountAddress: "0x1" });
      if (failure === "digest")
        Object.assign(stored.receipt, { digest: "wrong" });
      if (failure === "bcs")
        Object.assign(stored.receipt, { effectsBase64: "AA==" });
      if (failure === "state")
        Object.assign(stored.receipt, { success: false });
      await expect(
        readStoredReceipt(
          { readStoredReceipt: async () => stored },
          f.request,
          new AbortController().signal,
        ),
      ).rejects.toThrow();
    },
  );
  it.each(["status", "epoch", "checkpoint", "effects"])(
    "新详情%s冲突不替换持久终态",
    async (failure) => {
      const f = await fixture();
      const details = structuredClone(f.details);
      if (failure === "status") details.transaction.status.success = false;
      if (failure === "epoch") details.transaction.epoch = "8";
      if (failure === "checkpoint") details.transaction.checkpoint = "22";
      if (failure === "effects")
        details.transaction.effects.bcs = new Uint8Array([0]);
      expect(selectReceiptFacts(details, f.stored)).toMatchObject({
        confirmed: true,
        transaction: undefined,
        conflict: true,
      });
    },
  );
  it("已取消不发消息；取消后迟到结果丢弃且清理监听", async () => {
    const f = await fixture();
    const controller = new AbortController();
    controller.abort();
    const call = vi.fn(async () => f.stored);
    await expect(
      readStoredReceipt(
        { readStoredReceipt: call },
        f.request,
        controller.signal,
      ),
    ).rejects.toThrow();
    expect(call).not.toHaveBeenCalled();
    const later = new AbortController();
    let release = () => {};
    const value = new Promise<WalletStoredReceipt>((resolve) => {
      release = () => resolve(f.stored);
    });
    const removed = vi.spyOn(later.signal, "removeEventListener");
    const promise = readStoredReceipt(
      { readStoredReceipt: () => value },
      f.request,
      later.signal,
    );
    later.abort();
    await expect(promise).rejects.toThrow();
    release();
    expect(removed).toHaveBeenCalledWith("abort", expect.any(Function));
  });
});
