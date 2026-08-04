// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Content, Menu } from '_app/shared/bottom-menu-layout';
import { Button } from '_app/shared/ButtonUI';
import { Text } from '_app/shared/text';
import Alert from '_components/alert';
import LoadingIndicator from '_components/loading/LoadingIndicator';
import { ampli } from '_src/shared/analytics/ampli';
import { useI18n, type MessageKey } from '_src/ui/app/i18n';
import { calculateStakeShare, formatPercentageDisplay, useGetValidatorsApy } from 'rtd-apps-core';
import { useRtdClientQuery } from 'rtd-dapp-kit';
import { ArrowRight16 } from 'rtd-apps-icons';
import cl from 'clsx';
import { useMemo, useState } from 'react';

import { ValidatorListItem } from './ValidatorListItem';

type SortKeys = 'name' | 'stakeShare' | 'apy';
const sortKeys: Record<SortKeys, MessageKey> = {
	name: 'staking.sortName',
	stakeShare: 'staking.stakeShare',
	apy: 'staking.apy',
};

type Validator = {
	name: string;
	address: string;
	apy: number | null;
	isApyApproxZero?: boolean;
	stakeShare: number;
};

export function SelectValidatorCard() {
	const { t } = useI18n();
	const [selectedValidator, setSelectedValidator] = useState<Validator | null>(null);
	const [sortKey, setSortKey] = useState<SortKeys | null>(null);
	const [sortAscending, setSortAscending] = useState(true);
	const { data, isPending, isError } = useRtdClientQuery('getLatestRtdSystemState');

	const { data: rollingAverageApys } = useGetValidatorsApy();

	const selectValidator = (validator: Validator) => {
		setSelectedValidator((state) => (state?.address !== validator.address ? validator : null));
	};

	const handleSortByKey = (key: SortKeys) => {
		if (key === sortKey) {
			setSortAscending(!sortAscending);
		}
		setSortKey(key);
	};

	const totalStake = useMemo(() => {
		if (!data) return 0;
		return data.activeValidators.reduce(
			(acc, curr) => (acc += BigInt(curr.stakingPoolRtdBalance)),
			0n,
		);
	}, [data]);

	const validatorsRandomOrder = useMemo(
		() => [...(data?.activeValidators || [])].sort(() => 0.5 - Math.random()),
		[data?.activeValidators],
	);
	const validatorList = useMemo(() => {
		const sortedAsc = validatorsRandomOrder.map((validator) => {
			const { apy, isApyApproxZero } = rollingAverageApys?.[validator.rtdAddress] ?? { apy: null };
			return {
				name: validator.name,
				address: validator.rtdAddress,
				apy,
				isApyApproxZero,
				stakeShare: calculateStakeShare(
					BigInt(validator.stakingPoolRtdBalance),
					BigInt(totalStake),
				),
			};
		});
		if (sortKey) {
			sortedAsc.sort((a, b) => {
				if (sortKey === 'name') {
					return a[sortKey].localeCompare(b[sortKey], 'en', {
						sensitivity: 'base',
						numeric: true,
					});
				}
				// since apy can be null, fallback to 0
				return (a[sortKey] || 0) - (b[sortKey] || 0);
			});

			return sortAscending ? sortedAsc : sortedAsc.reverse();
		}
		return sortedAsc;
	}, [validatorsRandomOrder, sortAscending, rollingAverageApys, totalStake, sortKey]);

	if (isPending) {
		return (
			<div className="p-2 w-full flex justify-center items-center h-full">
				<LoadingIndicator />
			</div>
		);
	}

	if (isError) {
		return (
			<div className="p-2">
				<Alert>
					<div className="mb-1 font-semibold">{t('common.somethingWrong')}</div>
				</Alert>
			</div>
		);
	}

	return (
		<div className="flex flex-col w-full h-full -my-5">
			<Content className="flex flex-col w-full items-center">
				<div className="theme-surface sticky -top-5 z-50 mt-0 flex w-full flex-col items-center pb-2.5 pt-5">
					<div className="flex items-start w-full mb-2">
						<Text variant="subtitle" weight="medium" color="steel-darker">
							{t('staking.sortBy')}
						</Text>
						<div className="flex items-center ml-2 gap-1.5">
							{Object.entries(sortKeys).map(([key, value]) => {
								return (
									<button
										key={key}
										className="bg-transparent border-0 p-0 flex gap-1 cursor-pointer"
										onClick={() => handleSortByKey(key as SortKeys)}
									>
										<Text
											variant="caption"
											weight="medium"
											color={sortKey === key ? 'hero' : 'steel-darker'}
										>
											{t(value)}
										</Text>
										{sortKey === key && (
											<ArrowRight16
												className={cl(
													'text-captionSmall font-thin text-hero',
													sortAscending ? 'rotate-90' : '-rotate-90',
												)}
											/>
										)}
									</button>
								);
							})}
						</div>
					</div>
					<div className="flex items-start w-full">
						<Text variant="subtitle" weight="medium" color="steel-darker">
							{t('staking.selectValidator')}
						</Text>
					</div>
				</div>
				<div className="flex items-start flex-col w-full mt-1 flex-1">
					{data &&
						validatorList.map((validator) => (
							<div
								data-testid="validator-list-item"
								className="cursor-pointer w-full relative"
								key={validator.address}
								onClick={() => selectValidator(validator)}
							>
								<ValidatorListItem
									selected={selectedValidator?.address === validator.address}
									validatorAddress={validator.address}
									value={formatPercentageDisplay(
										!sortKey || sortKey === 'name' ? null : validator[sortKey],
										'-',
										validator?.isApyApproxZero,
									)}
								/>
							</div>
						))}
				</div>
			</Content>
			{selectedValidator && (
				<Menu stuckClass="staked-cta" className="w-full px-0 pb-5 mx-0 -bottom-5">
					<Button
						data-testid="select-validator-cta"
						size="tall"
						variant="primary"
						to={`/stake/new?address=${encodeURIComponent(selectedValidator.address)}`}
						onClick={() =>
							ampli.selectedValidator({
								validatorName: selectedValidator.name,
								validatorAddress: selectedValidator.address,
								validatorAPY: selectedValidator.apy || 0,
							})
						}
						text={t('staking.selectAmount')}
						after={<ArrowRight16 />}
					/>
				</Menu>
			)}
		</div>
	);
}
