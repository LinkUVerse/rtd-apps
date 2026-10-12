// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useI18n } from '_app/i18n';
import Alert from '_components/alert';
import PageTitle from '_app/shared/PageTitle';

export function UsdcPromo() {
	const { t } = useI18n();

	return (
		<div className="flex flex-col items-center gap-6">
			<PageTitle back />
			<Alert>{t('tokens.swapUnavailable')}</Alert>
		</div>
	);
}
