// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Button } from '_app/shared/ButtonUI';
import { useI18n } from '_app/i18n';
import { Heading } from '_app/shared/heading';
import { Text } from '_app/shared/text';
import Loading from '_components/loading';
import Logo from '_components/logo';
import { useFullscreenGuard, useInitializedGuard } from '_hooks';
import WelcomeSplash from '_src/ui/assets/images/WelcomeSplash.svg';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import { useAccountsFormContext } from '../../components/accounts/AccountsFormContext';
import { ZkLoginButtons } from '../../components/accounts/ZkLoginButtons';
import { useCreateAccountsMutation } from '../../hooks/useCreateAccountMutation';

export function WelcomePage() {
	const { t } = useI18n();
	const createAccountsMutation = useCreateAccountsMutation();
	const isFullscreenGuardLoading = useFullscreenGuard(true);
	const isInitializedLoading = useInitializedGuard(
		false,
		!(createAccountsMutation.isPending || createAccountsMutation.isSuccess),
	);
	const [, setAccountsFormValues] = useAccountsFormContext();
	const navigate = useNavigate();
	return (
		<Loading loading={isInitializedLoading || isFullscreenGuardLoading}>
			<div className="onboarding-surface flex h-full flex-col items-center overflow-auto rounded-[10px] px-7 py-6 shadow-wallet-content">
				<div className="shrink-0">
					<Logo variant="welcome" />
				</div>
				<div className="text-center mx-auto mt-2">
					<Heading variant="heading2" color="gray-90" as="h1" weight="bold">
						{t('accounts.welcomeTitle')}
					</Heading>
					<div className="mt-2">
						<Text variant="pBody" color="steel-dark" weight="medium">
							{t('accounts.welcomeDescription')}
						</Text>
					</div>
				</div>
				<div className="w-full h-full mt-3.5 flex justify-center items-center">
					<WelcomeSplash role="img" />
				</div>
				<div className="flex flex-col gap-3 mt-3.5 w-full items-center">
					<Text variant="pBody" color="steel-dark" weight="medium">
						{t('accounts.signInPreferred')}
					</Text>
					<ZkLoginButtons
						layout="row"
						buttonsDisabled={createAccountsMutation.isSuccess}
						sourceFlow="Onboarding"
						onButtonClick={async (provider) => {
							setAccountsFormValues({ type: 'zkLogin', provider });
							await createAccountsMutation.mutateAsync(
								{
									type: 'zkLogin',
								},
								{
									onSuccess: () => {
										navigate('/tokens');
									},
									onError: (error) => {
										toast.error(
											(error as Error)?.message || t('accounts.createFailed'),
										);
									},
								},
							);
						}}
					/>
					<Button
						to="/accounts/add-account?sourceFlow=Onboarding"
						size="tall"
						variant="secondary"
						text={t('accounts.moreOptions')}
						disabled={
							createAccountsMutation.isPending ||
							createAccountsMutation.isSuccess
						}
					/>
				</div>
			</div>
		</Loading>
	);
}
