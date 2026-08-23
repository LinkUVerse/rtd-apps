// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useI18n, type MessageKey } from '_app/i18n';
import { useTheme, type WalletTheme } from '_app/theme';
import { useNextMenuUrl } from '_components/menu/hooks';

import { MenuLayout } from './MenuLayout';
import { PreferenceOption } from './PreferenceOption';

const themeOptions: {
	theme: WalletTheme;
	titleKey: MessageKey;
	descriptionKey: MessageKey;
}[] = [
	{
		theme: 'passion',
		titleKey: 'theme.passion',
		descriptionKey: 'theme.passionDescription',
	},
	{
		theme: 'calm',
		titleKey: 'theme.calm',
		descriptionKey: 'theme.calmDescription',
	},
	{
		theme: 'professional',
		titleKey: 'theme.professional',
		descriptionKey: 'theme.professionalDescription',
	},
	{
		theme: 'red-thread',
		titleKey: 'theme.redThread',
		descriptionKey: 'theme.redThreadDescription',
	},
];

export function ThemeSettings() {
	const mainMenuUrl = useNextMenuUrl(true, '/');
	const { t } = useI18n();
	const { theme, setTheme } = useTheme();

	return (
		<MenuLayout title={t('theme.title')} back={mainMenuUrl}>
			<p className="preferences-description">{t('theme.description')}</p>
			<div
				className="preferences-grid"
				role="radiogroup"
				aria-label={t('theme.title')}
			>
				{themeOptions.map((option) => (
					<PreferenceOption
						key={option.theme}
						title={t(option.titleKey)}
						description={t(option.descriptionKey)}
						preview={
							<span
								className={`theme-preview theme-preview--${option.theme}`}
								aria-hidden="true"
							>
								<span />
								<span />
								<span />
							</span>
						}
						selected={theme === option.theme}
						onSelect={() => setTheme(option.theme)}
					/>
				))}
			</div>
		</MenuLayout>
	);
}
