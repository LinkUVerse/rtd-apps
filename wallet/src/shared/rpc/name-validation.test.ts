// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";
import { normalizeRtdAddress } from "rtd-typescript/utils";
import type { WalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { createRtdAddressValidation } from "../../ui/app/components/address-input/validation";
import { createValidationSchema } from "../../ui/app/pages/home/nft-transfer/validation";

vi.mock("../../ui/app/i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
function fixture(address: string | null = "0xb") {
  const resolve = vi
    .fn()
    .mockResolvedValue(
      address ? { address: normalizeRtdAddress(address) } : null,
    );
  const rpc = { resolveRecipientName: resolve } as unknown as WalletRpc;
  const schema = createRtdAddressValidation(rpc, true, {
    required: "required",
    invalid: "invalid",
    nameUnavailable: "unavailable",
    nameNotFound: "not-found",
    nameDisabled: "disabled",
  });
  return { rpc, resolve, schema };
}

describe("地址表单新名称解析", () => {
  it("有效普通地址不调用网络，名称每次重新查，不复用一分钟布尔缓存", async () => {
    const f = fixture();
    expect(await f.schema.isValid(normalizeRtdAddress("0xa"))).toBe(true);
    expect(f.resolve).not.toHaveBeenCalled();
    expect(await f.schema.isValid("test.rtd")).toBe(true);
    f.resolve.mockResolvedValue(null);
    expect(await f.schema.isValid("test.rtd")).toBe(false);
    expect(f.resolve).toHaveBeenCalledTimes(2);
  });
  it("查询错误及名称缺失不通过验证", async () => {
    const f = fixture(null);
    expect(await f.schema.isValid("test.rtd")).toBe(false);
    f.resolve.mockRejectedValue(new Error("snapshot lag"));
    expect(await f.schema.isValid("test.rtd")).toBe(false);
  });
  it("名称缺失、服务故障与地址格式错误具有不同提示且均禁止提交", async () => {
    const f = fixture(null);
    await expect(f.schema.validate("test.rtd")).rejects.toThrow("not-found");
    f.resolve.mockRejectedValue(new Error("private backend detail"));
    await expect(f.schema.validate("test.rtd")).rejects.toThrow("unavailable");
    await expect(f.schema.validate("not-an-address")).rejects.toThrow(
      "invalid",
    );
    expect(f.resolve).toHaveBeenCalledTimes(2);
    f.resolve.mockResolvedValue({ address: normalizeRtdAddress("0xb") });
    await expect(f.schema.validate("test.rtd")).resolves.toBe("test.rtd");
  });
  it("NFT表单保留名称服务暂不可用提示", async () => {
    const f = fixture();
    f.resolve.mockRejectedValue(new Error("lag"));
    const schema = createValidationSchema(
      f.rpc,
      true,
      normalizeRtdAddress("0xa"),
      normalizeRtdAddress("0xc"),
      (key) => key,
    );
    await expect(schema.validate({ to: "test.rtd" })).rejects.toThrow(
      "validation.nameUnavailable",
    );
  });
  it("禁用名称功能不会调用解析服务", async () => {
    const f = fixture();
    const schema = createRtdAddressValidation(f.rpc, false, {
      required: "required",
      invalid: "invalid",
      nameUnavailable: "unavailable",
      nameNotFound: "not-found",
      nameDisabled: "disabled",
    });
    await expect(schema.validate("test.rtd")).rejects.toThrow("disabled");
    expect(f.resolve).not.toHaveBeenCalled();
  });
  it("NFT解析错误只导致表单验证失败，不抛出未处理的网络异常", async () => {
    const f = fixture();
    f.resolve.mockRejectedValue(new Error("lag"));
    const schema = createValidationSchema(
      f.rpc,
      true,
      normalizeRtdAddress("0xa"),
      normalizeRtdAddress("0xc"),
      (key) => key,
    );
    expect(await schema.isValid({ to: "test.rtd" })).toBe(false);
  });
  it.each(["0xa", "0xc"])(
    "NFT名称不能解析到发送人或NFT对象 %s",
    async (address) => {
      const f = fixture(address);
      const schema = createValidationSchema(
        f.rpc,
        true,
        normalizeRtdAddress("0xa"),
        normalizeRtdAddress("0xc"),
        (key) => key,
      );
      expect(await schema.isValid({ to: "test.rtd" })).toBe(false);
    },
  );
});
