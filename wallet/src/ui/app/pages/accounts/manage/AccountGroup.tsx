// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { type AccountType, type SerializedUIAccount } from '_src/background/accounts/Account';
import { useI18n, type MessageKey } from '_app/i18n';
import { type ZkLoginProvider } from '_src/background/accounts/zklogin/providers';
import { isZkLoginAccountSerializedUI } from '_src/background/accounts/zklogin/ZkLoginAccount';
import { AccountIcon } from '_src/ui/app/components/accounts/AccountIcon';
import { AccountItem } from '_src/ui/app/components/accounts/AccountItem';
import { useAccountsFormContext } from '_src/ui/app/components/accounts/AccountsFormContext';
import { NicknameDialog } from '_src/ui/app/components/accounts/NicknameDialog';
import { VerifyPasswordModal } from '_src/ui/app/components/accounts/VerifyPasswordModal';
import { useAccounts } from '_src/ui/app/hooks/useAccounts';
import { useAccountSources } from '_src/ui/app/hooks/useAccountSources';
import { useBackgroundClient } from '_src/ui/app/hooks/useBackgroundClient';
import { useCreateAccountsMutation } from '_src/ui/app/hooks/useCreateAccountMutation';
import { Button } from '_src/ui/app/shared/ButtonUI';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '_src/ui/app/shared/Dialog';
import { Heading } from '_src/ui/app/shared/heading';
import { Text } from '_src/ui/app/shared/text';
import { ButtonOrLink, type ButtonOrLinkProps } from '_src/ui/app/shared/utils/ButtonOrLink';
import { ArrowBgFill16, Plus12 } from 'rtd-apps-icons';
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import { useMutation } from '@tanstack/react-query';
import { forwardRef, useState } from 'react';
import toast from 'react-hot-toast';

const accountTypeToLabel: Record<AccountType, string> = {
	'mnemonic-derived': 'Passphrase Derived',
	qredo: 'Qredo',
	imported: 'Imported',
	zkLogin: 'zkLogin',
};

const providerToLabel: Record<ZkLoginProvider, string> = {
	google: 'Google',
	twitch: 'Twitch',
	facebook: 'Facebook',
	kakao: 'Kakao',
};

export function getGroupTitle(
	aGroupAccount: SerializedUIAccount,
	translate?: (key: MessageKey) => string,
) {
	// TODO: revisit this logic for determining account provider
	if (isZkLoginAccountSerializedUI(aGroupAccount)) {
		return providerToLabel[aGroupAccount?.provider] ?? 'zkLogin';
	}
	if (translate && aGroupAccount.type === 'mnemonic-derived') {
		return translate('accounts.typeMnemonic');
	}
	if (translate && aGroupAccount.type === 'imported') {
		return translate('accounts.typeImported');
	}
	return accountTypeToLabel[aGroupAccount?.type] || '';
}

// todo: we probably have some duplication here with the various FooterLink / ButtonOrLink
// components - we should look to add these to base components somewhere
const FooterLink = forwardRef<HTMLAnchorElement | HTMLButtonElement, ButtonOrLinkProps>(
	({ children, to, ...props }, ref) => {
		return (
			<ButtonOrLink
				ref={ref}
				className="transition text-hero-darkest/40 hover:text-hero-darkest/50 no-underline uppercase outline-none border-none bg-transparent cursor-pointer"
				to={to}
				{...props}
			>
				<Text variant="captionSmallExtra" weight="medium">
					{children}
				</Text>
			</ButtonOrLink>
		);
	},
);

