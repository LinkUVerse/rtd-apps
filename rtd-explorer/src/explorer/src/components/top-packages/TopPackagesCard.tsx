// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { AnalyticsUnavailable } from "../AnalyticsUnavailable";
import { analyticsAvailability } from "~/rpc/analytics-availability";
import { TabHeader } from "~/ui/Tabs";

export type DateFilter = "3D" | "7D" | "30D";
export type ApiDateFilter = "rank3Days" | "rank7Days" | "rank30Days";
export const FILTER_TO_API_FILTER: Record<DateFilter, ApiDateFilter> = {
  "3D": "rank3Days",
  "7D": "rank7Days",
  "30D": "rank30Days",
};

export function TopPackagesCard() {
  const availability = analyticsAvailability("move-calls");
  return (
    <TabHeader
      title="Popular Packages"
      tooltip="Popular packages is recomputed on epoch changes."
    >
      {availability.phase === "unavailable" && <AnalyticsUnavailable />}
    </TabHeader>
  );
}
