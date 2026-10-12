// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { WalletObjectEffect } from "rtd-apps-core/src/rpc/transaction-view";
import { formatAddress } from "rtd-typescript/utils";
import { useI18n } from "../../i18n";
import ExplorerLink from "../explorer-link";
import { ExplorerLinkType } from "../explorer-link/ExplorerLinkType";
import { Card } from "../../shared/transaction-summary/Card";
import { OwnerFooter } from "../../shared/transaction-summary/OwnerFooter";
import { Text } from "../../shared/text";
import { HistoricalObject } from './HistoricalObject';

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
          <div className="flex flex-col gap-2 pb-3">
            <ExplorerLink
              type={ExplorerLinkType.object}
              objectID={change.objectId}
              className="text-hero-dark no-underline"
            >
              {formatAddress(change.objectId)}
            </ExplorerLink>
            {change.objectType && (
              <Text variant="pBody" color="steel-darker">
                {change.objectType}
              </Text>
            )}
            <Text variant="pBody" color="steel-dark">
              {t(
                change.outputState === "NotExist"
                  ? "receipt.objectRemoved"
                  : change.outputState === "PackageWrite"
                    ? "receipt.packageChanged"
                    : change.outputState === "AccumulatorWriteV1"
                      ? "receipt.balanceWritten"
                      : "receipt.objectWritten",
              )}
            </Text>
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
