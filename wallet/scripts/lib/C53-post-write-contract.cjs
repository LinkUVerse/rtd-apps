// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Post-transfer inventory oracle only. It never performs IO or authorizes a write.
const assert = require('node:assert/strict');

function admission(readiness, execution, wallTime = Date.now()) {
  assert(readiness.passed && execution.passed);
  assert.equal(readiness.h0, execution.h0);
  assert.equal(readiness.generation, execution.generation);
  assert.equal(execution.originalExecutions, 6);
  assert.equal(readiness.targetCheckpoint, 524022);
  assert.equal(execution.maximumExecutionCheckpoint, '524022');
  assert.equal(readiness.currentWalletContainers, 29);
  assert.equal(readiness.healthyChecks, 14);
  const age = wallTime - Date.parse(readiness.observedAt);
  assert(Number.isFinite(age) && age >= 0 && age < 300000);
  const gates = ['committedPublication', 'hbase14', 'sql23', 'rocks4', 'display',
    'declaredAndNativeAssetWindow', 'accountHistoryWindow'];
  assert.deepEqual(Object.keys(readiness.coverageGates).sort(), gates.slice().sort());
  assert(gates.every(key => readiness.coverageGates[key] === true), 'Post-write coverage is incomplete');
  assert(readiness.infrastructureReadyForProductionProbe === true);
}

function inventory(oracle, execution, owners) {
  assert(oracle.passed && execution.passed && oracle.h0 === execution.h0);
  const expectedAddresses = Object.fromEntries(['source', 'existingTarget', 'newTarget'].map(role => [role, oracle.addresses[role]]));
  assert.deepEqual(Object.keys(owners).sort(), Object.keys(expectedAddresses).sort());
  for (const [role, address] of Object.entries(expectedAddresses)) assert.equal(owners[role].address, address);
  const source = owners.source;
  assert.equal(source.kiosks.length, 3);
  const framework = source.kiosks.find(k => k.kind === 'framework' && !k.ownerCap.isPersonal);
  const personal = source.kiosks.find(k => k.kind === 'framework' && k.ownerCap.isPersonal);
  const ob = source.kiosks.find(k => k.kind === 'originbyte');
  assert(framework && personal && ob);
  const originalFramework = oracle.kiosks.find(k => k.kind !== 'personal');
  const originalPersonal = oracle.kiosks.find(k => k.kind === 'personal');
  assert.equal(framework.kioskId, originalFramework.objectId);
  assert.equal(personal.kioskId, originalPersonal.objectId);
  assert.equal(framework.ownerCap.objectId, oracle.frameworkCap.objectId);
  assert.equal(personal.ownerCap.objectId, oracle.personalCap.objectId);
  assert.equal(framework.owner, expectedAddresses.source);
  assert.equal(personal.owner, expectedAddresses.source);
  const originalOB = oracle.originByte.find(k => k.owner === expectedAddresses.source);
  assert.equal(ob.kioskId, originalOB.kioskId);
  assert.equal(ob.ownerTokenId, originalOB.tokenId);
  assert.equal(ob.owner, expectedAddresses.source);
  const nft = serial => oracle.nfts.find(n => n.value.serial === serial);
  assert.deepEqual(framework.items.map(n => n.objectId).sort(), [nft('3').objectId, nft('4').objectId].sort());
  const locked = framework.items.find(n => n.objectId === nft('3').objectId);
  const exclusive = framework.items.find(n => n.objectId === nft('4').objectId);
  assert.equal(locked.isLocked, true);
  assert.equal(locked.listing, undefined);
  assert.equal(exclusive.isLocked, false);
  assert.equal(exclusive.listing?.isExclusive, true);
  assert.equal(String(exclusive.listing.price), '1000000');
  assert.deepEqual(personal.items, []);
  assert.deepEqual(ob.items, []);
  assert.deepEqual(source.direct, []);
  const directDispatches = execution.sixFirstDispatches.filter(r => !r.label.startsWith('originbyte-'));
  assert.equal(directDispatches.length, 4);
  assert(directDispatches.every(r => r.recipient === expectedAddresses.existingTarget));
  assert.deepEqual(owners.existingTarget.direct.map(n => n.objectId).sort(), directDispatches.map(r => r.objectId).sort());
  assert.deepEqual(owners.newTarget.direct, []);
  for (const role of ['existingTarget', 'newTarget']) {
    const actual = owners[role];
    const dispatch = execution.sixFirstDispatches.find(r => r.label ===
      (role === 'existingTarget' ? 'originbyte-existing-target' : 'originbyte-new-target'));
    const native = execution.currentTransferredNFTs.find(n => n.objectId === dispatch.objectId);
    assert.equal(dispatch.recipient, actual.address);
    assert.equal(actual.kiosks.length, 1);
    const kiosk = actual.kiosks[0];
    assert.equal(kiosk.kind, 'originbyte');
    assert.equal(kiosk.kioskId, native.targetKiosk);
    assert.equal(kiosk.owner, actual.address);
    assert.match(kiosk.ownerTokenId, /^0x[0-9a-f]{64}$/);
    if (role === 'existingTarget') {
      const before = oracle.originByte.find(k => k.owner === actual.address);
      assert.equal(kiosk.kioskId, before.kioskId);
      assert.equal(kiosk.ownerTokenId, before.tokenId);
    }
    assert.equal(kiosk.items.length, 1);
    const item = kiosk.items[0];
    assert.equal(item.objectId, dispatch.objectId);
    assert.equal(item.kioskId, kiosk.kioskId);
    assert.equal(item.originByteRegistered, true);
    assert.equal(item.originByteExclusive, false);
  }
  const all = Object.values(owners).flatMap(owner => [...owner.direct, ...owner.kiosks.flatMap(k => k.items)]);
  assert.equal(all.length, 8);
  assert.equal(new Set(all.map(n => n.objectId)).size, 8);
  assert.deepEqual(all.map(n => n.objectId).sort(), [...oracle.nfts, ...oracle.obNfts].map(n => n.objectId).sort());
  for (const native of execution.currentTransferredNFTs) {
    const item = all.find(n => n.objectId === native.objectId);
    assert(item);
    for (const field of ['version', 'digest', 'previousTransaction']) assert.equal(item[field], native[field]);
    assert.deepEqual(item.owner, native.owner);
  }
  return all;
}

