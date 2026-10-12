// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
const assert = require('node:assert/strict');
const gateNames = ['committedPublication', 'hbase14', 'sql23', 'rocks4', 'display',
  'declaredAndNativeAssetWindow', 'accountHistoryWindow'];

function coverage(proof) {
  const uint = v => assert(Number.isSafeInteger(v) && v >= 0, 'Invalid durable coverage height');
  const { durable, effectiveAssetWindow: window, accountCoverage: account, targetCheckpoint: target } = proof;
  uint(proof.publishedHi); uint(target);
  for (const [name, count] of [['hbase', 14], ['sql', 23], ['rocks', 4]]) {
    assert.equal(Object.keys(durable[name]).length, count); Object.values(durable[name]).forEach(uint);
  }
  uint(durable.display.checkpointHi); uint(window.commonLo); uint(window.commonHi);
  if (account !== null) { uint(account.checkpointLo); uint(account.checkpointHi); }
  return { committedPublication: proof.publishedHi >= target,
    hbase14: Math.min(...Object.values(durable.hbase)) >= target,
    sql23: Math.min(...Object.values(durable.sql)) >= target,
    rocks4: Math.min(...Object.values(durable.rocks)) >= target,
    display: durable.display.checkpointHi >= target,
    declaredAndNativeAssetWindow: window.commonLo <= window.commonHi && window.commonHi >= target,
    accountHistoryWindow: account !== null && account.checkpointLo <= target && target <= account.checkpointHi };
}

function admission(proof, now = Date.now()) {
  assert(proof.passed === true && proof.targetCheckpoint === 696489);
  assert.deepEqual(proof.originalTargetCheckpoints, { C93Seed: 687127, C95SponsoredNFT: 696489 });
  const age = now - Date.parse(proof.observedAt);
  assert(Number.isFinite(age) && age >= 0 && age < 300000, 'Current inventory coverage is stale');
  assert.equal(proof.extraSerial95IncludedInTarget, true);
  assert.deepEqual(Object.keys(proof.coverageGates).sort(), [...gateNames].sort());
  assert(Object.values(proof.coverageGates).every(v => typeof v === 'boolean'));
  assert.deepEqual(proof.coverageGates, coverage(proof), 'Claimed gates differ from full durable coverage');
  const ready = gateNames.every(k => proof.coverageGates[k] === true);
  assert.equal(proof.infrastructureReadyForProductionProbe, ready);
  assert.deepEqual(proof.missingGates, gateNames.filter(k => !proof.coverageGates[k]));
  if (!ready) throw Error('Complete current NFT inventory coverage is incomplete');
  assert.equal(proof.currentWalletContainers, 116); assert.equal(proof.currentOriginalThirtyPlusSixScopeHeld, true); assert.equal(proof.actualFixedArchiveDependenciesHealthy, 6); assert.equal(proof.actualCurrentAll24FoundationsHealthy, true);
  assert.equal(proof.profilesOpened, 0);
  return true;
}

function fourCases(oracle) {
  const nft = serial => { const rows = oracle.nfts.filter(n => n.value.serial === serial); assert.equal(rows.length, 1); return rows[0]; };
  const ob = oracle.obNfts.filter(n => n.value.serial === '1'); assert.equal(ob.length, 1);
  const cases = [
    { name: 'direct', route: 'direct', nft: nft('6') },
    { name: 'framework', route: 'framework-kiosk', nft: nft('1') },
    { name: 'personal', route: 'personal-kiosk', nft: nft('5') },
    { name: 'originbyte', route: 'originbyte-kiosk', nft: ob[0] },
  ];
  assert.equal(new Set(cases.map(c => c.nft.objectId)).size, 4);
  assert.deepEqual(cases[0].nft.owner, { $kind: 'AddressOwner', AddressOwner: oracle.addresses.source });
  return cases.map(c => ({ name: c.name, route: c.route, objectId: c.nft.objectId, serial: c.nft.value.serial }));
}

module.exports = { admission, fourCases, gateNames, coverage };
