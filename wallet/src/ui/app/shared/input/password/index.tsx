// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { EyeClose16, EyeOpen16 } from 'rtd-apps-icons';
import { useI18n } from '_app/i18n';
import { useField } from 'formik';
import { useState, type ComponentProps } from 'react';

export interface PasswordInputProps extends Omit<
	ComponentProps<'input'>,
	'className' | 'type' | 'name'
> {
	name: string;
}

export function PasswordInputField({ ...props }: PasswordInputProps) {
	const { t } = useI18n();
	const [passwordShown, setPasswordShown] = useState(false);
	const [field] = useField(props.name);
	const IconComponent = passwordShown ? EyeOpen16 : EyeClose16;
	return (
		<div className="flex w-full relative items-center">
			<input
				type={passwordShown ? 'text' : 'password'}
				placeholder={props.placeholder || t('common.password')}
				{...props}
				{...field}
				className={
					'nova-input peer flex h-11 items-center gap-5 pr-11 font-medium'
				}
			/>
			<button
				type="button"
				aria-label={t(
					passwordShown ? 'common.hidePassword' : 'common.showPassword',
				)}
				className="absolute right-0 flex min-h-11 min-w-11 items-center justify-center border-none bg-transparent text-gray-60 cursor-pointer peer-focus:text-steel"
				onClick={() => setPasswordShown(!passwordShown)}
			>
				<IconComponent className="text-heading6 font-normal" />
			</button>
		</div>
	);
}
