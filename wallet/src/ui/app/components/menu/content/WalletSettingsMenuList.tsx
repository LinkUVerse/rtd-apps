// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { API_ENV_TO_INFO } from '_app/ApiProvider';
import { useI18n, type MessageKey } from '_app/i18n';
import { useTheme } from '_app/theme';
import { useNextMenuUrl } from '_components/menu/hooks';
import { useAppSelector } from '_hooks';
import { DISCORD_LINK, FAQ_LINK, ToS_LINK } from '_src/shared/constants';
import { parseAutoLock, useAutoLockMinutes } from '_src/ui/app/hooks/useAutoLockMinutes';
import FaucetRequestButton from '_src/ui/app/shared/faucet/FaucetRequestButton';
import { Link } from '_src/ui/app/shared/Link';
import { Text } from '_src/ui/app/shared/text';
import {
	ArrowUpRight12,
	Clipboard24,
	Domain24,
	Globe16,
	LockLocked24,
	More24,
} from 'rtd-apps-icons';
import SvgAccount24 from 'rtd-apps-icons/src/Account24';
import Browser from 'webextension-polyfill';

import Loading from '../../loading';
import { MenuLayout } from './MenuLayout';
import MenuListItem from './MenuListItem';

function MenuList() {
	const { locale, t } = useI18n();
	const { theme } = useTheme();
	const networkUrl = useNextMenuUrl(true, '/network');
	const autoLockUrl = useNextMenuUrl(true, '/auto-lock');
	const languageUrl = useNextMenuUrl(true, '/language');
	const themeUrl = useNextMenuUrl(true, '/theme');
	const moreOptionsUrl = useNextMenuUrl(true, '/more-options');
	const apiEnv = useAppSelector((state) => state.app.apiEnv);
	const networkKey = `network.${API_ENV_TO_INFO[apiEnv].env}` as MessageKey;
	const networkName = t(networkKey);
	const version = Browser.runtime.getManifest().version;
	const autoLockInterval = useAutoLockMinutes();
	const formattedAutoLock = (() => {
		if (typeof autoLockInterval.data !== 'number') {
			return null;
		}
		const { timer, interval } = parseAutoLock(autoLockInterval.data);
		const pluralSuffix = timer === 1 ? '' : 's';
		return t(`autoLock.${interval}${pluralSuffix}` as MessageKey, {
			count: timer,
		});
	})();

	return (
		<MenuLayout title={t('settings.title')}>
			<div className="flex flex-col divide-y divide-x-0 divide-solid divide-gray-45">
				<MenuListItem
					to={networkUrl}
					icon={<Domain24 />}
					title={t('settings.network')}
					subtitle={networkName}
				/>
				<MenuListItem
					to={autoLockUrl}
					icon={<LockLocked24 />}
					title={t('settings.autoLock')}
					subtitle={
						<Loading loading={autoLockInterval?.isPending}>
							{autoLockInterval.data === null ? t('common.notSetUp') : null}
							{formattedAutoLock}
						</Loading>
					}
				/>
				<MenuListItem
					to={themeUrl}
					icon={<span className="settings-theme-icon" aria-hidden="true" />}
					title={t('settings.appearance')}
					subtitle={t(theme === 'passion' ? 'theme.passion' : 'theme.calm')}
				/>
				<MenuListItem
					to={languageUrl}
					icon={<Globe16 className="h-6 w-6" />}
					title={t('settings.language')}
					subtitle={t(locale === 'en' ? 'language.englishNative' : 'language.chineseNative')}
				/>
				<MenuListItem icon={<Clipboard24 />} title={t('settings.faq')} href={FAQ_LINK} />
				<MenuListItem icon={<SvgAccount24 />} title={t('settings.support')} href={DISCORD_LINK} />
				<MenuListItem
					icon={<More24 className="text-steel-darker" />}
					title={t('settings.moreOptions')}
					to={moreOptionsUrl}
				/>
			</div>
			<div className="flex-1" />
			<div className="flex flex-col items-stretch mt-2.5">
				<FaucetRequestButton variant="outline" />
			</div>
			<div className="px-2.5 flex flex-col items-center justify-center no-underline gap-3.75 mt-3.75">
				<Link
					href={ToS_LINK}
					text={t('settings.terms')}
					after={<ArrowUpRight12 />}
					color="steelDark"
					weight="semibold"
				/>
				<Text variant="bodySmall" weight="medium" color="steel">
					{t('settings.version', { version })}
				</Text>
			</div>
		</MenuLayout>
	);
}

export default MenuList;
