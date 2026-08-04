// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '_src/ui/app/shared/Dialog';
import { useI18n } from '_app/i18n';
import { useZodForm } from 'rtd-apps-core';
import { useState, type JSX } from 'react';
import toast from 'react-hot-toast';
import { z } from 'zod';

import { useAccounts } from '../../hooks/useAccounts';
import { useBackgroundClient } from '../../hooks/useBackgroundClient';
import { Button } from '../../shared/ButtonUI';
import { Form } from '../../shared/forms/Form';
import { TextField } from '../../shared/forms/TextField';

const formSchema = z.object({
	nickname: z.string().trim(),
}) as any;

interface NicknameDialogProps {
	accountID: string;
	trigger: JSX.Element;
}

export function NicknameDialog({ accountID, trigger }: NicknameDialogProps) {
	const { t } = useI18n();
	const [open, setOpen] = useState(false);
	const backgroundClient = useBackgroundClient();
	const { data: accounts } = useAccounts();
	const account = accounts?.find((account) => account.id === accountID);

	const form = useZodForm({
		mode: 'all',
		schema: formSchema,
		defaultValues: {
			nickname: account?.nickname ?? '',
		},
	});
	const {
		register,
		formState: { isSubmitting, isValid },
	} = form;

	const onSubmit = async ({ nickname }: { nickname: string }) => {
		if (account && accountID) {
			try {
				await backgroundClient.setAccountNickname({
					id: accountID,
					nickname: nickname || null,
				});
				setOpen(false);
			} catch (e) {
				toast.error((e as Error).message || t('accounts.nicknameFailed'));
			}
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent onPointerDownOutside={(e: Event) => e.preventDefault()}>
				<DialogHeader>
					<DialogTitle>{t('accounts.nickname')}</DialogTitle>
					<DialogDescription asChild>
						<span className="sr-only">{t('accounts.nicknameDescription')}</span>
					</DialogDescription>
				</DialogHeader>
				<Form className="flex flex-col gap-6 h-full" form={form} onSubmit={onSubmit}>
					<TextField label={t('accounts.nicknameDescription')} {...register('nickname')} />
					<div className="flex gap-2.5">
						<Button
							variant="outline"
							size="tall"
							text={t('common.cancel')}
							onClick={() => setOpen(false)}
						/>
						<Button
							type="submit"
							disabled={isSubmitting || !isValid}
							variant="primary"
							size="tall"
							loading={isSubmitting}
							text={t('common.save')}
						/>
					</div>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
