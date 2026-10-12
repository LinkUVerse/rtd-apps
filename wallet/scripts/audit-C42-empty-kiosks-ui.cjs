// Independent current empty branches, whole captured responses, durable relock and fresh typed markers.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), cp = require('node:child_process');
const { GrpcTypes, RtdGrpcClient } = require('rtd-typescript/grpc'), { bcs } = require('rtd-typescript/bcs');
const { toBase64, toBase58 } = require('rtd-typescript/utils'), { blake2b } = require('@noble/hashes/blake2.js');
const read = f => JSON.parse(fs.readFileSync(f)), hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex'), sha = f => hash(fs.readFileSync(f));
const typed = (n, bytes) => toBase58(blake2b(Buffer.concat([Buffer.from(n + '::'), Buffer.from(bytes)]), { dkLen: 32 }));
function frame(encoded, T, response) {
  const raw = Buffer.from(encoded, 'base64'); assert(raw.length >= 5 && raw[0] === 0); const end = raw.readUInt32BE(1) + 5; assert(end <= raw.length);
  if (response) { assert(raw[end] === 128 && end + 5 + raw.readUInt32BE(end + 1) === raw.length); assert(/(?:^|\r\n)grpc-status:\s*0\r\n/.test(raw.subarray(end + 5).toString('ascii'))); }
  else assert.equal(end, raw.length); return T.fromBinary(raw.subarray(5, end));
}
(async () => {
  const [uiFile, output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
  const logs = path.resolve(__dirname, '../migrationToGRpcOrGraphQLDoc/workLog');
  const inventoryFile = path.join(logs, '20261007-C42-current-kiosk-inventory-production-02.json'), inventory = read(inventoryFile);
  const independentFile = path.join(logs, '20261007-C42-current-kiosk-inventory-independent-02.json'), independent = read(independentFile);
  const buildFile = path.join(logs, '20261007-default-generation-positive-C42-build-01.json'), build = read(buildFile);
  const originalFetch = globalThis.fetch, supplementalFrames = []; let report = {}, stage = 'current actual UI';
  try {
    const p = read(uiFile); assert(inventory.passed && independent.passed && build.passed && p.passed && p.browserTeardownComplete);
    assert(p.simulations === 0 && p.signatures === 0 && p.executeRequests === 0 && p.originalProfilesOpened === 0 && p.certificateChanges === 0);
    assert.equal(p.checks.length, 16); assert(p.checks.every(c => c.passed)); assert.deepEqual(p.blocked, []);
    assert.deepEqual(p.beforeJournal, p.afterJournal); assert.equal(Object.keys(p.beforeJournal).length, 3); assert(Object.values(p.beforeJournal).every(v => Array.isArray(v) && !v.length));
    for (const [f, h] of Object.entries(p.inputsSha256)) assert.equal(sha(f), h);
    assert.equal(p.inventorySha256, sha(inventoryFile)); assert.deepEqual(p.source, build.sourceAfter);
    assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), p.source);
    assert.equal(p.workerSource.workerSha256, build.artifacts['background.js']); assert(p.uiSource.matchesDisk);
    for (const r of p.uiSource.loadedBundles) assert.equal(r.loadedSha256, build.artifacts[r.file]);
    assert(p.fixture.endsWith('/current-empty-kiosks-C42-20261007-01'));
    assert(!cp.execFileSync('ps', ['-Ao', 'command='], { encoding: 'utf8' }).split('\n').some(s => s.includes('Google Chrome') && s.includes('--user-data-dir=' + p.profile)));
    const owner = inventory.owners.find(o => o.role === 'sender'); assert.equal(p.owner, owner.owner);
    assert.deepEqual(p.kioskBranches.map(k => k.kioskId).sort(), owner.kiosks.map(k => k.kioskId).sort());
    assert.deepEqual(p.kioskBranches.map(k => k.kind).sort(), ['framework', 'originbyte', 'personal']);
    const graph = [], transients = []; let rpc = 0, canonicalObjects = 0;
    for (const r of p.frames) {
      assert.equal(hash(Buffer.from(r.requestBase64, 'base64')), r.requestSha256); assert.equal(hash(Buffer.from(r.responseBase64, 'base64')), r.responseSha256);
      const u = new URL(r.url); assert.equal(u.hostname, '127.0.0.1');
      if (r.status !== 200) { assert([503, 504].includes(r.status)); transients.push({ phase: r.phase, url: r.url, status: r.status }); continue; }
      if (u.port === '41954' && u.pathname === '/graphql') {
        const q = JSON.parse(Buffer.from(r.requestBase64, 'base64')), d = JSON.parse(Buffer.from(r.responseBase64, 'base64')); assert(!d.errors);
        if (d.data.walletGenesis) assert.equal(d.data.walletGenesis.digest, inventory.h0);
        else { assert.deepEqual(Object.keys(d.data), ['checkpoint']); assert.equal(d.data.checkpoint.digest, inventory.h0); }
        graph.push({ phase: r.phase, request: q, data: d.data });
      } else if (u.pathname.endsWith('/account/graphql')) { const d = JSON.parse(Buffer.from(r.responseBase64, 'base64')); assert(!d.errors); }
      else {
        const method = u.pathname.split('/').pop(); assert(['GetServiceInfo', 'GetObject', 'GetCheckpoint'].includes(method));
        frame(r.requestBase64, GrpcTypes[method + 'Request'], false); const response = frame(r.responseBase64, GrpcTypes[method + 'Response'], true); rpc++;
        if (method === 'GetServiceInfo') assert.equal(response.chainId, inventory.h0);
        if (method === 'GetObject' && response.object?.bcs?.value) { const o = response.object, parsed = bcs.Object.parse(o.bcs.value);
          assert.equal(toBase64(bcs.Object.serialize(parsed).toBytes()), toBase64(o.bcs.value)); assert.equal(typed('Object', o.bcs.value), o.digest); canonicalObjects++; }
      }
    }
    const markers = new Map();
    for (const branch of p.kioskBranches) {
      const target = owner.kiosks.find(k => k.kioskId === branch.kioskId); assert.equal(branch.ownershipObjectId, target.ownershipObject.objectId);
      assert(branch.cardHref.includes(branch.kioskId)); assert(/Kiosk 中暂无资产|Kiosk is empty/.test(branch.detailsText));
      for (const snap of [branch.listSnapshot, branch.detailsSnapshot]) {
        const parts = JSON.parse(snap.authority.assetSnapshotKey); assert.equal(parts[0], snap.authority.readSessionKey);
        assert.equal(JSON.parse(parts[0])[0], snap.authority.bindingKey); assert.equal(JSON.parse(snap.authority.bindingKey)[5], inventory.h0); assert.equal(JSON.parse(snap.authority.bindingKey)[6], inventory.generation);
        assert.equal(parts[2], snap.checkpoint); assert.equal(parts[3], snap.digest); assert.deepEqual(parts[4], snap.dependencies); assert.equal(parts[4].length, 10);
        assert.equal(parts[5].coverage.snapshotCheckpoint, snap.checkpoint); assert.equal(parts[5].coverage.snapshotCheckpointDigest, snap.digest); assert(BigInt(snap.checkpoint) >= 281963n);
        if (markers.has(snap.checkpoint)) assert.equal(markers.get(snap.checkpoint), snap.digest); markers.set(snap.checkpoint, snap.digest);
      }
      const matching = graph.filter(r => String(r.data.walletSnapshot?.sequenceNumber) === branch.detailsSnapshot.checkpoint && r.data.walletSnapshot?.digest === branch.detailsSnapshot.digest);
      assert(matching.length); const dyn = matching.find(r => r.request.variables?.parent === target.kioskId && r.data.walletSnapshot.query.address?.dynamicFields);
      assert(dyn); const fields = dyn.data.walletSnapshot.query.address.dynamicFields; assert.equal(fields.pageInfo.hasNextPage, false);
      assert.equal(fields.nodes.length, branch.kind === 'framework' ? 0 : branch.kind === 'personal' ? 1 : 4);
      const collection = graph.find(r => String(r.data.walletSnapshot?.sequenceNumber) === branch.listSnapshot.checkpoint && r.request.variables?.owner === p.owner && r.data.walletSnapshot.query.address?.objects);
      assert(collection); assert.equal(collection.data.walletSnapshot.query.address.objects.pageInfo.hasNextPage, false);
      const node = collection.data.walletSnapshot.query.address.objects.nodes.find(n => n.address === target.ownershipObject.objectId);
      assert(node); assert.equal(node.digest, target.ownershipObject.digest); assert.equal(node.contents.bcs, target.ownershipObject.contentBase64);
      assert.equal(node.owner.__typename, 'AddressOwner'); assert.equal(node.owner.address.address, p.owner);
    }
    assert(!p.traffic.some(r => /\/(SimulateTransaction|ExecuteTransaction|VerifySignature)$/.test(new URL(r.url).pathname)));
    assert(p.captureErrors.every(r => r.closing === true));
    stage = 'fresh typed UI markers';
    globalThis.fetch = async (input, init) => { const u = new URL(input instanceof Request ? input.url : String(input));
      assert.equal(u.origin, 'http://127.0.0.1:41750'); assert(/\/(GetServiceInfo|GetCheckpoint)$/.test(u.pathname));
      const response = await originalFetch(input, { ...init, credentials: 'omit', redirect: 'error' }); supplementalFrames.push({ url: u.href, status: response.status, requestBase64: Buffer.from(init?.body ?? []).toString('base64'), responseBase64: Buffer.from(await response.clone().arrayBuffer()).toString('base64') }); return response; };
    const client = new RtdGrpcClient({ network: 'localnet', baseUrl: 'http://127.0.0.1:41750', format: 'binary', fetch: globalThis.fetch, mvr: { url: '' } });
    assert.equal((await client.ledgerService.getServiceInfo({}, { timeout: 20000 })).response.chainId, inventory.h0);
    for (const [sequence, digest] of markers) { const c = (await client.ledgerService.getCheckpoint({ checkpointId: { oneofKind: 'sequenceNumber', sequenceNumber: BigInt(sequence) }, readMask: { paths: ['sequence_number', 'digest', 'summary', 'contents'] } }, { timeout: 20000 })).response.checkpoint;
      assert.equal(c.digest, digest); assert.equal(typed('CheckpointSummary', c.summary.bcs.value), digest); assert.equal(typed('CheckpointContents', c.contents.bcs.value), c.contents.digest); assert.equal(c.summary.contentDigest, c.contents.digest); }
    assert.equal((await client.ledgerService.getServiceInfo({}, { timeout: 20000 })).response.chainId, inventory.h0);
    for (const r of supplementalFrames) { assert.equal(r.status, 200); const method = new URL(r.url).pathname.split('/').pop(); frame(r.requestBase64, GrpcTypes[method + 'Request'], false); frame(r.responseBase64, GrpcTypes[method + 'Response'], true); }
    report = { passed: true, observedAt: new Date().toISOString(), h0: inventory.h0, source: p.source, owner: p.owner, actualCurrentUiChecks: 16,
      currentEmptyBranches: p.kioskBranches.map(k => ({ kind: k.kind, kioskId: k.kioskId, listCheckpoint: k.listSnapshot.checkpoint, detailsCheckpoint: k.detailsSnapshot.checkpoint })),
      originalFramesVerified: p.frames.length, successfulRpcFrames: rpc, successfulGraphqlFrames: graph.length, canonicalObjectFrames: canonicalObjects,
      typedUiMarkers: [...markers].map(([checkpoint, digest]) => ({ checkpoint, digest })), transient503Or504Responses: transients, closingCaptureErrors: p.captureErrors,
      normalWholeJournalRelockVerified: true, ownedChromeAbsent: true, originalBackgroundCapturesComplete: false, sustainedAvailabilityAccepted: false,
      nonemptyLockedListedTransferAccepted: false, fullK3Accepted: false, parentQA07Complete: false, simulations: 0, signatures: 0, executeRequests: 0, supplementalFrames,
      inputsSha256: Object.fromEntries([__filename, path.resolve(uiFile), inventoryFile, independentFile, buildFile].map(f => [f, sha(f)])),
      scope: 'Current three actual empty framework/Personal/OB cards/details/noNFTlinks and navigation refresh, complete recorded transport with explicit transients and closing cancellations, current C42 loaded UI/worker, whole three stores unchanged and normal relock/natural close; fresh typed UI markers. No nonempty/locked/listed/transfer competition, fullK3/parent/ordinaryTLS/sustained acceptance.' };
  } catch (error) { report = { passed: false, stage, observedAt: new Date().toISOString(), errorType: error.name, message: String(error.message).slice(0, 650), supplementalFrames }; process.exitCode = 1; }
  finally { globalThis.fetch = originalFetch; fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ passed: report.passed, stage: report.stage, message: report.message, checks: report.actualCurrentUiChecks, frames: report.originalFramesVerified, supplementary: supplementalFrames.length })); }
})().catch(error => { console.error(JSON.stringify({ passed: false, message: String(error.message).slice(0, 300) })); process.exitCode = 1; });
