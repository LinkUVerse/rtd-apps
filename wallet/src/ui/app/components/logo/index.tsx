// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useI18n, type MessageKey } from '_app/i18n';
import { API_ENV } from '_src/shared/api-env';

type LogoProps = {
	networkName?: API_ENV;
};

const networkLabelKeys: Record<API_ENV, MessageKey> = {
	[API_ENV.mainnet]: 'network.mainnet',
	[API_ENV.devNet]: 'network.devNet',
	[API_ENV.testNet]: 'network.testNet',
	[API_ENV.local]: 'network.local',
	[API_ENV.customRPC]: 'network.customRPC',
};

const Logo = ({ networkName }: LogoProps) => {
	const { t } = useI18n();
	const activeNetwork = networkName || API_ENV.mainnet;
	const networkLabel = t(networkLabelKeys[activeNetwork]);

	return (
		<span className="rtd-wordmark" aria-label={`${t('brand.wallet')} · ${networkLabel}`}>
			<span className="rtd-wordmark__mark" aria-hidden="true">
				R
			</span>
			<span className="rtd-wordmark__name">{t('brand.name')}</span>
			{activeNetwork !== API_ENV.mainnet ? (
				<span className="rtd-wordmark__network">{networkLabel}</span>
			) : null}
		</span>
	);
};

export default Logo;
