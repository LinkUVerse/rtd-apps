// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useI18n, type MessageKey } from '_app/i18n';
import { API_ENV } from '_src/shared/api-env';
import { Rtd } from 'rtd-apps-icons';

type LogoProps = {
	networkName?: API_ENV;
	variant?: 'default' | 'welcome';
};

const networkLabelKeys: Record<API_ENV, MessageKey> = {
	[API_ENV.mainnet]: 'network.mainnet',
	[API_ENV.devNet]: 'network.devNet',
	[API_ENV.testNet]: 'network.testNet',
	[API_ENV.local]: 'network.local',
	[API_ENV.customRPC]: 'network.customRPC',
};

const Logo = ({ networkName, variant = 'default' }: LogoProps) => {
	const { t } = useI18n();
	const activeNetwork = networkName || API_ENV.mainnet;
	const networkLabel = t(networkLabelKeys[activeNetwork]);

	return (
		<span
			className={`rtd-wordmark${
				variant === 'welcome' ? ' rtd-wordmark--welcome' : ''
			}`}
			aria-label={`${t('brand.wallet')} · ${networkLabel}`}
		>
			<Rtd className="rtd-wordmark__mark" aria-hidden="true" />
			<span className="rtd-wordmark__text">
				<span className="rtd-wordmark__name">{t('brand.name')}</span>
				{activeNetwork !== API_ENV.mainnet ? (
					<span className="rtd-wordmark__network">{networkLabel}</span>
				) : null}
			</span>
		</span>
	);
};

export default Logo;
