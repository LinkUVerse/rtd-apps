// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Button } from '_app/shared/ButtonUI';
import { useI18n } from '_app/i18n';
import { useNextMenuUrl } from '_components/menu/hooks';
import { ampli } from '_src/shared/analytics/ampli';
import { persister } from '_src/ui/app/helpers/queryClient';
import { useBackgroundClient } from '_src/ui/app/hooks/useBackgroundClient';
import { ConfirmationModal } from '_src/ui/app/shared/ConfirmationModal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { MenuLayout } from './MenuLayout';

export function MoreOptions() {
	const { t } = useI18n();
	const mainMenuUrl = useNextMenuUrl(true, '/');
	const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
	const backgroundClient = useBackgroundClient();
	const queryClient = useQueryClient();
	const logoutMutation = useMutation({
		mutationKey: ['logout', 'clear wallet'],
		mutationFn: async () => {
			ampli.client.reset();
			queryClient.cancelQueries();
			queryClient.clear();
			await persister.removeClient();
			await backgroundClient.clearWallet();
		},
	});
	return (
		<MenuLayout title={t('moreOptions.title')} back={mainMenuUrl}>
			<Button
				variant="warning"
				text={t('moreOptions.logout')}
				size="narrow"
				loading={logoutMutation.isPending}
				disabled={isLogoutDialogOpen}
				onClick={() => setIsLogoutDialogOpen(true)}
			/>
			<ConfirmationModal
				isOpen={isLogoutDialogOpen}
				confirmText={t('moreOptions.logout')}
				confirmStyle="outlineWarning"
				title={t('moreOptions.logoutTitle')}
				hint={t('moreOptions.logoutHint')}
				onResponse={async (confirmed) => {
					setIsLogoutDialogOpen(false);
					if (confirmed) {
						await logoutMutation.mutateAsync(undefined, {
							onSuccess: () => {
								window.location.reload();
							},
						});
					}
				}}
			/>
		</MenuLayout>
	);
}
