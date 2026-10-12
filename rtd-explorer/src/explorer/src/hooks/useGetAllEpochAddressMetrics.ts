// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { analyticsAvailability } from "~/rpc/analytics-availability";

export function useGetAllEpochAddressMetrics(
  _options: { descendingOrder?: boolean } = {},
) {
  return analyticsAvailability("epoch-addresses");
}
