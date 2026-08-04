// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ActiveCoinsCard } from '_components/active-coins-card';
import { useI18n } from '_app/i18n';
import Overlay from '_components/overlay';
import { useUnlockedGuard } from '_src/ui/app/hooks/useUnlockedGuard';
import { RTD_TYPE_ARG } from 'rtd-typescript/utils';
import { useNavigate, useSearchParams } from 'react-router-dom';

function CoinsSelectorPage() {
	const { t } = useI18n();
	const [searchParams] = useSearchParams();
	const coinType = searchParams.get('type') || RTD_TYPE_ARG;
	const navigate = useNavigate();

	if (useUnlockedGuard()) {
		return null;
	}

	return (
		<Overlay
			showModal={true}
			title={t('transfer.selectCoin')}
			closeOverlay={() =>
				navigate(
					`/send?${new URLSearchParams({
						type: coinType,
					}).toString()}`,
				)
			}
		>
			<ActiveCoinsCard activeCoinType={coinType} showActiveCoin={false} />
		</Overlay>
	);
}

export default CoinsSelectorPage;
