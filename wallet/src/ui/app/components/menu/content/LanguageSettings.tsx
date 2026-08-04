// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useI18n, type Locale, type MessageKey } from '_app/i18n';
import { useNextMenuUrl } from '_components/menu/hooks';

import { MenuLayout } from './MenuLayout';
import { PreferenceOption } from './PreferenceOption';

const languageOptions: {
	locale: Locale;
	titleKey: MessageKey;
	nativeNameKey: MessageKey;
	preview: string;
}[] = [
	{
		locale: 'en',
		titleKey: 'language.english',
		nativeNameKey: 'language.englishNative',
		preview: 'EN',
	},
	{
		locale: 'zh-CN',
		titleKey: 'language.chinese',
		nativeNameKey: 'language.chineseNative',
		preview: '中',
	},
];

export function LanguageSettings() {
	const mainMenuUrl = useNextMenuUrl(true, '/');
	const { locale, setLocale, t } = useI18n();

	return (
		<MenuLayout title={t('language.title')} back={mainMenuUrl}>
			<p className="preferences-description">{t('language.description')}</p>
			<div className="preferences-grid" role="radiogroup" aria-label={t('language.title')}>
				{languageOptions.map((option) => (
					<PreferenceOption
						key={option.locale}
						title={t(option.titleKey)}
						description={t(option.nativeNameKey)}
						preview={<span className="language-preview">{option.preview}</span>}
						selected={locale === option.locale}
						onSelect={() => setLocale(option.locale)}
					/>
				))}
			</div>
		</MenuLayout>
	);
}
