// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// import { Transaction } from 'rtd-typescript';
import { UserApproveContainer } from '_components/user-approve-container';
import { useAppDispatch, useTransactionData, useTransactionDryRun } from '_hooks';
import { type TransactionApprovalRequest } from '_payloads/transactions/ApprovalRequest';
import { respondToTransactionRequest } from '_redux/slices/transaction-requests';
import { ampli } from '_src/shared/analytics/ampli';
import { useAccountByAddress } from '_src/ui/app/hooks/useAccountByAddress';
import { useQredoTransaction } from '_src/ui/app/hooks/useQredoTransaction';
import { useRecognizedPackages } from '_src/ui/app/hooks/useRecognizedPackages';
import { useSigner } from '_src/ui/app/hooks/useSigner';
import { useI18n } from '_src/ui/app/i18n';
import { PageMainLayoutTitle } from '_src/ui/app/shared/page-main-layout/PageMainLayoutTitle';
import { TransactionSummary } from '_src/ui/app/shared/transaction-summary';
import { useTransactionSummary } from 'rtd-apps-core';
import { Transaction } from 'rtd-typescript/transactions';
import { useMemo, useState } from 'react';

import { ConfirmationModal } from '../../../shared/ConfirmationModal';
import { GasFees } from './GasFees';
import { TransactionDetails } from './TransactionDetails';

export type TransactionRequestProps = {
	txRequest: TransactionApprovalRequest;
};

// Some applications require *a lot* of transactions to interact with, and this
// eats up our analytics event quota. As a short-term solution so we don't have
// to stop tracking this event entirely, we'll just manually exclude application
// origins with this list
const appOriginsToExcludeFromAnalytics = ['https://rtd8192.ethoswallet.xyz'];

export function TransactionRequest({ txRequest }: TransactionRequestProps) {
	const { t } = useI18n();
	const addressForTransaction = txRequest.tx.account;
	const { data: accountForTransaction } = useAccountByAddress(addressForTransaction);
	const signer = useSigner(accountForTransaction);
	const dispatch = useAppDispatch();
	const transaction = useMemo(() => {
		const tx = Transaction.from(txRequest.tx.data);
		if (addressForTransaction) {
			tx.setSenderIfNotSet(addressForTransaction);
		}
		return tx;
	}, [txRequest.tx.data, addressForTransaction]);
	const { isPending, isError } = useTransactionData(addressForTransaction, transaction);
	const [isConfirmationVisible, setConfirmationVisible] = useState(false);

	const {
		data,
		isError: isDryRunError,
		isPending: isDryRunLoading,
	} = useTransactionDryRun(addressForTransaction, transaction);
	const recognizedPackagesList = useRecognizedPackages();

	const summary = useTransactionSummary({
		transaction: data,
		currentAddress: addressForTransaction,
		recognizedPackagesList,
	});
	const { clientIdentifier, notificationModal } = useQredoTransaction(true);
	if (!signer) {
		return null;
	}
	return (
		<>
			<UserApproveContainer
				origin={txRequest.origin}
				originFavIcon={txRequest.originFavIcon}
				approveTitle={t('approval.approve')}
				rejectTitle={t('dapp.reject')}
				onSubmit={async (approved: boolean) => {
					if (isPending) return;
					if (approved && isError) {
						setConfirmationVisible(true);
						return;
					}
					await dispatch(
						respondToTransactionRequest({
							approved,
							txRequestID: txRequest.id,
							signer,
							clientIdentifier,
						}),
					);
					if (!appOriginsToExcludeFromAnalytics.includes(txRequest.origin)) {
						ampli.respondedToTransactionRequest({
							applicationUrl: txRequest.origin,
							approvedTransaction: approved,
							receivedFailureWarning: false,
							type: txRequest.tx.justSign ? 'sign' : 'sign-and-execute',
						});
					}
				}}
				address={addressForTransaction}
				approveLoading={isPending || isConfirmationVisible}
				checkAccountLock
			>
				<PageMainLayoutTitle title={t('approval.approveTransaction')} />
				<div className="flex flex-col">
					<div className="flex flex-col gap-4">
						<TransactionSummary
							isDryRun
							isLoading={isDryRunLoading}
							isError={isDryRunError}
							showGasSummary={false}
							summary={summary}
						/>
					</div>
					<section className="theme-card -mx-6">
						<div className="flex flex-col gap-4 p-6">
							<GasFees sender={addressForTransaction} transaction={transaction} />
							<TransactionDetails sender={addressForTransaction} transaction={transaction} />
						</div>
					</section>
				</div>
			</UserApproveContainer>
			<ConfirmationModal
				isOpen={isConfirmationVisible}
				title={t('approval.mightFail')}
				hint={t('approval.gasStillCharged')}
				confirmStyle="primary"
				confirmText={t('approval.approve')}
				cancelText={t('dapp.reject')}
				cancelStyle="warning"
				onResponse={async (isConfirmed) => {
					await dispatch(
						respondToTransactionRequest({
							approved: isConfirmed,
							txRequestID: txRequest.id,
							signer,
							clientIdentifier,
						}),
					);
					ampli.respondedToTransactionRequest({
						applicationUrl: txRequest.origin,
						approvedTransaction: isConfirmed,
						receivedFailureWarning: true,
						type: txRequest.tx.justSign ? 'sign' : 'sign-and-execute',
					});
					setConfirmationVisible(false);
				}}
			/>
			{notificationModal}
		</>
	);
}
