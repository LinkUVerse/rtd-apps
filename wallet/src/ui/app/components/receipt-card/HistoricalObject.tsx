// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import type { WalletObjectEffect } from "rtd-apps-core/src/rpc/transaction-view";
import { readHistoricalEffect } from "_src/shared/rpc/historical-effect";
import { useI18n } from "../../i18n";
import { ReceiptNotice } from "./ReceiptNotice";
import * as styles from "./Receipt.module.scss";

export function HistoricalObject({ effect }: { effect: WalletObjectEffect }) {
  const rpc = useWalletRpc(),
    { t } = useI18n();
  const [requested, setRequested] = useState(false);
  const eligible =
    !!effect.objectDigest &&
    effect.version !== null &&
    ["ObjectWrite", "PackageWrite"].includes(effect.outputState);
  const query = useQuery({
    queryKey: [
      "wallet-historical-object",
      rpc.bindingKey,
      rpc.readSessionKey,
      effect.objectId,
      effect.version,
      effect.objectDigest,
    ],
    queryFn: ({ signal }) => readHistoricalEffect(rpc, effect, signal),
    enabled: requested && eligible && !!rpc.readHistoricalObjects,
    retry: false,
    gcTime: 0,
    meta: { skipPersistedCache: true },
  });
  if (!eligible) return null;
  if (!rpc.readHistoricalObjects)
    return <ReceiptNotice>{t("receipt.archiveUnavailable")}</ReceiptNotice>;
  return (
    <div className={styles.history}>
      <button
        type="button"
        className={styles.action}
        disabled={query.isFetching}
        onClick={() => {
          if (requested) void query.refetch();
          else setRequested(true);
        }}
      >
        {t("receipt.readHistoricalObject")}
      </button>
      {requested && query.isFetching && (
        <ReceiptNotice>{t("receipt.historicalLoading")}</ReceiptNotice>
      )}
      {query.isError && (
        <ReceiptNotice tone="warning">
          {t("receipt.historicalUnavailable")}
        </ReceiptNotice>
      )}
      {query.data && !query.isError && (
        <div className={styles.history}>
          <ReceiptNotice tone="success">
            {t("receipt.historicalVerified")}
          </ReceiptNotice>
          <code className={styles.identifier}>{query.data.type}</code>
          <code className={styles.identifier}>{query.data.digest}</code>
        </div>
      )}
    </div>
  );
}
