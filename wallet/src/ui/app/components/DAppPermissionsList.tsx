// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { PermissionType } from '_messages/payloads/permissions';
import { useI18n, type MessageKey } from '_app/i18n';
import { CheckFill12 } from 'rtd-apps-icons';

import { Text } from '../shared/text';

export type DAppPermissionsListProps = {
	permissions: PermissionType[];
};

const permissionTypeToTxt: Record<PermissionType, MessageKey> = {
	viewAccount: 'dapp.permissionShareAddress',
	suggestTransactions: 'dapp.permissionSuggestTransactions',
};

export function DAppPermissionsList({ permissions }: DAppPermissionsListProps) {
	const { t } = useI18n();

	return (
		<ul className="list-none m-0 p-0 flex flex-col gap-3">
			{permissions.map((aPermission) => (
				<li key={aPermission} className="flex flex-row flex-nowrap items-center gap-2">
					<CheckFill12 className="text-steel" />
					<Text variant="bodySmall" weight="medium" color="steel-darker">
						{t(permissionTypeToTxt[aPermission])}
					</Text>
				</li>
			))}
		</ul>
	);
}
