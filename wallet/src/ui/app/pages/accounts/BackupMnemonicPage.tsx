// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Button } from '_app/shared/ButtonUI';
import { useI18n } from '_app/i18n';
import { CardLayout } from '_app/shared/card-layout';
import { Text } from '_app/shared/text';
import Alert from '_components/alert';
import Loading from '_components/loading';
import { HideShowDisplayBox } from '_src/ui/app/components/HideShowDisplayBox';
import { ArrowLeft16, Check12 } from 'rtd-apps-icons';
import { useEffect, useMemo, useState } from 'react';
import {
	Navigate,
	useLocation,
	useNavigate,
	useParams,
} from 'react-router-dom';

import { VerifyPasswordModal } from '../../components/accounts/VerifyPasswordModal';
import { useAccountSources } from '../../hooks/useAccountSources';
import { useExportPassphraseMutation } from '../../hooks/useExportPassphraseMutation';

export function BackupMnemonicPage() {
	const { t } = useI18n();
	const [passwordCopied, setPasswordCopied] = useState(false);
	const { state } = useLocation();
	const { accountSourceID } = useParams();
	const { data: accountSources, isPending } = useAccountSources();
	const selectedSource = useMemo(
		() => accountSources?.find(({ id }) => accountSourceID === id),
		[accountSources, accountSourceID],
	);
	const isOnboardingFlow = !!state?.onboarding;
	const [showPasswordDialog, setShowPasswordDialog] = useState(false);
	const [passwordConfirmed, setPasswordConfirmed] = useState(false);
	const requirePassword = !isOnboardingFlow || !!selectedSource?.isLocked;
	const passphraseMutation = useExportPassphraseMutation();
	useEffect(() => {
		(async () => {
			if (
				(requirePassword && !passwordConfirmed) ||
				!passphraseMutation.isIdle ||
				!accountSourceID
			) {
				return;
			}
			passphraseMutation.mutate({ accountSourceID: accountSourceID });
		})();
	}, [requirePassword, passwordConfirmed, accountSourceID, passphraseMutation]);
	useEffect(() => {
		if (requirePassword && !passwordConfirmed && !showPasswordDialog) {
			setShowPasswordDialog(true);
		}
	}, [requirePassword, passwordConfirmed, showPasswordDialog]);
	const navigate = useNavigate();
	if (!isPending && selectedSource?.type !== 'mnemonic') {
		return <Navigate to="/" replace />;
	}
	return (
		<Loading loading={isPending}>
			{showPasswordDialog ? (
				<CardLayout>
					<VerifyPasswordModal
						open
						onClose={() => {
							navigate(-1);
						}}
						onVerify={async (password) => {
							await passphraseMutation.mutateAsync({
								password,
								accountSourceID: selectedSource!.id,
							});
							setPasswordConfirmed(true);
							setShowPasswordDialog(false);
						}}
					/>
				</CardLayout>
			) : (
				<CardLayout
					icon={isOnboardingFlow ? 'success' : undefined}
					title={
						isOnboardingFlow
							? t('accounts.walletCreated')
							: t('accounts.backupRecovery')
					}
				>
					<div className="flex flex-col flex-nowrap flex-grow h-full w-full">
						<div className="flex flex-col flex-nowrap flex-grow mb-5">
							<div className="mb-1 mt-7.5 text-center">
								<Text variant="caption" color="steel-darker" weight="bold">
									{t('accounts.recoveryPhrase')}
								</Text>
							</div>
							<div className="mb-3.5 mt-2 text-center">
								<Text variant="pBodySmall" color="steel-dark" weight="normal">
									{t('accounts.recoveryDescription')}
								</Text>
							</div>
							<Loading loading={passphraseMutation.isPending}>
								{passphraseMutation.data ? (
									<HideShowDisplayBox
										value={passphraseMutation.data}
										hideCopy
									/>
								) : (
									<Alert>
										{(passphraseMutation.error as Error)?.message ||
											t('common.somethingWrong')}
									</Alert>
								)}
							</Loading>
							<div className="mt-3.75 mb-1 text-center">
								<Text variant="caption" color="steel-dark" weight="semibold">
									{t('accounts.warning')}
								</Text>
							</div>
							<div className="mb-1 text-center">
								<Text variant="pBodySmall" color="steel-dark" weight="normal">
									{t('accounts.recoveryWarning')}
								</Text>
							</div>
							<div className="flex-1" />
							{isOnboardingFlow ? (
								<div className="mt-5 flex w-full text-left">
									<label className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 text-rtd-dark">
										<input
											type="checkbox"
											name="agree"
											id="agree"
											className="peer/agree sr-only"
											onChange={() => setPasswordCopied(!passwordCopied)}
										/>
										<span className="theme-input flex h-5 w-5 shrink-0 items-center justify-center rounded border border-gray-50 peer-checked/agree:border-success peer-checked/agree:bg-success">
											<Check12 className="text-white text-body font-semibold" />
										</span>

										<span className="min-w-0 flex-1 leading-5">
											<Text
												variant="bodySmall"
												color="steel-dark"
												weight="normal"
											>
												{t('accounts.recoverySaved')}
											</Text>
										</span>
									</label>
								</div>
							) : null}
						</div>
						<Button
							type="button"
							size="tall"
							variant="primary"
							disabled={!passwordCopied && isOnboardingFlow}
							to="/"
							text={t('accounts.openWallet')}
							after={
								<ArrowLeft16 className="text-pBodySmall font-normal rotate-135" />
							}
						/>
					</div>
				</CardLayout>
			)}
		</Loading>
	);
}
