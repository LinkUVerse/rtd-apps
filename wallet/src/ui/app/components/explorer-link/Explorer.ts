// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { DEFAULT_API_ENV } from '_app/ApiProvider';
import { getUrlWithDeviceId } from '_src/shared/analytics/amplitude';
import { API_ENV } from '_src/shared/api-env';

const API_ENV_TO_EXPLORER_ENV: Record<API_ENV, string | undefined> = {
	[API_ENV.local]: 'local',
	[API_ENV.devNet]: 'devnet',
	[API_ENV.testNet]: 'testnet',
	[API_ENV.mainnet]: 'mainnet',
	[API_ENV.customRPC]: '',
};

const EXPLORER_LINK = 'https://rtdexplorer.com/';
const LOCAL_EXPLORER_PORT = 5180;
declare const __EXPLORER_DEV_URL__: string | undefined;
const IS_DEV_BUILD = process.env.NODE_ENV === 'development';
const LOCAL_EXPLORER_URL =
	typeof __EXPLORER_DEV_URL__ === 'string' ? __EXPLORER_DEV_URL__ : '';

/** In dev the explorer runs on this machine, next to the dev fullnode. */
function localExplorerBase(customRPC: string): string {
	if (LOCAL_EXPLORER_URL) {
		return LOCAL_EXPLORER_URL.endsWith('/') ? LOCAL_EXPLORER_URL : `${LOCAL_EXPLORER_URL}/`;
	}
	if (customRPC) {
		try {
			const url = new URL(customRPC);
			return `http://${url.hostname}:${LOCAL_EXPLORER_PORT}/`;
		} catch {
			// fall through to the loopback default
		}
	}
	return `http://127.0.0.1:${LOCAL_EXPLORER_PORT}/`;
}

//TODO - this is a temporary solution, we should have a better way to get the explorer url
function getExplorerUrl(path: string, apiEnv: API_ENV = DEFAULT_API_ENV, customRPC: string) {
	// A development wallet always talks to the locally running explorer, even
	// when the built-in network label is still mainnet/devnet.
	const isDev =
		IS_DEV_BUILD || apiEnv === API_ENV.local || apiEnv === API_ENV.customRPC;
	const url = getUrlWithDeviceId(new URL(path, isDev ? localExplorerBase(customRPC) : EXPLORER_LINK));
	if (isDev) {
		// The dev explorer derives every endpoint from its same-origin proxy.
		url.searchParams.set('network', apiEnv === API_ENV.customRPC ? customRPC : 'local');
	} else {
		const explorerEnv = API_ENV_TO_EXPLORER_ENV[apiEnv];
		if (explorerEnv) url.searchParams.append('network', explorerEnv);
	}
	return url.href;
}

export function getObjectUrl(
	objectID: string,
	apiEnv: API_ENV,
	customRPC: string,
	moduleName?: string | null,
) {
	return getExplorerUrl(
		`/object/${objectID}${moduleName ? `?module=${moduleName}` : ''}`,
		apiEnv,
		customRPC,
	);
}

export function getTransactionUrl(txDigest: string, apiEnv: API_ENV, customRPC: string) {
	return getExplorerUrl(`/txblock/${encodeURIComponent(txDigest)}`, apiEnv, customRPC);
}

export function getAddressUrl(address: string, apiEnv: API_ENV, customRPC: string) {
	return getExplorerUrl(`/address/${address}`, apiEnv, customRPC);
}

export function getValidatorUrl(address: string, apiEnv: API_ENV, customRPC: string) {
	return getExplorerUrl(`/validator/${address}`, apiEnv, customRPC);
}
