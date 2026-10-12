// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Independent captured-response checks; never treat negative readiness as inventory acceptance.
const fs = require('node:fs'), path = require('node:path');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const [input, output] = process.argv.slice(2);
assert(input && output && !fs.existsSync(output));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const read = f => JSON.parse(fs.readFileSync(f));
const p = read(input);
assert(p.passed && p.mode === 'uncovered-fixture-denied' && p.rejectionReason === 'coverage');
assert(p.actualProductionMinimumCheckpointDenied && p.targetCheckpoint === 424677);
assert(!p.indexedFixtureAccepted && !p.chromeAccepted && !p.parentCompletion);
for (const key of ['profilesOpened', 'simulations', 'signatures', 'executeRequests']) assert.equal(p[key], 0);
for (const [f, h] of Object.entries(p.inputsSha256)) assert.equal(sha(f), h);
assert.equal(p.frames.length, 1);
const frame = p.frames[0];
assert.equal(frame.url, 'http://127.0.0.1:41954/graphql'); assert.equal(frame.status, 200);
const decode = x => JSON.parse(Buffer.from(x, 'base64').toString());
const request = decode(frame.requestBase64), response = decode(frame.responseBase64);
assert(request.query.includes('query WalletSnapshotAdmission') && !response.errors);
const d = response.data; assert.equal(d.walletGenesis.digest, p.h0);
const dependencies = [['Address','balances'], ['Address','dynamicField'], ['Address','dynamicFields'],
  ['Address','dynamicObjectField'], ['Address','objects'], ['MoveObject','contents'], ['MoveValue','display'],
  ['Query','checkpoints'], ['Query','coinMetadata'], ['Query','object']];
const ranges = dependencies.map(([type, field], i) => {
  assert(request.query.includes(`type: "${type}", field: "${field}"`));
  const r = d.serviceConfig[`range${i}`], lo = r.first.sequenceNumber, hi = r.last.sequenceNumber;
  assert(Number.isSafeInteger(lo) && Number.isSafeInteger(hi) && lo >= 0 && lo <= hi);
  return { type, field, lo, hi };
});
const lo = Math.max(...ranges.map(r => r.lo)), hi = Math.min(...ranges.map(r => r.hi));
assert(lo <= hi && hi < 424677 && d.walletHead.sequenceNumber >= hi);
const display = d.walletDisplayService.displayHistory;
assert.equal(display.apiVersion, 1); assert.deepEqual(display.supportedTemplateKinds, ['V1','V2']);
assert.equal(display.coverage.genesisDigest, p.h0);
assert.equal(display.coverage.generation, 'dev-20261006-03');
assert.equal(display.coverage.snapshotCheckpoint, d.walletHead.sequenceNumber);
assert.equal(display.coverage.snapshotCheckpointDigest, d.walletHead.digest);
assert(display.coverage.firstCheckpoint <= lo && display.coverage.lastCheckpoint >= hi);
const proof = { passed: true, observedAt: new Date().toISOString(), h0: p.h0,
  targetCheckpoint: 424677, commonLo: lo, commonHi: hi, ranges, display,
  actualProductionMinimumCheckpointDenied: true, inputsHeld: true,
  indexedFixtureAccepted: false, chromeAccepted: false, parentCompletion: false,
  profilesOpened: 0, simulations: 0, signatures: 0, executeRequests: 0,
  inputsSha256: Object.fromEntries([__filename, path.resolve(input)].map(f => [f, sha(f)])),
  scope: 'Independent actual captured production GraphQL ten-domain/head/Display response and minimum424677 refusal. No positive inventory, Chrome, marker or execution acceptance.' };
fs.writeFileSync(output, JSON.stringify(proof, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ passed: true, commonLo: lo, commonHi: hi }));
