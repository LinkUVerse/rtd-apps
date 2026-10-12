// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Synthetic post-write cases built from retained public facts; no network or profile.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const contract = require('./lib/C53-post-write-contract.cjs');
const logs = path.resolve(__dirname, '../migrationToGRpcOrGraphQLDoc/workLog');
const read = file => JSON.parse(fs.readFileSync(file));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const [output] = process.argv.slice(2);
assert(output && !fs.existsSync(output));
const oracleFile = path.join(logs, '20261007-C43-nonempty-kiosk-native-independent-01.json');
const executionFile = path.join(logs, '20261007-C48-nft-execution-browser-independent-02.json');
const inventoryFile = path.join(logs, '20261007-C46-nonempty-kiosk-indexed-02.json');
const oracle = read(oracleFile), execution = read(executionFile), historical = read(inventoryFile);
assert(oracle.passed && execution.passed && historical.passed);
const originalItems = [...historical.direct, ...historical.sourceKiosks.flatMap(k => k.items)];
const source = { address: oracle.addresses.source, kiosks: clone(historical.sourceKiosks), direct: [] };
const retained = new Set(oracle.nfts.filter(n => ['3', '4'].includes(n.value.serial)).map(n => n.objectId));
for (const kiosk of source.kiosks) kiosk.items = kiosk.items.filter(n => retained.has(n.objectId));
const moved = id => {
  const native = execution.currentTransferredNFTs.find(n => n.objectId === id);
  return { ...clone(originalItems.find(n => n.objectId === id)), ...clone(native), kioskId: native.targetKiosk ?? undefined };
};
const existing = { address: oracle.addresses.existingTarget, kiosks: clone(historical.existingTargetKiosks),
  direct: execution.sixFirstDispatches.filter(row => !row.label.startsWith('originbyte-')).map(row => moved(row.objectId)) };
const existingOB = execution.sixFirstDispatches.find(row => row.label === 'originbyte-existing-target');
existing.kiosks[0].items = [moved(existingOB.objectId)];
const newOB = execution.sixFirstDispatches.find(row => row.label === 'originbyte-new-target');
const newTarget = { address: oracle.addresses.newTarget, direct: [], kiosks: [{ ...clone(existing.kiosks[0]),
  owner: oracle.addresses.newTarget, kioskId: execution.currentTransferredNFTs.find(n => n.objectId === newOB.objectId).targetKiosk,
  ownerTokenId: '0x' + 'ab'.repeat(32), items: [moved(newOB.objectId)] }] };
const baseline = { source, existingTarget: existing, newTarget };
const checks = [];
assert.equal(contract.inventory(oracle, execution, baseline).length, 8);
checks.push('synthetic exact post-six-write distribution accepted as contract only');
const reject = (label, change) => {
  const owners = clone(baseline); change(owners);
  assert.throws(() => contract.inventory(oracle, execution, owners)); checks.push(label);
};
reject('pristine eight-source inventory rejected', owners => { owners.source.kiosks = clone(historical.sourceKiosks); owners.source.direct = clone(historical.direct); });
reject('missing direct NFT rejected', owners => owners.existingTarget.direct.pop());
reject('duplicate direct NFT rejected', owners => owners.existingTarget.direct.push(clone(owners.existingTarget.direct[0])));
reject('missing source Kiosk rejected', owners => owners.source.kiosks.pop());
reject('extra target Kiosk rejected', owners => owners.newTarget.kiosks.push(clone(owners.newTarget.kiosks[0])));
reject('wrong framework cap rejected', owners => { owners.source.kiosks.find(k => k.kind === 'framework' && !k.ownerCap.isPersonal).ownerCap.objectId = 'wrong'; });
reject('wrong Personal cap rejected', owners => { owners.source.kiosks.find(k => k.kind === 'framework' && k.ownerCap.isPersonal).ownerCap.objectId = 'wrong'; });
reject('Personal old item rejected', owners => owners.source.kiosks.find(k => k.kind === 'framework' && k.ownerCap.isPersonal).items.push(moved(execution.sixFirstDispatches.find(r => r.label === 'personal').objectId)));
reject('OB source old item rejected', owners => owners.source.kiosks.find(k => k.kind === 'originbyte').items.push(moved(existingOB.objectId)));
reject('wrong target owner rejected', owners => { owners.newTarget.kiosks[0].owner = oracle.addresses.source; });
reject('wrong target ID rejected', owners => { owners.newTarget.kiosks[0].kioskId = 'wrong'; });
reject('wrong existing target token rejected', owners => { owners.existingTarget.kiosks[0].ownerTokenId = '0x' + 'cd'.repeat(32); });
reject('missing new target token rejected', owners => { delete owners.newTarget.kiosks[0].ownerTokenId; });
reject('wrong item target rejected', owners => { owners.newTarget.kiosks[0].items[0].kioskId = 'wrong'; });
reject('unregistered OB NFT rejected', owners => { owners.newTarget.kiosks[0].items[0].originByteRegistered = false; });
reject('exclusive target NFT rejected', owners => { owners.newTarget.kiosks[0].items[0].originByteExclusive = true; });
const lockedID = oracle.nfts.find(n => n.value.serial === '3').objectId;
const exclusiveID = oracle.nfts.find(n => n.value.serial === '4').objectId;
reject('lost original lock rejected', owners => { owners.source.kiosks.flatMap(k => k.items).find(n => n.objectId === lockedID).isLocked = false; });
reject('lost original exclusive listing rejected', owners => { owners.source.kiosks.flatMap(k => k.items).find(n => n.objectId === exclusiveID).listing.isExclusive = false; });
reject('changed original listing price rejected', owners => { owners.source.kiosks.flatMap(k => k.items).find(n => n.objectId === exclusiveID).listing.price = '999999'; });
for (const field of ['version', 'digest', 'previousTransaction']) reject('wrong moved ' + field + ' rejected', owners => { owners.existingTarget.direct[0][field] = 'wrong'; });
reject('wrong moved canonical owner rejected', owners => { owners.existingTarget.direct[0].owner.AddressOwner = oracle.addresses.source; });
const gates = Object.fromEntries(['committedPublication', 'hbase14', 'sql23', 'rocks4', 'display',
  'declaredAndNativeAssetWindow', 'accountHistoryWindow'].map(name => [name, true]));
