// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Text } from '_app/shared/text';
import { useI18n } from '_app/i18n';
import { entropyToSerialized, mnemonicToEntropy } from '_src/shared/utils/bip39';
import { useNavigate } from 'react-router-dom';

import { useAccountsFormContext } from '../../components/accounts/AccountsFormContext';
import { ImportRecoveryPhraseForm } from '../../components/accounts/ImportRecoveryPhraseForm';
import { Heading } from '../../shared/heading';

export function ImportPassphrasePage() {
	const { t } = useI18n();
	const navigate = useNavigate();
	const [, setFormValues] = useAccountsFormContext();
	return (
		<div className="onboarding-surface rounded-20 flex h-full flex-col items-center overflow-auto px-6 py-10 shadow-wallet-content">
			<Text variant="caption" color="steel-dark" weight="semibold">
				{t('accounts.walletSetup')}
			</Text>
			<div className="text-center mt-2.5">
				<Heading variant="heading1" color="gray-90" as="h1" weight="bold">
					{t('accounts.addExisting')}
				</Heading>
			</div>
			<div className="mt-6 grow flex flex-col gap-3">
				<div className="pl-2.5">
					<Text variant="pBody" color="steel-darker" weight="semibold">
						{t('accounts.enterRecoveryPhrase')}
					</Text>
				</div>
				<ImportRecoveryPhraseForm
					cancelButtonText={t('common.cancel')}
					submitButtonText={t('accounts.addAccount')}
					onSubmit={({ recoveryPhrase }) => {
						setFormValues({
							type: 'import-mnemonic',
							entropy: entropyToSerialized(mnemonicToEntropy(recoveryPhrase.join(' '))),
						});
						navigate('/accounts/protect-account?accountType=import-mnemonic');
					}}
				/>
			</div>
		</div>
	);
}
