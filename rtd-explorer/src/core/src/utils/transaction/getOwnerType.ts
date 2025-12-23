// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { RtdObjectChange } from "rtd-typescript/client";

export const getOwnerType = (change: RtdObjectChange) => {
	if (!("owner" in change)) return "";
	if (typeof change.owner === "object") {
		if ("AddressOwner" in change.owner) return "AddressOwner";
		if ("ObjectOwner" in change.owner) return "ObjectOwner";
		if ("Shared" in change.owner) return "Shared";
		if ("Immutable" in change.owner) return "Immutable";
		return "Unknown";
	}
	return change.owner;
};
