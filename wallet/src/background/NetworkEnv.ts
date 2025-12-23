// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { DEFAULT_API_ENV } from '_app/ApiProvider';
import { API_ENV, type NetworkEnvType } from '_src/shared/api-env';
import { isValidUrl } from '_src/shared/utils';
import mitt from 'mitt';
import Browser from 'webextension-polyfill';

class NetworkEnv {
	#events = mitt<{ changed: NetworkEnvType }>();

	async getActiveNetwork(): Promise<NetworkEnvType> {
		const { rtd_Env, rtd_Env_RPC } = await Browser.storage.local.get({
			rtd_Env: DEFAULT_API_ENV,
			rtd_Env_RPC: null,
		});
		const adjCustomUrl = rtd_Env === API_ENV.customRPC ? rtd_Env_RPC : null;
		if (rtd_Env === API_ENV.customRPC && adjCustomUrl) {
			return { env: API_ENV.customRPC, customRpcUrl: adjCustomUrl as string };
		}
		return { env: rtd_Env as Exclude<API_ENV, API_ENV.customRPC>, customRpcUrl: null };
	}

	async setActiveNetwork(network: NetworkEnvType) {
		const { env, customRpcUrl } = network;
		if (env === API_ENV.customRPC && !isValidUrl(customRpcUrl)) {
			throw new Error(`Invalid custom RPC url ${customRpcUrl}`);
		}
		await Browser.storage.local.set({
			rtd_Env: env,
			rtd_Env_RPC: customRpcUrl,
		});
		this.#events.emit('changed', network);
	}

	on = this.#events.on;

	off = this.#events.off;
}

const networkEnv = new NetworkEnv();
export default networkEnv;
