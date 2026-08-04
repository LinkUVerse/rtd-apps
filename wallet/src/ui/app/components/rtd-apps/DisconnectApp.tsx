// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import Overlay from '_components/overlay';
import { useAppSelector } from '_hooks';
import { permissionsSelectors } from '_redux/slices/permissions';
import { ampli } from '_src/shared/analytics/ampli';
import { useI18n } from '_src/ui/app/i18n';
import { formatAddress } from 'rtd-typescript/utils';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';

import { useBackgroundClient } from '../../hooks/useBackgroundClient';
import { Button } from '../../shared/ButtonUI';
import { Text } from '../../shared/text';
import { DAppInfoCard } from '../DAppInfoCard';
import { DAppPermissionsList } from '../DAppPermissionsList';
import { SummaryCard } from '../SummaryCard';
import { WalletListSelect } from '../WalletListSelect';
import { type DAppEntry } from './RtdApp';

export interface DisconnectAppProps extends Omit<DAppEntry, 'description' | 'tags'> {
	permissionID: string;
	setShowDisconnectApp: (showModal: boolean) => void;
}

function DisconnectApp({
	name,
	icon,
	link,
	permissionID,
	setShowDisconnectApp,
}: DisconnectAppProps) {
	const { t } = useI18n();
	const [accountsToDisconnect, setAccountsToDisconnect] = useState<string[]>([]);
	const permission = useAppSelector((state) =>
		permissionsSelectors.selectById(state, permissionID),
	);
	useEffect(() => {
		if (permission && !permission.allowed) {
			setShowDisconnectApp(false);
		}
	}, [permission, setShowDisconnectApp]);
	const connectedAccounts = useMemo(
		() => (permission?.allowed && permission.accounts) || [],
		[permission],
	);
	const backgroundClient = useBackgroundClient();
	const disconnectMutation = useMutation({
		mutationFn: async () => {
			const origin = permission?.origin;
			if (!origin) {
				throw new Error('Failed, origin not found');
			}

			await backgroundClient.disconnectApp(origin, accountsToDisconnect);
			await backgroundClient.sendGetPermissionRequests();
			ampli.disconnectedApplication({
				sourceFlow: 'Application page',
				disconnectedAccounts: accountsToDisconnect.length || 1,
				applicationName: permission.name,
				applicationUrl: origin,
			});
		},
		onSuccess: () => {
			toast.success(t('dapp.disconnectSuccess'));
			setShowDisconnectApp(false);
		},
		onError: () => toast.error(t('dapp.disconnectFailed')),
	});
	if (!permission) {
		return null;
	}
	return (
		<Overlay showModal setShowModal={setShowDisconnectApp} title={t('dapp.connectionActive')}>
			<div className="flex flex-col flex-nowrap items-stretch flex-1 gap-3.75">
				<DAppInfoCard name={name} iconUrl={icon} url={link} />
				<SummaryCard
					header={t('dapp.permissionsGiven')}
					body={<DAppPermissionsList permissions={permission.permissions} />}
				/>
				{connectedAccounts.length > 1 ? (
					<WalletListSelect
						title={t('dapp.connectedAccounts')}
						visibleValues={connectedAccounts}
						values={accountsToDisconnect}
						onChange={setAccountsToDisconnect}
						mode="disconnect"
						disabled={disconnectMutation.isPending}
					/>
				) : (
					<SummaryCard
						header={t('dapp.connectedAccount')}
						body={
							<Text variant="body" color="steel-dark" weight="semibold" mono>
								{connectedAccounts[0] ? formatAddress(connectedAccounts[0]) : null}
							</Text>
						}
					/>
				)}
				<div className="theme-card sticky -bottom-5 flex flex-1 items-end pb-5 pt-1">
					<Button
						size="tall"
						variant="warning"
						text={
							connectedAccounts.length === 1
								? t('dapp.disconnect')
								: accountsToDisconnect.length === 0 ||
									  connectedAccounts.length === accountsToDisconnect.length
									? t('dapp.disconnectAll')
									: t('dapp.disconnectSelected')
						}
						loading={disconnectMutation.isPending}
						onClick={() => disconnectMutation.mutate()}
					/>
				</div>
			</div>
		</Overlay>
	);
}

export default DisconnectApp;
