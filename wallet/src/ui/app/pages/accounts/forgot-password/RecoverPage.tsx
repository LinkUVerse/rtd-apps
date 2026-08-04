// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { entropyToSerialized, mnemonicToEntropy } from '_src/shared/utils/bip39';
import { ImportRecoveryPhraseForm } from '_src/ui/app/components/accounts/ImportRecoveryPhraseForm';
import { useRecoveryDataMutation } from '_src/ui/app/hooks/useRecoveryDataMutation';
import { useI18n } from '_src/ui/app/i18n';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import { useAccountSources } from '../../../hooks/useAccountSources';
import { Heading } from '../../../shared/heading';
import { Text } from '../../../shared/text';

export function RecoverPage() {
	const { t } = useI18n();
	const allAccountSources = useAccountSources();
	const navigate = useNavigate();
	const mnemonicAccountSource = allAccountSources.data?.find(({ type }) => type === 'mnemonic');
	useEffect(() => {
		if (!allAccountSources.isPending && !mnemonicAccountSource) {
			navigate('/', { replace: true });
		}
	}, [allAccountSources.isPending, mnemonicAccountSource, navigate]);
	const recoveryDataMutation = useRecoveryDataMutation();
	if (!mnemonicAccountSource) {
		return null;
	}
	return (
		<div className="flex flex-col items-center flex-1 gap-6">
			<div className="flex flex-col items-center gap-2">
				<Heading variant="heading1" color="gray-90" as="h1" weight="bold">
					{t('accounts.forgotTitle')}
				</Heading>
				<Text variant="pBody" color="gray-90">
					{t('accounts.enterRecovery')}
				</Text>
			</div>
			<div className="grow">
				<ImportRecoveryPhraseForm
					cancelButtonText={t('common.cancel')}
					submitButtonText={t('common.next')}
					onSubmit={async ({ recoveryPhrase }) => {
						try {
							await recoveryDataMutation.mutateAsync({
								type: 'mnemonic',
								accountSourceID: mnemonicAccountSource.id,
								entropy: entropyToSerialized(mnemonicToEntropy(recoveryPhrase.join(' '))),
							});
							navigate('../warning');
						} catch (e) {
							toast.error((e as Error)?.message || t('common.somethingWrong'));
						}
					}}
				/>
			</div>
		</div>
	);
}
