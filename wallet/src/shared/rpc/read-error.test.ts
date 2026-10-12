import { describe, expect, it } from "vitest";
import { RpcError } from "rtd-typescript/grpc";
import { classifyWalletReadError } from "./read-error";
import { NetworkIdentityError } from "./identity";
import { TransactionNetworkResetError } from "./transaction-network-identity";
import { WalletNetworkObservationError } from "./network-observation-state";
import { SnapshotReadError } from "./graphql-snapshot";
import { WalletHistoryError } from "./history-facts";
import { WalletSchemaCapabilityError } from "./graphql-schema-capabilities";
import {
  WalletNetworkAdmissionBlockedError,
  WalletNetworkAdmissionStateError,
} from "./network-admission-state";
import {
  StaleWalletSessionError,
  WalletReadBudgetError,
  WalletReadBudgetUnavailableError,
} from "./session";

describe("读取错误的公开分类", () => {
  it.each([
    [new WalletNetworkAdmissionBlockedError("reviewing"), "reviewing", false],
    [
      new WalletNetworkAdmissionBlockedError("quarantined"),
      "quarantined",
      false,
    ],
    [
      new WalletNetworkAdmissionStateError("unavailable"),
      "networkStorageUnavailable",
      false,
    ],
    [
      new WalletNetworkAdmissionStateError("budget"),
      "networkStorageUnavailable",
      false,
    ],
    [new WalletNetworkAdmissionStateError("corrupt"), "incomplete", false],
    [
      new WalletNetworkAdmissionStateError("stale"),
      "observationChanged",
      false,
    ],
    [new WalletSchemaCapabilityError("unavailable"), "unavailable", true],
    [new WalletSchemaCapabilityError("budget"), "budget", false],
    [new WalletSchemaCapabilityError("partial"), "incomplete", false],
    [new WalletSchemaCapabilityError("incompatible"), "incomplete", false],
    [new WalletHistoryError("unconfigured"), "unconfigured", false],
    [new WalletHistoryError("coverage"), "coverage", true],
    [new WalletHistoryError("changed"), "observationChanged", false],
    [new WalletHistoryError("budget"), "budget", false],
    [new WalletHistoryError("partial"), "incomplete", false],
    [new WalletHistoryError("incompatible"), "incomplete", false],
  ])(
    "新准入／schema／历史读取失败保持公开类别 %#",
    (error, kind, retryableRead) => {
      const original = error.message;
      const result = classifyWalletReadError(error);
      expect(result).toMatchObject({ kind, retryableRead });
      expect(error.message).toBe(original);
      expect(result.message).not.toBe("查询失败，请稍后重新查询");
    },
  );
  it.each([
    ["CANCELLED", "cancelled", false],
    ["UNAVAILABLE", "unavailable", true],
    ["DEADLINE_EXCEEDED", "unavailable", true],
    ["RESOURCE_EXHAUSTED", "exhausted", true],
    ["PERMISSION_DENIED", "denied", false],
    ["UNAUTHENTICATED", "denied", false],
    ["INVALID_ARGUMENT", "invalid", false],
    ["UNIMPLEMENTED", "unsupported", false],
    ["NOT_FOUND", "notFound", false],
    ["DATA_LOSS", "incomplete", false],
    ["INTERNAL", "unknown", false],
    ["__proto__", "unknown", false],
  ])("gRPC %s按状态分类，不向页面透出服务原文", (code, kind, retryableRead) => {
    const error = new RpcError(
      "private-service-token-and-address",
      String(code),
    );
    const result = classifyWalletReadError(error);
    expect(result).toMatchObject({ kind, retryableRead });
    expect(result.message).not.toContain("private");
    expect(error.message).toBe("private-service-token-and-address");
  });
  it.each([
    [new StaleWalletSessionError(), "cancelled"],
    [new WalletReadBudgetError(), "exhausted"],
    [new WalletReadBudgetUnavailableError(), "concurrencyUnavailable"],
    [new NetworkIdentityError("fullnode", "chain-mismatch"), "identity"],
    [new NetworkIdentityError("graphql", "incompatible"), "incomplete"],
    [new TransactionNetworkResetError("archive", 100n, 99n), "reset"],
    [
      new WalletNetworkObservationError("unavailable"),
      "networkStorageUnavailable",
    ],
    [new WalletNetworkObservationError("corrupt"), "incomplete"],
    [new WalletNetworkObservationError("stale"), "observationChanged"],
    [new SnapshotReadError("coverage"), "coverage"],
    [new SnapshotReadError("partial"), "incomplete"],
    [new SnapshotReadError("changed"), "incomplete"],
    [new DOMException("secret", "AbortError"), "cancelled"],
    [new DOMException("secret", "TimeoutError"), "unavailable"],
  ])("本地读取合同错误保留类别 %#", (error, kind) => {
    expect(classifyWalletReadError(error).kind).toBe(kind);
  });
  it.each([
    null,
    undefined,
    "secret",
    new Error("secret"),
    new TypeError("secret"),
    { code: "UNAVAILABLE", message: "secret" },
  ])("未知错误不猜测或输出原文 %#", (error) => {
    expect(classifyWalletReadError(error)).toEqual({
      kind: "unknown",
      message: "查询失败，请稍后重新查询",
      retryableRead: false,
    });
  });
});
