// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Text } from '_app/shared/text';
import { useI18n } from '_app/i18n';
import { useNavigate } from 'react-router-dom';

import { useAccountsFormContext } from '../../components/accounts/AccountsFormContext';
import { ImportPrivateKeyForm } from '../../components/accounts/ImportPrivateKeyForm';
import { Heading } from '../../shared/heading';

export function ImportPrivateKeyPage() {
	const { t } = useI18n();
	const navigate = useNavigate();
	const [, setAccountsFormValues] = useAccountsFormContext();

	return (
		<div className="onboarding-surface rounded-20 flex h-full w-full flex-col items-center px-6 py-10 shadow-wallet-content">
			<Text variant="caption" color="steel-dark" weight="semibold">
				{t('accounts.walletSetup')}
			</Text>
			<div className="text-center mt-2.5">
				<Heading variant="heading1" color="gray-90" as="h1" weight="bold">
					{t('accounts.importPrivateKey')}
				</Heading>
			</div>
			<div className="mt-6 w-full grow">
				<ImportPrivateKeyForm
					onSubmit={({ privateKey }) => {
						setAccountsFormValues({
							type: 'imported',
							keyPair: privateKey,
						});
						navigate('/accounts/protect-account?accountType=imported');
					}}
				/>
			</div>
		</div>
	);
}
