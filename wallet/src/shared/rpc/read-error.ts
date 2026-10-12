// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { RpcError } from "rtd-typescript/grpc";
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

const messages = {
  cancelled: "查询已取消，请重新查询",
  unavailable: "查询服务暂不可用，请稍后重试",
  exhausted: "查询请求繁忙，请稍后重试",
  concurrencyUnavailable: "浏览器读取并发控制不可用，请重新打开钱包",
  denied: "查询入口拒绝访问，请检查网络服务配置",
  invalid: "查询参数无效，请检查输入或网络配置",
  unsupported: "当前服务不支持此查询",
  notFound: "未查询到请求的数据，不能据此判定交易未提交",
  identity: "查询入口的链身份不匹配，已停止接纳数据",
  reset: "查询入口水位已倒退，请核对网络部署并更新绑定",
  observationChanged: "网络数据已更新，请重新查询或预览",
  networkStorageUnavailable: "网络校验记录暂不可用，请重新打开钱包",
  reviewing: "网络校验尚未完成，请等待原校验结束",
  quarantined: "当前网络绑定已被隔离，请核对并更新网络配置",
  unconfigured: "当前网络未配置所需查询服务，请检查网络配置",
  budget: "查询数据超出读取预算，请缩小查询范围",
  incomplete: "查询结果不完整或不兼容，未接纳数据",
  coverage: "查询尚未覆盖所需快照，请等待索引同步",
  unknown: "查询失败，请稍后重新查询",
} as const;
export type WalletReadErrorKind = keyof typeof messages;

/** Presentation only. Does not alter original exceptions, receipts, fallback or retry policy. */
export function classifyWalletReadError(error: unknown): {
  kind: WalletReadErrorKind;
  message: string;
  retryableRead: boolean;
} {
  let kind: WalletReadErrorKind = "unknown";
  if (error instanceof StaleWalletSessionError) kind = "cancelled";
  else if (error instanceof WalletReadBudgetError) kind = "exhausted";
  else if (error instanceof WalletReadBudgetUnavailableError)
    kind = "concurrencyUnavailable";
  else if (error instanceof TransactionNetworkResetError) kind = "reset";
  else if (error instanceof WalletNetworkObservationError)
    kind =
      error.reason === "stale"
        ? "observationChanged"
        : error.reason === "corrupt"
          ? "incomplete"
          : "networkStorageUnavailable";
  else if (error instanceof WalletNetworkAdmissionBlockedError)
    kind = error.reason === "reviewing" ? "reviewing" : "quarantined";
  else if (error instanceof WalletNetworkAdmissionStateError)
    kind =
      error.reason === "corrupt"
        ? "incomplete"
        : error.reason === "stale"
          ? "observationChanged"
          : "networkStorageUnavailable";
  else if (error instanceof WalletSchemaCapabilityError)
    kind =
      error.reason === "unavailable"
        ? "unavailable"
        : error.reason === "budget"
          ? "budget"
          : "incomplete";
  else if (error instanceof WalletHistoryError)
    kind =
      error.reason === "unconfigured"
        ? "unconfigured"
        : error.reason === "coverage"
          ? "coverage"
          : error.reason === "changed"
            ? "observationChanged"
            : error.reason === "budget"
              ? "budget"
              : "incomplete";
  else if (error instanceof NetworkIdentityError)
    kind = error.reason === "chain-mismatch" ? "identity" : "incomplete";
  else if (error instanceof SnapshotReadError)
    kind = error.reason === "coverage" ? "coverage" : "incomplete";
  else if (error instanceof DOMException)
    kind =
      error.name === "AbortError"
        ? "cancelled"
        : error.name === "TimeoutError"
          ? "unavailable"
          : "unknown";
  else if (error instanceof RpcError) {
    const kinds: Record<string, WalletReadErrorKind> = {
      CANCELLED: "cancelled",
      DEADLINE_EXCEEDED: "unavailable",
      UNAVAILABLE: "unavailable",
      RESOURCE_EXHAUSTED: "exhausted",
      UNAUTHENTICATED: "denied",
      PERMISSION_DENIED: "denied",
      INVALID_ARGUMENT: "invalid",
      UNIMPLEMENTED: "unsupported",
      NOT_FOUND: "notFound",
      DATA_LOSS: "incomplete",
    };
    kind = Object.prototype.hasOwnProperty.call(kinds, error.code)
      ? kinds[error.code]
      : "unknown";
  }
  return {
    kind,
    message: messages[kind],
    retryableRead: ["unavailable", "exhausted", "coverage"].includes(kind),
  };
}

export function walletReadErrorMessage(error: unknown): string {
  return classifyWalletReadError(error).message;
}
