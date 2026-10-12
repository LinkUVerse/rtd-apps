// Independently inspect recorded production pages, canonical native objects and one fresh typed marker.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { GrpcTypes, RtdGrpcClient } = require('rtd-typescript/grpc'), { bcs } = require('rtd-typescript/bcs');
const { toBase64, toBase58, normalizeStructTag } = require('rtd-typescript/utils'), { blake2b } = require('@noble/hashes/blake2.js');
const loader = require('tsx/cjs/api');
const { KIOSK_BCS, KIOSK_CAP_BCS, PERSONAL_CAP_BCS } = loader.require(path.resolve(__dirname, '../src/shared/rpc/kiosk-reader.ts'), __filename);
const { ORIGINBYTE_OWNER_TOKEN_BCS, ORIGINBYTE_EMPTY_KEY_BCS, ORIGINBYTE_TABLE_BCS } = loader.require(path.resolve(__dirname, '../src/shared/rpc/originbyte-kiosk.ts'), __filename);
const read = f => JSON.parse(fs.readFileSync(f)), sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const typed = (n, bytes) => toBase58(blake2b(Buffer.concat([Buffer.from(n + '::'), Buffer.from(bytes)]), { dkLen: 32 }));
function canonical(codec, value) { const raw = Buffer.from(value, 'base64'), parsed = codec.parse(raw); assert.equal(toBase64(codec.serialize(parsed).toBytes()), value); return parsed; }
function frame(encoded, T, response) {
  const raw = Buffer.from(encoded, 'base64'); assert(raw.length >= 5 && raw[0] === 0);
  const end = raw.readUInt32BE(1) + 5; assert(end <= raw.length);
  if (response) { assert(raw[end] === 128 && end + 5 + raw.readUInt32BE(end + 1) === raw.length); assert(/(?:^|\r\n)grpc-status:\s*0\r\n/.test(raw.subarray(end + 5).toString('ascii'))); }
  else assert.equal(end, raw.length);
  return T.fromBinary(raw.subarray(5, end));
}
(async () => {
  const [proofFile, output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
  const p = read(proofFile), originalFetch = globalThis.fetch, supplementalFrames = [];
  let report = {}, stage = 'recorded collection and authority';
  try {
    assert(p.passed && p.completeBothProductionKioskCollections && p.allCurrentItemBodiesAndOwnersMatchFreshFullnode);
    assert(p.simulations === 0 && p.signatures === 0 && p.executeRequests === 0 && !p.keystoreRead);
    for (const [f, h] of Object.entries(p.inputsSha256)) assert.equal(sha(f), h);
    assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), p.source);
    const profileFile = Object.keys(p.inputsSha256).find(f => f.endsWith('/certified-positive-transport-release-20261006-01/profile.json'));
    assert(profileFile); const packages = read(profileFile).packages;
    assert.equal(JSON.parse(p.snapshot.bindingKey)[5], p.h0); assert.equal(JSON.parse(p.snapshot.bindingKey)[6], p.generation);
    assert.equal(p.snapshot.dependencies.length, 10); assert(BigInt(p.snapshot.checkpoint) >= 281963n);
    const graph = [], objects = new Map(); let rpcCount = 0;
    for (const row of p.frames) {
      assert.equal(row.status, 200); const u = new URL(row.url); assert.equal(u.hostname, '127.0.0.1');
      if (u.port === '41954' && u.pathname === '/graphql') {
        const request = JSON.parse(Buffer.from(row.requestBase64, 'base64')), response = JSON.parse(Buffer.from(row.responseBase64, 'base64'));
        assert(!response.errors); assert.equal(response.data.walletGenesis.digest, p.h0);
        if (response.data.walletSnapshot) { assert.equal(String(response.data.walletSnapshot.sequenceNumber), p.snapshot.checkpoint); assert.equal(response.data.walletSnapshot.digest, p.snapshot.digest); }
        graph.push({ request, data: response.data });
      } else {
        assert.equal(u.port, '41750'); const method = u.pathname.split('/').pop(); assert(['GetServiceInfo', 'GetObject'].includes(method));
        const request = frame(row.requestBase64, GrpcTypes[method + 'Request'], false), response = frame(row.responseBase64, GrpcTypes[method + 'Response'], true); rpcCount++;
        if (method === 'GetServiceInfo') assert.equal(response.chainId, p.h0);
        else {
          const o = response.object; assert(o && o.bcs?.value && o.contents?.value); assert.equal(request.objectId, o.objectId);
          assert.equal(typed('Object', o.bcs.value), o.digest); const parsed = canonical(bcs.Object, toBase64(o.bcs.value));
          assert.equal(parsed.previousTransaction, o.previousTransaction);
          assert.equal(parsed.data.$kind, 'Move'); assert.equal(parsed.data.Move.version, String(o.version));
          assert.equal(toBase64(parsed.data.Move.contents), toBase64(o.contents.value));
          assert(!objects.has(o.objectId)); objects.set(o.objectId, { wire: o, parsed });
        }
      }
    }
    function dynamic(parent) {
      const pages = graph.filter(r => r.request.variables?.parent === parent && r.data.walletSnapshot?.query.address?.dynamicFields);
      assert.equal(pages.length, 1); assert.equal(pages[0].request.variables.cursor, null);
      const a = pages[0].data.walletSnapshot.query.address; assert.equal(a.address, parent); assert.equal(a.dynamicFields.pageInfo.hasNextPage, false);
      assert.equal(new Set(a.dynamicFields.nodes.map(n => n.address)).size, a.dynamicFields.nodes.length); return a.dynamicFields.nodes;
    }
    const classifications = [];
    for (const owner of p.owners) {
      const pages = graph.filter(r => r.request.variables?.owner === owner.owner && r.data.walletSnapshot?.query.address?.objects);
      // Native and OriginByte discover independently. This live inventory has one natural terminal page for each route.
      assert.equal(pages.length, 2); assert(pages.every(r => r.request.variables.cursor === null && r.request.variables.filter === null && r.request.variables.pageSize === 50));
      const rows = pages.map(r => { const a = r.data.walletSnapshot.query.address; assert.equal(a.address, owner.owner); assert.equal(a.objects.pageInfo.hasNextPage, false); return a.objects.nodes; });
      const stable = nodes => nodes.map(node => {
        const n = structuredClone(node), coverage = n.contents.display?.basis?.historyCoverage;
        if (coverage) {
          assert.equal(coverage.genesisDigest, p.h0); assert.equal(coverage.generation, p.generation);
          assert.equal(String(coverage.snapshotCheckpoint), p.snapshot.checkpoint); assert.equal(coverage.snapshotCheckpointDigest, p.snapshot.digest);
          assert(BigInt(coverage.lastCheckpoint) >= BigInt(p.snapshot.checkpoint));
          // Publication may advance between repeated same-S reads. Retain and validate both observed coverage ends.
          delete coverage.lastCheckpoint; delete coverage.lastCheckpointDigest;
        }
        return n;
      });
      assert.deepEqual(stable(rows[0]), stable(rows[1])); assert.equal(new Set(rows[0].map(n => n.address)).size, rows[0].length);
      const discovered = rows[0].filter(n => [normalizeStructTag(`${packages.kiosk}::kiosk::KioskOwnerCap`),
        normalizeStructTag(`${packages.personalKiosk}::personal_kiosk::PersonalKioskCap`),
        normalizeStructTag(`${packages.originByte.discoveryPackage}::ob_kiosk::OwnerToken`)].includes(n.contents.type.repr));
      assert.deepEqual(discovered.map(n => n.address).sort(), owner.kiosks.map(k => k.ownershipObject.objectId).sort());
      for (const kiosk of owner.kiosks) {
        assert.equal(kiosk.owner, owner.owner); assert.deepEqual(kiosk.items, []);
        const node = discovered.find(n => n.address === kiosk.ownershipObject.objectId), nativeCap = objects.get(node.address), nativeRoot = objects.get(kiosk.kioskId);
        assert(nativeCap && nativeRoot); assert.equal(node.owner.__typename, 'AddressOwner'); assert.equal(node.owner.address.address, owner.owner);
        for (const [saved, native] of [[kiosk.ownershipObject, nativeCap], [kiosk.root, nativeRoot]]) {
          assert.equal(saved.objectBcsBase64, toBase64(native.wire.bcs.value)); assert.equal(saved.contentBase64, toBase64(native.wire.contents.value));
          assert.equal(saved.version, String(native.wire.version)); assert.equal(saved.digest, native.wire.digest); assert.deepEqual(saved.owner, native.parsed.owner);
        }
        assert.equal(node.contents.bcs, kiosk.ownershipObject.contentBase64); assert.equal(node.digest, kiosk.ownershipObject.digest); assert.equal(String(node.version), kiosk.ownershipObject.version);
        assert.deepEqual(nativeCap.parsed.owner, { AddressOwner: owner.owner, $kind: 'AddressOwner' }); assert.equal(nativeRoot.parsed.owner.$kind, 'Shared');
        const root = canonical(KIOSK_BCS, kiosk.root.contentBase64); assert.deepEqual(root, kiosk.decodedRoot); assert.equal(root.item_count, 0); assert.equal(root.id, kiosk.kioskId); assert.equal(root.owner, owner.owner);
        const rootNode = graph.flatMap(r => r.data.walletSnapshot?.query.multiGetObjects ?? []).find(n => n.address === kiosk.kioskId)?.asMoveObject;
        assert(rootNode); assert.equal(rootNode.contents.bcs, kiosk.root.contentBase64); assert.equal(rootNode.digest, kiosk.root.digest); assert.equal(rootNode.contents.type.repr, normalizeStructTag('0x2::kiosk::Kiosk'));
        const fields = dynamic(kiosk.kioskId);
        if (kiosk.kind === 'originbyte') {
          assert.equal(kiosk.ownerCap, null); assert.equal(kiosk.ownerTokenId, node.address); assert.equal(root.allow_extensions, true);
          const token = canonical(ORIGINBYTE_OWNER_TOKEN_BCS, node.contents.bcs); assert.equal(token.id, node.address); assert.equal(token.owner, owner.owner); assert.equal(token.kiosk, kiosk.kioskId);
          assert.equal(fields.length, 4);
          const field = name => { const values = fields.filter(n => n.name.type.repr === normalizeStructTag(`${packages.originByte.discoveryPackage}::ob_kiosk::${name}`)); assert.equal(values.length, 1);
            const f = values[0]; assert.equal(f.value.__typename, 'MoveValue'); assert.equal(canonical(ORIGINBYTE_EMPTY_KEY_BCS, f.name.bcs).dummy_field, false); return f.value; };
          const version = field('VersionDfKey'); assert.equal(version.type.repr, 'u64'); assert.equal(canonical(bcs.u64(), version.bcs), '3');
          const cap = field('KioskOwnerCapDfKey'); assert.equal(cap.type.repr, normalizeStructTag('0x2::kiosk::KioskOwnerCap')); assert.equal(canonical(KIOSK_CAP_BCS, cap.bcs).for, kiosk.kioskId);
          const table = field('NftRefsDfKey'); assert.equal(table.type.repr, normalizeStructTag(`0x2::table::Table<0x2::object::ID,${packages.originByte.discoveryPackage}::ob_kiosk::NftRef>`));
          const decodedTable = canonical(ORIGINBYTE_TABLE_BCS, table.bcs); assert.equal(decodedTable.size, '0'); assert.deepEqual(dynamic(decodedTable.id), []);
        } else if (kiosk.ownerCap.isPersonal) {
          const cap = canonical(PERSONAL_CAP_BCS, node.contents.bcs); assert.equal(cap.id, node.address); assert.equal(cap.cap.for, kiosk.kioskId); assert.equal(node.hasPublicTransfer, false);
          assert.equal(fields.length, 1); assert.equal(fields[0].name.type.repr, normalizeStructTag(`${packages.personalKiosk}::personal_kiosk::OwnerMarker`));
          assert.equal(canonical(ORIGINBYTE_EMPTY_KEY_BCS, fields[0].name.bcs).dummy_field, false); assert.equal(fields[0].value.type.repr, 'address'); assert.equal(canonical(bcs.Address, fields[0].value.bcs), owner.owner);
        } else { const cap = canonical(KIOSK_CAP_BCS, node.contents.bcs); assert.equal(cap.id, node.address); assert.equal(cap.for, kiosk.kioskId); assert.deepEqual(fields, []); }
        classifications.push({ role: owner.role, kioskId: kiosk.kioskId, kind: kiosk.kind === 'originbyte' ? 'originbyte' : kiosk.ownerCap.isPersonal ? 'personal' : 'framework', currentItems: 0, lockedOrListedItems: 0 });
      }
    }
    assert.equal(objects.size, 6); assert.equal(p.frames.length, 55); assert.equal(graph.length, 37); assert.equal(rpcCount, 18);
    assert.equal(classifications.length, 3); assert.deepEqual(classifications.map(k => k.kind).sort(), ['framework', 'originbyte', 'personal']);
    stage = 'fresh typed snapshot';
    globalThis.fetch = async (input, init) => {
      const u = new URL(input instanceof Request ? input.url : String(input)); assert.equal(u.origin, 'http://127.0.0.1:41750'); assert(/\/(GetServiceInfo|GetCheckpoint)$/.test(u.pathname));
      const response = await originalFetch(input, { ...init, credentials: 'omit', redirect: 'error' });
      supplementalFrames.push({ url: u.href, status: response.status, requestBase64: Buffer.from(init?.body ?? []).toString('base64'), responseBase64: Buffer.from(await response.clone().arrayBuffer()).toString('base64') }); return response;
    };
    const client = new RtdGrpcClient({ network: 'localnet', baseUrl: 'http://127.0.0.1:41750', format: 'binary', fetch: globalThis.fetch, mvr: { url: '' } });
    assert.equal((await client.ledgerService.getServiceInfo({}, { timeout: 20000 })).response.chainId, p.h0);
    const c = (await client.ledgerService.getCheckpoint({ checkpointId: { oneofKind: 'sequenceNumber', sequenceNumber: BigInt(p.snapshot.checkpoint) }, readMask: { paths: ['sequence_number', 'digest', 'summary', 'contents'] } }, { timeout: 20000 })).response.checkpoint;
    assert.equal(String(c.sequenceNumber), p.snapshot.checkpoint); assert.equal(c.digest, p.snapshot.digest); assert.equal(typed('CheckpointSummary', c.summary.bcs.value), c.digest);
    assert.equal(typed('CheckpointContents', c.contents.bcs.value), c.contents.digest); assert.equal(c.summary.contentDigest, c.contents.digest);
    assert.equal((await client.ledgerService.getServiceInfo({}, { timeout: 20000 })).response.chainId, p.h0);
    for (const r of supplementalFrames) { assert.equal(r.status, 200); const method = new URL(r.url).pathname.split('/').pop(); frame(r.requestBase64, GrpcTypes[method + 'Request'], false); frame(r.responseBase64, GrpcTypes[method + 'Response'], true); }
    report = { passed: true, observedAt: new Date().toISOString(), source: p.source, h0: p.h0, generation: p.generation, checkpoint: p.snapshot.checkpoint, digest: p.snapshot.digest,
      originalFramesVerified: p.frames.length, successfulGraphqlFrames: graph.length, successfulRpcFrames: rpcCount, canonicalFreshNativeObjects: objects.size,
      naturalTerminalOwnedCollections: 4, classifications, bothOwnersComplete: true, freshTypedSnapshotVerified: true, originByteOwnerTokenNotOwnerCap: true,
      currentNonemptyHoldingAccepted: false, currentLockedListedTransfersAccepted: false, currentChromeAllBranchesAccepted: false, parentQA07Complete: false,
      simulations: 0, signatures: 0, executeRequests: 0, keystoreRead: false, supplementalFrames,
      inputsSha256: Object.fromEntries([__filename, path.resolve(proofFile)].map(f => [f, sha(f)])),
      scope: '55 original whole frames; two owned collections per owner naturally terminal and equal, exact complete discovery set, six canonical native objects and indexed matching cap/root bodies, Personal nestedcap/OwnerMarker, OB v3 embeddedcap/empty NftRefs table. Three new native frames verify typed S. All three currently empty; no nonempty/listed/locked transfer or Chrome/parent completion.' };
  } catch (error) { report = { passed: false, observedAt: new Date().toISOString(), stage, errorType: error.name, message: String(error.message).slice(0, 650), supplementalFrames }; process.exitCode = 1; }
  finally { globalThis.fetch = originalFetch; fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ passed: report.passed, stage: report.stage, message: report.message, frames: report.originalFramesVerified, objects: report.canonicalFreshNativeObjects, supplementary: supplementalFrames.length })); }
})().catch(error => { console.error(JSON.stringify({ passed: false, message: String(error.message).slice(0, 300) })); process.exitCode = 1; });
