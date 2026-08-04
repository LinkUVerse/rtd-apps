// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Text } from '_app/shared/text';
import { useI18n } from '_app/i18n';
import { IconTooltip } from '_app/shared/tooltip';
import LoadingIndicator from '_components/loading/LoadingIndicator';
import { roundFloat, useGetValidatorsApy } from 'rtd-apps-core';
import { useRtdClientQuery } from 'rtd-dapp-kit';
import { useMemo } from 'react';

const APY_DECIMALS = 3;

type DelegatedAPYProps = {
	stakedValidators: string[];
};

export function DelegatedAPY({ stakedValidators }: DelegatedAPYProps) {
	const { t } = useI18n();
	const { data, isPending } = useRtdClientQuery('getLatestRtdSystemState');
	const { data: rollingAverageApys } = useGetValidatorsApy();

	const averageNetworkAPY = useMemo(() => {
		if (!data || !rollingAverageApys) return null;

		let stakedAPYs = 0;

		stakedValidators.forEach((validatorAddress) => {
			stakedAPYs += rollingAverageApys?.[validatorAddress]?.apy || 0;
		});

		const averageAPY = stakedAPYs / stakedValidators.length;

		return roundFloat(averageAPY || 0, APY_DECIMALS);
	}, [data, rollingAverageApys, stakedValidators]);

	if (isPending) {
		return (
			<div className="p-2 w-full flex justify-center items-center h-full">
				<LoadingIndicator />
			</div>
		);
	}

	if (!averageNetworkAPY) return null;

	return (
		<div className="flex gap-0.5 items-center">
			{averageNetworkAPY !== null ? (
				<>
					<Text variant="body" weight="semibold" color="steel-dark">
						{averageNetworkAPY}
					</Text>
					<Text variant="subtitle" weight="medium" color="steel-darker">
						% {t('staking.apy')}
					</Text>
					<div className="text-steel items-baseline text-body flex">
						<IconTooltip tip={t('staking.averageApyDescription')} placement="top" />
					</div>
				</>
			) : (
				<Text variant="subtitle" weight="medium" color="steel-dark">
					--
				</Text>
			)}
		</div>
	);
}
