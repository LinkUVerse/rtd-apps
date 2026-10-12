// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { Transaction } from "rtd-typescript/transactions";
import { useI18n } from "_src/ui/app/i18n";
import { SummaryCard } from "./SummaryCard";
import { DescriptionItem, DescriptionList } from "./DescriptionList";

/** Read the exact prepared BCS, never the original mutable dApp request. */
export function readPreparedExpiration(bytesBase64?: string) {
  let expiration: ReturnType<Transaction["getData"]>["expiration"] = null;
  try {
    expiration = bytesBase64
      ? Transaction.from(bytesBase64).getData().expiration
      : null;
  } catch {
    /* Invalid preparation cannot be presented as no expiration. */
  }
  // Reject imprecise numeric values; current SDK decodes Epoch as an exact decimal string.
  if (
    expiration?.$kind === "Epoch" &&
    typeof expiration.Epoch === "number" &&
    !Number.isSafeInteger(expiration.Epoch)
  )
    expiration = null;
  return expiration;
}
export function canApproveTransactionValidity(bytesBase64?: string) {
  const expiration = readPreparedExpiration(bytesBase64);
  if (!expiration) return false;
  const window =
    expiration.$kind === "ValidDuring"
      ? expiration.ValidDuring
      : expiration.$kind === "Validity"
        ? expiration.Validity
        : null;
  return (
    !window || (window.minTimestamp === null && window.maxTimestamp === null)
  );
}
export function TransactionValidity({ bytesBase64 }: { bytesBase64?: string }) {
  const { t } = useI18n();
  const expiration = readPreparedExpiration(bytesBase64);
  const window =
    expiration?.$kind === "ValidDuring"
      ? expiration.ValidDuring
      : expiration?.$kind === "Validity"
        ? expiration.Validity
        : null;
  const proposers =
    expiration?.$kind === "Validity"
      ? expiration.Validity.allowedProposers
      : null;
  return (
    <SummaryCard header={t("approval.validity")} initialExpanded>
      {!expiration ? (
        <div>{t("approval.gatherFailed")}</div>
      ) : expiration.$kind === "None" ? (
        <div>{t("approval.noExpiration")}</div>
      ) : (
        <DescriptionList>
          {expiration.$kind === "Epoch" && (
            <DescriptionItem title={t("approval.maxEpoch")}>
              {expiration.Epoch}
            </DescriptionItem>
          )}
          {window && (
            <>
              <DescriptionItem title={t("approval.minEpoch")}>
                {window.minEpoch ?? t("approval.unbounded")}
              </DescriptionItem>
              <DescriptionItem title={t("approval.maxEpoch")}>
                {window.maxEpoch ?? t("approval.unbounded")}
              </DescriptionItem>
              {(window.minTimestamp !== null ||
                window.maxTimestamp !== null) && (
                <DescriptionItem title={t("approval.timeConstraint")}>
                  {t("approval.timeConstraintUnsupported")}
                </DescriptionItem>
              )}
            </>
          )}
          {proposers && (
            <DescriptionItem title={t("approval.proposerConstraint")}>
              {t("approval.proposerEpoch")} {proposers.epoch} ·{" "}
              {proposers.proposers.join(", ")}
            </DescriptionItem>
          )}
        </DescriptionList>
      )}
    </SummaryCard>
  );
}
