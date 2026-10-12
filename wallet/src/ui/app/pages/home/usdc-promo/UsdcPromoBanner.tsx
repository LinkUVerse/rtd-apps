// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useGetAllBalances } from '_app/hooks/useGetAllBalances';
import { useI18n } from '_app/i18n';
import { Text } from '_app/shared/text';
import { ButtonOrLink } from '_app/shared/utils/ButtonOrLink';
import { useActiveAddress } from '_hooks';
import { useUsdcPromo } from '_pages/home/usdc-promo/useUsdcPromo';
import { ampli } from '_shared/analytics/ampli';
import { useCoinMetadata } from 'rtd-apps-core/src/rpc/coin';
import { type RtdClientTypes } from 'rtd-typescript/client';
import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

function useUsdcInUserBalance() {
	const activeAccountAddress = useActiveAddress();
	const { wrappedUsdcList } = useUsdcPromo();

	const { data: coinBalances, isError } = useGetAllBalances(activeAccountAddress || '');
	if (isError) return [];

	return coinBalances
		? coinBalances.filter(
				(coin) => wrappedUsdcList.includes(coin.coinType) && BigInt(coin.balance) > 0n,
			)
		: [];
}

function BannerImage({ balance }: { balance: RtdClientTypes.Balance }) {
	const { t } = useI18n();
	const navigate = useNavigate();
	const { promoBannerBackground, promoBannerText } = useUsdcPromo();
	const { data: metadata } = useCoinMetadata(balance.coinType);
	const usdcInUsersBalance = useUsdcInUserBalance();

	const maxBalance = useMemo(() => {
		if (!metadata) return null;
		const decimals = metadata.decimals;
		return new BigNumber(balance.balance).shiftedBy(-decimals).decimalPlaces(decimals).toString();
	}, [balance, metadata]);
	if (maxBalance === null) return null;

	return (
		<ButtonOrLink
			className="relative bg-transparent border-none p-0"
			onClick={() => {
				ampli.clickedUsdcPromoBanner({
					wUsdcInAccount: usdcInUsersBalance.map((coin) => coin.coinType),
				});
				navigate(
					`/usdc-promo?${new URLSearchParams({
						type: balance.coinType,
						presetAmount: maxBalance,
					})}`,
				);
			}}
		>
			<img
				className="w-full cursor-pointer h-16"
				alt={t('promo.usdcBannerAlt')}
				src={promoBannerBackground}
			/>
			<div className="absolute top-1/2 -translate-y-1/2 w-full flex flex-row gap-4 px-3">
				<img
					alt="USDC"
					src="https://fe-assets.linkuverse.com/wallet_next/usdc_icon.png"
					className="h-8 w-8"
				/>
				<Text variant="bodySmall" weight="medium" color="white" className="text-left">
					{promoBannerText}
				</Text>
			</div>
		</ButtonOrLink>
	);
}

export function UsdcPromoBanner() {
	const { enabled } = useUsdcPromo();
	const usdcInUsersBalance = useUsdcInUserBalance();

	const firstUsdcInUsersBalance = usdcInUsersBalance[0];

	if (!enabled || !firstUsdcInUsersBalance) {
		return null;
	}

	return <BannerImage balance={firstUsdcInUsersBalance} />;
}
