// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { GAS_TYPE_ARG } from '_redux/slices/rtd-objects/Coin';
import { useI18n } from '_app/i18n';
import { useFormatCoin } from 'rtd-apps-core';

export type FaucetMessageInfoProps = {
	error?: string | null;
	loading?: boolean;
	totalReceived?: number | null;
};

function FaucetMessageInfo({
	error = null,
	loading = false,
	totalReceived = null,
}: FaucetMessageInfoProps) {
	const { t } = useI18n();
	const [coinsReceivedFormatted, coinsReceivedSymbol] = useFormatCoin(totalReceived, GAS_TYPE_ARG);
	if (loading) {
		return <>{t('faucet.requestProgress')}</>;
	}
	if (error) {
		return <>{error}</>;
	}
	const amount = `${totalReceived ? `${coinsReceivedFormatted} ` : ''}${coinsReceivedSymbol}`;
	return <>{t('faucet.received', { amount })}</>;
}

export default FaucetMessageInfo;
