// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createRtdAddressValidation } from "_components/address-input/validation";
import { createTokenValidation } from "_src/shared/validation";
import { type MessageKey, type MessageValues } from "_app/i18n";
import { formatBalance } from "rtd-apps-core/src/rpc/coin";
import { type WalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import * as Yup from "yup";

export function createValidationSchemaStepOne(
  client: WalletRpc,
  rtdNSEnabled: boolean,
  coinBalance: bigint,
  coinSymbol: string,
  decimals: number,
  t: (key: MessageKey, values?: MessageValues) => string,
) {
  return Yup.object({
    to: createRtdAddressValidation(client, rtdNSEnabled, {
      required: t("validation.required"),
      invalid: t("validation.invalidAddress"),
      nameUnavailable: t("validation.nameUnavailable"),
      nameNotFound: t("validation.nameNotFound"),
      nameDisabled: t("validation.nameDisabled"),
    }),
    amount: createTokenValidation(coinBalance, decimals, {
      required: t("validation.required"),
      invalid: t("validation.invalidNumber"),
      minimum: t("validation.positiveAmount", { symbol: coinSymbol }),
      maximum: t("validation.maximumAmount", {
        amount: formatBalance(coinBalance, decimals),
        symbol: coinSymbol,
      }),
      maximumDecimals: t("validation.maximumDecimals", { count: decimals }),
    }),
  });
}
