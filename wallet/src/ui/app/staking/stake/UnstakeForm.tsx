// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Card } from '_app/shared/card';
import { Text } from '_app/shared/text';
import { CountDownTimer } from '_src/ui/app/shared/countdown-timer';
import { useI18n } from '_src/ui/app/i18n';
import { useFormatCoin, useGetTimeBeforeEpochNumber } from 'rtd-apps-core';
import { RTD_TYPE_ARG } from 'rtd-typescript/utils';
import { Form } from 'formik';
import { useMemo } from 'react';

import { useActiveAddress, useTransactionGasBudget } from '../../hooks';
import { GAS_SYMBOL } from '../../redux/slices/rtd-objects/Coin';
import { Heading } from '../../shared/heading';
import { createUnstakeTransaction } from './utils/transaction';

export type StakeFromProps = {
	stakedRtdId: string;
	coinBalance: bigint;
	coinType: string;
	stakingReward?: string;
	epoch: number;
};

export function UnStakeForm({
	stakedRtdId,
	coinBalance,
	coinType,
	stakingReward,
	epoch,
}: StakeFromProps) {
	const { t } = useI18n();
	const [rewards, rewardSymbol] = useFormatCoin(stakingReward, RTD_TYPE_ARG);
	const [totalRtd] = useFormatCoin(BigInt(stakingReward || 0) + coinBalance, RTD_TYPE_ARG);
	const [tokenBalance] = useFormatCoin(coinBalance, coinType);

	const transaction = useMemo(() => createUnstakeTransaction(stakedRtdId), [stakedRtdId]);
	const activeAddress = useActiveAddress();
	const { data: gasBudget } = useTransactionGasBudget(activeAddress, transaction);

	const { data: currentEpochEndTime } = useGetTimeBeforeEpochNumber(epoch + 1 || 0);

	return (
		<Form className="flex flex-1 flex-col flex-nowrap" autoComplete="off" noValidate>
			<Card
				titleDivider
				header={
					<div className="theme-surface flex w-full justify-between px-4 py-3">
						<Text variant="body" weight="medium" color="steel-darker">
							{t('staking.currentEpochEnds')}
						</Text>
						<div className="flex gap-0.5 ml-auto">
							{currentEpochEndTime > 0 ? (
								<CountDownTimer
									timestamp={currentEpochEndTime}
									variant="body"
									color="steel-dark"
									weight="medium"
									endLabel="--"
								/>
							) : (
								<Text variant="body" weight="medium" color="steel-dark">
									{t('staking.epochNumber', { count: epoch })}
								</Text>
							)}
						</div>
					</div>
				}
				footer={
					<div className="flex gap-0.5 justify-between w-full">
						<Text variant="pBodySmall" weight="medium" color="steel-darker">
							{t('staking.totalUnstaked')}
						</Text>
						<div className="flex gap-0.5 ml-auto">
							<Heading variant="heading4" weight="semibold" color="steel-darker" leading="none">
								{totalRtd}
							</Heading>
							<Text variant="bodySmall" weight="medium" color="steel-dark">
								{GAS_SYMBOL}
							</Text>
						</div>
					</div>
				}
			>
				<div className="pb-3.75 flex flex-col  w-full gap-2">
					<div className="flex gap-0.5 justify-between w-full">
						<Text variant="body" weight="medium" color="steel-darker">
							{t('staking.yourStake')}
						</Text>
						<Text variant="body" weight="medium" color="steel-darker">
							{tokenBalance} {GAS_SYMBOL}
						</Text>
					</div>
					<div className="flex gap-0.5 justify-between w-full">
						<Text variant="body" weight="medium" color="steel-darker">
							{t('staking.rewardsEarned')}
						</Text>
						<Text variant="body" weight="medium" color="steel-darker">
							{rewards} {rewardSymbol}
						</Text>
					</div>
				</div>
			</Card>
			<div className="mt-4">
				<Card variant="gray">
					<div className=" w-full flex justify-between">
						<Text variant="body" weight="medium" color="steel-darker">
							{t('transaction.gasFees')}
						</Text>

						<Text variant="body" weight="medium" color="steel-dark">
							{gasBudget || '-'} {GAS_SYMBOL}
						</Text>
					</div>
				</Card>
			</div>
		</Form>
	);
}
