// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { LOCAL_DEV_ENDPOINTS } from '../../src/shared/rpc/local-dev-endpoints';
import { profileFixture } from '../../src/shared/rpc/profile-fixture';
import { builtinHostPermissions } from './profile-host-permissions';

/** The local dev stack ports are granted unconditionally so "local" works with no build configuration. */
const LOCAL_DEV_ORIGINS = Array.from(
  new Set(Object.values(LOCAL_DEV_ENDPOINTS).map((url) => `${new URL(url).origin}/*`)),
).sort();

describe('built-in manifest host permissions', () => {
  it('includes all four configured services, preserving explicit ports', () => {
    const profile = profileFixture();
    profile.endpoints = {
      fullnodeGrpcWeb: 'http://127.0.0.1:41750',
      graphqlUrl: 'http://127.0.0.1:41954/graphql',
      archiveGrpcWeb: 'http://127.0.0.1:41955/archive',
      accountHistoryUrl: 'http://127.0.0.1:41956/account/graphql',
    };
    expect(builtinHostPermissions(JSON.stringify({ local: profile }))).toEqual(
      Array.from(new Set([
        ...LOCAL_DEV_ORIGINS,
        'http://127.0.0.1:41750/*', 'http://127.0.0.1:41954/*',
        'http://127.0.0.1:41955/*', 'http://127.0.0.1:41956/*',
      ])).sort(),
    );
  });

  it('unifies shared origins across services and networks, includes faucet but not explorer', () => {
    const profile = profileFixture();
    profile.faucetUrl = 'http://127.0.0.1:9123';
    profile.explorerUrl = 'https://explorer.example/';
    expect(builtinHostPermissions(JSON.stringify({ local: profile, testNet: profile }))).toEqual(
      Array.from(new Set([
        ...LOCAL_DEV_ORIGINS,
        'http://127.0.0.1:9000/*', 'http://127.0.0.1:9123/*', 'https://localhost:9001/*',
      ])).sort(),
    );
  });

  it.each([undefined, '', '  ', '{}'])(
    'grants only the fixed local dev ports when no network is configured: %s',
    raw => {
      // No legacy fallback URL is ever expanded; the local dev stack ports are
      // the one exception, because they are the zero-configuration local entry.
      expect(builtinHostPermissions(raw)).toEqual(LOCAL_DEV_ORIGINS);
    },
  );

  it.each(['null', '[]', 'false', 'invalid'])('fails invalid registry instead of granting hosts: %s', raw => {
    expect(() => builtinHostPermissions(raw)).toThrow();
  });

  it('does not install custom or unknown networks as built-ins', () => {
    for (const key of ['customRPC', 'typo', '__proto__']) {
      expect(() => builtinHostPermissions(JSON.stringify({ [key]: profileFixture() }))).toThrow();
    }
  });

  it('requires the same complete contract as built-in selection', () => {
    const partial = profileFixture();
    delete partial.endpoints.graphqlUrl;
    expect(() => builtinHostPermissions(JSON.stringify({ local: partial }))).toThrow();
  });

  it('rejects credential-bearing endpoints and remote plaintext', () => {
    for (const endpoint of ['https://user:secret@example.com', 'http://example.com']) {
      const profile = profileFixture();
      profile.endpoints.fullnodeGrpcWeb = endpoint;
      expect(() => builtinHostPermissions(JSON.stringify({ local: profile }))).toThrow();
    }
  });
});
