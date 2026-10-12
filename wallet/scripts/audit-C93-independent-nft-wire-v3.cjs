// Independently decode every retained original fixture request/response; zero I/O.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { GrpcTypes } = require('rtd-typescript/grpc');
const { Transaction } = require('rtd-typescript/transactions'), { bcs } = require('rtd-typescript/bcs');
const { verifyTransactionSignature } = require('rtd-typescript/verify');
const read = f => JSON.parse(fs.readFileSync(f)), sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function frame(value, codec, response) {
  const raw = Buffer.from(value, 'base64'); assert.equal(raw[0], 0); const end = 5 + raw.readUInt32BE(1); assert(end <= raw.length);
  if (response) { assert.equal(raw[end], 128); assert.equal(end + 5 + raw.readUInt32BE(end + 1), raw.length); assert.match(raw.subarray(end + 5).toString(), /(^|\r\n)grpc-status:[ \t]*0(\r\n|$)/); }
  else assert.equal(raw.length, end);
  return codec.fromBinary(raw.subarray(5, end));
}
function canonical(codec, bytes) { const parsed = codec.parse(bytes); assert.deepEqual(Buffer.from(codec.serialize(parsed).toBytes()), Buffer.from(bytes)); return parsed; }
(async () => {
  const [op, nativeFile, output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
  const intent = read(path.join(op, 'intent.json')), native = read(nativeFile), pending = read(path.join(op, 'seed/pending.json'));
  assert(native.passed && native.original13AndPolicyHeld && native.canonicalCapabilityCount === 5);
  const pins = { ...intent.inputsSha256, ...intent.protectedOriginalsSha256, ...native.inputsSha256 };
  for (const [f, h] of Object.entries(pins)) assert.equal(sha(f), h);
  const bytes = Buffer.from(pending.bytesBase64, 'base64'); const data = canonical(bcs.TransactionData, bytes);
  assert.equal(data.V1.sender, native.addresses.source); assert.equal(data.V1.gasData.owner, native.addresses.source);
  assert.equal(await Transaction.from(bytes).getDigest(), pending.digest);
  assert.equal((await verifyTransactionSignature(bytes, pending.signature)).toRtdAddress(), native.addresses.source);
  let grpcFrames = 0, faucets = 0, executions = 0, exactFinalSimulations = 0; const methods = {}, extra = [], missingLagReplies = [];
  const failure = read(path.join(op, 'seed/failure.json')), recovered = read(path.join(op, 'recover/evidence.json'));
  assert.equal(failure.executeRequests, 1); assert.equal(failure.signatures, 1); assert.equal(failure.simulations, 1);
  assert(recovered.passed && recovered.executeRequests === 0 && recovered.signatures === 0 && recovered.simulations === 0 && recovered.faucetRequests === 0);
  assert.equal(recovered.digest, pending.digest);
  for (const stage of ['inspect', 'fund', 'seed', 'recover']) {
    const file = path.join(op, stage, stage === 'seed' ? 'frames-failed.json' : 'frames.json'); extra.push(file);
    for (const wire of read(file)) {
      assert.equal(wire.status, 200); assert(!wire.transportError);
      const u = new URL(wire.url); assert.equal(u.hostname, '127.0.0.1');
      if (u.port === '41753') {
        assert.equal(stage, 'fund'); const request = JSON.parse(Buffer.from(wire.requestBase64, 'base64').toString());
        const response = JSON.parse(Buffer.from(wire.responseBase64, 'base64').toString());
        assert(Object.keys(request).length === 1 && request.FixedAmountRequest);
        assert([native.addresses.source, native.addresses.sponsor].includes(request.FixedAmountRequest.recipient));
        assert.equal(response.status, 'Success'); faucets++; continue;
      }
      assert.equal(u.port, '41750'); const method = u.pathname.split('/').pop();
      assert(GrpcTypes[method + 'Request'] && GrpcTypes[method + 'Response'], 'Known gRPC message codec required: ' + method);
      const request = frame(wire.requestBase64, GrpcTypes[method + 'Request'], false);
      if (wire.responseBase64 === '') {
        assert.equal(stage, 'seed'); assert.equal(method, 'GetTransaction'); assert.equal(request.digest, pending.digest);
        assert.equal(failure.message, 'Transaction ' + pending.digest + ' not found');
        missingLagReplies.push({ stage, digest: request.digest, status: wire.status, bodyBytes: 0, originalReplyHeadersNotCaptured: true, originalGrpcStatusUnverified: true });
        continue;
      }
      const response = frame(wire.responseBase64, GrpcTypes[method + 'Response'], true);
      grpcFrames++; methods[method] = (methods[method] ?? 0) + 1;
      if (method === 'ExecuteTransaction') {
        assert.equal(stage, 'seed'); executions++; assert.equal(Buffer.from(request.transaction.bcs.value).toString('base64'), pending.bytesBase64);
        assert.equal(request.signatures.length, 1); assert.equal(Buffer.from(request.signatures[0].bcs.value).toString('base64'), pending.signature);
        assert.equal(Buffer.from(response.transaction.transaction.bcs.value).toString('base64'), pending.bytesBase64);
        assert.deepEqual(response.transaction.signatures.map(s => Buffer.from(s.bcs.value).toString('base64')), [pending.signature]);
        const effects = canonical(bcs.TransactionEffects, response.transaction.effects.bcs.value);
        assert.equal(effects.V2.transactionDigest, pending.digest); assert.equal(effects.V2.status.$kind, 'Success'); assert(response.transaction.effects.status.success);
      }
      if (method === 'SimulateTransaction') {
        assert.equal(stage, 'seed'); assert.equal(request.checks, GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED);
        if (request.transaction.bcs?.value && Buffer.from(request.transaction.bcs.value).equals(bytes)) {
          assert.equal(request.doGasSelection, false); assert.equal(response.transaction.transaction.digest, pending.digest);
          assert(!request.readMask.paths.some(p => p === 'transaction.bcs'));
          const effects = canonical(bcs.TransactionEffects, response.transaction.effects.bcs.value);
          assert.equal(effects.V2.transactionDigest, pending.digest); assert.equal(effects.V2.status.$kind, 'Success'); exactFinalSimulations++;
        } else {
          assert(!request.transaction.bcs); assert.equal(request.doGasSelection, true);
          assert.equal(request.transaction.sender, native.addresses.source);
          assert.equal(response.transaction.transaction.sender, native.addresses.source);
          assert(request.transaction.kind && response.transaction.transaction.kind);
        }
      }
      if (['seed', 'recover'].includes(stage) && method === 'GetTransaction') assert.equal(request.digest, pending.digest);
    }
  }
  assert.equal(faucets, 2); assert.equal(executions, 1); assert(exactFinalSimulations >= 1); assert.equal(missingLagReplies.length, 1);
  assert.equal(methods.GetPackage >= 4, true); assert.equal(native.nfts.length + native.obNfts.length, 8);
  const report = { passed: true, observedAt: new Date().toISOString(), operation: op, originalSuccessfulGrpcFramesDecoded: grpcFrames, methods, missingLagReplies, allOriginalReplyHeadersAccepted:false,
    actualFreshFaucetRequests: faucets, actualUniqueExecuteRequests: executions, exactFinalEnabledSimulations: exactFinalSimulations,
    sender: native.addresses.source, digest: pending.digest, canonicalTransactionAndEffects: true, cryptographicSignatureVerified: true,
    eightNFTFiveCapsAndOriginal13PolicyHeld: true, originalFailureRetained: true, recoveryOnlyOriginalDigest: true,
    simulationsByAudit: 0, signaturesByAudit: 0, executeRequestsByAudit: 0,
    newContainers: 0, indexedAccepted: false, chromeAccepted: false, parentAcceptance: false,
    inputsSha256: Object.fromEntries([__filename, nativeFile, path.join(op, 'intent.json'), path.join(op, 'seed/pending.json'), path.join(op, 'seed/failure.json'), path.join(op, 'recover/evidence.json'), ...extra].map(f => [path.resolve(f), sha(f)])) };
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ passed: true, originalSuccessfulGrpcFramesDecoded: grpcFrames, unverifiedOriginalLagReplies:missingLagReplies.length, actualUniqueExecuteRequests: executions, auditExecuteRequests: 0 }));
})().catch(error => { console.error(JSON.stringify({ passed: false, errorType: error.name, message: String(error.message).slice(0, 300) })); process.exitCode = 1; });
