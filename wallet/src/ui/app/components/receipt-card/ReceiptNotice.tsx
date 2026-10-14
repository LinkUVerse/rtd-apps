// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from "react";
import { CheckStroke16, Info16 } from "rtd-apps-icons";
import * as styles from "./Receipt.module.scss";

export function ReceiptNotice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "success" | "warning" | "issue";
}) {
  const Icon = tone === "success" ? CheckStroke16 : Info16;
  return (
    <div
      className={styles.notice}
      data-tone={tone}
      role={tone === "issue" ? "alert" : "status"}
    >
      <Icon className={styles.noticeIcon} aria-hidden="true" />
      <div className={styles.noticeBody}>{children}</div>
    </div>
  );
}
