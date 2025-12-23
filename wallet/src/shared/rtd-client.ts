// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import networkEnv from '_src/background/NetworkEnv';
import { API_ENV, ENV_TO_API, type NetworkEnvType } from '_src/shared/api-env';
import { SentryHttpTransport } from 'rtd-apps-core';
import { RtdClient, RtdHTTPTransport } from 'rtd-typescript/client';

const rtdClientPerNetwork = new Map<string, RtdClient>();
const SENTRY_MONITORED_ENVS = [API_ENV.mainnet];

export function getRtdClient({ env, customRpcUrl }: NetworkEnvType): RtdClient {
	const key = `${env}_${customRpcUrl}`;
	if (!rtdClientPerNetwork.has(key)) {
		const connection = customRpcUrl ? customRpcUrl : ENV_TO_API[env];
		if (!connection) {
			throw new Error(`API url not found for network env ${env} ${customRpcUrl}`);
		}
		rtdClientPerNetwork.set(
			key,
			new RtdClient({
				transport:
					!customRpcUrl && SENTRY_MONITORED_ENVS.includes(env)
						? new SentryHttpTransport(connection)
						: new RtdHTTPTransport({ url: connection }),
			}),
		);
	}
	return rtdClientPerNetwork.get(key)!;
}

export async function getActiveNetworkRtdClient(): Promise<RtdClient> {
	return getRtdClient(await networkEnv.getActiveNetwork());
}
