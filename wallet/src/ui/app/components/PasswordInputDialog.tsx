// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useBackgroundClient } from '_src/ui/app/hooks/useBackgroundClient';
import { useI18n } from '_app/i18n';
import { Button } from '_src/ui/app/shared/ButtonUI';
import FieldLabel from '_src/ui/app/shared/field-label';
import { Heading } from '_src/ui/app/shared/heading';
import { PasswordInputField } from '_src/ui/app/shared/input/password';
import { Text } from '_src/ui/app/shared/text';
import { ArrowLeft16, ArrowRight16 } from 'rtd-apps-icons';
import classNames from 'clsx';
import { ErrorMessage, Form, Formik } from 'formik';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { object, string as YupString } from 'yup';

import Alert from './alert';

export type PasswordExportDialogProps = {
	title: string;
	continueLabel?: string;
	showArrowIcon?: boolean;
	onPasswordVerified: (password: string) => Promise<void> | void;
	onBackClicked?: () => void;
	showBackButton?: boolean;
	spacing?: boolean;
	background?: boolean;
	legacyAccounts?: boolean;
};

/** @deprecated - use UnlockAccountModal instead **/
export function PasswordInputDialog({
	title,
	continueLabel,
	showArrowIcon = false,
	spacing = false,
	background = false,
	onPasswordVerified,
	onBackClicked,
	showBackButton = false,
	legacyAccounts = false,
}: PasswordExportDialogProps) {
	const { t } = useI18n();
	const resolvedContinueLabel = continueLabel || t('common.continue');
	const validation = object({
		password: YupString().ensure().required(t('validation.required')),
	});
	const navigate = useNavigate();
	const backgroundService = useBackgroundClient();
	return (
		<Formik
			initialValues={{ password: '' }}
			onSubmit={async ({ password }, { setFieldError }) => {
				try {
					await backgroundService.verifyPassword({ password, legacyAccounts });
					try {
						await onPasswordVerified(password);
					} catch (e) {
						toast.error((e as Error).message || t('common.wrongPassword'));
					}
				} catch (e) {
					setFieldError(
						'password',
						(e as Error).message || t('common.wrongPassword'),
					);
				}
			}}
			validationSchema={validation}
			validateOnMount
		>
			{({ isSubmitting, isValid }) => (
				<Form
					className={classNames(
						'flex flex-col flex-nowrap items-center flex-1 gap-7.5',
						{
							'bg-white': background,
							'px-5 pt-10': spacing,
						},
					)}
				>
					<div className="text-center">
						<Heading variant="heading1" color="gray-90" weight="bold">
							{title}
						</Heading>
					</div>
					<div className="self-stretch flex-1">
						<FieldLabel txt={t('accounts.enterWalletPassword')}>
							<PasswordInputField name="password" />
							<ErrorMessage
								render={(error) => <Alert>{error}</Alert>}
								name="password"
							/>
						</FieldLabel>
						<div className="text-center mt-4">
							<Text variant="pBodySmall" color="steel-dark" weight="normal">
								{t('accounts.passwordDescription')}
							</Text>
						</div>
					</div>
					<div className="flex flex-nowrap gap-3.75 self-stretch">
						{showBackButton ? (
							<Button
								text={t('common.back')}
								color="heroDark"
								size="tall"
								variant="outline"
								before={<ArrowLeft16 />}
								onClick={() => {
									if (typeof onBackClicked === 'function') {
										onBackClicked();
									} else {
										navigate(-1);
									}
								}}
								disabled={isSubmitting}
							/>
						) : null}
						<Button
							type="submit"
							variant="primary"
							size="tall"
							text={resolvedContinueLabel}
							loading={isSubmitting}
							disabled={!isValid}
							after={showArrowIcon ? <ArrowRight16 /> : null}
						/>
					</div>
				</Form>
			)}
		</Formik>
	);
}
