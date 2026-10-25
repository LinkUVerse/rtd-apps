// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { enUS, zhCN } from "date-fns/locale";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from "react";

import { zh } from "./messages";

export type Locale = "en" | "zh";

type Variables = Record<string, string | number>;

export type Translate = (source: string, variables?: Variables) => string;

type I18nValue = {
	locale: Locale;
	setLocale: (locale: Locale) => void;
	toggleLocale: () => void;
	t: Translate;
};

const STORAGE_KEY = "rtd-explorer-locale";
const TITLES: Record<Locale, string> = {
	en: "RTD Explorer | Chain intelligence",
	zh: "RTD 浏览器｜链上数据一览",
};

function isLocale(value: string | null): value is Locale {
	return value === "en" || value === "zh";
}

function detectLocale(): Locale {
	if (typeof window === "undefined") return "en";
	try {
		const stored = window.localStorage.getItem(STORAGE_KEY);
		if (isLocale(stored)) return stored;
		const query = new URLSearchParams(window.location.search).get("lang");
		if (isLocale(query)) return query;
		return navigator.language?.toLowerCase().startsWith("zh") ? "zh" : "en";
	} catch {
		return "en";
	}
}

function translate(locale: Locale, source: string, variables?: Variables) {
	const template = locale === "zh" ? zh[source] ?? source : source;
	if (!variables) return template;
	return template.replace(/\{(\w+)\}/g, (match, name) =>
		variables[name] === undefined ? match : String(variables[name]),
	);
}

const fallback: I18nValue = {
	locale: "en",
	setLocale: () => undefined,
	toggleLocale: () => undefined,
	t: (source) => source,
};

const I18nContext = createContext<I18nValue>(fallback);

export function I18nProvider({ children }: { children: ReactNode }) {
	const [locale, setLocaleState] = useState<Locale>(detectLocale);

	const setLocale = useCallback((next: Locale) => {
		setLocaleState(next);
		try {
			window.localStorage.setItem(STORAGE_KEY, next);
		} catch {
			// Storage may be unavailable in private or extension contexts.
		}
	}, []);

	const toggleLocale = useCallback(() => {
		setLocale(locale === "zh" ? "en" : "zh");
	}, [locale, setLocale]);

	useEffect(() => {
		document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
		document.title = TITLES[locale];
	}, [locale]);

	const value = useMemo<I18nValue>(
		() => ({
			locale,
			setLocale,
			toggleLocale,
			t: (source, variables) => translate(locale, source, variables),
		}),
		[locale, setLocale, toggleLocale],
	);

	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
	return useContext(I18nContext);
}

export function useDateLocale() {
	const { locale } = useI18n();
	return locale === "zh" ? zhCN : enUS;
}
