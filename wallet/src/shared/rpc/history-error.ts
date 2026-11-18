// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export class WalletHistoryError extends Error {
  constructor(
    readonly reason:
      | "unconfigured"
      | "incompatible"
      | "changed"
      | "coverage"
      | "budget"
      | "partial",
  ) {
    super(
      reason === "unconfigured"
        ? "当前网络未配置账户历史查询服务"
        : reason === "coverage"
          ? "账户历史覆盖不足，请刷新重试"
          : reason === "budget"
            ? "账户历史查询超出预算，请缩小查询窗口"
            : reason === "changed"
              ? "账户历史快照已变化，请重新查询"
              : "账户历史事实不完整，已拒绝接纳",
    );
    this.name = "WalletHistoryError";
  }
}
