// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useRef } from 'react';
import { useWalletRpc } from 'rtd-apps-core/src/rpc/WalletRpcContext';
import { requestRtdFromFaucetV2 } from 'rtd-typescript/faucet';
import { sumFaucetCoins } from './sumFaucetCoins';
import {
	useIsMutating,
	useMutation,
	type UseMutationOptions,
} from '@tanstack/react-query';

import { useActiveAccount } from '../../hooks/useActiveAccount';
import { useI18n } from '../../i18n';

type UseFaucetMutationOptions = Pick<UseMutationOptions, 'onError'> & {
	address?: string;
};

export function useFaucetMutation(options?: UseFaucetMutationOptions) {
	const { t } = useI18n();
	const rpc = useWalletRpc();
	const activeAccount = useActiveAccount();
	const activeAddress = activeAccount?.address || null;
	const addressToTopUp = options?.address || activeAddress;
	const mutationKey = ['faucet-request-tokens', rpc.bindingKey, rpc.faucetUrl, addressToTopUp];
	const scope = JSON.stringify([rpc.bindingKey, rpc.readSessionKey, rpc.faucetUrl, activeAccount?.id, addressToTopUp, activeAccount?.isLocked]);
	const current = useRef<string | null>(scope);
	current.current = scope;
	useEffect(() => {
		current.current = scope;
		return () => { current.current = null; };
	}, [scope]);
	const mutation = useMutation({
		mutationKey,
		mutationFn: async () => {
			if (!addressToTopUp) {
				throw new Error(t('faucet.walletMissing'));
			}
			if (!rpc.faucetUrl || !rpc.hasFullnodeSession) {
				throw new Error(t('faucet.hostMissing'));
			}

			if (!activeAccount || activeAccount.isLocked || current.current !== scope) {
				throw new Error(t('faucet.walletMissing'));
			}
			const access = await rpc.probeEntryAccess();
			if (access.state !== 'accessible' || current.current !== scope) {
				throw new Error(t('faucet.networkChanged'));
			}
			const response = await requestRtdFromFaucetV2({
				recipient: addressToTopUp,
				host: rpc.faucetUrl,
			});
			return sumFaucetCoins(response.coins_sent);
		},
		onError: options?.onError,
		retry: false,
	});
	return {
		...mutation,
		/** If the currently-configured endpoint supports faucet and the active account is unlocked */
		enabled: !!rpc.faucetUrl && rpc.hasFullnodeSession && !!activeAccount && !activeAccount.isLocked,
		/**
		 * is any faucet request in progress across different instances of the mutation
		 */
		isMutating: useIsMutating({ mutationKey }) > 0,
	};
}
