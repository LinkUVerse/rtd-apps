// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { AccountItemApproveConnection } from '_components/accounts/AccountItemApproveConnection';
import Loading from '_components/loading';
import { UserApproveContainer } from '_components/user-approve-container';
import { useAppDispatch, useAppSelector } from '_hooks';
import type { RootState } from '_redux/RootReducer';
import { permissionsSelectors, respondToPermissionRequest } from '_redux/slices/permissions';
import { type SerializedUIAccount } from '_src/background/accounts/Account';
import { ampli } from '_src/shared/analytics/ampli';
import { useI18n } from '_src/ui/app/i18n';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { AccountMultiSelectWithControls } from '../../components/accounts/AccountMultiSelect';
import Alert from '../../components/alert';
import { SectionHeader } from '../../components/SectionHeader';
import { useAccountGroups } from '../../hooks/useAccountGroups';
import { useActiveAccount } from '../../hooks/useActiveAccount';
import { PageMainLayoutTitle } from '../../shared/page-main-layout/PageMainLayoutTitle';
import './SiteConnectPage.module.scss';

function SiteConnectPage() {
	const { t } = useI18n();
	const { requestID } = useParams();
	const permissionsInitialized = useAppSelector(({ permissions }) => permissions.initialized);
	const loading = !permissionsInitialized;
	const permissionSelector = useMemo(
		() => (state: RootState) =>
			requestID ? permissionsSelectors.selectById(state, requestID) : null,
		[requestID],
	);
	const dispatch = useAppDispatch();
	const permissionRequest = useAppSelector(permissionSelector);
	const activeAccount = useActiveAccount();
	const accountGroups = useAccountGroups();
	const accounts = accountGroups.list();
	const unlockedAccounts = accounts.filter((account) => !account.isLocked);
	const lockedAccounts = accounts.filter((account) => account.isLocked);
	const [accountsToConnect, setAccountsToConnect] = useState<SerializedUIAccount[]>(() =>
		activeAccount && !activeAccount.isLocked ? [activeAccount] : [],
	);
	const handleOnSubmit = useCallback(
		async (allowed: boolean) => {
			if (requestID && accountsToConnect && permissionRequest) {
				await dispatch(
					respondToPermissionRequest({
						id: requestID,
						accounts: allowed ? accountsToConnect.map((account) => account.address) : [],
						allowed,
					}),
				);
				ampli.respondedToConnectionRequest({
					applicationName: permissionRequest.name,
					applicationUrl: permissionRequest.origin,
					approvedConnection: allowed,
				});
				window.close();
			}
		},
		[requestID, accountsToConnect, permissionRequest, dispatch],
	);
	useEffect(() => {
		if (!loading && !permissionRequest) {
			window.close();
		}
	}, [loading, permissionRequest]);

	const parsedOrigin = useMemo(
		() => (permissionRequest ? new URL(permissionRequest.origin) : null),
		[permissionRequest],
	);

	const isSecure = parsedOrigin?.protocol === 'https:';
	const [displayWarning, setDisplayWarning] = useState(!isSecure);

	const handleHideWarning = useCallback(
		async (allowed: boolean) => {
			if (allowed) {
				setDisplayWarning(false);
			} else {
				await handleOnSubmit(false);
			}
		},
		[handleOnSubmit],
	);

	useEffect(() => {
		setDisplayWarning(!isSecure);
	}, [isSecure]);
	return (
		<Loading loading={loading}>
			{permissionRequest &&
				(displayWarning ? (
					<UserApproveContainer
						origin={permissionRequest.origin}
						originFavIcon={permissionRequest.favIcon}
						approveTitle={t('dapp.continue')}
						rejectTitle={t('dapp.reject')}
						onSubmit={handleHideWarning}
						isWarning
						addressHidden
						blended
					>
						<PageMainLayoutTitle title={t('dapp.insecureWebsite')} />
						<div className="warning-wrapper">
							<h1 className="warning-title">{t('dapp.connectionNotSecure')}</h1>
						</div>

						<div className="warning-message">{t('dapp.insecureDescription')}</div>
					</UserApproveContainer>
				) : (
					<UserApproveContainer
						origin={permissionRequest.origin}
						originFavIcon={permissionRequest.favIcon}
						permissions={permissionRequest.permissions}
						approveTitle={t('dapp.connect')}
						rejectTitle={t('dapp.reject')}
						onSubmit={handleOnSubmit}
						approveDisabled={!accountsToConnect.length}
						blended
					>
						<PageMainLayoutTitle title={t('dapp.approveConnection')} />
						<div className="flex flex-col gap-8 py-6">
							{unlockedAccounts.length > 0 ? (
								<AccountMultiSelectWithControls
									selectedAccountIDs={accountsToConnect.map((account) => account.id)}
									accounts={unlockedAccounts ?? []}
									onChange={(value) => {
										setAccountsToConnect(value.map((id) => accounts?.find((a) => a.id === id)!));
									}}
								/>
							) : (
								<Alert mode="warning">{t('dapp.allAccountsLocked')}</Alert>
							)}
							{lockedAccounts?.length > 0 && (
								<div className="flex flex-col gap-3">
									<SectionHeader title={t('dapp.lockedUnavailable')} />
									{lockedAccounts?.map((account) => (
										<AccountItemApproveConnection
											key={account.id}
											showLock
											account={account}
											disabled={account.isLocked}
										/>
									))}
								</div>
							)}
						</div>
					</UserApproveContainer>
				))}
		</Loading>
	);
}

export default SiteConnectPage;
