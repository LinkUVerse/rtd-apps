// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Button } from '_app/shared/ButtonUI';
import {
	useI18n,
	type Locale,
	type MessageKey,
	type MessageValues,
} from '_app/i18n';
import { ToS_LINK } from '_src/shared/constants';
import { useZodForm } from 'rtd-apps-core';
import { useEffect, useMemo } from 'react';
import { type SubmitHandler } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import zxcvbn from 'zxcvbn';

import {
	parseAutoLock,
	useAutoLockMinutes,
} from '../../hooks/useAutoLockMinutes';
import { CheckboxField } from '../../shared/forms/CheckboxField';
import { Form } from '../../shared/forms/Form';
import { TextField } from '../../shared/forms/TextField';
import { Link } from '../../shared/Link';
import { AutoLockSelector, createAutoLockSchema } from './AutoLockSelector';

function addDot(str: string | undefined) {
	if (str && !str.endsWith('.')) {
		return `${str}.`;
	}
	return str;
}

type Translate = (key: MessageKey, values?: MessageValues) => string;

const createFormSchema = (t: Translate, locale: Locale) =>
	z
		.object({
			password: z
				.object({
					input: z
						.string()
						.min(1, t('accounts.required'))
						.superRefine((val, ctx) => {
							const {
								score,
								feedback: { warning, suggestions },
							} = zxcvbn(val);
							if (score <= 2) {
								ctx.addIssue({
									code: z.ZodIssueCode.custom,
									message:
										locale === 'zh-CN'
											? t('accounts.passwordWeak')
											: `${addDot(warning) || t('accounts.passwordWeak')}${
													suggestions ? ` ${suggestions.join(' ')}` : ''
												}`,
								});
							}
						}),
					confirmation: z.string().min(1, t('accounts.required')),
				})
				.refine(
					({ input, confirmation }) =>
						input && confirmation && input === confirmation,
					{
						path: ['confirmation'],
						message: t('accounts.passwordMismatch'),
					},
				),
			acceptedTos: z.literal(true).refine((val) => val === true, {
				message: t('accounts.acceptTerms'),
			}),
		})
		.merge(createAutoLockSchema(t)) as any;

export type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

type ProtectAccountFormProps = {
	submitButtonText: string;
	cancelButtonText?: string;
	onSubmit: SubmitHandler<FormValues>;
	displayToS?: boolean;
};

export function ProtectAccountForm({
	submitButtonText,
	cancelButtonText,
	onSubmit,
	displayToS,
}: ProtectAccountFormProps) {
	const { locale, t } = useI18n();
	const formSchema = useMemo(() => createFormSchema(t, locale), [locale, t]);
	const autoLock = useAutoLockMinutes();
	const form = useZodForm({
		mode: 'all',
		schema: formSchema,
		values: {
			password: { input: '', confirmation: '' },
			acceptedTos: !!displayToS,
			autoLock: parseAutoLock(autoLock.data || null),
		},
	});
	const {
		watch,
		register,
		formState: { isSubmitting, isValid },
		trigger,
		getValues,
	} = form;
	const navigate = useNavigate();
	useEffect(() => {
		const { unsubscribe } = watch((_, { name, type }) => {
			if (
				name === 'password.input' &&
				type === 'change' &&
				getValues('password.confirmation')
			) {
				trigger('password.confirmation');
			}
		});
		return unsubscribe;
	}, [watch, trigger, getValues]);
	return (
		<Form
			className="flex flex-col gap-6 h-full"
			form={form}
			onSubmit={onSubmit}
		>
			<TextField
				autoFocus
				type="password"
				label={t('accounts.createPassword')}
				{...register('password.input')}
			/>
			<TextField
				type="password"
				label={t('accounts.confirmPassword')}
				{...register('password.confirmation')}
			/>
			<AutoLockSelector />
			<div className="flex-1" />
			<div className="flex flex-col gap-5">
				{displayToS ? null : (
					<CheckboxField
						name="acceptedTos"
						label={
							<div className="text-bodySmall leading-5">
								{t('accounts.termsAgreement')}{' '}
								<span className="inline-block">
									<Link
										href={ToS_LINK}
										beforeColor="steelDarker"
										color="rtdDark"
										text={t('accounts.terms')}
									/>
								</span>
							</div>
						}
					/>
				)}
				<div className="flex gap-2.5">
					{cancelButtonText ? (
						<Button
							variant="outline"
							size="tall"
							text={cancelButtonText}
							onClick={() => navigate(-1)}
						/>
					) : null}
					<Button
						type="submit"
						disabled={isSubmitting || !isValid}
						variant="primary"
						size="tall"
						loading={isSubmitting}
						text={submitButtonText}
					/>
				</div>
			</div>
		</Form>
	);
}
