// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { explorerDisplayStrings } from "rtd-apps-core/src/utils/explorer-kiosk";
import { parseObjectType } from "../../utils/objectUtils";

import type { RtdObjectResponse, ObjectOwner, DisplayFieldsResponse } from "rtd-typescript/jsonRpc";

export type DataType = {
	id: string;
	category?: string;
	owner: ObjectOwner;
	version: string;
	readonly?: string;
	objType: string;
	name?: string;
	ethTokenId?: string;
	publisherAddress?: string;
	contract_id?: { bytes: string };
	data: {
		contents: Record<string, any>;
		owner?: { ObjectOwner: [] };
		tx_digest?: string | null;
	};
	loadState?: string;
	display?: Record<string, string>;
	/** Full SDK metadata, including structured values and partial errors. */
	rawDisplay?: DisplayFieldsResponse | null;
};

/**
 * Translate the SDK response to the existing data format
 * TODO: We should redesign the rendering logic and data model
 * to make this more extensible and customizable for different Move types
 */
export function translate(o: RtdObjectResponse): DataType {
	if (o.data) {
		return {
			id: o.data.objectId,
			version: o.data.version,
			objType: parseObjectType(o),
			owner: o.data.owner!,
			data: {
				contents:
					o.data?.content?.dataType === "moveObject"
						? o.data?.content.fields
						: o.data.content!.disassembled,
				tx_digest: o.data.previousTransaction,
			},
			display: explorerDisplayStrings(o) ?? undefined,
			rawDisplay: o.data.display,
		};
	} else {
		throw new Error(`${o.error}`);
	}
}
