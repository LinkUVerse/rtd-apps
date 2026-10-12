// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { KIOSK_OWNER_CAP, PERSONAL_KIOSK_RULE_ADDRESS } from 'rtd-kiosk';
import type { KioskClientOptions } from 'rtd-kiosk';
import type { RtdObjectData, RtdObjectResponse } from 'rtd-typescript/jsonRpc';

export const ORIGINBYTE_KIOSK_MODULE =
	'0x95a441d389b07437d00dd07e0b6f05f513d7659b13fd7c5d3923c7d9d847199b::ob_kiosk';

export const ORIGINBYTE_KIOSK_OWNER_TOKEN = `${ORIGINBYTE_KIOSK_MODULE}::OwnerToken`;

export function isKioskOwnerToken(
	network: KioskClientOptions['network'],
	object?: RtdObjectResponse | RtdObjectData | null,
) {
	if (!object) return false;
	const objectData = 'data' in object && object.data ? object.data : (object as RtdObjectData);
	const personalPackage = PERSONAL_KIOSK_RULE_ADDRESS[network];
	return (
		objectData?.type === KIOSK_OWNER_CAP ||
		objectData?.type === ORIGINBYTE_KIOSK_OWNER_TOKEN ||
		(!!personalPackage && objectData?.type === `${personalPackage}::personal_kiosk::PersonalKioskCap`)
	);
}

export function getKioskIdFromOwnerCap(object: RtdObjectResponse | RtdObjectData) {
	const objectData = 'data' in object && object.data ? object.data : (object as RtdObjectData);
	const fields =
		objectData.content?.dataType === 'moveObject'
			? (objectData.content.fields as {
					for?: string;
					kiosk?: string;
					cap?: { fields: { for: string } };
				})
			: null;
	return fields?.for ?? fields?.kiosk ?? fields?.cap?.fields.for!;
}
