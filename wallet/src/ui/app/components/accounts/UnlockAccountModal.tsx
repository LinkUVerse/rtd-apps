// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { type SerializedUIAccount } from '_src/background/accounts/Account';
import { useI18n } from '_app/i18n';
import { toast } from 'react-hot-toast';

import { useBackgroundClient } from '../../hooks/useBackgroundClient';
import { PasswordModalDialog } from './PasswordInputDialog';

type UnlockAccountModalProps = {
	onClose: () => void;
	onSuccess: () => void;
	account: SerializedUIAccount | null;
	open: boolean;
};

export function UnlockAccountModal({ onClose, onSuccess, account, open }: UnlockAccountModalProps) {
	const { t } = useI18n();
	const backgroundService = useBackgroundClient();
	if (!account) return null;
	return (
		<PasswordModalDialog
			{...{
				open,
				onClose,
				title: t('accounts.unlockTitle'),
				description: t('accounts.unlockDescription'),
				confirmText: t('accounts.unlock'),
				cancelText: t('common.cancel'),
				showForgotPassword: true,
				onSubmit: async (password: string) => {
					await backgroundService.unlockAccountSourceOrAccount({
						password,
						id: account.id,
					});
					toast.success(t('accounts.unlocked'));
					onSuccess();
				},
				// this is not necessary for unlocking but will show the wrong password error as a form error
				// so doing it like this to keep it simple. The extra verification shouldn't be a problem
				verify: true,
			}}
		/>
	);
}