const readiness = { passed: true, h0: execution.h0, generation: execution.generation, targetCheckpoint: 524022,
  currentWalletContainers: 29, healthyChecks: 14, observedAt: '2026-10-07T15:00:00.000Z', coverageGates: gates,
  infrastructureReadyForProductionProbe: true };
const wallTime = Date.parse('2026-10-07T15:00:01.000Z');
contract.admission(readiness, execution, wallTime); checks.push('all exact fresh seven gates required before IO');
for (const key of Object.keys(gates)) {
  assert.throws(() => contract.admission({ ...readiness, coverageGates: { ...gates, [key]: false } }, execution, wallTime));
  checks.push('each missing coverage ' + key + ' rejects');
}
for (const [label, change] of [
  ['old minimum', { targetCheckpoint: 424677 }], ['wrong chain', { h0: 'foreign' }],
  ['wrong generation', { generation: 'foreign' }], ['stale', { observedAt: '2026-10-07T14:55:00Z' }],
  ['future', { observedAt: '2026-10-07T15:00:02Z' }], ['unhealthy', { healthyChecks: 13 }]]) {
  assert.throws(() => contract.admission({ ...readiness, ...change }, execution, wallTime)); checks.push(label + ' rejects');
}
const histories = {};
for (const role of ['source', 'existingTarget', 'newTarget']) {
  const address = oracle.addresses[role];
  const expected = execution.sixFirstDispatches.filter(r => role === 'source' || r.recipient === address);
  histories[role] = { address, checkpointLo: 333000, checkpointHi: 524022, coverage: {
    registrationComplete: false, completeForRegisteredKiosks: true,
    completeForDiscoveredOwnerTokens: true, completeForDiscoveredCapabilities: true,
    allAccountActivityCertified: false, allAccountTransfersCertified: false },
    totalTransactions: expected.length, transactions: expected.map(r => ({ digest: r.digest,
      checkpoint: Number(execution.nativeReceipts.find(n => n.digest === r.digest).checkpoint), status: 'SUCCESS',
      sender: oracle.addresses.source, nativeTransaction: { syntheticFixture: true }, kioskTransfers: null })) };
}
contract.histories(oracle, execution, histories); checks.push('separate complete supported six five one windows preserve actual false global flags');
const nullable = clone(histories); nullable.source.coverage.allAccountTransfersCertified = null;
contract.histories(oracle, execution, nullable); checks.push('nullable global transfer certification is preserved');
for (const [label, change] of [
  ['missing account participation', h => { h.existingTarget.transactions.pop(); h.existingTarget.totalTransactions--; }],
  ['wrong receipt checkpoint', h => { h.source.transactions[0].checkpoint--; }],
  ['missing native fact', h => { delete h.source.transactions[0].nativeTransaction; }],
  ['missing Kiosk fact', h => { delete h.source.transactions[0].kioskTransfers; }],
  ['upgraded whole-account claim', h => { h.source.coverage.allAccountActivityCertified = true; }],
  ['upgraded whole-transfer claim', h => { h.source.coverage.allAccountTransfersCertified = true; }],
  ['upgraded registration claim', h => { h.source.coverage.registrationComplete = true; }],
  ['incomplete registered Kiosk window', h => { h.source.coverage.completeForRegisteredKiosks = false; }],
  ['incomplete discovered Token window', h => { h.existingTarget.coverage.completeForDiscoveredOwnerTokens = false; }],
  ['incomplete discovered capability window', h => { h.newTarget.coverage.completeForDiscoveredCapabilities = false; }],
  ['lagging history', h => { h.newTarget.checkpointHi = 524021; }]]) {
  const history = clone(histories); change(history); assert.throws(() => contract.histories(oracle, execution, history)); checks.push(label + ' rejects');
}
const files = [__filename, path.join(__dirname, 'lib/C53-post-write-contract.cjs'), oracleFile, executionFile, inventoryFile];
const result = { passed: true, observedAt: new Date().toISOString(), checksPassed: checks.length, checks,
  postWriteIndexAccepted: false, profilesOpened: 0, networkRequests: 0, simulations: 0, signatures: 0, executeRequests: 0,
  inputsSha256: Object.fromEntries(files.map(file => [file, sha(file)])),
  scope: 'Synthetic post-write inventory/admission/history contract tests from retained public original/native facts. Historical inventory is only fixture input; no current inventory, native response or indexed/Chrome acceptance is claimed. No network, private keys or profile access.' };
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ passed: true, checksPassed: checks.length, postWriteIndexAccepted: false }));
