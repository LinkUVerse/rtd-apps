// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { StatsWrapper } from "./FormattedStatsAmount";
import { useExplorerQuery } from "~/rpc/explorer-client";

export function Checkpoint() {
  const { data, isPending, isError } = useExplorerQuery(
    "getLatestCheckpointSequenceNumber",
  );
  if (isError) return <div role="status">Checkpoint unavailable</div>;

  return (
    <StatsWrapper
      label="Checkpoint"
      tooltip="The current checkpoint"
      unavailable={isPending}
      size="sm"
      orientation="horizontal"
    >
      {data !== undefined ? BigInt(data).toLocaleString() : null}
    </StatsWrapper>
  );
}
