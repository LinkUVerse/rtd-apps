// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { type AccountType } from '_src/background/accounts/Account';
import { useI18n } from '_app/i18n';

import { BadgeLabel } from './BadgeLabel';

type AccountBadgeProps = {
	accountType: AccountType;
};

export function AccountBadge({ accountType }: AccountBadgeProps) {
	const { t } = useI18n();
	const badgeText =
		accountType === 'imported'
			? t('accounts.typeImported')
			: accountType === 'qredo'
				? 'Qredo'
				: accountType === 'zkLogin'
					? 'zkLogin'
					: null;

	if (!badgeText) return null;

	return <BadgeLabel label={badgeText} />;
}
