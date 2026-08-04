// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { PasswordModalDialog, type PasswordModalDialogProps } from './PasswordInputDialog';
import { useI18n } from '_app/i18n';

type VerifyPasswordModalProps = Pick<PasswordModalDialogProps, 'open' | 'onClose'> & {
	onVerify: (password: string) => Promise<void> | void;
};

export function VerifyPasswordModal({ onClose, onVerify, open }: VerifyPasswordModalProps) {
	const { t } = useI18n();
	return (
		<PasswordModalDialog
			{...{
				onClose,
				open,
				title: t('accounts.verifyPasswordTitle'),
				description: t('accounts.verifyPasswordDescription'),
				verify: true,
				confirmText: t('accounts.verify'),
				cancelText: t('common.cancel'),
				onSubmit: onVerify,
			}}
		/>
	);
}
