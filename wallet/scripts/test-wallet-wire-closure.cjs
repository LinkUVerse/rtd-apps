// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { inspectSource } = require('./audit-wallet-wire-closure.cjs');
const methods = new Set(['rtd_getObject', 'sui_getObject']);
test('finds literal and static template wire names independent of call spelling', () => {
  const result = inspectSource('example.ts', 'send({ method: "rtd_getObject" }); const x = `sui_getObject`;', methods);
  assert.deepEqual(result.literals.map(x => x.method), ['rtd_getObject', 'sui_getObject']);
});
test('does not count comments, Move identifiers or TypeScript types as requests', () => {
  const result = inspectSource('example.ts', '// rtd_getObject\nconst type = "0x3::rtd_system::RtdSystemState"; interface R { jsonrpc: string }', methods);
  assert.deepEqual(result.literals, []); assert.deepEqual(result.envelopes, []);
});
test('finds both quoted and identifier envelope properties', () => {
  assert.equal(inspectSource('example.ts', 'const a = { jsonrpc: "2.0" }; const b = { "jsonrpc": "2.0" };', methods).envelopes.length, 2);
});
test('malformed emitted source is not silently skipped', () => {
  assert.throws(() => inspectSource('example.ts', 'const x = {', methods));
});
