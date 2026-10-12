// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Full production inventory; uncovered admission denies before any session or network request.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), cp = require('node:child_process');
const contract = require('./lib/C99-nft-inventory-contract-v2.cjs');
const environment = require('./lib/C103-current-nft-environment.cjs');
const wallet = path.resolve(__dirname, '..'), root = path.resolve(wallet, '../..');
const logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function record(file, value) {
  const fd = fs.openSync(file, 'wx', 0o600);
  try { fs.writeFileSync(fd, JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2) + '\n'); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  const dir = fs.openSync(path.dirname(file), 'r'); try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); }
}
async function main() {
  const [readinessFile, output] = process.argv.slice(2); assert(readinessFile && output && !fs.existsSync(output));
  const readiness = read(readinessFile);
  const nativeFile = path.join(logs, '20261008-C93-recovered-native-independent-01.json');
  const oracle = read(nativeFile);
  const files = [__filename, path.resolve(readinessFile), nativeFile,
    path.join(__dirname, 'lib/C99-nft-inventory-contract-v2.cjs'), ...environment.pins];
  for (const proof of [readiness, oracle]) {
    assert(proof.passed); for (const [file, hash] of Object.entries(proof.inputsSha256)) assert.equal(sha(file), hash);
  }
  assert.equal(readiness.fixture, oracle.operation); assert.equal(readiness.h0, oracle.h0);
  const cases = contract.fourCases(oracle);
  let session, phase = 'admission', proof, requests = 0;
  const frames = [], fetch0 = globalThis.fetch;
  try {
    if (!readiness.infrastructureReadyForProductionProbe) {
      assert.throws(() => contract.admission(readiness), /Complete current NFT inventory coverage is incomplete/);
      proof = { passed: true, mode: 'uncovered-preflight-denied', sessionsCreated: 0,
        indexedFixtureAccepted: false, originalThirteenPlusSerial95Accepted: false };
    } else {
      contract.admission(readiness);
      const fixture = readiness.fixture, intentFile = path.join(fixture, 'intent.json'), intent = read(intentFile);
      const bindingFile = path.join(fixture, 'seed/route-binding.json'), binding = read(bindingFile);
      const buildFile = environment.buildFile, build = read(buildFile);
      const profileFile = environment.profileFile;
      const extraFile = path.join(fixture, '../sponsored-nft-C95-20261008-01/recover-execute/nft-after.json');
      assert(fs.existsSync(extraFile)); const extra = read(extraFile);
      assert(extra.owner.AddressOwner === oracle.addresses.newTarget);
      assert.equal(extra.objectId, '0xbd68011f347c85bbb3908291eb1dc3ff8960b0ad68adfdc5d785fc2bf96d11c1');
      const held = () => {
        for (const [f, h] of Object.entries({ ...intent.inputsSha256, ...intent.protectedOriginalsSha256 })) assert.equal(sha(f), h);
        assert.deepEqual(environment.validateBuild(buildFile, profileFile).sourceAfter, build.sourceAfter);
        environment.held(intentFile);
      };
      held(); files.push(intentFile, bindingFile, buildFile, profileFile, extraFile);
      const loader = require('tsx/cjs/api');
      const load = name => loader.require(path.join(wallet, 'src/shared/rpc', name + '.ts'), __filename);
      const { validateNetworkProfile } = load('profile'), { WalletReadSession } = load('session');
      const { WalletAssetReader } = load('asset-reader'), { WalletFullnodeReader } = load('fullnode-reader');
      const profile = validateNetworkProfile(read(profileFile));
      assert.equal(profile.expectedGenesisDigest, oracle.h0); assert.equal(profile.generation, readiness.generation);
      const origins = [profile.endpoints.fullnodeGrpcWeb, profile.endpoints.graphqlUrl,
        profile.endpoints.archiveGrpcWeb, profile.endpoints.accountHistoryUrl].map(v => new URL(v).origin);
      assert.deepEqual(origins, ['http://127.0.0.1:41750', 'http://127.0.0.1:42011',
        'http://127.0.0.1:42012', 'http://127.0.0.1:42013']);
      const allowed = new Set(origins);
      globalThis.fetch = async (input, init) => {
        const u = new URL(input instanceof Request ? input.url : String(input)); assert(allowed.has(u.origin));
        assert(u.pathname === '/graphql' || u.pathname === '/account/graphql' ||
          ['/GetServiceInfo', '/GetObject', '/GetCheckpoint', '/GetAvailableRange'].some(p => u.pathname.endsWith(p)));
        const body = Buffer.from(init?.body ?? []); assert(!body.toString().includes('"jsonrpc"'));
        const frame = { phase, url: u.href, startedAt: new Date().toISOString(), requestBase64: body.toString('base64') };
        requests++; frames.push(frame);
        try { const response = await fetch0(input, { ...init, credentials: 'omit', redirect: 'error',
            headers: { ...Object.fromEntries(new Headers(init?.headers)), Origin: 'chrome-extension://nbmpcfknfgjmecallhngcincnhklllpj' } }); const raw = Buffer.from(await response.clone().arrayBuffer());
          assert(raw.length <= 16 * 1024 * 1024); Object.assign(frame, { status: response.status,
            headers: Object.fromEntries(response.headers), responseBase64: raw.toString('base64'), endedAt: new Date().toISOString() }); return response;
        } catch (error) { frame.transportError = error.name; throw error; }
      };
      session = new WalletReadSession(profile);
      const reader = await WalletAssetReader.open(session, { minimumCheckpoint: '696489', timeoutMs: 60000 });
      assert(BigInt(reader.proof.checkpoint) >= 696489n); assert.equal(reader.proof.dependencies.length, 10);
      phase = 'complete four-role inventories'; const owners = {};
      for (const role of ['source', 'existingTarget', 'newTarget', 'sponsor']) {
        const address = oracle.addresses[role] ?? read(path.join(fixture, 'addresses.json'))[role]; assert(address);
        const kiosks = await reader.kiosks(address), nft = await reader.ownedObjects(address, { type: binding.nftType, pageSize: 1 });
        const obNft = await reader.ownedObjects(address, { type: binding.oldNftPackage + '::migration_nft::MigrationNFT', pageSize: 1 });
        for (const result of [kiosks, nft, obNft]) assert.equal(result.snapshot.cacheKey, reader.proof.cacheKey);
        owners[role] = { address, kiosks: kiosks.value, direct: nft.value, directOriginByteNFT: obNft.value };
      }
      assert.equal(owners.source.kiosks.length, 3); assert.equal(owners.existingTarget.kiosks.length, 1);
      assert.equal(owners.newTarget.kiosks.length, 0); assert.equal(owners.sponsor.kiosks.length, 0);
      assert.deepEqual(owners.source.direct.map(n => n.objectId), [cases[0].objectId]);
      assert.deepEqual(owners.newTarget.direct.map(n => n.objectId), [extra.objectId]);
      assert.deepEqual(owners.existingTarget.direct, []); assert.deepEqual(owners.sponsor.direct, []);
      assert(Object.values(owners).every(v => v.directOriginByteNFT.length === 0));
      for (const kiosk of oracle.kiosks) {
        const indexed = owners.source.kiosks.find(k => k.kioskId === kiosk.objectId); assert(indexed && indexed.kind === 'framework');
        const personal = kiosk.kind === 'personal'; assert.equal(indexed.ownerCap.isPersonal, personal);
        assert.equal(indexed.ownerCap.objectId, personal ? oracle.personalCap.objectId : oracle.frameworkCap.objectId);
        const expected = oracle.nfts.filter(n => personal ? n.value.serial === '5' : ['1', '2', '3', '4'].includes(n.value.serial));
        assert.deepEqual(indexed.items.map(n => n.objectId).sort(), expected.map(n => n.objectId).sort());
        for (const n of expected) { const item = indexed.items.find(i => i.objectId === n.objectId); assert.equal(item.isLocked, n.value.serial === '3');
          if (['2', '4'].includes(n.value.serial)) { assert(item.listing); assert.equal(item.listing.isExclusive, n.value.serial === '4'); assert.equal(String(item.listing.price), '1000000'); }
          else assert.equal(item.listing, undefined);
        }
      }
      for (const ob of oracle.originByte) { const role = ob.owner === oracle.addresses.source ? 'source' : 'existingTarget';
        const indexed = owners[role].kiosks.find(k => k.kioskId === ob.kioskId); assert(indexed && indexed.kind === 'originbyte');
        assert.equal(indexed.ownerTokenId, ob.tokenId);
        assert.deepEqual(indexed.items.map(i => i.objectId).sort(), (role === 'source' ? oracle.obNfts : []).map(n => n.objectId).sort());
        assert(indexed.items.every(i => i.originByteRegistered && !i.originByteExclusive));
      }
      const ids = [...oracle.nfts, ...oracle.obNfts].map(n => n.objectId).concat(
        [oracle.frameworkCap.objectId, oracle.personalCap.objectId, oracle.purchaseCap.objectId], oracle.originByte.map(k => k.tokenId), extra.objectId);
      assert.equal(ids.length, 14); assert.equal(new Set(ids).size, 14);
      phase = 'fourteen indexed native exact archive objects'; const indexed = await reader.objects(ids);
      assert.equal(indexed.snapshot.cacheKey, reader.proof.cacheKey); assert.equal(indexed.value.length, 14);
      const native = new WalletFullnodeReader(session, { timeoutMs: 60000 }), live = [];
      const { RtdGrpcClient } = require('rtd-typescript/grpc'), { bcs } = require('rtd-typescript/bcs');
      const { toBase58 } = require('rtd-typescript/utils'), { blake2b } = require('@noble/hashes/blake2.js');
      const typed = (type, value) => toBase58(blake2b(Buffer.concat([Buffer.from(type + '::'), Buffer.from(value)]), { dkLen: 32 }));
      const archive = new RtdGrpcClient({ network: profile.sdkNetwork, baseUrl: profile.endpoints.archiveGrpcWeb,
        format: 'binary', fetch: globalThis.fetch, mvr: { url: '' } });
      assert.equal((await archive.ledgerService.getServiceInfo({})).response.chainId, oracle.h0);
      for (const id of ids) { const object = await native.object(id); assert(object); const atS = indexed.value.find(o => o.objectId === id); assert(atS);
        for (const field of ['objectId', 'version', 'digest', 'type', 'previousTransaction']) assert.equal(atS[field], object[field]);
        assert.deepEqual(atS.owner, object.owner); assert.deepEqual(Buffer.from(atS.content), Buffer.from(object.content));
        const archived = (await archive.ledgerService.getObject({ objectId: id, version: BigInt(object.version),
          readMask: { paths: ['object_id', 'version', 'digest', 'owner', 'object_type', 'bcs', 'contents', 'previous_transaction'] } },
          { timeout: 20000 })).response.object;
        assert(archived && String(archived.version) === object.version && archived.digest === object.digest);
        assert.deepEqual(Buffer.from(archived.bcs.value), Buffer.from(object.objectBcs));
        assert.deepEqual(Buffer.from(archived.contents.value), Buffer.from(object.content));
        assert.equal(typed('Object', archived.bcs.value), object.digest);
        assert.deepEqual(Buffer.from(bcs.Object.serialize(bcs.Object.parse(archived.bcs.value)).toBytes()), Buffer.from(archived.bcs.value));
        live.push({ ...object, content: undefined, objectBcs: undefined, contentBase64: Buffer.from(object.content).toString('base64'), objectBcsBase64: Buffer.from(object.objectBcs).toString('base64') });
      }
      const marker = (await archive.ledgerService.getCheckpoint({ checkpointId: { oneofKind: 'sequenceNumber',
        sequenceNumber: BigInt(reader.proof.checkpoint) }, readMask: { paths: ['sequence_number', 'digest', 'summary', 'contents'] } },
        { timeout: 20000 })).response.checkpoint;
      assert.equal(String(marker.sequenceNumber), reader.proof.checkpoint); assert.equal(marker.digest, reader.proof.digest);
      assert.equal(typed('CheckpointSummary', marker.summary.bcs.value), marker.digest);
      assert.equal(typed('CheckpointContents', marker.contents.bcs.value), marker.contents.digest);
      assert.equal(marker.summary.contentDigest, marker.contents.digest);
      phase = 'original thirteen objects and policy unchanged';
      const normalize = o => ({ objectId: o.objectId, version: o.version, digest: o.digest, owner: o.owner, type: o.type, contentBase64: Buffer.from(o.content).toString('base64') });
      for (const name of ['original-objects', 'policy']) { const expected = read(path.join(fixture, 'inspect/' + name + '.json')), actual = [];
        for (const row of expected) { const object = await native.object(row.objectId); assert(object); actual.push(normalize(object)); }
        assert.deepEqual(actual, expected);
      }
      await reader.snapshot.revalidate(); held();
      proof = { passed: true, mode: 'covered-current-inventory', sessionsCreated: 1,
        indexedFixtureAccepted: true, originalThirteenPlusSerial95Accepted: true,
        snapshot: reader.proof, owners, indexedObjects: indexed.value, freshNativeObjects: live,
        original13AndPolicyHeld: true, completeFourRoleInventories: true,
        allEightNFTFiveCapabilitiesAndSerial95: true, buildFile, profileFile };
    }
  } catch (error) { proof = { passed: false, phase, errorType: error.name, message: String(error.message).slice(0, 700) }; process.exitCode = 1; }
  finally { session?.close(); globalThis.fetch = fetch0;
    Object.assign(proof, { observedAt: new Date().toISOString(), h0: readiness.h0, targetCheckpoint: 696489,
      fixture: readiness.fixture, cases, frames, requests, simulations: 0, signatures: 0, executeRequests: 0,
      profilesOpened: 0, newContainers: 0, signals: 0, chromeAccepted: false, parentCompletion: false,
      inputsSha256: Object.fromEntries(files.map(f => [path.resolve(f), sha(f)])) });
    record(output, proof); console.log(JSON.stringify({ passed: proof.passed, mode: proof.mode, requests,
      indexedFixtureAccepted: proof.indexedFixtureAccepted === true }));
  }
}
main().catch(error => { console.error(JSON.stringify({ passed: false, phase: 'preflight', errorType: error.name })); process.exitCode = 1; });
