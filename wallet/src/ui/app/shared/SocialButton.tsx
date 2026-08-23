// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Text } from '_app/shared/text';
import { useI18n } from '_app/i18n';
import {
	SocialFacebook24,
	SocialGoogle24,
	SocialKakao24,
	SocialMicrosoft24,
	SocialTwitch24,
} from 'rtd-apps-icons';
import { cva, type VariantProps } from 'class-variance-authority';
import {
	forwardRef,
	type FunctionComponent,
	type Ref,
	type SVGProps,
} from 'react';

import { ButtonOrLink, type ButtonOrLinkProps } from './utils/ButtonOrLink';

const styles = cva(
	'nova-button nova-button--tall w-full cursor-pointer gap-3 disabled:opacity-40',
	{
		variants: {
			provider: {
				microsoft: 'nova-button--outline',
				google: 'nova-button--outline',
				facebook: 'bg-facebook border-none text-white',
				twitch: 'bg-twitch border-none text-white',
				kakao: 'bg-kakao border-none text-black/85',
			},
		},
	},
);

type StyleProps = VariantProps<typeof styles>;
type SocialSignInProvider = NonNullable<StyleProps['provider']>;

type SocialButtonProps = {
	showLabel?: boolean;
	provider: SocialSignInProvider;
} & Omit<ButtonOrLinkProps, 'className'> &
	StyleProps;

const socialSignInProviderInfo: Record<
	SocialSignInProvider,
	{ icon: FunctionComponent<SVGProps<SVGSVGElement>>; providerName: string }
> = {
	microsoft: {
		icon: SocialMicrosoft24,
		providerName: 'Microsoft',
	},
	google: {
		icon: SocialGoogle24,
		providerName: 'Google',
	},
	facebook: {
		icon: SocialFacebook24,
		providerName: 'Facebook',
	},
	twitch: {
		icon: SocialTwitch24,
		providerName: 'Twitch',
	},
	kakao: {
		icon: SocialKakao24,
		providerName: 'Kakao',
	},
};

export const SocialButton = forwardRef(
	(
		{ provider, showLabel = false, ...otherProps }: SocialButtonProps,
		forwardedRef: Ref<HTMLAnchorElement | HTMLButtonElement>,
	) => {
		const { t } = useI18n();
		const { icon: IconComponent, providerName } =
			socialSignInProviderInfo[provider];
		const label = t('accounts.signInWith', { provider: providerName });
		return (
			<ButtonOrLink
				ref={forwardedRef}
				className={styles({ provider })}
				aria-label={showLabel ? undefined : label}
				{...otherProps}
			>
				<IconComponent className="h-6 w-6" />
				{showLabel && (
					<Text variant="pBody" weight="semibold">
						{label}
					</Text>
				)}
			</ButtonOrLink>
		);
	},
);
