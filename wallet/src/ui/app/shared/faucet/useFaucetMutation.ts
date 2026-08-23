// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
	getFaucetRequestStatus,
	requestRtdFromFaucetV1,
} from 'rtd-typescript/faucet';
import {
	useIsMutating,
	useMutation,
	type UseMutationOptions,
} from '@tanstack/react-query';

import { useActiveAccount } from '../../hooks/useActiveAccount';
import { useI18n } from '../../i18n';

type UseFaucetMutationOptions = Pick<UseMutationOptions, 'onError'> & {
	host: string | null;
	address?: string;
};

const MAX_FAUCET_REQUESTS_STATUS = 20;
const FAUCET_REQUEST_DELAY = 1500;

export function useFaucetMutation(options?: UseFaucetMutationOptions) {
	const { t } = useI18n();
	const activeAccount = useActiveAccount();
	const activeAddress = activeAccount?.address || null;
	const addressToTopUp = options?.address || activeAddress;
	const mutationKey = ['faucet-request-tokens', activeAddress];
	const mutation = useMutation({
		mutationKey,
		mutationFn: async () => {
			if (!addressToTopUp) {
				throw new Error(t('faucet.walletMissing'));
			}
			if (!options?.host) {
				throw new Error(t('faucet.hostMissing'));
			}

			const { error, task: taskId } = await requestRtdFromFaucetV1({
				recipient: addressToTopUp,
				host: options.host,
			});

			if (error || !taskId) {
				throw new Error(error ?? t('faucet.taskMissing'));
			}

			let currentStatus = 'INPROGRESS';
			let requestStatusCount = 0;
			while (currentStatus === 'INPROGRESS') {
				const {
					status: { status, transferred_gas_objects },
					error,
				} = await getFaucetRequestStatus({
					host: options.host,
					taskId,
				});

				currentStatus = status;

				if (
					currentStatus === 'DISCARDED' ||
					error ||
					requestStatusCount > MAX_FAUCET_REQUESTS_STATUS
				) {
					throw new Error(error ?? t('common.somethingWrong'));
				}

				if (currentStatus === 'SUCCEEDED') {
					return transferred_gas_objects?.sent.reduce(
						(total, { amount }) => total + amount,
						0,
					);
				}
				requestStatusCount += 1;
				await new Promise((resolve) =>
					setTimeout(resolve, FAUCET_REQUEST_DELAY),
				);
			}

			throw new Error(t('common.somethingWrong'));
		},
		...options,
	});
	return {
		...mutation,
		/** If the currently-configured endpoint supports faucet and the active account is unlocked */
		enabled: !!options?.host && !!activeAccount && !activeAccount.isLocked,
		/**
		 * is any faucet request in progress across different instances of the mutation
		 */
		isMutating: useIsMutating({ mutationKey }) > 0,
	};
}
