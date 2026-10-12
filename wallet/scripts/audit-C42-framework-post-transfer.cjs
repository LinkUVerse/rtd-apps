// Offline independent whole-frame and canonical post-transfer verification.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { GrpcTypes } = require('rtd-typescript/grpc'), { bcs } = require('rtd-typescript/bcs');
const { Transaction } = require('rtd-typescript/transactions'), { verifyTransactionSignature } = require('rtd-typescript/verify');
const { toBase64, toBase58 } = require('rtd-typescript/utils'), { blake2b } = require('@noble/hashes/blake2.js');
const loader = require('tsx/cjs/api');
const { KIOSK_BCS, KIOSK_CAP_BCS } = loader.require(path.resolve(__dirname, '../src/shared/rpc/kiosk-reader.ts'), __filename);
const read = f => JSON.parse(fs.readFileSync(f)), sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const typed = (n, bytes) => toBase58(blake2b(Buffer.concat([Buffer.from(n + '::'), Buffer.from(bytes)]), { dkLen: 32 }));
function frame(encoded, T, response) {
  const raw = Buffer.from(encoded, 'base64'); assert(raw.length >= 5 && raw[0] === 0);
  const end = raw.readUInt32BE(1) + 5; assert(end <= raw.length);
  if (response) {
    assert(raw[end] === 128 && end + 5 + raw.readUInt32BE(end + 1) === raw.length);
    assert(/(?:^|\r\n)grpc-status:\s*0\r\n/.test(raw.subarray(end + 5).toString('ascii')));
  } else assert.equal(end, raw.length);
  return T.fromBinary(raw.subarray(5, end));
}
(async () => {
  const [proofFile, output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
  const p = read(proofFile); assert(p.passed && p.executeRequests === 0 && p.signatures === 0 && p.simulations === 0 && p.originalProfilesOpened === 0 && !p.keystoreRead);
  for (const [f, h] of Object.entries(p.inputsSha256)) assert.equal(sha(f), h);
  assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), p.source);
  assert.equal(p.currentKioskItems, 0); assert.equal(p.originalCheckpoint, '281963');
  assert(BigInt(p.snapshot.checkpoint) >= 281963n && p.snapshot.dependencies.length === 10);
  const graph = [], native = [];
  for (const row of p.frames) {
    assert.equal(row.status, 200); const u = new URL(row.url);
    assert.equal(u.hostname, '127.0.0.1'); assert(['41750', '41954', '41955'].includes(u.port));
    if (u.pathname === '/graphql') {
      const request = JSON.parse(Buffer.from(row.requestBase64, 'base64'));
      const response = JSON.parse(Buffer.from(row.responseBase64, 'base64'));
      assert(!response.errors); assert.equal(response.data.walletGenesis.digest, p.h0);
      const snap = response.data.walletSnapshot;
      if (snap) { assert.equal(String(snap.sequenceNumber), p.snapshot.checkpoint); assert.equal(snap.digest, p.snapshot.digest); }
      graph.push({ request, response });
    } else {
      const method = u.pathname.split('/').pop(); assert(['GetServiceInfo', 'GetObject', 'GetTransaction', 'GetCheckpoint'].includes(method));
      const request = frame(row.requestBase64, GrpcTypes[method + 'Request'], false);
      const response = frame(row.responseBase64, GrpcTypes[method + 'Response'], true);
      if (method === 'GetServiceInfo') assert.equal(response.chainId, p.h0);
      native.push({ ...row, method, request, response });
    }
  }
  assert.equal(p.frames.length, 29); assert.equal(graph.length, 20); assert.equal(native.length, 9);
  const pages = graph.filter(r => r.request.variables?.owner === p.recipient && r.response.data.walletSnapshot?.query.address?.objects);
  assert.equal(pages.length, 3); let cursor = null; const owned = [];
  for (const [index, r] of pages.entries()) {
    assert.equal(r.request.variables.cursor, cursor); assert.equal(r.request.variables.pageSize, 3);
    const address = r.response.data.walletSnapshot.query.address; assert.equal(address.address, p.recipient);
    const c = address.objects; assert.equal(c.pageInfo.hasNextPage, index < pages.length - 1);
    assert.equal(c.nodes.length, index < 2 ? 3 : 1); cursor = c.pageInfo.endCursor; owned.push(...c.nodes);
  }
  assert.equal(owned.length, 7); assert.equal(new Set(owned.map(n => n.address)).size, 7);
  assert.deepEqual(owned.map(n => n.address).sort(), p.recipientOwnedObjects.map(n => n.objectId).sort());
  const nftNode = owned.find(n => n.address === p.currentNft.objectId);
  assert.equal(nftNode.owner.__typename, 'AddressOwner'); assert.equal(nftNode.owner.address.address, p.recipient);
  assert.equal(nftNode.previousTransaction.digest, p.originalDigest);
  assert.equal(nftNode.digest, p.currentNft.digest); assert.equal(String(nftNode.version), p.currentNft.version);
  assert.equal(nftNode.contents.bcs, p.currentNft.contentBase64);
  const sender = graph.find(r => r.request.variables?.owner === p.sender && r.response.data.walletSnapshot?.query.address?.objects);
  assert(sender); const senderObjects = sender.response.data.walletSnapshot.query.address.objects;
  assert.equal(senderObjects.pageInfo.hasNextPage, false);
  const cap = senderObjects.nodes.find(n => n.address === p.originalCapId);
  assert.equal(cap.owner.__typename, 'AddressOwner'); assert.equal(cap.owner.address.address, p.sender);
  const decodedCap = KIOSK_CAP_BCS.parse(Buffer.from(cap.contents.bcs, 'base64'));
  assert.equal(toBase64(KIOSK_CAP_BCS.serialize(decodedCap).toBytes()), cap.contents.bcs);
  assert.equal(decodedCap.id, p.originalCapId); assert.equal(decodedCap.for, p.kioskId);
  const kioskNode = graph.flatMap(r => r.response.data.walletSnapshot?.query.multiGetObjects ?? []).find(n => n.address === p.kioskId).asMoveObject;
  const kiosk = KIOSK_BCS.parse(Buffer.from(kioskNode.contents.bcs, 'base64'));
  assert.equal(toBase64(KIOSK_BCS.serialize(kiosk).toBytes()), kioskNode.contents.bcs);
  assert.equal(kiosk.id, p.kioskId); assert.equal(kiosk.owner, p.sender); assert.equal(kiosk.item_count, 0);
  const dynamic = graph.find(r => r.request.variables?.parent === p.kioskId).response.data.walletSnapshot.query.address.dynamicFields;
  assert.deepEqual(dynamic.nodes, []); assert.equal(dynamic.pageInfo.hasNextPage, false);
  const objects = native.filter(r => r.method === 'GetObject'); assert.equal(objects.length, 2);
  assert.deepEqual(new Set(objects.map(r => new URL(r.url).port)), new Set(['41750', '41955']));
  for (const r of objects) {
    const o = r.response.object; assert.equal(r.request.objectId, p.currentNft.objectId);
    assert.equal(o.digest, p.currentNft.digest); assert.equal(String(o.version), p.currentNft.version);
    assert.equal(toBase64(o.bcs.value), p.currentNft.objectBcsBase64); assert.equal(toBase64(o.contents.value), p.currentNft.contentBase64);
    assert.equal(typed('Object', o.bcs.value), o.digest);
    const parsed = bcs.Object.parse(o.bcs.value); assert.equal(toBase64(bcs.Object.serialize(parsed).toBytes()), p.currentNft.objectBcsBase64);
    assert.deepEqual(parsed.owner, p.currentNft.owner); assert.equal(parsed.previousTransaction, p.originalDigest);
    if (new URL(r.url).port === '41955') assert.equal(String(r.request.version), p.currentNft.version);
  }
  const tx = native.find(r => r.method === 'GetTransaction').response.transaction;
  assert.equal(tx.digest, p.originalDigest); assert.equal(String(tx.checkpoint), p.originalCheckpoint);
  assert.equal(await Transaction.from(tx.transaction.bcs.value).getDigest(), p.originalDigest);
  const data = bcs.TransactionData.parse(tx.transaction.bcs.value), effects = bcs.TransactionEffects.parse(tx.effects.bcs.value);
  assert.equal(toBase64(bcs.TransactionData.serialize(data).toBytes()), toBase64(tx.transaction.bcs.value));
  assert.equal(toBase64(bcs.TransactionEffects.serialize(effects).toBytes()), toBase64(tx.effects.bcs.value));
  assert.equal(effects[effects.$kind].transactionDigest, p.originalDigest); assert.equal(effects[effects.$kind].status.$kind, 'Success');
  assert.equal(tx.signatures.length, 1); assert.equal((await verifyTransactionSignature(tx.transaction.bcs.value, toBase64(tx.signatures[0].bcs.value))).toRtdAddress(), p.sender);
  const checkpoint = native.find(r => r.method === 'GetCheckpoint').response.checkpoint;
  assert.equal(checkpoint.digest, p.snapshot.digest); assert.equal(String(checkpoint.sequenceNumber), p.snapshot.checkpoint);
  assert.equal(typed('CheckpointSummary', checkpoint.summary.bcs.value), p.snapshot.digest);
  assert.equal(typed('CheckpointContents', checkpoint.contents.bcs.value), checkpoint.contents.digest);
  assert.equal(checkpoint.summary.contentDigest, checkpoint.contents.digest);
  const report = { passed: true, observedAt: new Date().toISOString(), source: p.source, h0: p.h0,
    originalDigest: p.originalDigest, originalCheckpoint: p.originalCheckpoint, checkpoint: p.snapshot.checkpoint, snapshotDigest: p.snapshot.digest,
    completeFramesVerified: 29, graphqlFramesVerified: 20, successfulRpcFramesVerified: 9,
    recipientPagination: { pages: 3, objects: 7, unique: true, naturalTerminalObserved: true },
    senderCapCanonicalBcsVerified: true, originalKioskCanonicalBcsAndEmptyDynamicFieldsVerified: true,
    freshNativeAndExactArchiveCanonicalObjectVerified: true, originalCanonicalTransactionEffectsAndSignatureVerified: true,
    typedSnapshotSummaryAndContentsVerified: true, auditNetworkRequests: 0, signatures: 0, simulations: 0, executeRequests: 0,
    currentC42BrowserAccepted: false, namesCurrentAccepted: false, parentTX08Complete: false,
    inputsSha256: Object.fromEntries([__filename, path.resolve(proofFile)].map(f => [f, sha(f)])),
    scope: 'Offline independent29 whole request/response frames/status0, current source and original production proof pins; actual three-page recipient collection7, sender original canonical cap/Kiosk and empty dynamicFields, fresh native and exact archive canonical NFT/owner/body/digest, original successful transaction/effects/signature/checkpoint, typed archive S marker. No browser refresh/names/all entries or parent acceptance.' };
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ passed: true, frames: 29, pages: 3, ownedObjects: 7, auditNetworkRequests: 0 }));
})().catch(error => { console.error(JSON.stringify({ passed: false, errorType: error.name, message: String(error.message).slice(0, 650), stack: String(error.stack).split('\n').slice(0, 4) })); process.exitCode = 1; });
