// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RtdHTTPTransport } from 'rtd-typescript/client';
import * as Sentry from '@sentry/react';

const IGNORED_METHODS = ['rtdx_resolveNameServiceNames', 'rtdx_resolveNameServiceAddresses'];

export class SentryHttpTransport extends RtdHTTPTransport {
	#url: string;
	constructor(url: string) {
		super({ url });
		this.#url = url;
	}

	async #withRequest<T>(input: { method: string; params: unknown[] }, handler: () => Promise<T>) {
		return await Sentry.startSpan({
			name: input.method,
			op: 'http.rpc-request',
			attributes: {
				url: this.#url,
				params: JSON.stringify(input.params),
			},
		}, async (span) => {
			try {
				const res = await handler();
				span.setStatus({ code: 1 }); // OK status
				return res;
			} catch (e) {
				span.setStatus({ code: 2 }); // ERROR status
				throw e;
			}
		});
	}

	override async request<T>(input: { method: string; params: unknown[] }) {
		if (IGNORED_METHODS.includes(input.method)) {
			return super.request<T>(input);
		}

		return this.#withRequest(input, () => super.request<T>(input));
	}
}
