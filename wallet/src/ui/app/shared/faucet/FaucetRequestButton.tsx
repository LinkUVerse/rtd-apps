// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Button, type ButtonProps } from '_app/shared/ButtonUI';
import { useI18n, type MessageKey } from '_app/i18n';
import { useAppSelector } from '_hooks';
import { FaucetRateLimitError } from 'rtd-typescript/faucet';
import { toast } from 'react-hot-toast';

import FaucetMessageInfo from './FaucetMessageInfo';
import { useFaucetMutation } from './useFaucetMutation';
import { useFaucetRateLimiter } from './useFaucetRateLimiter';

export type FaucetRequestButtonProps = {
	variant?: ButtonProps['variant'];
	size?: ButtonProps['size'];
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
