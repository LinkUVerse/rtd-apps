// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { ReceiptIdentifier } from "_components/receipt-card/ReceiptIdentifier";
import { ExplorerLinkType } from "_components/explorer-link/ExplorerLinkType";
import { useActiveAddress } from "_src/ui/app/hooks";
import { useI18n } from "_src/ui/app/i18n";
import { GAS_TYPE_ARG } from "_src/ui/app/redux/slices/rtd-objects/Coin";
import { type WalletGasSummary } from "rtd-apps-core/src/rpc/transaction-view";
import { useFormatCoin } from "rtd-apps-core/src/rpc/coin";

import { Text } from "../../text";

export function GasSummary({
  gasSummary,
}: {
  gasSummary?: WalletGasSummary | null;
}) {
  const { t } = useI18n();
  const [gas, symbol] = useFormatCoin(gasSummary?.totalGas, GAS_TYPE_ARG);
  const address = useActiveAddress();

  if (!gasSummary) return null;

  return (
    <div className="nova-card relative flex flex-col">
      <div className="bg-rtd-lightest rounded-t-[9px] py-2.5 px-4">
        <Text color="steel-darker" variant="captionSmall" weight="semibold">
          {t("transaction.gasFees")}
        </Text>
      </div>
      <div className="flex flex-col items-center gap-2 w-full px-4 py-3">
        <div className="flex w-full items-center justify-start">
          {address === gasSummary?.owner && (
            <div className="mr-auto">
              <Text color="steel-dark" variant="pBody" weight="medium">
                {t("transaction.youPaid")}
              </Text>
            </div>
          )}
          <Text color="steel-darker" variant="pBody" weight="medium">
            {gasSummary.isSponsored && address !== gasSummary.owner ? "0" : gas}{" "}
            {symbol}
          </Text>
        </div>
        {gasSummary?.isSponsored && gasSummary.owner && (
          <>
            <div className="flex w-full justify-between">
              <Text color="steel-dark" variant="pBody" weight="medium">
                {t("transaction.paidBySponsor")}
              </Text>
              <Text color="steel-darker" variant="pBody" weight="medium">
                {gas} {symbol}
              </Text>
            </div>
            <div className="flex w-full items-start justify-between gap-3">
              <Text color="steel-dark" variant="pBody" weight="medium">
                {t("approval.sponsor")}
              </Text>
              <ReceiptIdentifier
                value={gasSummary.owner}
                type="address"
                explorerLink={{
                  type: ExplorerLinkType.address,
                  address: gasSummary.owner,
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
