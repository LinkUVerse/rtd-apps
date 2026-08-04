// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useAppSelector } from '_hooks';
import { getNavIsVisible } from '_redux/slices/app';
import { useI18n } from '_app/i18n';
import { Activity32, Apps32, Nft132, Tokens32 } from 'rtd-apps-icons';
import cl from 'clsx';
import { NavLink } from 'react-router-dom';

import { useActiveAccount } from '../../hooks/useActiveAccount';
import * as styles from './Navigation.module.scss';

// Type assertion to access CSS module classes
const st = styles as any;

function logNavigationDebug(tab: string, activeAccount?: ReturnType<typeof useActiveAccount>) {
	console.info('[RTD Wallet Navigation Debug] bottom tab clicked', {
		tab,
		isLocked: activeAccount?.isLocked,
		accountAddress: activeAccount?.address,
		href: window.location.href,
		timestamp: new Date().toISOString(),
	});
}

export function Navigation() {
	const { t } = useI18n();
	const isVisible = useAppSelector(getNavIsVisible);
	const activeAccount = useActiveAccount();
	const makeLinkCls = ({ isActive }: { isActive: boolean }) =>
		cl(st.link, {
			[st.active]: isActive,
			[st.disabled]: activeAccount?.isLocked,
		});
	const makeLinkClsNoDisabled = ({ isActive }: { isActive: boolean }) =>
		cl(st.link, { [st.active]: isActive });
	return (
		<nav
			className={cl('border-b-0 rounded-tl-md rounded-tr-md shrink-0', st.container, {
				[st.hidden]: !isVisible,
			})}
		>
			<div id="rtd-apps-filters" className="flex whitespace-nowrap w-full justify-center"></div>
			<div className={st.navMenu}>
				<NavLink
					data-testid="nav-tokens"
					to="/tokens"
					className={makeLinkClsNoDisabled}
					title={t('navigation.home')}
					onClick={() => logNavigationDebug('Home', activeAccount)}
				>
					<Tokens32 className="w-8 h-8" />
					<span className={st.title}>{t('navigation.home')}</span>
				</NavLink>
				<NavLink
					to="/nfts"
					className={makeLinkCls}
					title={t('navigation.assets')}
					onClick={(e) => {
						logNavigationDebug('Assets', activeAccount);
						if (activeAccount?.isLocked) {
							e.preventDefault();
						}
					}}
				>
					<Nft132 className="w-8 h-8" />
					<span className={st.title}>{t('navigation.assets')}</span>
				</NavLink>
				<NavLink
					to="/apps"
					className={makeLinkCls}
					title={t('navigation.apps')}
					onClick={(e) => {
						logNavigationDebug('Apps', activeAccount);
						if (activeAccount?.isLocked) {
							e.preventDefault();
						}
					}}
				>
					<Apps32 className="w-8 h-8" />
					<span className={st.title}>{t('navigation.apps')}</span>
				</NavLink>
				<NavLink
					data-testid="nav-activity"
					to="/transactions"
					className={makeLinkCls}
					title={t('navigation.transactions')}
					onClick={(e) => {
						logNavigationDebug('Activity', activeAccount);
						if (activeAccount?.isLocked) {
							e.preventDefault();
						}
					}}
				>
					<Activity32 className="w-8 h-8" />
					<span className={st.title}>{t('navigation.activity')}</span>
				</NavLink>
			</div>
		</nav>
	);
}
