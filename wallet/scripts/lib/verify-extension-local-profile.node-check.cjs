// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
const test = require('node:test'); // Executed explicitly, outside Vitest discovery.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const verify = require('./verify-extension-local-profile.cjs');

const profile = { id: 'certified-wallet-dev', revision: 2,
  expectedGenesisDigest: '3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj',
  endpoints: { graphqlUrl: 'https://127.0.0.1:39600/graphql' } };
function fixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wallet-compiled-profile-'));
  try {
    const profileFile = path.join(root, 'profile.json');
    fs.writeFileSync(profileFile, JSON.stringify(profile));
    const literal = JSON.stringify(JSON.stringify({ local: profile }));
    for (const name of ['ui.js', 'background.js']) fs.writeFileSync(path.join(root, name), `throw new Error('Never execute this bundle'); const registry = ${literal};`);
    run({ extension: root, profileFile });
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test('checks both escaped registry literals without executing either bundle', () => fixture(args => {
  const result = verify(args);
  assert.equal(result.passed, true);
  assert.equal(Object.keys(result.bundles).length, 2);
}));
test('missing UI or background profile refuses browser startup', () => fixture(args => {
  for (const name of ['ui.js', 'background.js']) {
    const original = fs.readFileSync(path.join(args.extension, name));
    fs.writeFileSync(path.join(args.extension, name), 'const registry = undefined;');
    assert.throws(() => verify(args), /missing from compiled bundle/);
    fs.writeFileSync(path.join(args.extension, name), original);
  }
}));
test('different endpoint or revision in one bundle cannot pass', () => fixture(args => {
  for (const changed of [{ ...profile, revision: 3 }, { ...profile, endpoints: { graphqlUrl: 'https://unreviewed.invalid/graphql' } }]) {
    fs.writeFileSync(path.join(args.extension, 'background.js'), `const registry = ${JSON.stringify(JSON.stringify({ local: changed }))};`);
    assert.throws(() => verify(args), /differs from reviewed profile/);
  }
}));
test('URLs and profile markers without a complete JSON registry are insufficient', () => fixture(args => {
  fs.writeFileSync(path.join(args.extension, 'ui.js'), `const marker = ${JSON.stringify(profile.id + ' ' + profile.endpoints.graphqlUrl)};`);
  assert.throws(() => verify(args), /missing from compiled bundle/);
}));
