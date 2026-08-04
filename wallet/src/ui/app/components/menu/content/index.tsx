// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ErrorBoundary } from '_components/error-boundary';
import {
	MainLocationContext,
	useMenuIsOpen,
	useMenuUrl,
	useNextMenuUrl,
} from '_components/menu/hooks';
import { useOnKeyboardEvent } from '_hooks';
import { useCallback } from 'react';
import type { MouseEvent } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import { AutoLockAccounts } from './AutoLockAccounts';
import { LanguageSettings } from './LanguageSettings';
import { MoreOptions } from './MoreOptions';
import { NetworkSettings } from './NetworkSettings';
import { ThemeSettings } from './ThemeSettings';
import WalletSettingsMenuList from './WalletSettingsMenuList';

const CLOSE_KEY_CODES: string[] = ['Escape'];

function MenuContent() {
	const mainLocation = useLocation();
	const isOpen = useMenuIsOpen();
	const menuUrl = useMenuUrl();
	const menuHomeUrl = useNextMenuUrl(true, '/');
	const closeMenuUrl = useNextMenuUrl(false);
	const navigate = useNavigate();
	const handleOnCloseMenu = useCallback(
		(e: KeyboardEvent | MouseEvent<HTMLDivElement>) => {
			if (isOpen) {
				e.preventDefault();
				navigate(closeMenuUrl);
			}
		},
		[isOpen, navigate, closeMenuUrl],
	);

	useOnKeyboardEvent('keydown', CLOSE_KEY_CODES, handleOnCloseMenu, isOpen);
	if (!isOpen) {
		return null;
	}

	return (
		<div className="settings-panel absolute inset-0 z-50 flex flex-col justify-items-stretch overflow-y-auto rounded-t-xl px-2.5 pb-8">
			<ErrorBoundary>
				<MainLocationContext.Provider value={mainLocation}>
					<Routes location={menuUrl || ''}>
						<Route path="/" element={<WalletSettingsMenuList />} />
						<Route path="/network" element={<NetworkSettings />} />
						<Route path="/auto-lock" element={<AutoLockAccounts />} />
						<Route path="/language" element={<LanguageSettings />} />
						<Route path="/theme" element={<ThemeSettings />} />
						<Route path="/more-options" element={<MoreOptions />} />
						<Route path="*" element={<Navigate to={menuHomeUrl} replace={true} />} />
					</Routes>
				</MainLocationContext.Provider>
			</ErrorBoundary>
		</div>
	);
}

export default MenuContent;
