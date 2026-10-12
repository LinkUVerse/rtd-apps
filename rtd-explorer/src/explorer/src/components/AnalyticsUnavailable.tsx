// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { Text } from "@linku/ui";

export function AnalyticsUnavailable() {
  return (
    <div role="status">
      <Text color="steel" variant="body/medium">
        Statistics are unavailable on this network.
      </Text>
    </div>
  );
}
