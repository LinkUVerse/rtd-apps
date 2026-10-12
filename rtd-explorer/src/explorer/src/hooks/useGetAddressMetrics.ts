// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { analyticsAvailability } from "~/rpc/analytics-availability";

export function useGetAddressMetrics() {
  return analyticsAvailability("addresses");
}
