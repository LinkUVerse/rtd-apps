// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Text } from "_app/shared/text";
import { useI18n } from "_app/i18n";
import { TxnAddress } from "_components/receipt-card/TxnAddress";
import { TxnAmountView } from "_components/receipt-card/TxnAmount";
import { parseAmount } from "_helpers";
import { GAS_SYMBOL } from "_src/ui/app/redux/slices/rtd-objects/Coin";
import { CoinFormat, formatBalance } from "rtd-apps-core/src/rpc/coin";
import type { PreparedCoinTransfer } from "_src/shared/rpc/coin-transfer-preparation";

export type PreviewTransferProps = {
  prepared: PreparedCoinTransfer;
  coinSymbol: string;
  gasBudget?: string;
};

export function PreviewTransfer({
  prepared,
  coinSymbol,
  gasBudget,
}: PreviewTransferProps) {
  const { t } = useI18n();
  // These are the exact draft facts bound to the approved bytes. A later
  // metadata outage must not erase the user's review or imply dispatch failed.
  // The signing path independently revalidates the current network and bytes.
  const { amount, coinDecimals, sender, to, recipientName, isPayAllRtd } =
    prepared.input;
  const amountWithoutDecimals = parseAmount(amount, coinDecimals);

  return (
    <div className="divide-y divide-solid divide-steel/20 divide-x-0 flex flex-col px-2.5 w-full">
      <TxnAmountView
        amount={amountWithoutDecimals.toString()}
        label={t("transfer.sending")}
        formattedAmount={formatBalance(
          amountWithoutDecimals.toString(),
          coinDecimals,
          CoinFormat.FULL,
        )}
        symbol={coinSymbol}
        format={CoinFormat.FULL}
        approximation={isPayAllRtd}
      />
      <TxnAddress address={sender} label={t("transfer.from")} />
      <TxnAddress
        address={to}
        recipientName={recipientName}
        fullAddress
        label={t("transfer.to")}
      />
      <div className="pt-3.5 mb-5 flex w-full gap-2 justify-between">
        <div className="flex gap-1">
          <Text variant="body" color="gray-80" weight="medium">
            {t("transfer.estimatedGas")}
          </Text>
        </div>
        <Text variant="body" color="gray-90" weight="medium">
          {gasBudget} {GAS_SYMBOL}
        </Text>
      </div>
    </div>
  );
}
