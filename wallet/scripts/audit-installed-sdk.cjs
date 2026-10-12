#!/usr/bin/env node
// Inspect actual installed SDK dependencies, independent of sibling source node_modules.
const { createRequire } = require('node:module');
const { readFileSync, realpathSync, existsSync } = require('node:fs');
const { resolve, dirname, join } = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const wallet = resolve(process.argv[2] || process.cwd());
const walletRequire = createRequire(join(wallet, 'package.json'));
const semver = walletRequire('semver');
function packageAt(entry, expected) {
  let dir = dirname(realpathSync(entry));
  while (true) {
    const file = join(dir, 'package.json');
    if (existsSync(file)) {
      const pkg = JSON.parse(readFileSync(file, 'utf8'));
      if (pkg.name === expected && pkg.version) return { file, pkg };
    }
    const parent = dirname(dir);
    assert.notEqual(parent, dir, `No package metadata for ${expected}`);
    dir = parent;
  }
}
const entry = walletRequire.resolve('rtd-typescript/grpc');
const sdk = packageAt(entry, 'rtd-typescript');
const sdkRequire = createRequire(entry);
const dependencies = {};
for (const [name, subpath] of Object.entries({
  '@noble/hashes': '@noble/hashes/sha2.js',
  '@noble/curves': '@noble/curves/ed25519.js',
  '@scure/bip39': '@scure/bip39',
  graphql: 'graphql',
})) {
  const dep = packageAt(sdkRequire.resolve(subpath), name);
  const range = sdk.pkg.dependencies[name];
  assert.ok(semver.satisfies(dep.pkg.version, range), `${name}: ${dep.pkg.version} outside ${range}`);
  dependencies[name] = { version: dep.pkg.version, declaredRange: range, packagePath: dep.file };
}
const lock = readFileSync(join(wallet, '..', 'pnpm-lock.yaml'));
console.log(JSON.stringify({ passed: true, sdkVersion: sdk.pkg.version, sdkPackage: sdk.file,
  lockSha256: createHash('sha256').update(lock).digest('hex'), dependencies,
  scope: 'Installed SDK version ranges and module resolution; not network or browser acceptance' }, null, 2));
