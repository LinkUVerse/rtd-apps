// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useRtdClient } from "rtd-dapp-kit";
import { normalizeRtdAddress } from "rtd-typescript/utils";
import { useQuery } from "@tanstack/react-query";

const defaultOptions = {
	showType: true,
	showContent: true,
	showOwner: true,
	showPreviousTransaction: true,
	showStorageRebate: true,
	showDisplay: true,
};

export function useGetObject(objectId?: string | null) {
	const client = useRtdClient();
	const normalizedObjId = objectId && normalizeRtdAddress(objectId);
	return useQuery({
		queryKey: ["object", normalizedObjId],
		queryFn: () =>
			client.getObject({
				id: normalizedObjId!,
				options: defaultOptions,
			}),
		enabled: !!normalizedObjId,
	});
}
