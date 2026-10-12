// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { type ExplorerEndOfEpochInfo } from "~/rpc/epoch-schema";

export function getEpochStorageFundFlow(endOfEpochInfo: ExplorerEndOfEpochInfo | null) {
	const fundInflow = endOfEpochInfo
		? BigInt(endOfEpochInfo.storageFundReinvestment) +
		  BigInt(endOfEpochInfo.storageCharge) +
		  BigInt(endOfEpochInfo.leftoverStorageFundInflow)
		: null;

	const fundOutflow = endOfEpochInfo ? BigInt(endOfEpochInfo.storageRebate) : null;

	const netInflow = fundInflow !== null && fundOutflow !== null ? fundInflow - fundOutflow : null;

	return { netInflow, fundInflow, fundOutflow };
}
