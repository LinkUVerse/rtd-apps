// Independently decode actual native requests, full final bytes/effects and signatures.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { GrpcTypes } = require('rtd-typescript/grpc'), { bcs } = require('rtd-typescript/bcs');
const { Transaction } = require('rtd-typescript/transactions'), { verifyTransactionSignature } = require('rtd-typescript/verify');
const { normalizeStructTag, toBase58 } = require('rtd-typescript/utils'), { blake2b } = require('@noble/hashes/blake2.js');
const read = f => JSON.parse(fs.readFileSync(f)), sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const typed = (name, bytes) => toBase58(blake2b(Buffer.concat([Buffer.from(name + '::'), Buffer.from(bytes)]), { dkLen: 32 }));
function canonical(codec, bytes) { const value = codec.parse(bytes); assert.deepEqual(Buffer.from(codec.serialize(value).toBytes()), Buffer.from(bytes)); return value; }
function message(base64, type, reply = false) {
  const raw = Buffer.from(base64, 'base64'); assert(raw.length >= 5 && raw[0] === 0); const end = 5 + raw.readUInt32BE(1); assert(end <= raw.length);
  if (reply) { assert.equal(raw[end], 128); assert.equal(end + 5 + raw.readUInt32BE(end + 1), raw.length); assert.match(raw.subarray(end + 5).toString(), /(^|\r\n)grpc-status:[ \t]*0(\r\n|$)/); }
  else assert.equal(end, raw.length);
  return type.fromBinary(raw.subarray(5, end));
}
function projection(o) {
  const kinds = GrpcTypes.Owner_OwnerKind; let owner;
  if (o.owner.kind === kinds.ADDRESS) owner = { $kind: 'AddressOwner', AddressOwner: o.owner.address };
  else if (o.owner.kind === kinds.OBJECT) owner = { $kind: 'ObjectOwner', ObjectOwner: o.owner.address };
  else if (o.owner.kind === kinds.SHARED) owner = { $kind: 'Shared', Shared: { initialSharedVersion: String(o.owner.version) } };
  else if (o.owner.kind === kinds.IMMUTABLE) owner = { $kind: 'Immutable', Immutable: true };
  else if (o.owner.kind === kinds.CONSENSUS_ADDRESS) owner = { $kind: 'ConsensusAddressOwner', ConsensusAddressOwner: { owner: o.owner.address, startVersion: String(o.owner.version) } };
  else assert.fail('Exact native owner kind required');
  assert(o.contents?.value && o.version !== undefined && o.digest && o.objectType);
  return { objectId: o.objectId, version: String(o.version), digest: o.digest, owner, type: normalizeStructTag(o.objectType), contentBase64: Buffer.from(o.contents.value).toString('base64') };
}
function protoExpiration(proto, data) {
  const kind = GrpcTypes.TransactionExpiration_TransactionExpirationKind;
  if (data.$kind === 'None') { assert.equal(proto.kind, kind.NONE); return; }
  if (data.$kind === 'Epoch') { assert.equal(proto.kind, kind.EPOCH); assert.equal(String(proto.epoch), data.Epoch); return; }
  assert(['ValidDuring', 'Validity'].includes(data.$kind)); const e = data[data.$kind];
  assert.equal(proto.kind, data.$kind === 'Validity' ? kind.VALIDITY : kind.VALID_DURING);
  assert.equal(proto.chain, e.chain); assert.equal(String(proto.nonce), String(e.nonce));
  for (const [wire, local] of [['epoch', 'maxEpoch'], ['minEpoch', 'minEpoch'], ['minTimestamp', 'minTimestamp'], ['maxTimestamp', 'maxTimestamp']]) {
    assert.equal(proto[wire] === undefined ? null : String(proto[wire]), e[local] === null ? null : String(e[local]));
  }
  if (data.$kind === 'Validity') { assert.equal(String(proto.allowedProposers.epoch), e.allowedProposers.epoch); assert.deepEqual(proto.allowedProposers.proposers, e.allowedProposers.proposers); }
}
(async () => {
  const [proofFile, output] = process.argv.slice(2); assert(output && !fs.existsSync(output)); const p = read(proofFile); assert(p.passed && p.executeRequests === 0);
  assert.equal(p.checks.length, 14); assert.equal(p.frames.length, 84); assert.equal(p.snapshotCalls, 0); assert.equal(p.privateSignatures, 2);
  for (const [f, h] of Object.entries(p.inputsSha256)) assert.equal(sha(f), h);
  const originalBytes = Buffer.from(p.prepared.bytesBase64, 'base64'), original = canonical(bcs.TransactionData, originalBytes);
  assert.equal(typed('TransactionData', originalBytes), p.prepared.digest); assert.equal(await Transaction.from(originalBytes).getDigest(), p.prepared.digest);
  assert.equal(p.prepared.route, 'direct'); assert.equal(p.prepared.gasPaymentKind, 'coins'); assert.equal(original.V1.sender, p.directNFT.sender); assert.equal(original.V1.gasData.owner, p.directNFT.sender);
  assert.equal(original.V1.kind.ProgrammableTransaction.inputs[0].Object.ImmOrOwnedObject.objectId, p.directNFT.objectId);
  assert.equal(bcs.Address.parse(Buffer.from(original.V1.kind.ProgrammableTransaction.inputs[1].Pure.bytes, 'base64')), p.directNFT.to);
  const cases = new Map(p.cases.map(c => [c.label, c])); assert.equal(cases.size, 3);
  for (const c of cases.values()) {
    assert.equal(c.originalDigest, p.prepared.digest); assert.notEqual(c.digest, p.prepared.digest);
    const bytes = Buffer.from(c.bytesBase64, 'base64'), actual = canonical(bcs.TransactionData, bytes), expected = structuredClone(original);
    assert.equal(typed('TransactionData', bytes), c.digest);
    if (c.label === 'changed Gas budget stale NFT digest') expected.V1.gasData.budget = String(BigInt(expected.V1.gasData.budget) + 1000n);
    else if (c.label === 'changed recipient stale NFT digest') expected.V1.kind.ProgrammableTransaction.inputs[1].Pure.bytes = actual.V1.kind.ProgrammableTransaction.inputs[1].Pure.bytes;
    else { assert.equal(c.label, 'changed expiration None stale NFT digest'); expected.V1.expiration = { $kind: 'None', None: true }; }
    assert.deepEqual(actual, expected);
    const reject = p.rejected.find(r => r.label === c.label); assert(reject && reject.actualRequests === 3 && !reject.zeroIO && reject.message.includes('已授权的交易模拟未通过'));
  }
  assert.equal(p.rejected.filter(r => r.zeroIO && r.actualRequests === 0).length, 4);
  const signatures = p.localSignatures, sponsored = canonical(bcs.TransactionData, Buffer.from(signatures.bytesBase64, 'base64'));
  assert.equal(sponsored.V1.sender, p.directNFT.sender); assert.equal(sponsored.V1.gasData.owner, p.sponsor); assert.equal(sponsored.V1.gasData.payment.length, 1);
  assert.equal(signatures.bytesBase64, p.sponsored.bytesBase64); assert.equal(typed('TransactionData', Buffer.from(signatures.bytesBase64, 'base64')), p.sponsored.digest);
  const sender = await verifyTransactionSignature(Buffer.from(signatures.bytesBase64, 'base64'), signatures.senderSignature), sponsor = await verifyTransactionSignature(Buffer.from(signatures.bytesBase64, 'base64'), signatures.sponsorSignature);
  assert.equal(sender.toRtdAddress(), p.directNFT.sender); assert.equal(sponsor.toRtdAddress(), p.sponsor);
  const expiredBytes = Buffer.from(signatures.changedExpirationBytesBase64, 'base64'), expired = canonical(bcs.TransactionData, expiredBytes);
  assert.equal(expired.V1.expiration.$kind, 'Epoch'); assert.equal(expired.V1.expiration.Epoch, '0');
  const expectedExpired = structuredClone(sponsored); expectedExpired.V1.expiration = { $kind: 'Epoch', Epoch: '0' }; assert.deepEqual(expired, expectedExpired);
  assert.equal(await sender.verifyTransaction(expiredBytes, signatures.senderSignature), false); assert.equal(await sponsor.verifyTransaction(expiredBytes, signatures.sponsorSignature), false);
  const worldBefore = new Map(), worldAfter = new Map(); const simulated = [], pointObjects = []; let headerExpired = 0, fullReplies = 0, resolution = 0;
  const methods = {}, chainEpochs = [], sponsorCoinRefs = [];
  for (const wire of p.frames) {
    const url = new URL(wire.url); assert.equal(url.origin, 'http://127.0.0.1:41750'); assert.equal(wire.status, 200); assert(!wire.transportError);
    const method = url.pathname.split('/').pop(); assert(!['ExecuteTransaction', 'VerifySignature'].includes(method)); assert(GrpcTypes[method + 'Request']);
    const req = message(wire.requestBase64, GrpcTypes[method + 'Request']); methods[method] = (methods[method] ?? 0) + 1;
    if (!wire.responseBase64) {
      assert.equal(method, 'SimulateTransaction'); assert.equal(wire.phase, 'sponsor NFT expiration changed to expired epoch zero');
      assert.equal(wire.headers['grpc-status'], '13'); assert.equal(decodeURIComponent(wire.headers['grpc-message']), 'Transaction Expired');
      assert(wire.headers['grpc-status-details-bin']); assert.equal(req.checks, GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED);
      assert.deepEqual(Buffer.from(req.transaction.bcs.value), expiredBytes); assert.equal(req.doGasSelection, false); headerExpired++; continue;
    }
    const res = message(wire.responseBase64, GrpcTypes[method + 'Response'], true); fullReplies++;
    if (method === 'GetServiceInfo') { assert.equal(res.chainId, p.h0); assert(res.epoch >= 1n); chainEpochs.push(String(res.epoch)); }
    if (method === 'BatchGetObjects') {
      assert.equal(req.requests.length, res.objects.length);
      for (let i = 0; i < res.objects.length; i++) { const result = res.objects[i].result; assert.equal(result.oneofKind, 'object'); const o = result.object; assert.equal(req.requests[i].objectId, o.objectId);
        const map = wire.phase === 'fresh initial state' ? worldBefore : worldAfter; assert(['fresh initial state', 'fresh all new thirteen and original thirteen and policy postconditions'].includes(wire.phase)); assert(!map.has(o.objectId)); map.set(o.objectId, projection(o)); }
    }
    if (method === 'GetObject') {
      const o = res.object; assert.equal(o.objectId, p.directNFT.objectId); assert.equal(o.owner.address, p.directNFT.sender);
      const body = canonical(bcs.Object, o.bcs.value); assert.equal(typed('Object', o.bcs.value), o.digest); assert.equal(body.data.$kind, 'Move');
      assert.deepEqual(Buffer.from(body.data.Move.contents), Buffer.from(o.contents.value)); assert.equal(body.data.Move.version, String(o.version)); pointObjects.push(o.objectId);
    }
    if (method === 'ListOwnedObjects' && wire.phase === 'fresh sponsor coin reference') {
      for (const o of res.objects) { assert.equal(o.owner.address, p.sponsor); sponsorCoinRefs.push({ objectId: o.objectId, version: String(o.version), digest: o.digest }); }
    }
    if (method === 'SimulateTransaction') {
      assert.equal(req.checks, GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED);
      if (!req.transaction.bcs) { assert.equal(wire.phase, 'direct production core preparation'); assert.equal(req.doGasSelection, true); assert.equal(req.transaction.sender, p.directNFT.sender); resolution++; continue; }
      assert.equal(req.doGasSelection, false); assert.deepEqual(req.readMask.paths, ['transaction', 'command_outputs']);
      const bytes = Buffer.from(req.transaction.bcs.value), data = canonical(bcs.TransactionData, bytes), digest = typed('TransactionData', bytes), tx = res.transaction;
      assert.deepEqual(Buffer.from(tx.transaction.bcs.value), bytes); if(tx.digest !== undefined) assert.equal(tx.digest, digest); assert.equal(tx.transaction.digest, digest);
      assert.equal(tx.transaction.sender, data.V1.sender); assert.equal(tx.transaction.gasPayment.owner, data.V1.gasData.owner); assert.equal(String(tx.transaction.gasPayment.budget), data.V1.gasData.budget); assert.equal(String(tx.transaction.gasPayment.price), data.V1.gasData.price);
      assert.deepEqual(tx.transaction.gasPayment.objects.map(o => ({ objectId: o.objectId, version: String(o.version), digest: o.digest })), data.V1.gasData.payment); protoExpiration(tx.transaction.expiration, data.V1.expiration);
      const effects = canonical(bcs.TransactionEffects, tx.effects.bcs.value); assert.equal(typed('TransactionEffects', tx.effects.bcs.value), tx.effects.digest); assert.equal(effects.V2.transactionDigest, digest); assert.equal(effects.V2.status.$kind, 'Success'); assert(tx.effects.status.success && !tx.effects.status.error);
      assert.equal(effects.V2.executedEpoch, String(tx.effects.epoch)); assert.equal(tx.effects.transactionDigest, digest);
      const nftWrite = effects.V2.changedObjects.find(([id]) => id === p.directNFT.objectId); assert(nftWrite && nftWrite[1].outputState.$kind === 'ObjectWrite');
      const to = bcs.Address.parse(Buffer.from(data.V1.kind.ProgrammableTransaction.inputs[1].Pure.bytes, 'base64')); assert.equal(nftWrite[1].outputState.ObjectWrite[1].AddressOwner, to);
      const expected = cases.get(wire.phase)?.bytesBase64 ?? (wire.phase.includes('sponsor NFT') ? p.sponsored.bytesBase64 : p.prepared.bytesBase64); assert.equal(bytes.toString('base64'), expected);
      simulated.push({ phase: wire.phase, digest, gasOwner: data.V1.gasData.owner, gasBudget: data.V1.gasData.budget, recipient: to, expirationKind: data.V1.expiration.$kind, canonicalFullFinalBytesAndEffects: true });
    }
  }
  assert.equal(fullReplies, 83); assert.equal(headerExpired, 1); assert.equal(resolution, 1); assert.equal(simulated.length, 7); assert.equal(methods.SimulateTransaction, 9);
  assert.equal(worldBefore.size, 27); assert.equal(worldAfter.size, 27); assert.deepEqual(worldAfter, worldBefore); assert(pointObjects.length === 1);
  assert(sponsorCoinRefs.some(ref => JSON.stringify(ref) === JSON.stringify(sponsored.V1.gasData.payment[0])));
  for (const o of [...p.nativeBefore, ...p.original13Before, ...p.policyBefore]) assert.deepEqual(worldBefore.get(o.objectId), o);
  assert.deepEqual(p.nativeAfter, p.nativeBefore); assert.equal(p.nativeBefore.length, 13); assert.equal(p.original13Before.length, 13);
  const files = [__filename, proofFile, path.join(path.dirname(proofFile), '20261008-C94-initial-driver-failure-01.json'), path.join(path.dirname(proofFile), '20261008-C94-recipient-builder-driver-failure-01.json')];
  const report = { passed: true, observedAt: new Date().toISOString(), proof: proofFile, all84OriginalRequestsDecoded: true, successfulFullRepliesAndTrailers: 83, actualExpiredEpochReplyHeaders: 1,
    completeSuccessfulFinalBCSSimulations: 7, resolverEnabledSimulations: 1, actualEnabledSimulationRequests: 9, finalSimulations: simulated,
    senderAndSponsorBothFullByteSignaturesVerified: true, changedExpirationRejectsBothOriginalSignatures: true, actualEpochExpiredReply: 'INTERNAL13 Transaction Expired',
    complete27ObjectsBeforeAndAfterHeld: true, newEightNFTFiveCapsHeld: true, original13AndPolicyHeld: true,
    fourPreIOGuardsVerified: true, actualThreeChangedDigestRefusalsVerified: true, methods, chainEpochs,
    auditRequests: 0, auditSimulations: 0, auditSignatures: 0, auditExecuteRequests: 0, newContainers: 0,
    providerChromeAccepted: false, fourRouteCompetitionAccepted: false, fullNFTAuthorizationAccepted: false, sponsoredExecutionAccepted: false, parentAcceptance: false,
    inputsSha256: Object.fromEntries(files.map(f => [path.resolve(f), sha(f)])) };
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ passed: true, actualRequests: 84, finalSimulations: 7, signaturesVerified: 2, auditExecuteRequests: 0 }));
})().catch(error => { console.error(JSON.stringify({ passed: false, errorType: error.name, message: String(error.message).slice(0, 450) })); process.exitCode = 1; });
