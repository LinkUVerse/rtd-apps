// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Parse literal constants; never execute a bundle to inspect its configuration.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const ts = require('typescript');

function verify({ extension, profileFile }) {
  const profileBytes = fs.readFileSync(profileFile);
  const profile = JSON.parse(profileBytes);
  assert.equal(profile.id, 'certified-wallet-dev');
  assert.equal(profile.expectedGenesisDigest, '3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj');
  const bundles = {};
  const uiBundles = ['ui.js'];
  for (const name of fs.readdirSync(extension).filter(name => name.endsWith('.js.map'))) {
    const map = JSON.parse(fs.readFileSync(path.join(extension, name), 'utf8'));
    if (map.sources?.some(source => /\/ui\/index\.tsx(?:\?|$)/.test(source))) uiBundles.push(name.slice(0, -4));
  }
  const selected = Array.from(new Set(uiBundles.concat(['background.js'])));
  for (const name of selected) {
    const text = fs.readFileSync(path.join(extension, name), 'utf8');
    const tree = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    assert.equal(tree.parseDiagnostics.length, 0, 'Bundle must parse before profile inspection');
    let matches = 0;
    function visit(node) {
      if (ts.isStringLiteral(node) && node.text.includes(profile.id)) {
        let registry;
        try { registry = JSON.parse(node.text); } catch {}
        if (registry?.local) {
          assert.deepEqual(registry, { local: profile }, 'Compiled Local registry differs from reviewed profile');
          matches++;
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
    bundles[name] = { sha256: crypto.createHash('sha256').update(text).digest('hex'), registryMatches: matches };
  }
  assert(bundles['background.js'].registryMatches > 0, 'Reviewed Local profile missing from background');
  assert(Array.from(new Set(uiBundles)).some(name => bundles[name].registryMatches > 0), 'Reviewed Local profile missing from UI source-map closure');
  return { passed: true, profileId: profile.id, profileRevision: profile.revision,
    profileSha256: crypto.createHash('sha256').update(profileBytes).digest('hex'), bundles, uiBundles: Array.from(new Set(uiBundles)),
    scope: 'AST literal equality for compiled Local profile; not network or Chrome acceptance' };
}
module.exports = verify;
if (require.main === module) {
  try { console.log(JSON.stringify(verify({ extension: process.argv[2], profileFile: process.argv[3] }))); }
  catch (error) { console.error(JSON.stringify({ passed: false, errorType: error.name })); process.exitCode = 1; }
}
