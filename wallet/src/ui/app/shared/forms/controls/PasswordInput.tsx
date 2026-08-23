// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { EyeClose16, EyeOpen16 } from 'rtd-apps-icons';
import { useI18n } from '_app/i18n';
import { forwardRef, useState, type ComponentProps } from 'react';

import { ButtonOrLink } from '../../utils/ButtonOrLink';
import { Input } from './Input';

type PasswordInputProps = {
	name: string;
} & Omit<ComponentProps<'input'>, 'className' | 'type' | 'name' | 'ref'>;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
	({ placeholder, ...props }, forwardedRef) => {
		const { t } = useI18n();
		const [passwordShown, setPasswordShown] = useState(false);
		const IconComponent = passwordShown ? EyeOpen16 : EyeClose16;

		return (
			<div className="flex w-full relative items-center">
				<Input
					{...props}
					style={{ ...props.style, paddingRight: 44 }}
					type={passwordShown ? 'text' : 'password'}
					placeholder={placeholder || t('common.password')}
					ref={forwardedRef}
				/>
				<ButtonOrLink
					aria-label={t(
						passwordShown ? 'common.hidePassword' : 'common.showPassword',
					)}
					className="absolute right-0 flex min-h-11 min-w-11 appearance-none items-center justify-center border-none bg-transparent text-gray-60 cursor-pointer peer-focus:text-steel"
					onClick={() => setPasswordShown((prevState) => !prevState)}
				>
					<IconComponent className="w-4 h-4" />
				</ButtonOrLink>
			</div>
		);
	},
);
