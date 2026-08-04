// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import ExplorerLink from '_src/ui/app/components/explorer-link';
import { ExplorerLinkType } from '_src/ui/app/components/explorer-link/ExplorerLinkType';
import { useActiveAddress } from '_src/ui/app/hooks';
import { useI18n } from '_src/ui/app/i18n';
import { GAS_TYPE_ARG } from '_src/ui/app/redux/slices/rtd-objects/Coin';
import { useFormatCoin, type GasSummaryType } from 'rtd-apps-core';
import { formatAddress } from 'rtd-typescript/utils';

import { Text } from '../../text';

export function GasSummary({ gasSummary }: { gasSummary?: GasSummaryType }) {
	const { t } = useI18n();
	const [gas, symbol] = useFormatCoin(gasSummary?.totalGas, GAS_TYPE_ARG);
	const address = useActiveAddress();

	if (!gasSummary) return null;

	return (
		<div className="theme-card relative flex flex-col rounded-2xl shadow-card-soft">
			<div className="bg-gray-40 rounded-t-2xl py-2.5 px-4">
				<Text color="steel-darker" variant="captionSmall" weight="semibold">
					{t('transaction.gasFees')}
				</Text>
			</div>
			<div className="flex flex-col items-center gap-2 w-full px-4 py-3">
				<div className="flex w-full items-center justify-start">
					{address === gasSummary?.owner && (
						<div className="mr-auto">
							<Text color="steel-dark" variant="pBody" weight="medium">
								{t('transaction.youPaid')}
							</Text>
						</div>
					)}
					<Text color="steel-darker" variant="pBody" weight="medium">
						{gasSummary?.isSponsored ? '0' : gas} {symbol}
					</Text>
				</div>
				{gasSummary?.isSponsored && gasSummary.owner && (
					<>
						<div className="flex w-full justify-between">
							<Text color="steel-dark" variant="pBody" weight="medium">
								{t('transaction.paidBySponsor')}
							</Text>
							<Text color="steel-darker" variant="pBody" weight="medium">
								{gas} {symbol}
							</Text>
						</div>
						<div className="flex w-full justify-between">
							<Text color="steel-dark" variant="pBody" weight="medium">
								{t('approval.sponsor')}
							</Text>
							<ExplorerLink
								type={ExplorerLinkType.address}
								address={gasSummary.owner}
								className="text-hero-dark no-underline"
							>
								<Text variant="pBodySmall" truncate mono>
									{formatAddress(gasSummary.owner)}
								</Text>
							</ExplorerLink>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
