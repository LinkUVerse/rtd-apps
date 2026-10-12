import { act, createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { useOnrampProviders } from './useOnrampProviders';
const mocks = vi.hoisted(() => ({ support:vi.fn(), feature:vi.fn(() => true) }));
vi.mock('@growthbook/growthbook-react', () => ({useFeatureIsOn:mocks.feature}));
vi.mock('_src/ui/app/experimentation/feature-gating', () => ({growthbook:{getFeatureValue:mocks.support}}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(() => vi.unstubAllGlobals());
it('remote enablement and persisted provider keys cannot expose an unverified RTD purchase provider', async () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch',fetch);
  vi.stubGlobal('localStorage',{getItem:()=>'moonpay',setItem:vi.fn()});
  const client = new QueryClient({defaultOptions:{queries:{retry:false}}});
  client.setQueryData(['onramp','get-providers'],['moonpay','banxa']);
  const container = document.createElement('div'), root = createRoot(container);
  function View() {
    const result = useOnrampProviders();
    return h('pre',null,JSON.stringify({unavailable:result.unavailable,providers:result.providers?.map(p=>p.key)}));
  }
  try {
    await act(async()=>root.render(h(QueryClientProvider,{client,children:h(View)})));
    expect(JSON.parse(container.textContent!)).toEqual({unavailable:true,providers:[]});
    expect(mocks.feature).toHaveBeenCalledWith('wallet-onramp');
    expect(mocks.support).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  } finally {await act(async()=>root.unmount());client.clear();}
});
