// Independent approval gate: no requests, new signatures, simulation or execution.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { GrpcTypes } = require('rtd-typescript/grpc'), { bcs } = require('rtd-typescript/bcs');
const { verifyTransactionSignature } = require('rtd-typescript/verify'), { Transaction } = require('rtd-typescript/transactions');
const read = f => JSON.parse(fs.readFileSync(f)), sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function frame(base64, codec, reply = false) {
  const raw = Buffer.from(base64, 'base64'); assert(raw.length >= 5 && raw[0] === 0); const end = 5 + raw.readUInt32BE(1); assert(end <= raw.length);
  if (reply) { assert.equal(raw[end], 128); assert.equal(end + 5 + raw.readUInt32BE(end + 1), raw.length); assert.match(raw.subarray(end + 5).toString(), /(^|\r\n)grpc-status:[ \t]*0(\r\n|$)/); }
  else assert.equal(end, raw.length);
  return codec.fromBinary(raw.subarray(5, end));
}
(async () => {
  const [operation, output] = process.argv.slice(2), op = path.resolve(operation), base = path.join(op, 'approve'); assert(output && !fs.existsSync(output));
  const files = ['evidence', 'authorization-input', 'wallet-standard-authorization', 'node-frames', 'browser-frames', 'protected-before', 'protected-after', 'journal-before', 'journal-after', 'normal-exit', 'worker-source', 'ui-source'].map(n => path.join(base, n + '.json'));
  const p = read(files[0]); assert(p.passed && p.executeRequests === 0 && p.actualWalletStandardSignatures === 1 && p.captureErrors.length === 0);
  for (const [f, h] of Object.entries(p.inputsSha256)) assert.equal(sha(f), h);
  const input = read(files[1]), auth = read(files[2]); assert(auth.passed && auth.records.length === 1 && auth.transactionSignatures === 1);
  const signed = auth.records[0], bytes = Buffer.from(signed.bytesBase64, 'base64'), data = bcs.TransactionData.parse(bytes); assert.equal(bcs.TransactionData.serialize(data).toBase64(), signed.bytesBase64);
  assert.equal(input.bytesBase64, signed.bytesBase64); assert.equal(await Transaction.from(bytes).getDigest(), signed.digest); assert.equal((await verifyTransactionSignature(bytes, signed.signature)).toRtdAddress(), data.V1.sender);
  assert.deepEqual(Transaction.from(bytes).getData().gasData, input.variant.gasData); assert.deepEqual(Transaction.from(bytes).getData().expiration, input.variant.expiration);
  assert(signed.sponsored && signed.previewDigestMatches && signed.uiSponsorAndValidityAccepted); assert(auth.singleSignExecuteDenied.approvalDisabled && auth.singleSignExecuteDenied.refusedBeforeToken && auth.singleSignExecuteDenied.journalUnchanged);
  assert.deepEqual(read(files[8]), read(files[7])); const exit = read(files[9]); assert(exit.allAccountsLocked && exit.admission.pending === 0 && exit.admission.faults.length === 0 && exit.originalProfilesOpened === 0);
  const worker = read(files[10]); assert((worker.after ?? worker.before).matchesDisk); const ui = read(files[11]); assert(ui.matchesDisk && ui.loadedBundles.length === 3);
  const sourceProof = path.resolve(__dirname, '../migrationToGRpcOrGraphQLDoc/workLog/20261008-C94-current-nft-core-authorization-03.json'), oracle = read(sourceProof), expected = new Map([...oracle.nativeBefore, ...oracle.original13Before, ...oracle.policyBefore].map(o => [o.objectId, o]));
  for (const f of files.slice(5, 7)) assert.deepEqual(new Map(read(f).map(o => [o.objectId, o])), expected);
  let requests = 0, simulations = 0, exact = 0, verifyCalls = 0; const methods = {};
  for (const f of files.slice(3, 5)) for (const wire of read(f)) {
    assert.equal(wire.status, 200); const method = new URL(wire.url).pathname.split('/').pop(); assert.notEqual(method, 'ExecuteTransaction'); assert(GrpcTypes[method + 'Request'] && GrpcTypes[method + 'Response']);
    const req = frame(wire.requestBase64, GrpcTypes[method + 'Request']), res = frame(wire.responseBase64, GrpcTypes[method + 'Response'], true); requests++; methods[method] = (methods[method] ?? 0) + 1;
    if (method === 'SimulateTransaction') {
      assert.equal(req.checks, GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED); simulations++;
      if (req.transaction.bcs?.value && Buffer.from(req.transaction.bcs.value).equals(bytes)) {
        assert.equal(req.doGasSelection, false); const tx = res.transaction; assert.deepEqual(Buffer.from(tx.transaction.bcs.value), bytes); assert.equal(tx.transaction.digest, signed.digest);
        const fx = bcs.TransactionEffects.parse(tx.effects.bcs.value); assert.equal(bcs.TransactionEffects.serialize(fx).toBase64(), Buffer.from(tx.effects.bcs.value).toString('base64')); assert.equal(fx.V2.transactionDigest, signed.digest); assert.equal(fx.V2.status.$kind, 'Success');
        assert.equal(tx.transaction.gasPayment.owner, data.V1.gasData.owner); assert.equal(String(tx.transaction.gasPayment.budget), data.V1.gasData.budget); assert.equal(String(tx.transaction.gasPayment.price), data.V1.gasData.price);
        assert.deepEqual(tx.transaction.gasPayment.objects.map(o => ({ objectId: o.objectId, version: String(o.version), digest: o.digest })), data.V1.gasData.payment);
        assert.equal(tx.transaction.expiration.kind, GrpcTypes.TransactionExpiration_TransactionExpirationKind.EPOCH); assert.equal(String(tx.transaction.expiration.epoch), data.V1.expiration.Epoch); exact++;
      }
    }
    if (method === 'VerifySignature') { assert.equal(req.address, data.V1.sender); assert.equal(req.message.name, 'TransactionData'); assert.deepEqual(Buffer.from(req.message.value), bytes); assert.equal(Buffer.from(req.signature.bcs.value).toString('base64'), signed.signature); assert(res.isValid && !res.reason); verifyCalls++; }
  }
  assert.equal(exact, 2); assert.equal(verifyCalls, 1);
  const result = { passed: true, observedAt: new Date().toISOString(), operation: op, actualWalletStandardSenderSignatures: 1, completeApprovedBytesSignatureVerified: true, exactOriginalEnabledNFTSimulations: exact, requestsAndFullRepliesDecoded: requests, simulations, nativeSenderVerifyCalls: verifyCalls, actualSponsorAndEpochUIApproved: true, singleSignWalletExecuteDenied: true, allThreeJournalStoresHeld: true, full27ProtectedObjectsAndC94BaselineHeld: true, normalRelockAndAdmissionSettled: true, exactCurrentWorkerAndThreeUIBundles: true, methods, auditRequests: 0, auditSignatures: 0, auditExecuteRequests: 0, externalExecutionAccepted: false, parentAcceptance: false, inputsSha256: Object.fromEntries([__filename, sourceProof, ...files].map(f => [f, sha(f)])) };
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ passed: true, requestsAndFullRepliesDecoded: requests, exactOriginalEnabledNFTSimulations: exact, nativeSenderVerifyCalls: verifyCalls, auditExecuteRequests: 0 }));
})().catch(e => { console.error(JSON.stringify({ passed: false, errorType: e.name, message: String(e.message).slice(0, 550) })); process.exitCode = 1; });