function histories(oracle, execution, owners) {
  for (const role of ['source', 'existingTarget', 'newTarget']) {
    const address = oracle.addresses[role];
    const history = owners[role];
    assert.equal(history.address, address);
    assert(history.checkpointLo <= 522405 && history.checkpointHi >= 524022);
    assert.equal(history.totalTransactions, history.transactions.length);
    // Complete pagination of supported activity does not certify the account universe.
    // Match the primary04 contract and the actual bounded Token/Cap service.
    assert.equal(history.coverage.registrationComplete, false);
    assert.equal(history.coverage.completeForRegisteredKiosks, true);
    assert.equal(history.coverage.completeForDiscoveredOwnerTokens, true);
    assert.equal(history.coverage.completeForDiscoveredCapabilities, true);
    assert.equal(history.coverage.allAccountActivityCertified, false);
    assert([false, null].includes(history.coverage.allAccountTransfersCertified));
    const expected = execution.sixFirstDispatches.filter(row => role === 'source' || row.recipient === address);
    assert.equal(expected.length, role === 'source' ? 6 : role === 'existingTarget' ? 5 : 1);
    for (const dispatch of expected) {
      const rows = history.transactions.filter(row => row.digest === dispatch.digest);
      assert.equal(rows.length, 1);
      const receipt = execution.nativeReceipts.find(row => row.digest === dispatch.digest);
      assert.equal(rows[0].checkpoint, Number(receipt.checkpoint));
      assert.equal(rows[0].status, 'SUCCESS');
      assert.equal(rows[0].sender, oracle.addresses.source);
      assert(rows[0].nativeTransaction !== null && rows[0].nativeTransaction !== undefined);
      assert(rows[0].kioskTransfers !== undefined);
    }
  }
}

module.exports = { admission, inventory, histories };
