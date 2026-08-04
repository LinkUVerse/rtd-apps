// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { LabelValueItem } from '_components/LabelValueItem';
import { LabelValuesContainer } from '_components/LabelValuesContainer';
import { SummaryCard } from '_components/SummaryCard';
import { UserApproveContainer } from '_components/user-approve-container';
import { useI18n } from '_app/i18n';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useBackgroundClient } from '../../hooks/useBackgroundClient';
import { Heading } from '../../shared/heading';
import { PageMainLayoutTitle } from '../../shared/page-main-layout/PageMainLayoutTitle';
import { Text } from '../../shared/text';
import { useQredoUIPendingRequest } from './hooks';
import { isUntrustedQredoConnect } from './utils';

export function QredoConnectInfoPage() {
	const { t } = useI18n();
	const { requestID } = useParams();
	const { data, isPending } = useQredoUIPendingRequest(requestID);
	const isUntrusted = !!data && isUntrustedQredoConnect(data);
	const [isUntrustedAccepted, setIsUntrustedAccepted] = useState(false);
	const navigate = useNavigate();
	const backgroundService = useBackgroundClient();
	useEffect(() => {
		if (!isPending && !data) {
			window.close();
		}
	}, [isPending, data]);
	if (isPending) {
		return null;
	}
	if (!data) {
		return null;
	}
	const showUntrustedWarning = isUntrusted && !isUntrustedAccepted;
	return (
		<>
			<PageMainLayoutTitle title={t('qredo.setupTitle')} />
			<UserApproveContainer
				approveTitle={t('common.continue')}
				rejectTitle={t('dapp.reject')}
				isWarning={showUntrustedWarning}
				origin={data.origin}
				originFavIcon={data.originFavIcon}
				onSubmit={async (approved) => {
					if (approved) {
						if (showUntrustedWarning) {
							setIsUntrustedAccepted(true);
						} else {
							navigate('./select', { state: { reviewed: true } });
						}
					} else {
						await backgroundService.rejectQredoConnection({
							qredoID: data.id,
						});
						window.close();
					}
				}}
				addressHidden
			>
				<div className="pt-4">
					<SummaryCard
						header={showUntrustedWarning ? '' : t('qredo.moreInformation')}
						body={
							showUntrustedWarning ? (
								<div className="flex flex-col gap-2.5">
									<Heading variant="heading6" weight="semibold" color="gray-90">
										{t('dapp.connectionNotSecure')}
									</Heading>
									<Text variant="pBodySmall" weight="medium" color="steel-darker">
										{t('dapp.insecureDescription')}
									</Text>
								</div>
							) : (
								<LabelValuesContainer>
									<LabelValueItem label={t('qredo.serviceName')} value={data.service} />
									<LabelValueItem label={t('qredo.workspace')} value={data.organization || '-'} />
									<LabelValueItem label={t('qredo.token')} value={data.partialToken} />
									<LabelValueItem label={t('qredo.apiUrl')} value={data.apiUrl} />
								</LabelValuesContainer>
							)
						}
					/>
				</div>
			</UserApproveContainer>
		</>
	);
}
