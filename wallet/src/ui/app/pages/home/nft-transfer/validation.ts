// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createRtdAddressValidation } from "_components/address-input/validation";
import { type MessageKey, type MessageValues } from "_app/i18n";
import { type WalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import * as Yup from "yup";
import {
  isValidRtdAddress,
  isValidRtdNSName,
  normalizeRtdAddress,
} from "rtd-typescript/utils";

export function createValidationSchema(
  client: WalletRpc,
  rtdNSEnabled: boolean,
  senderAddress: string,
  objectId: string,
  t: (key: MessageKey, values?: MessageValues) => string,
) {
  const recipient = async (value: string): Promise<string | null> => {
    try {
      return rtdNSEnabled && isValidRtdNSName(value)
        ? ((await client.resolveRecipientName(value))?.address ?? null)
        : isValidRtdAddress(value)
          ? normalizeRtdAddress(value)
          : null;
    } catch {
      return null;
    }
  };
  return Yup.object({
    to: createRtdAddressValidation(client, rtdNSEnabled, {
      required: t("validation.required"),
      invalid: t("validation.invalidAddress"),
      nameUnavailable: t("validation.nameUnavailable"),
      nameNotFound: t("validation.nameNotFound"),
      nameDisabled: t("validation.nameDisabled"),
    })
      .test(
        "sender-address",
        t("validation.nftOwnedByAddress"),
        async (value) => {
          const target = await recipient(value);
          return (
            !target ||
            !senderAddress ||
            normalizeRtdAddress(senderAddress) !== target
          );
        },
      )
      .test(
        "nft-sender-address",
        t("validation.nftRecipientDifferent"),
        async (value) => {
          const target = await recipient(value);
          return !target || normalizeRtdAddress(objectId) !== target;
        },
      ),
  });
}
