// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { walletReadErrorMessage } from "_src/shared/rpc/read-error";

import { useActiveAddress } from '_app/hooks/useActiveAddress';
import { useGetAllBalances } from '_app/hooks/useGetAllBalances';
import Loading from '_components/loading';
import { filterAndSortTokenBalances } from '_helpers';
import { RTD_TYPE_ARG } from 'rtd-typescript/utils';
import { Link } from 'react-router-dom';

import { CoinItem } from './CoinItem';

export function ActiveCoinsCard({
	activeCoinType = RTD_TYPE_ARG,
	showActiveCoin = true,
}: {
	activeCoinType: string;
	showActiveCoin?: boolean;
}) {
	const selectedAddress = useActiveAddress();

	const { data: balances, isPending, error, isError } = useGetAllBalances(selectedAddress || '');
	const coins = balances ? filterAndSortTokenBalances(balances) : undefined;

	const activeCoin = coins?.find(({ coinType }) => coinType === activeCoinType);
	if (isError) return <div role="alert">{walletReadErrorMessage(error)}</div>;

	return (
		<Loading loading={isPending}>
			<div className="flex w-full">
				{showActiveCoin ? (
					activeCoin && (
						<Link
							to={`/send/select?${new URLSearchParams({
								type: activeCoin.coinType,
							}).toString()}`}
							className="border-solid border border-gray-45 rounded-2lg no-underline flex gap-2 items-center w-full overflow-hidden"
						>
							<CoinItem
								coinType={activeCoin.coinType}
								balance={BigInt(activeCoin.balance)}
								isActive
							/>
						</Link>
					)
				) : (
					<div className="flex flex-col w-full">
						<div className="flex flex-col justify-between items-center mt-2 divide-y divide-solid divide-gray-45 divide-x-0">
							{coins?.map(({ coinType, balance }) => (
								<Link
									to={`/send?${new URLSearchParams({
										type: coinType,
									}).toString()}`}
									key={coinType}
									className="no-underline w-full"
								>
									<CoinItem coinType={coinType} balance={BigInt(balance)} />
								</Link>
							))}
						</div>
					</div>
				)}
			</div>
		</Loading>
	);
}
