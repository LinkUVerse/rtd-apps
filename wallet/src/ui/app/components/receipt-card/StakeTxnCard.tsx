// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ValidatorLogo } from '_app/staking/validators/ValidatorLogo';
import { TxnAmount } from '_components/receipt-card/TxnAmount';
import {
	NUM_OF_EPOCH_BEFORE_STAKING_REWARDS_REDEEMABLE,
	NUM_OF_EPOCH_BEFORE_STAKING_REWARDS_STARTS,
} from '_src/shared/constants';
import { CountDownTimer } from '_src/ui/app/shared/countdown-timer';
import { useI18n } from '_src/ui/app/i18n';
import { Text } from '_src/ui/app/shared/text';
import { IconTooltip } from '_src/ui/app/shared/tooltip';
import {
	formatPercentageDisplay,
	useGetTimeBeforeEpochNumber,
	useGetValidatorsApy,
} from 'rtd-apps-core';
import type { RtdEvent } from 'rtd-typescript/client';
import { RTD_TYPE_ARG } from 'rtd-typescript/utils';

import { Card } from '../../shared/transaction-summary/Card';

type StakeTxnCardProps = {
	event: RtdEvent;
};

// For Staked Transaction use moveEvent Field to get the validator address, delegation amount, epoch
export function StakeTxnCard({ event }: StakeTxnCardProps) {
	const { t } = useI18n();
	const json = event.parsedJson as { amount: string; validator_address: string; epoch: string };
	const validatorAddress = json?.validator_address;
	const stakedAmount = json?.amount;
	const stakedEpoch = Number(json?.epoch || '0');

	const { data: rollingAverageApys } = useGetValidatorsApy();

	const { apy, isApyApproxZero } = rollingAverageApys?.[validatorAddress] ?? {
		apy: null,
	};
	// Reward will be available after 2 epochs
	// TODO: Get epochStartTimestampMs/StartDate
	// for staking epoch + NUM_OF_EPOCH_BEFORE_STAKING_REWARDS_REDEEMABLE
	const startEarningRewardsEpoch = Number(stakedEpoch) + NUM_OF_EPOCH_BEFORE_STAKING_REWARDS_STARTS;

	const redeemableRewardsEpoch =
		Number(stakedEpoch) + NUM_OF_EPOCH_BEFORE_STAKING_REWARDS_REDEEMABLE;

	const { data: timeBeforeStakeRewardsStarts } =
		useGetTimeBeforeEpochNumber(startEarningRewardsEpoch);

	const { data: timeBeforeStakeRewardsRedeemable } =
		useGetTimeBeforeEpochNumber(redeemableRewardsEpoch);

	return (
		<Card>
			<div className="flex flex-col divide-y divide-solid divide-gray-40 divide-x-0">
				{validatorAddress && (
					<div className="mb-3.5 w-full divide-y divide-gray-40 divide-solid">
						<ValidatorLogo
							validatorAddress={validatorAddress}
							showAddress
							iconSize="md"
							size="body"
							activeEpoch={json?.epoch}
						/>
					</div>
				)}
				{stakedAmount && (
					<TxnAmount amount={stakedAmount} coinType={RTD_TYPE_ARG} label={t('staking.stake')} />
				)}
				<div className="flex flex-col">
					<div className="flex justify-between w-full py-3.5">
						<div className="flex gap-1 items-baseline justify-center text-steel">
							<Text variant="body" weight="medium" color="steel-darker">
								{t('staking.apy')}
							</Text>
							<IconTooltip tip={t('staking.apyDescription')} />
						</div>
						<Text variant="body" weight="medium" color="steel-darker">
							{formatPercentageDisplay(apy, '--', isApyApproxZero)}
						</Text>
					</div>
				</div>
				<div className="flex flex-col">
					<div className="flex justify-between w-full py-3.5">
						<div className="flex gap-1 items-baseline text-steel">
							<Text variant="body" weight="medium" color="steel-darker">
								{timeBeforeStakeRewardsStarts > 0
									? t('staking.rewardsStart')
									: t('staking.rewardsStarted')}
							</Text>
						</div>

						{timeBeforeStakeRewardsStarts > 0 ? (
							<CountDownTimer
								timestamp={timeBeforeStakeRewardsStarts}
								variant="body"
								color="steel-darker"
								weight="medium"
								label={t('staking.in')}
								endLabel="--"
							/>
						) : (
							<Text variant="body" weight="medium" color="steel-darker">
								{t('staking.epochNumber', { count: startEarningRewardsEpoch })}
							</Text>
						)}
					</div>
					<div className="flex justify-between w-full">
						<div className="flex gap-1 flex-1 items-baseline text-steel">
							<Text variant="pBody" weight="medium" color="steel-darker">
								{t('staking.rewardsRedeemable')}
							</Text>
						</div>
						<div className="flex-1 flex justify-end gap-1 items-center">
							{timeBeforeStakeRewardsRedeemable > 0 ? (
								<CountDownTimer
									timestamp={timeBeforeStakeRewardsRedeemable}
									variant="body"
									color="steel-darker"
									weight="medium"
									label={t('staking.in')}
									endLabel="--"
								/>
							) : (
								<Text variant="body" weight="medium" color="steel-darker">
									{t('staking.epochNumber', { count: redeemableRewardsEpoch })}
								</Text>
							)}
						</div>
					</div>
				</div>
			</div>
		</Card>
	);
}
