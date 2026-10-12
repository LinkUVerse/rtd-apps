// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useFormatCoin } from "rtd-apps-core/src/rpc/coin";
import { Transaction } from "rtd-typescript/transactions";
import { RTD_TYPE_ARG } from "rtd-typescript/utils";
import { useMemo } from "react";
import { usePreparedTransaction } from "./usePreparedTransaction";

export function useTransactionData(
  sender?: string | null,
  transaction?: Transaction | null,
) {
  const query = usePreparedTransaction(sender, transaction);
  const prepared = query.data;
  const data = useMemo(
    () =>
      prepared ? Transaction.from(prepared.bytesBase64).getData() : undefined,
    [prepared],
  );
  return { ...query, data, prepared };
}
export function useTransactionGasBudget(
  sender?: string | null,
  transaction?: Transaction | null,
) {
  const { data, ...rest } = useTransactionData(sender, transaction);
  const [formattedGas] = useFormatCoin(data?.gasData.budget, RTD_TYPE_ARG);
  return { data: formattedGas, ...rest };
}
