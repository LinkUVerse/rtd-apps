// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useRtdNSEnabled } from "rtd-apps-core/src/rpc/name-hooks";
import { useI18n } from "_app/i18n";
import {
  useWalletRpc,
  type WalletRpc,
} from "rtd-apps-core/src/rpc/WalletRpcContext";
import { isValidRtdAddress, isValidRtdNSName } from "rtd-typescript/utils";
import { useMemo } from "react";
import * as Yup from "yup";

type AddressValidationMessages = {
  required: string;
  invalid: string;
  nameUnavailable: string;
  nameNotFound: string;
  nameDisabled: string;
};

export function createRtdAddressValidation(
  client: WalletRpc,
  rtdNSEnabled: boolean,
  messages: AddressValidationMessages,
) {
  return Yup.string()
    .ensure()
    .trim()
    .required(messages.required)
    .test("is-rtd-address", messages.invalid, async (value, context) => {
      if (isValidRtdNSName(value)) {
        if (!rtdNSEnabled)
          return context.createError({ message: messages.nameDisabled });
        try {
          return (await client.resolveRecipientName(value))
            ? true
            : context.createError({ message: messages.nameNotFound });
        } catch {
          return context.createError({ message: messages.nameUnavailable });
        }
      }

      return isValidRtdAddress(value);
    });
}

export function useRtdAddressValidation() {
  const { t } = useI18n();
  const client = useWalletRpc();
  const rtdNSEnabled = useRtdNSEnabled();

  return useMemo(() => {
    return createRtdAddressValidation(client, rtdNSEnabled, {
      required: t("validation.required"),
      invalid: t("validation.invalidAddress"),
      nameUnavailable: t("validation.nameUnavailable"),
      nameNotFound: t("validation.nameNotFound"),
      nameDisabled: t("validation.nameDisabled"),
    });
  }, [client, rtdNSEnabled, t]);
}
