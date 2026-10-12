// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { useStorageMigrationStatus } from './useStorageMigrationStatus';

const background = vi.hoisted(() => ({ getStorageMigrationStatus: vi.fn() }));
vi.mock('./useBackgroundClient', () => ({ useBackgroundClient: () => background }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const cleanups: (() => Promise<void>)[] = [];
beforeEach(() => { background.getStorageMigrationStatus.mockReset().mockResolvedValue('ready'); });
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
  vi.useRealTimers();
});

function mount() {
  const node = document.createElement('div');
  document.body.append(node);
  const root = createRoot(node);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Probe({ tick }: { tick: number }) {
    const status = useStorageMigrationStatus();
    return createElement('div', { 'data-tick': tick }, status.data ?? 'pending');
  }
  const render = async (tick: number) => {
    await act(async () => root.render(createElement(QueryClientProvider, { client }, createElement(Probe, { tick }))));
  };
  cleanups.push(async () => { await act(async () => root.unmount()); client.clear(); node.remove(); });
  return { node, client, render };
}

it('stops polling after the actual background status becomes ready', async () => {
  vi.useFakeTimers();
  const view = mount();
  await view.render(1);
  await act(async () => vi.waitFor(() => expect(view.node.textContent).toBe('ready')));
  await act(async () => vi.advanceTimersByTimeAsync(4000));
  expect(background.getStorageMigrationStatus).toHaveBeenCalledTimes(1);
});

it('rechecks ready status after a network cache clear instead of leaving the app blank', async () => {
  const view = mount();
  await view.render(1);
  await act(async () => vi.waitFor(() => expect(view.node.textContent).toBe('ready')));
  await act(async () => view.client.clear());
  await view.render(2);
  await act(async () => vi.waitFor(() => expect(view.node.textContent).toBe('ready'), { timeout: 1000 }));
  expect(background.getStorageMigrationStatus).toHaveBeenCalledTimes(2);
});
