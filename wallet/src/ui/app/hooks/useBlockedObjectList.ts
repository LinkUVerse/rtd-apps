// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { normalizeStructTag } from "rtd-typescript/utils";
import { useQuery } from "@tanstack/react-query";

import { useAppsBackend } from "rtd-apps-core/src/hooks/useAppsBackend";
import { walletExternalServicesEnabled } from "_src/shared/external-services";

export function useBlockedObjectList() {
  const { request } = useAppsBackend();
  const query = useQuery({
    queryKey: ["apps-backend", "guardian", "object-list"],
    enabled: walletExternalServicesEnabled,
    queryFn: () => {
      // enabled alone does not protect an explicit refetch.
      if (!walletExternalServicesEnabled)
        throw new Error("藏品风险名单外部服务未启用");
      return request<{ blocklist: string[] }>("guardian/object-list");
    },
    select: (data) => {
      if (
        !Array.isArray(data.blocklist) ||
        data.blocklist.some((type) => typeof type !== "string")
      )
        throw new Error("藏品风险名单格式无效");
      return data.blocklist.map(normalizeStructTag);
    },
  });
  return {
    ...query,
    // A disabled build must not reuse a previous enabled build's cached verdict.
    data: walletExternalServicesEnabled ? query.data : undefined,
    riskState: !walletExternalServicesEnabled
      ? ("disabled" as const)
      : query.isError
        ? ("error" as const)
        : query.isPending
          ? ("loading" as const)
          : ("ready" as const),
  };
}
