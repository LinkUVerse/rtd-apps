// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createMessage } from '_messages';
import { NEVER, of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BackgroundClient } from '.';

const { connectToBackgroundService } = vi.hoisted(() => ({
	connectToBackgroundService: vi.fn(),
}));

vi.mock('_messaging/PortStream', () => ({
	PortStream: { connectToBackgroundService },
}));
vi.mock('_redux/store/thunk-extras', () => ({
	thunkExtras: { background: {} },
}));
vi.mock('_redux/slices/app', () => ({
	changeActiveNetwork: vi.fn(),
	setActiveOrigin: vi.fn(),
}));
vi.mock('_redux/slices/permissions', () => ({ setPermissions: vi.fn() }));
vi.mock('_redux/slices/transaction-requests', () => ({
	setTransactionRequests: vi.fn(),
}));
vi.mock('../experimentation/feature-gating', () => ({
	growthbook: { setAttributes: vi.fn(), setFeatures: vi.fn() },
}));
vi.mock('../helpers/query-client-keys', () => ({ accountsQueryKey: ['accounts'] }));
vi.mock('../helpers/queryClient', () => ({
	queryClient: { invalidateQueries: vi.fn() },
}));
vi.mock('../hooks/useAccountSources', () => ({
	accountSourcesQueryKey: ['accountSources'],
}));

function createPortStream(sendMessage: ReturnType<typeof vi.fn>, connected = true) {
	return {
		connected,
		onDisconnect: NEVER,
		onMessage: NEVER,
		sendMessage,
	};
}

describe('BackgroundClient port reconnection', () => {
	beforeEach(() => {
		connectToBackgroundService.mockReset();
	});

	it('reconnects and retries when Edge invalidates a port before onDisconnect is delivered', async () => {
		const disconnectedPort = createPortStream(
			vi.fn(() => {
				throw new Error('Attempting to use a disconnected port object');
			}),
		);
		const replacementSend = vi.fn((message) => of(createMessage({ type: 'done' }, message.id)));
		const replacementPort = createPortStream(replacementSend);
		connectToBackgroundService.mockReturnValue(replacementPort);
		const client = new BackgroundClient();
		Reflect.set(client, '_portStream', disconnectedPort);

		await expect(client.setAutoLockMinutes({ minutes: 30 })).resolves.toMatchObject({
			payload: { type: 'done' },
		});

		expect(connectToBackgroundService).toHaveBeenCalledOnce();
		expect(replacementSend).toHaveBeenCalledOnce();
		expect(replacementSend.mock.calls[0][0].payload).toEqual({
			type: 'method-payload',
			method: 'setAutoLockMinutes',
			args: { minutes: 30 },
		});
	});

	it('does not retry unrelated postMessage errors', () => {
		const port = createPortStream(
			vi.fn(() => {
				throw new Error('The message could not be cloned');
			}),
		);
		const client = new BackgroundClient();
		Reflect.set(client, '_portStream', port);

		expect(() => client.setAutoLockMinutes({ minutes: 30 })).toThrow(
			'The message could not be cloned',
		);
		expect(connectToBackgroundService).not.toHaveBeenCalled();
	});
});
