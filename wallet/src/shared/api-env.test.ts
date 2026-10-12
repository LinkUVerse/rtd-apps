import { expect, it } from 'vitest';
import { API_ENV, toPublicNetwork } from './api-env';
import { profileFixture } from './rpc/profile-fixture';
it('page-facing status contains the explicit chain label but no deployment profile or URLs', () => {
  expect(toPublicNetwork({ env: API_ENV.customRPC, customRpcUrl: 'http://private-host', profile: profileFixture() }))
    .toEqual({ env: API_ENV.customRPC, customRpcUrl: '', walletStandardChain: 'rtd:localnet' });
});
