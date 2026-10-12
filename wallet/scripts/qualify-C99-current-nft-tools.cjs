// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Guard qualifications and actual no-IO driver proofs; no invented positive browser acceptance.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), cp = require('node:child_process');
const assert = require('node:assert/strict'), contract = require('./lib/C99-nft-inventory-contract-v2.cjs');
const wallet = path.resolve(__dirname, '..'), logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8')), sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function main() {
  const [output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
  const files = [__filename], checks = [], now = Date.now();
  const proofFile = path.join(logs, '20261008-C99-nft-inventory-readiness-03.json'), proof = read(proofFile);
  const oracleFile = path.join(logs, '20261008-C93-recovered-native-independent-01.json'), oracle = read(oracleFile);
  const clone = v => structuredClone(v), test = (name, fn) => { fn(); checks.push({ name, passed: true }); };
  const positive = clone(proof); positive.observedAt = new Date(now).toISOString(); positive.publishedHi = 696489;
  for (const key of ['hbase', 'sql', 'rocks']) for (const name of Object.keys(positive.durable[key])) positive.durable[key][name] = 696489;
  positive.durable.display.checkpointHi = 696489; positive.effectiveAssetWindow.commonHi = 696489; positive.accountCoverage.checkpointHi = 696489;
  positive.coverageGates = contract.coverage(positive); positive.missingGates = []; positive.infrastructureReadyForProductionProbe = true;
  test('mock complete guarded positive contract only', () => assert.equal(contract.admission(positive, now), true));
  test('actual negative full durable facts', () => { const p = clone(proof); p.observedAt = new Date(now).toISOString(); assert.throws(() => contract.admission(p, now), /coverage is incomplete/); });
  for (const key of contract.gateNames) test('missing durable gate ' + key, () => {
    const p = clone(positive);
    if (key === 'committedPublication') p.publishedHi--;
    if (key === 'hbase14') p.durable.hbase[Object.keys(p.durable.hbase)[0]]--;
    if (key === 'sql23') p.durable.sql[Object.keys(p.durable.sql)[0]]--;
    if (key === 'rocks4') p.durable.rocks[Object.keys(p.durable.rocks)[0]]--;
    if (key === 'display') p.durable.display.checkpointHi--;
    if (key === 'declaredAndNativeAssetWindow') p.effectiveAssetWindow.commonHi--;
    if (key === 'accountHistoryWindow') p.accountCoverage.checkpointHi--;
    p.coverageGates = contract.coverage(p); p.infrastructureReadyForProductionProbe = false; p.missingGates = [key];
    assert.throws(() => contract.admission(p, now), /coverage is incomplete/);
  });
  const mutations = {
    'false positive flags with missing durable coverage': p => { p.durable.hbase[Object.keys(p.durable.hbase)[0]]--; },
    'wrong target': p => { p.targetCheckpoint = 687127; },
    'omitted serial95': p => { p.extraSerial95IncludedInTarget = false; },
    'wrong original seed target': p => { p.originalTargetCheckpoints.C93Seed--; },
    'stale coverage': p => { p.observedAt = new Date(now - 300000).toISOString(); },
    'future coverage': p => { p.observedAt = new Date(now + 1).toISOString(); },
    'invalid coverage time': p => { p.observedAt = 'invalid'; },
    'missing mandatory field': p => { delete p.coverageGates.display; },
    'extra unqualified gate': p => { p.coverageGates.thinWindow = true; },
    'numeric claimed gate': p => { p.coverageGates.hbase14 = 1; },
    'fewer hbase pipelines': p => { delete p.durable.hbase[Object.keys(p.durable.hbase)[0]]; },
    'fewer sql pipelines': p => { delete p.durable.sql[Object.keys(p.durable.sql)[0]]; },
    'fewer rocks pipelines': p => { delete p.durable.rocks[Object.keys(p.durable.rocks)[0]]; },
    'boolean durable counter': p => { p.durable.sql[Object.keys(p.durable.sql)[0]] = true; },
    'nonfinite counter': p => { p.publishedHi = Infinity; },
    'negative counter': p => { p.durable.display.checkpointHi = -1; },
    'inverted asset window': p => { p.effectiveAssetWindow.commonLo = 696490; },
    'missing account coverage': p => { p.accountCoverage = null; },
    'inconsistent readiness': p => { p.infrastructureReadyForProductionProbe = false; },
    'inconsistent missing gates': p => { p.missingGates = ['hbase14']; },
    'wrong runtime health count': p => { p.healthyChecks = 13; },
    'nonzero opened profiles': p => { p.profilesOpened = 1; },
  };
  for (const [name, mutate] of Object.entries(mutations)) test(name, () => { const p = clone(positive); mutate(p); assert.throws(() => contract.admission(p, now)); });
  test('actual independent source four cases', () => assert.deepEqual(contract.fourCases(oracle).map(c => c.route), ['direct', 'framework-kiosk', 'personal-kiosk', 'originbyte-kiosk']));
  test('missing ordinary kiosk NFT rejected', () => { const p = clone(oracle); p.nfts = p.nfts.filter(n => n.value.serial !== '1'); assert.throws(() => contract.fourCases(p)); });
  test('duplicate direct NFT rejected', () => { const p = clone(oracle); p.nfts.push(clone(p.nfts.find(n => n.value.serial === '6'))); assert.throws(() => contract.fourCases(p)); });
  test('different direct owner rejected', () => { const p = clone(oracle); p.nfts.find(n => n.value.serial === '6').owner.AddressOwner = p.addresses.existingTarget; assert.throws(() => contract.fourCases(p)); });
  const actualProofs = [
    '20261008-C99-nft-inventory-preflight-02.json', '20261008-C99-nft-inventory-preflight-independent-02.json',
    '20261008-C99-four-nft-live-preflight-01.json', '20261008-C99-four-nft-live-preflight-independent-01.json',
    '20261008-C99-four-nft-durable-preflight-01.json', '20261008-C99-four-nft-durable-preflight-independent-01.json',
  ];
  for (const name of actualProofs) { const f = path.join(logs, name), p = read(f); assert(p.passed);
    for (const [file, h] of Object.entries(p.inputsSha256)) assert.equal(sha(file), h); files.push(f); }
  const sources = ['lib/C99-nft-inventory-contract.cjs', 'lib/C99-nft-inventory-contract-v2.cjs',
    'probe-C99-current-nft-inventory.cjs', 'probe-C99-current-nft-inventory-v2.cjs',
    'audit-C99-current-nft-inventory.cjs', 'test-C99-current-four-nft-M3.cjs', 'audit-C99-current-four-nft-M3.cjs'];
  for (const name of sources) { const f = path.join(__dirname, name); assert.equal(cp.spawnSync('node', ['--check', f]).status, 0); files.push(f); }
  const profileRoot = path.join(require('node:os').homedir(), '.local/state/rtd-wallet-migration/dev-20261006-03');
  assert(!fs.existsSync(path.join(profileRoot, 'current-C99-four-nft-live-20261008-01')));
  assert(!fs.existsSync(path.join(profileRoot, 'current-C99-four-nft-durable-20261008-01')));
  files.push(proofFile, oracleFile);
  const result = { passed: true, observedAt: new Date().toISOString(), preparedOnly: true, guardChecks: checks,
    guardChecksPassed: checks.length, sourceSyntaxChecks: sources.length,
    actualInventoryNoIoAndBothBrowserNoProfileDriversVerified: true, independentActualNegativeAudits: 3,
    onlyPositiveOracleMocked: true, actualCoveredInventoryAccepted: false,
    actualLiveFormsAccepted: false, actualDurableFormsAccepted: false, profilesOpened: 0,
    signatures: 0, executeRequests: 0, sourceChanged: false, newContainers: 0, parentCompletion: false,
    inputsSha256: Object.fromEntries(files.map(f => [path.resolve(f), sha(f)])) };
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ passed: true, guardChecksPassed: checks.length, actualCoveredInventoryAccepted: false }));
}
main();
