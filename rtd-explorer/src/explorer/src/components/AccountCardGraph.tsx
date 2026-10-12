// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { Heading } from "@linku/ui";
import { AnalyticsUnavailable } from "./AnalyticsUnavailable";
import { useGetAddressMetrics } from "~/hooks/useGetAddressMetrics";
import { useGetAllEpochAddressMetrics } from "~/hooks/useGetAllEpochAddressMetrics";
import { Card } from "~/ui/Card";

export function AccountsCardGraph() {
  const addresses = useGetAddressMetrics();
  const history = useGetAllEpochAddressMetrics({ descendingOrder: false });
  return (
    <Card bg="white/80" spacing="lg" height="full">
      <div className="flex h-full flex-col gap-4 overflow-hidden">
        <Heading variant="heading4/semibold" color="steel-darker">
          Accounts
        </Heading>
        {addresses.phase === "unavailable" &&
          history.phase === "unavailable" && <AnalyticsUnavailable />}
      </div>
    </Card>
  );
}