// todo: this is slightly different than the account footer in the AccountsList - look to consolidate :(
function AccountFooter({ accountID, showExport }: { accountID: string; showExport?: boolean }) {
	const { t } = useI18n();
	const allAccounts = useAccounts();
	const totalAccounts = allAccounts?.data?.length || 0;
	const backgroundClient = useBackgroundClient();
	const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
	const removeAccountMutation = useMutation({
		mutationKey: ['remove account mutation', accountID],
		mutationFn: async () => {
			await backgroundClient.removeAccount({ accountID });
			setIsConfirmationVisible(false);
		},
	});
	return (
		<>
			<div className="flex flex-shrink-0 w-full">
				<div className="flex gap-0.5 items-center whitespace-nowrap">
					<NicknameDialog
						accountID={accountID}
						trigger={<FooterLink>{t('accounts.editNickname')}</FooterLink>}
					/>
					{showExport ? (
						<FooterLink to={`/accounts/export/${accountID}`}>
							{t('accounts.exportPrivateKey')}
						</FooterLink>
					) : null}
					{allAccounts.isPending ? null : (
						<FooterLink
							onClick={() => setIsConfirmationVisible(true)}
							disabled={isConfirmationVisible}
						>
							{t('accounts.remove')}
						</FooterLink>
					)}
				</div>
			</div>
			<Dialog open={isConfirmationVisible}>
				<DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
					<DialogHeader>
						<DialogTitle>{t('accounts.removeTitle')}</DialogTitle>
					</DialogHeader>
					{totalAccounts === 1 ? (
						<div className="text-center">
							<DialogDescription>{t('accounts.removeOnlyWarning')}</DialogDescription>
						</div>
					) : null}
					<DialogFooter>
						<div className="flex gap-2.5">
							<Button
								variant="outline"
								size="tall"
								text={t('common.cancel')}
								onClick={() => setIsConfirmationVisible(false)}
							/>
							<Button
								variant="warning"
								size="tall"
								text={t('accounts.remove')}
								loading={removeAccountMutation.isPending}
								onClick={() => {
									removeAccountMutation.mutate(undefined, {
										onSuccess: () => toast.success(t('accounts.removed')),
										onError: (e) =>
											toast.error((e as Error)?.message || t('common.somethingWrong')),
									});
								}}
							/>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

export function AccountGroup({
	accounts,
	type,
	accountSourceID,
}: {
	accounts: SerializedUIAccount[];
	type: AccountType;
	accountSourceID?: string;
}) {
	const { t } = useI18n();
	const createAccountMutation = useCreateAccountsMutation();
	const isMnemonicDerivedGroup = type === 'mnemonic-derived';
	const [accountsFormValues, setAccountsFormValues] = useAccountsFormContext();
	const [isPasswordModalVisible, setPasswordModalVisible] = useState(false);
	const { data: accountSources } = useAccountSources();
	const accountSource = accountSources?.find(({ id }) => id === accountSourceID);
	return (
		<>
			<CollapsiblePrimitive.Root defaultOpen asChild>
				<div className="flex flex-col gap-4 w-full">
					<CollapsiblePrimitive.Trigger asChild>
						<div className="flex gap-2 w-full items-center justify-center cursor-pointer flex-shrink-0 group [&>*]:select-none">
							<ArrowBgFill16 className="h-4 w-4 group-data-[state=open]:rotate-90 text-hero-darkest/20" />
							<Heading variant="heading5" weight="semibold" color="steel-darker">
								{getGroupTitle(accounts[0], t)}
							</Heading>
							<div className="h-px bg-gray-45 flex flex-1 flex-shrink-0" />
							{isMnemonicDerivedGroup && accountSource ? (
								<ButtonOrLink
									loading={createAccountMutation.isPending}
									onClick={async (e) => {
										// prevent the collapsible from closing when clicking the "new" button
										e.stopPropagation();
										setAccountsFormValues({
											type: 'mnemonic-derived',
											sourceID: accountSource.id,
										});
										if (accountSource.isLocked) {
											setPasswordModalVisible(true);
										} else {
											createAccountMutation.mutate({ type: 'mnemonic-derived' });
										}
									}}
									className="items-center justify-center gap-0.5 cursor-pointer appearance-none uppercase flex bg-transparent border-0 outline-none text-hero hover:text-hero-darkest"
								>
									<Plus12 />
									<Text variant="bodySmall" weight="semibold">
										{t('accounts.new')}
									</Text>
								</ButtonOrLink>
							) : null}
						</div>
					</CollapsiblePrimitive.Trigger>
					<CollapsiblePrimitive.CollapsibleContent asChild>
						<div className="flex flex-col gap-3 w-full flex-shrink-0">
							{accounts.map((account) => {
								return (
									<AccountItem
										key={account.id}
										background="gradient"
										accountID={account.id}
										icon={<AccountIcon account={account} />}
										footer={
											<AccountFooter
												accountID={account.id}
												showExport={account.isKeyPairExportable}
											/>
										}
									/>
								);
							})}
							{isMnemonicDerivedGroup && accountSource ? (
								<Button
									variant="secondary"
									size="tall"
									text={t('accounts.exportPassphrase')}
									to={`../export/passphrase/${accountSource.id}`}
								/>
							) : null}
						</div>
					</CollapsiblePrimitive.CollapsibleContent>
				</div>
			</CollapsiblePrimitive.Root>
			{isPasswordModalVisible ? (
				<VerifyPasswordModal
					open
					onVerify={async (password) => {
						if (accountsFormValues.current && accountsFormValues.current.type !== 'zkLogin') {
							await createAccountMutation.mutateAsync({
								type: accountsFormValues.current.type,
								password,
							});
						}
						setPasswordModalVisible(false);
					}}
					onClose={() => setPasswordModalVisible(false)}
				/>
			) : null}
		</>
	);
}
