// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ArrowUpRight16, Copy16 } from "rtd-apps-icons";
import { useEffect, useState } from "react";
import { useCopyToClipboard } from "../../hooks/useCopyToClipboard";
import {
  useExplorerLink,
  type ExplorerLinkConfig,
} from "../../hooks/useExplorerLink";
import { useI18n } from "../../i18n";
import * as styles from "./Receipt.module.scss";

export type ReceiptIdentifierType =
  | "address"
  | "object"
  | "transaction"
  | "validator";

export function ReceiptIdentifier({
  value,
  type,
  explorerLink,
  prefix,
  testId,
}: {
  value: string;
  type: ReceiptIdentifierType;
  explorerLink: ExplorerLinkConfig;
  prefix?: string;
  testId?: string;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const copy = useCopyToClipboard(value, {
    copySuccessMessage:
      type === "transaction"
        ? t("receipt.transactionIdCopied")
        : t("receipt.idCopied"),
  });
  const explorerHref = useExplorerLink(explorerLink);
  const abbreviated = value.startsWith("0x")
    ? `0x${value.slice(2, 6)}…${value.slice(-4)}`
    : `${value.slice(0, 6)}…${value.slice(-6)}`;

  useEffect(() => setExpanded(false), [value]);

  return (
    <div
      data-testid={testId}
      data-identifier-type={type}
      data-value={value}
      className={styles.identifierField}
    >
      <div className={styles.identifierRow}>
        <button
          type="button"
          className={styles.identifierValue}
          aria-expanded={expanded}
          title={value}
          onClick={() => setExpanded((current) => !current)}
        >
          {prefix && <span className={styles.identifierPrefix}>{prefix}</span>}
          <code>{expanded ? value : abbreviated}</code>
          <span className="sr-only">
            {t(expanded ? "receipt.collapseId" : "receipt.expandId")}
          </span>
        </button>
        <div className={styles.identifierActions}>
          <button
            type="button"
            data-action="copy"
            className={styles.identifierAction}
            aria-label={t("common.copy")}
            title={t("common.copy")}
            onClick={copy}
          >
            <Copy16 aria-hidden="true" />
          </button>
          {explorerHref && (
            <a
              data-action="explorer"
              className={styles.identifierAction}
              href={explorerHref}
              target="_blank"
              rel="noreferrer"
              aria-label={t("common.viewOnExplorer")}
              title={t("common.viewOnExplorer")}
            >
              <ArrowUpRight16 aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
