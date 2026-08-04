// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react';

import en from './messages/en';
import zhCN from './messages/zh-CN';

export const supportedLocales = ['en', 'zh-CN'] as const;
export type Locale = (typeof supportedLocales)[number];
export type MessageKey = keyof typeof en;
export type MessageValues = Record<string, string | number>;

const DEFAULT_LOCALE: Locale = 'en';
const LOCALE_STORAGE_KEY = 'rtd-wallet.locale';

const messages: Record<Locale, Record<MessageKey, string>> = {
	en,
	'zh-CN': zhCN,
};

export function resolveLocale(locale?: string | null): Locale {
	if (!locale) {
		return DEFAULT_LOCALE;
	}
	if (locale.toLowerCase().startsWith('zh')) {
		return 'zh-CN';
	}
	return supportedLocales.includes(locale as Locale) ? (locale as Locale) : DEFAULT_LOCALE;
}

export function translate(locale: Locale, key: MessageKey, values?: MessageValues): string {
	const message = messages[locale][key] || messages[DEFAULT_LOCALE][key];
	if (!values) {
		return message;
	}
	return message.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
		Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : placeholder,
	);
}

function getInitialLocale(): Locale {
	if (typeof window === 'undefined') {
		return DEFAULT_LOCALE;
	}
	try {
		const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
		return resolveLocale(storedLocale || window.navigator.language);
	} catch {
		return resolveLocale(window.navigator.language);
	}
}

type I18nContextValue = {
	locale: Locale;
	setLocale: (locale: Locale) => void;
	t: (key: MessageKey, values?: MessageValues) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
	const [locale, setLocaleState] = useState<Locale>(getInitialLocale);
	const setLocale = useCallback(
		(nextLocale: Locale) => setLocaleState(resolveLocale(nextLocale)),
		[],
	);

	useEffect(() => {
		document.documentElement.lang = locale;
		try {
			window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
		} catch {
			// The selected locale still applies for this session when storage is unavailable.
		}
	}, [locale]);

	const value = useMemo<I18nContextValue>(
		() => ({
			locale,
			setLocale,
			t: (key, values) => translate(locale, key, values),
		}),
		[locale, setLocale],
	);

	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
	const value = useContext(I18nContext);
	if (!value) {
		throw new Error('useI18n must be used within an I18nProvider');
	}
	return value;
}
