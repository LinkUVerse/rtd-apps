// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Decode complete recorded production inventory, pagination, canonical native/archive objects and S.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const parser = require('./lib/C88-post-write-bytes.cjs'), contract = require('./lib/C99-nft-inventory-contract-v2.cjs');
const environment = require('./lib/C103-current-nft-environment.cjs');
const { normalizeStructTag } = require('rtd-typescript/utils');
const wallet = path.resolve(__dirname, '..'), logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8')), sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function main() {
  const [input, output] = process.argv.slice(2); assert(input && output && !fs.existsSync(output));
  const p = read(input), files = [__filename, path.resolve(input), path.join(__dirname, 'lib/C99-nft-inventory-contract-v2.cjs'),
    path.join(__dirname, 'lib/C88-post-write-bytes.cjs'), path.join(__dirname, 'lib/C85-post-write-bytes.cjs'),
    path.join(__dirname, 'lib/C88-full-summary.cjs'), path.join(__dirname, 'audit-C84-nft-post-write-positive.cjs'), ...environment.pins];
  assert(p.passed); for (const [f, h] of Object.entries(p.inputsSha256)) assert.equal(sha(f), h);
  const readinessFile = Object.keys(p.inputsSha256).find(f => /C99-nft-inventory-readiness-\d+\.json$/.test(f)); assert(readinessFile);
  const readiness = read(readinessFile), nativeFile = path.join(logs, '20261008-C93-recovered-native-independent-01.json'), oracle = read(nativeFile);
  assert.deepEqual(p.cases, contract.fourCases(oracle)); assert.equal(p.h0, oracle.h0); assert.equal(p.fixture, oracle.operation);
  assert.equal(p.targetCheckpoint, 696489); assert.equal(p.requests, p.frames.length);
  for (const name of ['simulations', 'signatures', 'executeRequests', 'profilesOpened', 'newContainers', 'signals']) assert.equal(p[name], 0);
  assert.equal(p.chromeAccepted, false); assert.equal(p.parentCompletion, false);
  let result;
  if (p.mode === 'uncovered-preflight-denied') {
    assert.throws(() => contract.admission(readiness, Date.parse(p.observedAt)), /Complete current NFT inventory coverage is incomplete/);
    assert.equal(p.requests, 0); assert.equal(p.sessionsCreated, 0); assert.equal(p.indexedFixtureAccepted, false);
    result = { passed: true, mode: 'uncovered-preflight-independent', actualZeroIoRefusalVerified: true,
      allFourteenCanonicalObjectsAccepted: false, indexedFixtureAccepted: false };
  } else {
    assert.equal(p.mode, 'covered-current-inventory'); contract.admission(readiness, Date.parse(p.observedAt));
    environment.validateBuild(p.buildFile, p.profileFile); environment.held(path.join(p.fixture, 'intent.json'));
    assert(p.indexedFixtureAccepted && p.originalThirteenPlusSerial95Accepted);
    assert(BigInt(p.snapshot.checkpoint) >= 696489n && p.snapshot.dependencies.length === 10);
    const binding = read(path.join(p.fixture, 'seed/route-binding.json')), addresses = read(path.join(p.fixture, 'addresses.json'));
    const extra = read(path.join(p.fixture, '../sponsored-nft-C95-20261008-01/recover-execute/nft-after.json'));
    const ids = [...oracle.nfts, ...oracle.obNfts].map(n => n.objectId).concat(
      [oracle.frameworkCap.objectId, oracle.personalCap.objectId, oracle.purchaseCap.objectId], oracle.originByte.map(k => k.tokenId), extra.objectId);
    assert.equal(ids.length, 14); assert.equal(new Set(ids).size, 14);
    const objectFrames = p.frames.filter(f => f.phase === 'fourteen indexed native exact archive objects');
    const native = parser.nativeObjects(objectFrames.filter(f => new URL(f.url).port === '41750'), ids);
    const archive = parser.exactArchiveObjects(objectFrames.filter(f => new URL(f.url).port === '42012'), native);
    const checkpoint = parser.checkpoint(objectFrames.filter(f => new URL(f.url).port === '42012'), p.snapshot);
    const graphql = parser.snapshotObjects(p.frames, p.snapshot, p.h0, native);
    assert.equal(p.freshNativeObjects.length, 14);
    for (const row of p.freshNativeObjects) { const value = native.get(row.objectId); assert(value);
      for (const name of ['objectId', 'version', 'digest', 'type', 'previousTransaction']) assert.equal(row[name], value[name]);
      assert.deepEqual(row.owner, value.owner); assert.equal(row.contentBase64, value.content.toString('base64')); assert.equal(row.objectBcsBase64, value.objectBcs.toString('base64'));
    }
    const extraCurrent = native.get(extra.objectId); for (const name of ['objectId', 'version', 'digest', 'type']) assert.equal(extraCurrent[name], extra[name]);
    assert.deepEqual(extraCurrent.owner, extra.owner); assert.equal(extraCurrent.content.toString('base64'), extra.contentBase64);
    // Independently collect complete one-item NFT pages for every role and both NFT types.
    const pages = {};
    for (const role of ['source', 'existingTarget', 'newTarget', 'sponsor']) {
      assert.equal(p.owners[role].address, addresses[role]); pages[role] = {};
      for (const [key, type] of [['direct', binding.nftType], ['directOriginByteNFT', binding.oldNftPackage + '::migration_nft::MigrationNFT']]) {
        const selected = [];
        for (const frame of p.frames.filter(f => f.phase === 'complete four-role inventories' && f.url.endsWith('/graphql'))) {
          const request = JSON.parse(parser.base64(frame.requestBase64)), response = JSON.parse(parser.base64(frame.responseBase64));
          if (request.variables?.owner !== addresses[role] || !request.variables.filter?.type || normalizeStructTag(request.variables.filter.type) !== normalizeStructTag(type) || request.variables.pageSize !== 1) continue;
          assert(response.data && !response.errors); const data = response.data.walletSnapshot;
          assert.equal(String(data.sequenceNumber), p.snapshot.checkpoint); assert.equal(data.digest, p.snapshot.digest);
          const address = data.query.address; assert.equal(address.address, addresses[role]); selected.push({ variables: request.variables, connection: address.objects });
        }
        assert(selected.length > 0); let cursor = null; const collected = [], cursors = new Set();
        for (let i = 0; i < selected.length; i++) { const { variables, connection } = selected[i]; assert.equal(variables.cursor, cursor);
          assert(Array.isArray(connection.nodes) && connection.nodes.length <= 1); assert.equal(typeof connection.pageInfo.hasNextPage, 'boolean');
          for (const node of connection.nodes) { assert.equal(node.owner.__typename, 'AddressOwner'); assert.equal(node.owner.address.address, addresses[role]); assert.equal(normalizeStructTag(node.contents.type.repr), normalizeStructTag(type)); collected.push(node.address); }
          cursor = connection.pageInfo.endCursor;
          if (connection.pageInfo.hasNextPage) { assert(typeof cursor === 'string' && cursor && !cursors.has(cursor)); cursors.add(cursor); assert(i < selected.length - 1); }
          else assert.equal(i, selected.length - 1);
        }
        assert.equal(new Set(collected).size, collected.length); assert.deepEqual(collected, p.owners[role][key].map(n => n.objectId));
        pages[role][key] = { completePages: selected.length, ids: collected };
      }
    }
    assert.deepEqual(pages.source.direct.ids, [p.cases[0].objectId]); assert.deepEqual(pages.newTarget.direct.ids, [extra.objectId]);
    const before = ['original-objects', 'policy'].flatMap(n => read(path.join(p.fixture, 'inspect/' + n + '.json')));
    assert.equal(before.length, 14); const original = parser.nativeObjects(p.frames.filter(f => f.phase === 'original thirteen objects and policy unchanged'), before.map(o => o.objectId));
    for (const expected of before) { const value = original.get(expected.objectId); for (const key of ['objectId', 'version', 'digest', 'type']) assert.equal(value[key], expected[key]); assert.deepEqual(value.owner, expected.owner); assert.equal(value.content.toString('base64'), expected.contentBase64); }
    result = { passed: true, mode: 'covered-current-inventory-independent', allFourteenCanonicalObjectsAccepted: true,
      indexedFixtureAccepted: true, canonicalNativeObjects: native.size, fixedArchiveVersions: archive.fixedVersions,
      original13AndPolicyCanonicalHeld: true, extraSerial95Included: true, completeFourRoleNFTPages: pages, checkpoint, graphql };
  }
  result.observedAt = new Date().toISOString(); result.chromeAccepted = false; result.parentCompletion = false;
  result.inputsSha256 = Object.fromEntries([...files, readinessFile, nativeFile].map(f => [path.resolve(f), sha(f)]));
  fs.writeFileSync(output, JSON.stringify(result, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ passed: result.passed, mode: result.mode, allFourteenCanonicalObjectsAccepted: result.allFourteenCanonicalObjectsAccepted }));
}
if (require.main === module) main();
module.exports = { main };
