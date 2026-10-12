// Independent raw current GraphQL/unary frames, canonical eight objects and fresh typed S.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { GrpcTypes, RtdGrpcClient } = require('rtd-typescript/grpc');
const { bcs } = require('rtd-typescript/bcs');
const { normalizeStructTag, toBase64, toBase58 } = require('rtd-typescript/utils');
const { blake2b } = require('@noble/hashes/blake2.js');
const read = f => JSON.parse(fs.readFileSync(f));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const typed = (t, bytes) => toBase58(blake2b(Buffer.concat([Buffer.from(t + '::'), Buffer.from(bytes)]), { dkLen: 32 }));
function frame(value, codec, trailers) {
  const raw = Buffer.from(value, 'base64'); assert(raw.length >= 5 && raw[0] === 0);
  const end = 5 + raw.readUInt32BE(1); assert(end <= raw.length);
  if (trailers) { assert(raw[end] === 128 && end + 5 + raw.readUInt32BE(end + 1) === raw.length); assert.match(raw.subarray(end + 5).toString(), /(^|\r\n)grpc-status:[ \t]*0(\r\n|$)/); }
  else assert.equal(end, raw.length);
  return codec.fromBinary(raw.subarray(5, end));
}
function bytes(value) {
  if (Array.isArray(value)) return Buffer.from(value);
  assert(value && typeof value === 'object'); const keys = Object.keys(value);
  assert.deepEqual(keys, keys.map((_v, i) => String(i))); assert(Object.values(value).every(n => Number.isInteger(n) && n >= 0 && n <= 255));
  return Buffer.from(Object.values(value));
}
(async () => {
  const [proofFile, output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
  const p = read(proofFile), supplementalFrames = [], originalFetch = globalThis.fetch;
  let report = {}, stage = 'recorded independent raw frames';
  try {
    assert(p.passed && p.mode === 'covered-fixture-inventory' && p.indexedFixtureAccepted);
    assert.equal(p.targetCheckpoint, 424677); assert(BigInt(p.snapshot.checkpoint) >= 424677n);
    assert(p.profilesOpened === 0 && p.simulations === 0 && p.signatures === 0 && p.executeRequests === 0);
    for (const [f, h] of Object.entries(p.inputsSha256)) assert.equal(sha(f), h);
    const oracleFile = Object.keys(p.inputsSha256).find(f => f.endsWith('/20261007-C43-nonempty-kiosk-native-independent-01.json'));
    const buildFile = Object.keys(p.inputsSha256).find(f => f.endsWith('/20261007-default-generation-positive-C46-build-03.json'));
    const profileFile = Object.keys(p.inputsSha256).find(f => f.endsWith('/C46-isolated-browser-gateway-20261007-03/profile.json'));
    assert(oracleFile && buildFile && profileFile); const oracle = read(oracleFile), build = read(buildFile), profile = read(profileFile);
    assert(oracle.passed && build.passed); assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), build.sourceAfter);
    assert.equal(p.h0, profile.expectedGenesisDigest); assert.equal(JSON.parse(p.snapshot.bindingKey)[5], p.h0); assert.equal(JSON.parse(p.snapshot.bindingKey)[6], profile.generation);
    assert.equal(p.snapshot.dependencies.length, 10); assert.equal(p.sourceKiosks.length, 3);
    const items = [...p.sourceKiosks.flatMap(k => k.items), ...p.direct]; assert.equal(items.length, 8);
    assert.deepEqual(items.map(n => n.objectId).sort(), [...oracle.nfts, ...oracle.obNfts].map(n => n.objectId).sort());
    assert.equal(new Set(items.map(n => n.objectId)).size, 8);
    const graphs = [], refusedGraphqlFrames = [], nativeObjects = new Map(); let grpcCount = 0;
    for (const r of p.frames) {
      const u = new URL(r.url); assert.equal(u.hostname, '127.0.0.1');
      if (r.status !== 200) {
        assert.equal(u.port, '41957'); assert.equal(u.pathname, '/graphql'); assert([503, 504].includes(r.status));
        refusedGraphqlFrames.push(r); continue;
      }
      if (u.pathname === '/graphql') {
        assert.equal(u.port, '41957'); const req = JSON.parse(Buffer.from(r.requestBase64, 'base64'));
        const res = JSON.parse(Buffer.from(r.responseBase64, 'base64')); assert(!res.errors);
        if (res.data.walletGenesis) assert.equal(res.data.walletGenesis.digest, p.h0);
        if (res.data.chainIdentifier) assert.equal(res.data.chainIdentifier, p.h0);
        if (res.data.walletSnapshot) { assert.equal(String(res.data.walletSnapshot.sequenceNumber), p.snapshot.checkpoint); assert.equal(res.data.walletSnapshot.digest, p.snapshot.digest); }
        graphs.push({ request: req, data: res.data });
      } else {
        assert(['41750', '41958'].includes(u.port)); const method = u.pathname.split('/').pop();
        assert(['GetServiceInfo', 'GetObject', 'GetCheckpoint', 'GetAvailableRange'].includes(method));
        const req = frame(r.requestBase64, GrpcTypes[method + 'Request'], false), res = frame(r.responseBase64, GrpcTypes[method + 'Response'], true); grpcCount++;
        if (method === 'GetServiceInfo') assert.equal(res.chainId, p.h0);
        if (method === 'GetObject') {
          const o = res.object; assert(o?.bcs?.value && o.contents?.value && req.objectId === o.objectId);
          assert.equal(typed('Object', o.bcs.value), o.digest); const v = bcs.Object.parse(o.bcs.value);
          assert.deepEqual(Buffer.from(bcs.Object.serialize(v).toBytes()), Buffer.from(o.bcs.value));
          assert.equal(v.data.$kind, 'Move'); assert.equal(v.data.Move.version, String(o.version)); assert.equal(v.previousTransaction, o.previousTransaction);
          assert.deepEqual(Buffer.from(v.data.Move.contents), Buffer.from(o.contents.value));
          const prior = nativeObjects.get(o.objectId); if (prior) assert.deepEqual(Buffer.from(prior.object.bcs.value), Buffer.from(o.bcs.value));
          nativeObjects.set(o.objectId, { object: o, parsed: v });
        }
      }
    }
    const nodes = [];
    const visit = value => {
      if (!value || typeof value !== 'object') return;
      if (value.address && value.digest && value.contents?.bcs && value.contents?.type?.repr) nodes.push(value);
      for (const v of Object.values(value)) visit(v);
    };
    graphs.forEach(g => visit(g.data));
    const verified = [];
    for (const item of items) {
      const native = nativeObjects.get(item.objectId); assert(native, 'Each accepted indexed NFT needs its original canonical Fullnode frame');
      assert.equal(String(native.object.version), item.version); assert.equal(native.object.digest, item.digest);
      assert.equal(normalizeStructTag(native.object.objectType), item.type); assert.deepEqual(native.parsed.owner, item.owner);
      assert.deepEqual(Buffer.from(native.object.contents.value), bytes(item.content));
      const indexed = nodes.filter(n => n.address === item.objectId); assert(indexed.length > 0);
      for (const node of indexed) {
        assert.equal(String(node.version), item.version); assert.equal(node.digest, item.digest);
        assert.equal(node.contents.type.repr, item.type); assert.equal(node.contents.bcs, toBase64(bytes(item.content)));
      }
      verified.push({ objectId: item.objectId, version: item.version, digest: item.digest, canonicalNativeAndIndexedBodyMatch: true });
    }
    const n = serial => oracle.nfts.find(v => v.value.serial === serial).objectId;
    const all = p.sourceKiosks.flatMap(k => k.items);
    assert(all.find(i => i.objectId === n('3')).isLocked);
    assert(all.find(i => i.objectId === n('4')).listing.isExclusive);
    assert.equal(all.find(i => i.objectId === n('2')).listing.isExclusive, false);
    assert.equal(String(all.find(i => i.objectId === n('2')).listing.price), '1000000');
    assert.deepEqual(p.direct.map(n => n.objectId), [n('6')]);
    const personal = p.sourceKiosks.find(k => k.kind === 'framework' && k.ownerCap.isPersonal);
    assert(personal && personal.ownerCap.objectId === oracle.personalCap.objectId && personal.items[0].objectId === n('5'));
    const ob = p.sourceKiosks.find(k => k.kind === 'originbyte');
    assert(ob && ob.items.length === 2 && ob.items.every(i => i.originByteRegistered && !i.originByteExclusive));
    assert.equal(p.existingTargetKiosks.length, 1); assert.equal(p.existingTargetKiosks[0].kind, 'originbyte'); assert.equal(p.existingTargetKiosks[0].items.length, 0); assert.deepEqual(p.newTargetKiosks, []);
    const terminalOwners = new Set();
    for (const graph of graphs) {
      const a = graph.data.walletSnapshot?.query.address;
      if (a?.objects?.pageInfo?.hasNextPage === false) terminalOwners.add(a.address);
    }
    for (const role of ['source', 'existingTarget', 'newTarget']) assert(terminalOwners.has(oracle.addresses[role]));
    stage = 'fresh typed snapshot checkpoint';
    globalThis.fetch = async (input, init) => {
      const u = new URL(input instanceof Request ? input.url : String(input)); assert.equal(u.origin, 'http://127.0.0.1:41750'); assert(/\/(GetCheckpoint|GetServiceInfo)$/.test(u.pathname));
      const r = await originalFetch(input, init); supplementalFrames.push({ url: u.href, status: r.status, requestBase64: Buffer.from(init?.body ?? []).toString('base64'), responseBase64: Buffer.from(await r.clone().arrayBuffer()).toString('base64') }); return r;
    };
    const client = new RtdGrpcClient({ network: 'localnet', baseUrl: 'http://127.0.0.1:41750', format: 'binary', fetch: globalThis.fetch, mvr: { url: '' } });
    assert.equal((await client.ledgerService.getServiceInfo({}, { timeout: 20000 })).response.chainId, p.h0);
    const c = (await client.ledgerService.getCheckpoint({ checkpointId: { oneofKind: 'sequenceNumber', sequenceNumber: BigInt(p.snapshot.checkpoint) }, readMask: { paths: ['sequence_number', 'digest', 'summary', 'contents'] } }, { timeout: 20000 })).response.checkpoint;
    assert.equal(String(c.sequenceNumber), p.snapshot.checkpoint); assert.equal(c.digest, p.snapshot.digest);
    assert.equal(typed('CheckpointSummary', c.summary.bcs.value), c.digest); assert.equal(typed('CheckpointContents', c.contents.bcs.value), c.contents.digest); assert.equal(c.summary.contentDigest, c.contents.digest);
    assert.equal((await client.ledgerService.getServiceInfo({}, { timeout: 20000 })).response.chainId, p.h0);
    for (const r of supplementalFrames) { assert.equal(r.status, 200); const m = new URL(r.url).pathname.split('/').pop(); frame(r.requestBase64, GrpcTypes[m + 'Request'], false); frame(r.responseBase64, GrpcTypes[m + 'Response'], true); }
    for (const [f, h] of Object.entries(p.inputsSha256)) assert.equal(sha(f), h);
    const protectedPins = read(path.join(p.fixture, 'intent.json')).protectedOriginalsSha256; assert.equal(Object.keys(protectedPins).length, 1015);
    for (const [f, h] of Object.entries(protectedPins)) assert.equal(sha(f), h);
    report = { passed: true, observedAt: new Date().toISOString(), source: build.sourceAfter, h0: p.h0,
      checkpoint: p.snapshot.checkpoint, digest: p.snapshot.digest, originalFrames: p.frames.length,
      successfulGraphqlFrames: graphs.length, refusedGraphqlFrames, successfulUnaryFrames: grpcCount, canonicalEightNFTs: verified,
      naturallyTerminalControlledOwners: 3, frameworkOrdinaryListedLockedExclusiveVerified: true,
      personalWrappedCapAndItemVerified: true, originByteRegisteredItemsAndTwoTargetStatesVerified: true,
      freshTypedSnapshotVerified: true, sustainedAvailabilityAccepted: false, protectedOriginalFilesHeld: 1015, simulations: 0, signatures: 0,
      executeRequests: 0, profilesOpened: 0, supplementalFrames,
      inputsSha256: Object.fromEntries([__filename, path.resolve(proofFile), oracleFile, buildFile, profileFile].map(f => [f, sha(f)])),
      scope: 'Independent all retained whole frames, canonical typed eight native NFT objects and matching actual same-S indexed bodies, three natural terminal owner collections, five Item/ordinary listing/lock/exclusive/Personal wrapped cap, OB registration and existing/new target discovery, fresh typed checkpoint. No keys/profile, simulation, signer, Execute, Chrome transfer or complete parent acceptance.' };
  } catch (e) { report = { passed: false, observedAt: new Date().toISOString(), stage, errorType: e.name, message: String(e.message).slice(0, 1400), supplementalFrames }; process.exitCode = 1; }
  finally {
    globalThis.fetch = originalFetch;
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: report.passed, stage: report.stage, message: report.message, originalFrames: report.originalFrames, nativeObjects: report.canonicalEightNFTs?.length }));
  }
})().catch(() => { console.error('Current NFT independent audit prerequisites failed'); process.exitCode = 1; });
