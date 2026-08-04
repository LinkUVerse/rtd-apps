// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useActiveAddress } from '_app/hooks/useActiveAddress';
import { useI18n } from '_app/i18n';
import { ErrorBoundary } from '_src/ui/app/components/error-boundary';
import ExplorerLink from '_src/ui/app/components/explorer-link';
import { ExplorerLinkType } from '_src/ui/app/components/explorer-link/ExplorerLinkType';
import { LabelValueItem } from '_src/ui/app/components/LabelValueItem';
import { LabelValuesContainer } from '_src/ui/app/components/LabelValuesContainer';
import Loading from '_src/ui/app/components/loading';
import { NFTDisplayCard } from '_src/ui/app/components/nft-display';
import { useUnlockedGuard } from '_src/ui/app/hooks/useUnlockedGuard';
import { Collapsible } from '_src/ui/app/shared/collapse';
import PageTitle from '_src/ui/app/shared/PageTitle';
import { useGetKioskContents } from 'rtd-apps-core';
import { formatAddress } from 'rtd-typescript/utils';
import { Link, useSearchParams } from 'react-router-dom';

function KioskDetailsPage() {
	const { t } = useI18n();
	const [searchParams] = useSearchParams();
	const kioskId = searchParams.get('kioskId');
	const accountAddress = useActiveAddress();
	const { data: kioskData, isPending } = useGetKioskContents(accountAddress);
	const kiosk = kioskData?.kiosks.get(kioskId!);
	const items = kiosk?.items;

	if (useUnlockedGuard()) {
		return null;
	}

	return (
		<div className="flex flex-1 flex-col flex-nowrap gap-3.75">
			<PageTitle title={t('kiosk.title')} back />
			<Loading loading={isPending}>
				{!items?.length ? (
					<div className="flex flex-1 items-center self-center text-caption font-semibold text-steel-darker">
						{t('kiosk.empty')}
					</div>
				) : (
					<>
						<div className="grid grid-cols-3 gap-3 items-center justify-center mb-auto">
							{items.map((item) => (
								<Link
									to={`/nft-details?${new URLSearchParams({
										objectId: item.data?.objectId!,
									}).toString()}`}
									key={item.data?.objectId}
									className="no-underline"
								>
									<ErrorBoundary>
										<NFTDisplayCard
											objectId={item.data?.objectId!}
											size="md"
											animateHover
											borderRadius="xl"
											isLocked={item?.isLocked}
										/>
									</ErrorBoundary>
								</Link>
							))}
						</div>
					</>
				)}
				<Collapsible defaultOpen title={t('nft.details')}>
					<LabelValuesContainer>
						<LabelValueItem label={t('kiosk.numberOfItems')} value={items?.length || '0'} />
						<LabelValueItem
							label={t('kiosk.id')}
							value={
								<ExplorerLink
									className="text-hero-dark no-underline font-mono"
									objectID={kioskId!}
									type={ExplorerLinkType.object}
								>
									{formatAddress(kioskId!)}
								</ExplorerLink>
							}
						/>
					</LabelValuesContainer>
				</Collapsible>
			</Loading>
		</div>
	);
}

export default KioskDetailsPage;
