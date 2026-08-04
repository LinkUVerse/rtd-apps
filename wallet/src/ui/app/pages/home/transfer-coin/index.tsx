// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import BottomMenuLayout, { Content, Menu } from '_app/shared/bottom-menu-layout';
import { Button } from '_app/shared/ButtonUI';
import { useI18n } from '_app/i18n';
import { Text } from '_app/shared/text';
import { ActiveCoinsCard } from '_components/active-coins-card';
import Overlay from '_components/overlay';
import { ampli } from '_src/shared/analytics/ampli';
import { getSignerOperationErrorMessage } from '_src/ui/app/helpers/errorMessages';
import { useActiveAccount } from '_src/ui/app/hooks/useActiveAccount';
import { fetchAllCoins, getAllCoinsQueryKey } from '_src/ui/app/hooks/useGetAllCoins';
import { useQredoTransaction } from '_src/ui/app/hooks/useQredoTransaction';
import { useSigner } from '_src/ui/app/hooks/useSigner';
import { useUnlockedGuard } from '_src/ui/app/hooks/useUnlockedGuard';
import { QredoActionIgnoredByUser } from '_src/ui/app/QredoSigner';
import { useCoinMetadata } from 'rtd-apps-core';
import { useRtdClient } from 'rtd-dapp-kit';
import { ArrowLeft16, ArrowRight16 } from 'rtd-apps-icons';
import * as Sentry from '@sentry/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import { PreviewTransfer } from './PreviewTransfer';
import { SendTokenForm } from './SendTokenForm';
import type { SubmitProps } from './SendTokenForm';
import { createTokenTransferTransaction } from './utils/transaction';

const TRANSFER_DEBUG_PREFIX = '[RTD Wallet Transfer Debug]';

function isObjectVersionUnavailableError(error: unknown) {
	const message = getSignerOperationErrorMessage(error);
	return (
		message.includes('ObjectVersionUnavailableForConsumption') ||
		message.includes('is not available for consumption, current version')
	);
}

function logTransferDebug(label: string, details: unknown) {
	console.info(`${TRANSFER_DEBUG_PREFIX} ${label}`, details);
}

