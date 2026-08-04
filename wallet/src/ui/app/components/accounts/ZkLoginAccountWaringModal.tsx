// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
	zkLoginProviderDataMap,
	type ZkLoginProvider,
} from '_src/background/accounts/zklogin/providers';
import { isZkLoginAccountSerializedUI } from '_src/background/accounts/zklogin/ZkLoginAccount';
import { type MethodPayload } from '_src/shared/messaging/messages/payloads/MethodPayload';
import { useI18n } from '_src/ui/app/i18n';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '_src/ui/app/shared/Dialog';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { useActiveAccount } from '../../hooks/useActiveAccount';
import { useBackgroundClient } from '../../hooks/useBackgroundClient';
import { Button } from '../../shared/ButtonUI';
import { Link } from '../../shared/Link';

const providerToName: Record<ZkLoginProvider, string> = {
	google: 'Google',
	facebook: 'Facebook',
	twitch: 'Twitch',
	kakao: 'kakao',
};

export function ZkLoginAccountWarningModal() {
	const { t } = useI18n();
	const activeAccount = useActiveAccount();
	const backgroundClient = useBackgroundClient();
	const warningMutation = useMutation({
		mutationKey: ['acknowledge-zk-login-warning'],
		mutationFn: (args: MethodPayload<'acknowledgeZkLoginWarning'>['args']) =>
			backgroundClient.acknowledgeZkLoginWarning(args),
	});
	if (
		activeAccount &&
		isZkLoginAccountSerializedUI(activeAccount) &&
		!activeAccount.warningAcknowledged
	) {
		const providerData = zkLoginProviderDataMap[activeAccount.provider];
		return (
			<Dialog open>
				<DialogContent onPointerDownOutside={(e) => e.preventDefault()} background="avocado">
					<DialogHeader>
						<DialogTitle className="text-hero-darkest">
							<div>{t('accounts.zkTurnOn2fa')}</div>
							<div>{t('accounts.zkProtectAssets')}</div>
						</DialogTitle>
					</DialogHeader>
					<DialogDescription className="text-center text-steel-darker">
						{t('accounts.zkWarning', { provider: providerToName[activeAccount.provider] })}
						{providerData.mfaLink ? (
							<>
								{' '}
								<span className="inline-block">
									<Link
										color="heroDark"
										href={providerData.mfaLink}
										text={t('accounts.zkVisitLink')}
									/>
								</span>{' '}
								{t('accounts.zkSetupSuffix')}
							</>
						) : null}
					</DialogDescription>
					<DialogFooter>
						<Button
							text={t('accounts.understand')}
							loading={warningMutation.isPending}
							onClick={() =>
								warningMutation.mutate(
									{ accountID: activeAccount.id },
									{
										onError: (e) => {
											toast.error((e as Error)?.message || t('common.somethingWrong'));
										},
									},
								)
							}
						/>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	}
	return null;
}
