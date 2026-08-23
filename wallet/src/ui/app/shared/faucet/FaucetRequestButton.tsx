// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Button, type ButtonProps } from '_app/shared/ButtonUI';
import { useI18n, type MessageKey } from '_app/i18n';
import { useAppSelector } from '_hooks';
import { API_ENV } from '_src/shared/api-env';
import { FaucetRateLimitError, getFaucetHost } from 'rtd-typescript/faucet';
import { toast } from 'react-hot-toast';

import FaucetMessageInfo from './FaucetMessageInfo';
import { useFaucetMutation } from './useFaucetMutation';
import { useFaucetRateLimiter } from './useFaucetRateLimiter';

export type FaucetRequestButtonProps = {
	variant?: ButtonProps['variant'];
	size?: ButtonProps['size'];
};

export const FAUCET_HOSTS = {
	[API_ENV.local]: getFaucetHost('localnet'),
	[API_ENV.devNet]: getFaucetHost('devnet'),
	[API_ENV.testNet]: getFaucetHost('testnet'),
};

function FaucetRequestButton({
	variant = 'primary',
	size = 'narrow',
}: FaucetRequestButtonProps) {
	const { t } = useI18n();
	const network = useAppSelector(({ app }) => app.apiEnv);
	const networkName = t(`network.${network}` as MessageKey);
	const [isRateLimited, rateLimit] = useFaucetRateLimiter();

	const mutation = useFaucetMutation({
		host:
			network in FAUCET_HOSTS
				? FAUCET_HOSTS[network as keyof typeof FAUCET_HOSTS]
				: null,
		onError: (error) => {
			if (error instanceof FaucetRateLimitError) {
				rateLimit();
			}
		},
	});

	return mutation.enabled ? (
		<Button
			data-testid="faucet-request-button"
			variant={variant}
			size={size}
			disabled={isRateLimited}
			onClick={() => {
				toast.promise(mutation.mutateAsync(), {
					loading: <FaucetMessageInfo loading />,
					success: (totalReceived) => (
						<FaucetMessageInfo totalReceived={totalReceived} />
					),
					error: (error) => <FaucetMessageInfo error={error.message} />,
				});
			}}
			loading={mutation.isMutating}
			text={t('faucet.requestTokens', { network: networkName })}
		/>
	) : null;
}

export default FaucetRequestButton;
