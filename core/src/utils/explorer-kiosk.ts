// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { KioskItem } from 'rtd-kiosk';
import type { RtdObjectResponse } from 'rtd-typescript/jsonRpc';

export type ExplorerKioskItem = RtdObjectResponse & { kioskId: string };

/** Presentation DTO for existing Explorer views; never a transaction input or Move JSON decoder. */
export function explorerKioskItem(item: KioskItem): ExplorerKioskItem {
	const object = item.data;
	if (!object || object.objectId !== item.objectId || object.type !== item.type) {
		throw new Error('Kiosk item object is missing or inconsistent');
	}
	return {
		kioskId: item.kioskId,
		data: {
			objectId: object.objectId, version: object.version, digest: object.digest,
			type: object.type, previousTransaction: object.previousTransaction,
			display: object.display ? {
				data: object.display.data,
				error: object.display.error === null ? null : { code: 'displayError', error: object.display.error },
			} : null,
		},
	};
}

/** Display v2 may contain structured JSON; image/text consumers accept only string values. */
export function explorerDisplayString(object: RtdObjectResponse, field: string): string | undefined {
	const value = object.data?.display?.data?.[field];
	return typeof value === 'string' ? value : undefined;
}

export function explorerVideoUrl(object: RtdObjectResponse, recognizedPackages: readonly string[]): string | null {
	const type = object.data?.type ?? (object.data?.content?.dataType === 'package'
		? 'package' : object.data?.content?.type);
	if (!type || !recognizedPackages.includes(type.split('::')[0])) return null;
	return explorerDisplayString(object, 'video_url') ?? null;
}

/** Text-only projection for existing Explorer detail cards; raw metadata remains on the object. */
export function explorerDisplayStrings(object: RtdObjectResponse): Record<string, string> | null {
	const data = object.data?.display?.data;
	return data ? Object.fromEntries(Object.entries(data).filter((entry): entry is [string, string] => typeof entry[1] === 'string')) : null;
}
