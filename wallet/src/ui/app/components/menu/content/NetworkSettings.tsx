// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useNextMenuUrl } from '_components/menu/hooks';
import NetworkSelector from '_components/network-selector';
import { useI18n } from '_app/i18n';

import { MenuLayout } from './MenuLayout';

export function NetworkSettings() {
	const { t } = useI18n();
	const mainMenuUrl = useNextMenuUrl(true, '/');
	return (
		<MenuLayout title={t('settings.network')} back={mainMenuUrl}>
			<NetworkSelector />
		</MenuLayout>
	);
}
