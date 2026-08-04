// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Card } from '_app/shared/card';
import { Text } from '_app/shared/text';
import NumberInput from '_components/number-input';
import {
	NUM_OF_EPOCH_BEFORE_STAKING_REWARDS_REDEEMABLE,
	NUM_OF_EPOCH_BEFORE_STAKING_REWARDS_STARTS,
} from '_src/shared/constants';
import { CountDownTimer } from '_src/ui/app/shared/countdown-timer';
import { useI18n } from '_src/ui/app/i18n';
import { useCoinMetadata, useFormatCoin, useGetTimeBeforeEpochNumber } from 'rtd-apps-core';
import { Field, Form, useFormikContext } from 'formik';
import { memo, useCallback, useMemo } from 'react';

import { parseAmount } from '../../helpers';
import { useActiveAddress, useTransactionGasBudget } from '../../hooks';
import { type FormValues } from './StakingCard';
import { createStakeTransaction } from './utils/transaction';

const HIDE_MAX = true;

export type StakeFromProps = {
	validatorAddress: string;
	coinBalance: bigint;
	coinType: string;
	epoch?: string | number;
};

function StakeForm({ validatorAddress, coinBalance, coinType, epoch }: StakeFromProps) {
	const { t } = useI18n();
	const { values, setFieldValue } = useFormikContext<FormValues>();

	const { data: metadata } = useCoinMetadata(coinType);
	const decimals = metadata?.decimals ?? 0;
	const [maxToken, symbol, queryResult] = useFormatCoin(coinBalance, coinType);

	const transaction = useMemo(() => {
		if (!values.amount || !decimals) return null;
		const amountWithoutDecimals = parseAmount(values.amount, decimals);
		return createStakeTransaction(amountWithoutDecimals, validatorAddress);
	}, [values.amount, validatorAddress, decimals]);

	const activeAddress = useActiveAddress();
	const { data: gasBudget } = useTransactionGasBudget(activeAddress, transaction);

	const setMaxToken = useCallback(() => {
		if (!maxToken) return;
		setFieldValue('amount', maxToken);
	}, [maxToken, setFieldValue]);

	// Reward will be available after 2 epochs
	const startEarningRewardsEpoch = Number(epoch || 0) + NUM_OF_EPOCH_BEFORE_STAKING_REWARDS_STARTS;

	const redeemableRewardsEpoch =
		Number(epoch || 0) + NUM_OF_EPOCH_BEFORE_STAKING_REWARDS_REDEEMABLE;

	const { data: timeBeforeStakeRewardsStarts } =
		useGetTimeBeforeEpochNumber(startEarningRewardsEpoch);

	const { data: timeBeforeStakeRewardsRedeemable } =
		useGetTimeBeforeEpochNumber(redeemableRewardsEpoch);

	return (
		<Form className="flex flex-1 flex-col flex-nowrap items-center" autoComplete="off">
			<div className="flex flex-col justify-between items-center mb-3 mt-3.5 w-full gap-1.5">
				<Text variant="caption" color="gray-85" weight="semibold">
					{t('staking.enterAmount')}
				</Text>
				<Text variant="bodySmall" color="steel" weight="medium">
					{t('staking.available', { amount: maxToken, symbol })}
				</Text>
			</div>
			<Card
				variant="gray"
				titleDivider
				header={
					<div className="theme-surface flex w-full p-2.5">
						<Field
							data-testid="stake-amount-input"
							component={NumberInput}
							allowNegative={false}
							name="amount"
							className="w-full border-none bg-transparent text-heading4 font-semibold text-hero-dark placeholder:font-semibold placeholder:text-gray-70"
							decimals
							suffix={` ${symbol}`}
							autoFocus
						/>
						{!HIDE_MAX ? (
							<button
								className="theme-surface flex h-6 w-11 cursor-pointer items-center justify-center rounded-2xl border border-solid border-gray-60 text-bodySmall font-medium text-steel-darker hover:border-steel-dark hover:text-steel-darker disabled:cursor-auto disabled:opacity-50"
								onClick={setMaxToken}
								disabled={queryResult.isPending}
								type="button"
							>
								{t('common.max')}
							</button>
						) : null}
					</div>
				}
				footer={
					<div className="py-px flex justify-between w-full">
						<Text variant="body" weight="medium" color="steel-darker">
							{t('transaction.gasFees')}
						</Text>
						<Text variant="body" weight="medium" color="steel-darker">
							{gasBudget} {symbol}
						</Text>
					</div>
				}
			>
				<div className="pb-3.75 flex justify-between w-full">
					<Text variant="body" weight="medium" color="steel-darker">
						{t('staking.rewardsStart')}
					</Text>
					{timeBeforeStakeRewardsStarts > 0 ? (
						<CountDownTimer
							timestamp={timeBeforeStakeRewardsStarts}
							variant="body"
							color="steel-darker"
							weight="semibold"
							label={t('staking.in')}
							endLabel="--"
						/>
					) : (
						<Text variant="body" weight="medium" color="steel-darker">
							{epoch ? t('staking.epochNumber', { count: Number(startEarningRewardsEpoch) }) : '--'}
						</Text>
					)}
				</div>
				<div className="pb-3.75 flex justify-between item-center w-full">
					<div className="flex-1">
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
								weight="semibold"
								label={t('staking.in')}
								endLabel="--"
							/>
						) : (
							<Text variant="body" weight="medium" color="steel-darker">
								{epoch ? t('staking.epochNumber', { count: Number(redeemableRewardsEpoch) }) : '--'}
							</Text>
						)}
					</div>
				</div>
			</Card>
		</Form>
	);
}

export default memo(StakeForm);
