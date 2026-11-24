// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { WalletObjectEffect } from "rtd-apps-core/src/rpc/transaction-view";
import { useI18n } from "../../i18n";
import { ExplorerLinkType } from "../explorer-link/ExplorerLinkType";
import { Card } from "../../shared/transaction-summary/Card";
import { OwnerFooter } from "../../shared/transaction-summary/OwnerFooter";
import { Text } from "../../shared/text";
import { HistoricalObject } from "./HistoricalObject";
import { ReceiptIdentifier } from "./ReceiptIdentifier";
import { ReceiptNotice } from "./ReceiptNotice";
import * as styles from "./Receipt.module.scss";

export function ObjectEffects({
  changes,
}: {
  changes: readonly WalletObjectEffect[];
}) {
  const { t } = useI18n();
  return (
    <>
      {changes.map((change, index) => (
        <Card
          key={`${change.objectId}:${index}`}
          heading={t(
            change.operation === "Created"
              ? "transaction.changeCreated"
              : change.operation === "Deleted"
                ? "transaction.changeDeleted"
                : "transaction.changes",
          )}
          footer={
            <OwnerFooter
              owner={change.outputOwner ?? change.inputOwner ?? undefined}
              ownerType={change.outputOwner === "Shared" ? "Shared" : undefined}
            />
          }
        >
          <div className={styles.object}>
            <ReceiptIdentifier
              value={change.objectId}
              type="object"
              explorerLink={{
                type: ExplorerLinkType.object,
                objectID: change.objectId,
              }}
            />
            {change.objectType && (
              <code className={styles.identifier}>{change.objectType}</code>
            )}
            <ReceiptNotice>
              {t(
                change.outputState === "NotExist"
                  ? "receipt.objectRemoved"
                  : change.outputState === "PackageWrite"
                    ? "receipt.packageChanged"
                    : change.outputState === "AccumulatorWriteV1"
                      ? "receipt.balanceWritten"
                      : "receipt.objectWritten",
              )}
            </ReceiptNotice>
            {change.version !== null && (
              <Text variant="pBody" color="steel-dark">
                {t("receipt.objectVersion", { version: change.version })}
              </Text>
            )}
            <HistoricalObject effect={change} />
          </div>
        </Card>
      ))}
    </>
  );
}
