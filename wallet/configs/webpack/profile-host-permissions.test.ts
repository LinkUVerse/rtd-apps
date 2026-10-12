// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { profileFixture } from '../../src/shared/rpc/profile-fixture';
import { builtinHostPermissions } from './profile-host-permissions';

describe('built-in manifest host permissions', () => {
  it('includes all four configured services, preserving explicit ports', () => {
    const profile = profileFixture();
    profile.endpoints = {
      fullnodeGrpcWeb: 'http://127.0.0.1:41750',
      graphqlUrl: 'http://127.0.0.1:41954/graphql',
      archiveGrpcWeb: 'http://127.0.0.1:41955/archive',
      accountHistoryUrl: 'http://127.0.0.1:41956/account/graphql',
    };
    expect(builtinHostPermissions(JSON.stringify({ local: profile }))).toEqual([
      'http://127.0.0.1:41750/*', 'http://127.0.0.1:41954/*',
      'http://127.0.0.1:41955/*', 'http://127.0.0.1:41956/*',
    ]);
  });

  it('unifies shared origins across services and networks, includes faucet but not explorer', () => {
    const profile = profileFixture();
    profile.faucetUrl = 'http://127.0.0.1:9123';
    profile.explorerUrl = 'https://explorer.example/';
    expect(builtinHostPermissions(JSON.stringify({ local: profile, testNet: profile }))).toEqual([
      'http://127.0.0.1:9000/*', 'http://127.0.0.1:9123/*', 'https://localhost:9001/*',
    ]);
  });

  it.each([undefined, '', '  ', '{}'])('leaves unconfigured builds without old fallback permissions: %s', raw => {
    expect(builtinHostPermissions(raw)).toEqual([]);
  });

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
