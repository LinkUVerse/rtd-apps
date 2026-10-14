// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Check32, X32 } from "rtd-apps-icons";
import * as styles from "./Receipt.module.scss";

export function StatusIcon({ status }: { status: boolean }) {
  const Icon = status ? Check32 : X32;
  return (
    <div
      className={styles.statusBadge}
      data-success={status}
      aria-hidden="true"
    >
      <Icon fill="currentColor" className="h-8 w-8" />
    </div>
  );
}
