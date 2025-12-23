// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { type ObjectOwner, type RtdObjectResponse } from "rtd-typescript/client";

import { findIPFSvalue } from "./stringUtils";

export function parseImageURL(display?: Record<string, string> | null) {
	const url = display?.image_url;
	if (url) {
		if (findIPFSvalue(url)) return url;
		// String representing true http/https URLs are valid:
		try {
			new URL(url);
			return url;
		} catch {
			//do nothing
		}
	}
	return "";
}

export function parseObjectType(data: RtdObjectResponse): string {
	if (data.data?.content?.dataType === "package") {
		return "Move Package";
	}
	return data.data?.type ?? data?.data?.content?.type ?? "unknown";
}

export function getOwnerStr(owner: ObjectOwner): string {
	if (typeof owner === "object") {
		if ("AddressOwner" in owner) return owner.AddressOwner;
		if ("ObjectOwner" in owner) return owner.ObjectOwner;
		if ("Shared" in owner) return "Shared";
		if ("Immutable" in owner) return "Immutable";
		return "Unknown";
	}
	return owner;
}

export const checkIsPropertyType = (value: unknown) => ["number", "string"].includes(typeof value);

export const extractName = (display?: Record<string, string> | null) => {
	if (!display || !("name" in display)) return undefined;
	const name = display.name;
	if (typeof name === "string") {
		return name;
	}
	return null;
};

export function getDisplayUrl(url?: string) {
	if (url) {
		try {
			const parsedUrl = new URL(url);
			return {
				href: url,
				display: parsedUrl.hostname,
			};
		} catch (_e) {
			// do nothing
		}
	}
	return url || null;
}
