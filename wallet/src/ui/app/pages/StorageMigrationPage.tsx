// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useMutation } from '@tanstack/react-query';
import { useI18n } from '_app/i18n';
import { toast } from 'react-hot-toast';

import LoadingIndicator from '../components/loading/LoadingIndicator';
import { PasswordInputDialog } from '../components/PasswordInputDialog';
import { useBackgroundClient } from '../hooks/useBackgroundClient';
import { useStorageMigrationStatus } from '../hooks/useStorageMigrationStatus';
import { CardLayout } from '../shared/card-layout';
import { Toaster } from '../shared/toaster';

export function StorageMigrationPage() {
	const { t } = useI18n();
	const { data } = useStorageMigrationStatus();
	const backgroundClient = useBackgroundClient();
	const migrationMutation = useMutation({
		mutationKey: ['do storage migration'],
		mutationFn: ({ password }: { password: string }) =>
			backgroundClient.doStorageMigration({ password }),
		onSuccess: () => {
			toast.success(t('storage.migrationDone'));
		},
	});
	if (!data || data === 'ready') {
		return null;
	}
	return (
		<>
			<CardLayout
				title={data === 'inProgress' ? t('storage.migrationProgress') : ''}
				subtitle={data === 'required' ? t('storage.migrationRequired') : ''}
				icon="rtd"
			>
				{data === 'required' && !migrationMutation.isSuccess ? (
					<PasswordInputDialog
						onPasswordVerified={async (password) => {
							await migrationMutation.mutateAsync({ password });
						}}
						title={t('storage.enterPassword')}
						legacyAccounts
					/>
				) : (
					<div className="flex flex-1 items-center">
						<LoadingIndicator />
					</div>
				)}
			</CardLayout>
			<Toaster />
		</>
	);
}
