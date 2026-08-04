// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { type SignMessageApprovalRequest } from '_payloads/transactions/ApprovalRequest';
import { toUtf8OrB64 } from '_src/shared/utils';
import { useI18n } from '_src/ui/app/i18n';
import { useMemo } from 'react';

import { UserApproveContainer } from '../../components/user-approve-container';
import { useAppDispatch } from '../../hooks';
import { useAccountByAddress } from '../../hooks/useAccountByAddress';
import { useQredoTransaction } from '../../hooks/useQredoTransaction';
import { useSigner } from '../../hooks/useSigner';
import { respondToTransactionRequest } from '../../redux/slices/transaction-requests';
import { Heading } from '../../shared/heading';
import { PageMainLayoutTitle } from '../../shared/page-main-layout/PageMainLayoutTitle';
import { Text } from '../../shared/text';

export type SignMessageRequestProps = {
	request: SignMessageApprovalRequest;
};

export function SignMessageRequest({ request }: SignMessageRequestProps) {
	const { t } = useI18n();
	const { message, type } = useMemo(() => toUtf8OrB64(request.tx.message), [request.tx.message]);
	const { data: account } = useAccountByAddress(request.tx.accountAddress);
	const signer = useSigner(account);
	const dispatch = useAppDispatch();
	const { clientIdentifier, notificationModal } = useQredoTransaction(true);

	return (
		<UserApproveContainer
			origin={request.origin}
			originFavIcon={request.originFavIcon}
			approveTitle={t('approval.sign')}
			rejectTitle={t('dapp.reject')}
			approveDisabled={!signer}
			onSubmit={async (approved) => {
				if (!signer) {
					return;
				}
				await dispatch(
					respondToTransactionRequest({
						txRequestID: request.id,
						approved,
						signer,
						clientIdentifier,
					}),
				);
			}}
			address={request.tx.accountAddress}
			scrollable
			blended
			checkAccountLock
		>
			<PageMainLayoutTitle title={t('approval.signMessage')} />
			<div className="py-4">
				<Heading variant="heading6" color="gray-90" weight="semibold" centered>
					{t('approval.messageSigning')}
				</Heading>
			</div>
			<div className="theme-card flex flex-col flex-nowrap items-stretch overflow-x-hidden overflow-y-auto rounded-15 border border-solid border-gray-50 shadow-card-soft">
				<div className="p-5 break-words">
					<Text variant="pBodySmall" weight="medium" color="steel-darker" mono={type === 'base64'}>
						{message}
					</Text>
				</div>
			</div>
			{notificationModal}
		</UserApproveContainer>
	);
}