function TransferCoinPage() {
	const { t } = useI18n();
	const [searchParams] = useSearchParams();
	const coinType = searchParams.get('type');
	const [showTransactionPreview, setShowTransactionPreview] = useState<boolean>(false);
	const [formData, setFormData] = useState<SubmitProps>();
	const navigate = useNavigate();
	const { data: coinMetadata } = useCoinMetadata(coinType);
	const activeAccount = useActiveAccount();
	const signer = useSigner(activeAccount);
	const address = activeAccount?.address;
	const queryClient = useQueryClient();
	const { clientIdentifier, notificationModal } = useQredoTransaction();
	const client = useRtdClient();

	const resetCoinQueries = () => {
		queryClient.removeQueries({ queryKey: ['get-coins'] });
		queryClient.removeQueries({ queryKey: ['get-all-coins'] });
		queryClient.invalidateQueries({ queryKey: ['getAllBalances'] });
		queryClient.invalidateQueries({ queryKey: ['coin-balance'] });
	};

	const transaction = useMemo(() => {
		if (!coinType || !signer || !formData || !address) return null;

		return createTokenTransferTransaction({
			coinType,
			coinDecimals: coinMetadata?.decimals ?? 0,
			...formData,
		});
	}, [formData, signer, coinType, address, coinMetadata?.decimals]);

	const executeTransfer = useMutation({
		mutationFn: async () => {
			if (!transaction || !signer || !formData || !coinType || !address) {
				throw new Error('Missing data');
			}

			return await Sentry.startSpan(
				{
					name: 'send-tokens',
				},
				async (span) => {
					const executeWithFreshCoins = async () => {
						const latestCoins = await fetchAllCoins(client, coinType, address);
						logTransferDebug('fresh coins fetched before signing', {
							address,
							coinType,
							coinCount: latestCoins.length,
							coins: latestCoins.map((coin) => ({
								coinObjectId: coin.coinObjectId,
								version: coin.version,
								digest: coin.digest,
								balance: coin.balance,
								coinType: coin.coinType,
							})),
						});
						queryClient.setQueryData(getAllCoinsQueryKey(coinType, address), latestCoins);
						const freshTransaction = createTokenTransferTransaction({
							coinType,
							coinDecimals: coinMetadata?.decimals ?? 0,
							...formData,
							coins: latestCoins,
						});
						logTransferDebug('transaction data before sdk build', freshTransaction.getData());
						return signer.signAndExecuteTransactionBlock(
							{
								transactionBlock: freshTransaction,
								options: {
									showInput: true,
								},
							},
							clientIdentifier,
						);
					};

					try {
						return await executeWithFreshCoins();
					} catch (error) {
						logTransferDebug('transfer failed', {
							errorMessage: getSignerOperationErrorMessage(error),
							error,
						});
						if (isObjectVersionUnavailableError(error)) {
							resetCoinQueries();
							logTransferDebug('retrying after clearing coin queries', {
								address,
								coinType,
							});
							return await executeWithFreshCoins();
						}
						if (!(error instanceof QredoActionIgnoredByUser)) {
							span.setAttributes({ failure: true });
						}
						throw error;
					}
				},
			);
		},
		onSuccess: (response) => {
			resetCoinQueries();

			ampli.sentCoins({
				coinType: coinType!,
			});

			const receiptUrl = `/receipt?txdigest=${encodeURIComponent(
				response.digest,
			)}&from=transactions`;
			return navigate(receiptUrl);
		},
		onError: (error) => {
			if (error instanceof QredoActionIgnoredByUser) {
				navigate('/');
			} else {
				resetCoinQueries();
				toast.error(
					<div className="max-w-xs overflow-hidden flex flex-col">
						<small className="text-ellipsis overflow-hidden">
							{getSignerOperationErrorMessage(error)}
						</small>
					</div>,
				);
			}
		},
	});

	if (useUnlockedGuard()) {
		return null;
	}

	if (!coinType) {
		return <Navigate to="/" replace={true} />;
	}

	return (
		<Overlay
			showModal={true}
			title={showTransactionPreview ? t('transfer.reviewAndSend') : t('transfer.sendCoins')}
			closeOverlay={() => navigate('/')}
		>
			<div className="flex flex-col w-full h-full">
				{showTransactionPreview && formData ? (
					<BottomMenuLayout>
						<Content>
							<PreviewTransfer
								coinType={coinType}
								amount={formData.amount}
								to={formData.to}
								approximation={formData.isPayAllRtd}
								gasBudget={formData.gasBudgetEst}
							/>
						</Content>
						<Menu stuckClass="sendCoin-cta" className="w-full px-0 pb-0 mx-0 gap-2.5">
							<Button
								type="button"
								variant="secondary"
								onClick={() => setShowTransactionPreview(false)}
								text={t('common.back')}
								before={<ArrowLeft16 />}
							/>

							<Button
								type="button"
								variant="primary"
								onClick={() => executeTransfer.mutateAsync()}
								text={t('transfer.sendNow')}
								disabled={coinType === null}
								after={<ArrowRight16 />}
								loading={executeTransfer.isPending}
							/>
						</Menu>
					</BottomMenuLayout>
				) : (
					<>
						<div className="mb-7 flex flex-col gap-2.5">
							<div className="pl-1.5">
								<Text variant="caption" color="steel" weight="semibold">
									{t('transfer.selectAllCoins')}
								</Text>
							</div>
							<ActiveCoinsCard activeCoinType={coinType} />
						</div>

						<SendTokenForm
							onSubmit={(formData) => {
								setShowTransactionPreview(true);
								setFormData(formData);
							}}
							coinType={coinType}
							initialAmount={formData?.amount || ''}
							initialTo={formData?.to || ''}
						/>
					</>
				)}
			</div>
			{notificationModal}
		</Overlay>
	);
}

export default TransferCoinPage;
