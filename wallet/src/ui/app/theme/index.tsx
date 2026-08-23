// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
	createContext,
	useCallback,
	useContext,
	useLayoutEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react';

export const supportedThemes = [
	'passion',
	'calm',
	'professional',
	'red-thread',
] as const;
export type WalletTheme = (typeof supportedThemes)[number];

const DEFAULT_THEME: WalletTheme = 'passion';
const THEME_STORAGE_KEY = 'rtd-wallet.theme';

export function resolveTheme(theme?: string | null): WalletTheme {
	return supportedThemes.includes(theme as WalletTheme)
		? (theme as WalletTheme)
		: DEFAULT_THEME;
}

function getInitialTheme(): WalletTheme {
	if (typeof window === 'undefined') {
		return DEFAULT_THEME;
	}
	try {
		return resolveTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
	} catch {
		return DEFAULT_THEME;
	}
}

type ThemeContextValue = {
	theme: WalletTheme;
	setTheme: (theme: WalletTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setThemeState] = useState<WalletTheme>(getInitialTheme);
	const setTheme = useCallback(
		(nextTheme: WalletTheme) => setThemeState(resolveTheme(nextTheme)),
		[],
	);

	useLayoutEffect(() => {
		document.documentElement.dataset.rtdTheme = theme;
		document.documentElement.style.colorScheme =
			theme === 'professional' || theme === 'red-thread' ? 'dark' : 'light';
		try {
			window.localStorage.setItem(THEME_STORAGE_KEY, theme);
		} catch {
			// The selected theme still applies for this session when storage is unavailable.
		}
	}, [theme]);

	const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

	return (
		<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
	);
}

export function useTheme() {
	const value = useContext(ThemeContext);
	if (!value) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}
	return value;
}
