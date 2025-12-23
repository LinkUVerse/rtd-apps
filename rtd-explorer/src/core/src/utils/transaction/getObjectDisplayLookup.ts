// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { DisplayFieldsResponse, RtdObjectResponse } from "rtd-typescript/client";

import { hasDisplayData } from "../hasDisplayData";

export function getObjectDisplayLookup(objects: RtdObjectResponse[] = []) {
	const lookup = new Map<string, DisplayFieldsResponse>();
	return objects?.filter(hasDisplayData).reduce((acc, curr) => {
		if (curr.data?.objectId) {
			acc.set(curr.data.objectId, curr.data.display!);
		}
		return acc;
	}, lookup);
}
