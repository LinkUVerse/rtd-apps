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
					'theme-input peer flex h-11 w-full items-center gap-5 rounded-2lg border border-solid border-gray-45 py-2.5 pl-3 pr-0 text-body font-medium text-steel-dark shadow-button placeholder-gray-65 focus:border-steel focus:shadow-none'
				}
			/>
			<IconComponent
				className="absolute text-heading6 font-normal text-gray-60 cursor-pointer right-3 peer-focus:text-steel"
				onClick={() => setPasswordShown(!passwordShown)}
			/>
		</div>
	);
}
