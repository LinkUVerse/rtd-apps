// Read-only independent audit of original Wallet Standard and dual-signature gRPC records.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { GrpcTypes } = require('rtd-typescript/grpc'), { bcs } = require('rtd-typescript/bcs');
const { verifyTransactionSignature } = require('rtd-typescript/verify');
const { Transaction } = require('rtd-typescript/transactions');
const { toBase58, normalizeStructTag } = require('rtd-typescript/utils'), { blake2b } = require('@noble/hashes/blake2.js');
const read = f => JSON.parse(fs.readFileSync(f)), sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const typed = (name, bytes) => toBase58(blake2b(Buffer.concat([Buffer.from(name + '::'), Buffer.from(bytes)]), { dkLen: 32 }));
function canonical(codec, bytes) { const data = codec.parse(bytes); assert.deepEqual(Buffer.from(codec.serialize(data).toBytes()), Buffer.from(bytes)); return data; }
function frame(base64, codec, response = false) {
  const raw = Buffer.from(base64, 'base64'); assert(raw.length >= 5 && raw[0] === 0); const end = 5 + raw.readUInt32BE(1); assert(end <= raw.length);
  if (response) { assert.equal(raw[end], 128); assert.equal(end + 5 + raw.readUInt32BE(end + 1), raw.length); assert.match(raw.subarray(end + 5).toString(), /(^|\r\n)grpc-status:[ \t]*0(\r\n|$)/); }
  else assert.equal(end, raw.length);
  return codec.fromBinary(raw.subarray(5, end));
}
function projection(o) {
  const kinds = GrpcTypes.Owner_OwnerKind; let owner;
  if (o.owner.kind === kinds.ADDRESS) owner = { $kind: 'AddressOwner', AddressOwner: o.owner.address };
  else if (o.owner.kind === kinds.OBJECT) owner = { $kind: 'ObjectOwner', ObjectOwner: o.owner.address };
  else if (o.owner.kind === kinds.SHARED) owner = { $kind: 'Shared', Shared: { initialSharedVersion: String(o.owner.version) } };
  else if (o.owner.kind === kinds.IMMUTABLE) owner = { $kind: 'Immutable', Immutable: true };
  else assert.fail('Exact supported native owner kind required');
  assert(o.contents?.value && o.version !== undefined && o.digest && o.objectType);
  if (o.bcs?.value) { const body = canonical(bcs.Object, o.bcs.value); assert.equal(typed('Object', o.bcs.value), o.digest); assert.equal(body.data.$kind, 'Move'); assert.deepEqual(Buffer.from(body.data.Move.contents), Buffer.from(o.contents.value)); }
  return { objectId: o.objectId, version: String(o.version), digest: o.digest, owner, type: normalizeStructTag(o.objectType), contentBase64: Buffer.from(o.contents.value).toString('base64') };
}
function executed(tx, bytes, terminal, mask) {
  const selected = field => mask.some(p => p === "*" || p === field || field.startsWith(p + "."));
  assert(tx?.transaction?.bcs?.value && tx.effects?.bcs?.value);
  const original = Buffer.from(tx.transaction.bcs.value), data = canonical(bcs.TransactionData, original), digest = typed('TransactionData', original);
  if (bytes) assert.deepEqual(original, bytes);
  if (terminal || tx.digest !== undefined) assert.equal(tx.digest, digest);
  assert.equal(tx.transaction.digest, digest); if (selected('transaction.sender')) assert.equal(tx.transaction.sender, data.V1.sender); else assert.equal(tx.transaction.sender, undefined);
  if (selected('transaction.gas_payment')) {
  const gas = tx.transaction.gasPayment; assert.equal(gas.owner, data.V1.gasData.owner); assert.equal(String(gas.budget), data.V1.gasData.budget); assert.equal(String(gas.price), data.V1.gasData.price);
  assert.deepEqual(gas.objects.map(o => ({ objectId: o.objectId, version: String(o.version), digest: o.digest })), data.V1.gasData.payment);
  } else assert.equal(tx.transaction.gasPayment, undefined);
  if (selected('transaction.expiration')) {
  const expiration = data.V1.expiration, proto = tx.transaction.expiration, kinds = GrpcTypes.TransactionExpiration_TransactionExpirationKind;
  if (expiration.$kind === 'Epoch') { assert.equal(proto.kind, kinds.EPOCH); assert.equal(String(proto.epoch), expiration.Epoch); }
  else if (expiration.$kind === 'None') assert.equal(proto.kind, kinds.NONE);
  else {
    assert(['Validity', 'ValidDuring'].includes(expiration.$kind)); const e = expiration[expiration.$kind];
    assert.equal(proto.kind, expiration.$kind === 'Validity' ? kinds.VALIDITY : kinds.VALID_DURING); assert.equal(proto.chain, e.chain); assert.equal(String(proto.nonce), String(e.nonce));
    for (const [wire, local] of [['epoch', 'maxEpoch'], ['minEpoch', 'minEpoch'], ['minTimestamp', 'minTimestamp'], ['maxTimestamp', 'maxTimestamp']]) assert.equal(proto[wire] === undefined ? null : String(proto[wire]), e[local] === null ? null : String(e[local]));
    if (expiration.$kind === 'Validity') { assert.equal(String(proto.allowedProposers.epoch), e.allowedProposers.epoch); assert.deepEqual(proto.allowedProposers.proposers, e.allowedProposers.proposers); }
  }
  } else assert.equal(tx.transaction.expiration, undefined);
  const effects = canonical(bcs.TransactionEffects, tx.effects.bcs.value); assert.equal(typed('TransactionEffects', tx.effects.bcs.value), tx.effects.digest); assert.equal(effects.V2.transactionDigest, digest); assert.equal(effects.V2.status.$kind, 'Success'); assert(tx.effects.status.success && !tx.effects.status.error);
  assert.equal(tx.effects.transactionDigest, digest); assert.equal(String(tx.effects.epoch), effects.V2.executedEpoch);
  return { digest, data, effects };
}
(async () => {
  const [operation, output] = process.argv.slice(2), op = path.resolve(operation); assert(output && !fs.existsSync(output));
  const intentFile = path.join(op, 'intent.json'), intent = read(intentFile), logs = path.resolve(__dirname, '../migrationToGRpcOrGraphQLDoc/workLog');
  const originals = read(path.join(logs, '20261008-C94-current-nft-core-authorization-03.json'));
  const expected = new Map([...originals.nativeBefore, ...originals.original13Before, ...originals.policyBefore].map(o => [o.objectId, o])); assert.equal(expected.size, 27);
  const sourceAddresses = read(path.join(intent.fixture, 'addresses.json')), signed = read(path.join(op, 'approve/wallet-standard-authorization.json')).records[0];
  const approvedBytes = Buffer.from(signed.bytesBase64, 'base64'), approved = canonical(bcs.TransactionData, approvedBytes), digest = typed('TransactionData', approvedBytes);
  assert.equal(await Transaction.from(approvedBytes).getDigest(), digest); assert.equal(digest, signed.digest); assert.equal(approved.V1.sender, sourceAddresses.source); assert.equal(approved.V1.gasData.owner, sourceAddresses.sponsor);
  assert.equal((await verifyTransactionSignature(approvedBytes, signed.signature)).toRtdAddress(), sourceAddresses.source);
  const sponsorPending = read(path.join(op, 'execute/pending.json')); assert.equal(sponsorPending.digest, digest); assert.equal(sponsorPending.bytesBase64, signed.bytesBase64); assert(sponsorPending.senderSignatureFromWalletStandard && sponsorPending.externalSponsor); assert.equal(sponsorPending.signatures[0], signed.signature);
  const verified = await Promise.all(sponsorPending.signatures.map(sig => verifyTransactionSignature(approvedBytes, sig)));
  assert.deepEqual(verified.map(k => k.toRtdAddress()).sort(), [sourceAddresses.source, sourceAddresses.sponsor].sort());
  const auth = read(path.join(op, 'approve/wallet-standard-authorization.json')), denial = auth.singleSignExecuteDenied;
  assert(auth.passed && auth.transactionSignatures === 1 && signed.previewDigestMatches && signed.uiSponsorAndValidityAccepted);
  assert(denial.journalUnchanged && denial.approvalDisabled && denial.rejectEnabled && denial.refusedBeforeToken);
  assert.deepEqual(read(path.join(op, 'approve/journal-before.json')), read(path.join(op, 'approve/journal-after.json')));
  const exit = read(path.join(op, 'approve/normal-exit.json')); assert(exit.allAccountsLocked && exit.admission.pending === 0 && exit.admission.faults.length === 0 && exit.originalProfilesOpened === 0);
  const mutations = read(path.join(op, 'execute/old-signature-mutations.json')); assert.deepEqual(mutations.map(m => m.kind), ['gas', 'expiration']);
  for (const mutation of mutations) for (const sig of sponsorPending.signatures) { let denied = false; try { await verifyTransactionSignature(Buffer.from(mutation.changedBytesBase64, 'base64'), sig); } catch { denied = true; } assert(denied); }
  const retainedFailure = read(path.join(op, 'mint/failure.json')); assert(!retainedFailure.passed && retainedFailure.executeRequests === 1);
  const qualification = read(path.join(logs, '20261008-C95-rpc-error-driver-qualification-01.json')); assert(qualification.passed && qualification.exactOriginalInverse);
  const methods = {}, executeRows = [], nativeTerminals = [], finalSims = [], stages = ['mint', 'recover-mint', 'approve', 'execute', 'recover-execute'];
  let allRequests = 0, fullReplies = 0, actualLagHeaders = 0, simulations = 0, browserExecutions = 0;
  const files = [__filename, intentFile, path.join(logs, '20261008-C94-current-nft-core-authorization-03.json'), path.join(logs, '20261008-C95-rpc-error-driver-qualification-01.json')];
  for (const stage of stages) {
    const failed = ['mint', 'execute'].includes(stage);
    const base = path.join(op, stage), reportFile = path.join(base, failed ? 'failure.json' : 'evidence.json'), report = read(reportFile); files.push(reportFile);
    if (!failed) assert(report.passed && report.all27ProtectedObjectsHeld);
    else assert(report.passed === false && report.executeRequests === 1);
    for (const [f, h] of Object.entries(report.inputsSha256)) assert.equal(sha(f), h);
    const frameFiles = [failed ? 'node-frames-failed.json' : 'node-frames.json']; if (stage === 'approve') frameFiles.push('browser-frames.json');
    for (const name of frameFiles) {
      const frameFile = path.join(base, name); files.push(frameFile);
      const worldBefore = new Map(), worldAfter = new Map();
      for (const wire of read(frameFile)) {
        const method = new URL(wire.url).pathname.split('/').pop(); assert(GrpcTypes[method + 'Request'] && GrpcTypes[method + 'Response']);
        const req = frame(wire.requestBase64, GrpcTypes[method + 'Request']); allRequests++; methods[method] = (methods[method] ?? 0) + 1;
        assert.equal(wire.status, 200);
        if (wire.responseBase64 === '') {
          assert.equal(method, 'GetTransaction'); assert.equal(wire.headers['grpc-status'], '5'); assert.equal(decodeURIComponent(wire.headers['grpc-message']), 'Transaction ' + req.digest + ' not found'); actualLagHeaders++; continue;
        }
        const res = frame(wire.responseBase64, GrpcTypes[method + 'Response'], true); fullReplies++;
        if (method === 'GetServiceInfo') assert.equal(res.chainId, intent.h0);
        if (method === 'BatchGetObjects' && name !== 'browser-frames.json' && wire.phase.startsWith('27 protected objects ') && req.requests.length === 27 && req.requests.every(r => expected.has(r.objectId))) {
          const map = wire.phase.endsWith('before') ? worldBefore : worldAfter;
          for (const item of res.objects) { assert(item.result?.oneofKind === 'object'); const o = projection(item.result.object); assert(!map.has(o.objectId)); map.set(o.objectId, o); }
        }
        if (method === 'SimulateTransaction') {
          assert.equal(req.checks, GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED); simulations++;
          if (req.transaction?.bcs?.value) { assert.equal(req.doGasSelection, false); const parsed = executed(res.transaction, Buffer.from(req.transaction.bcs.value), false, req.readMask.paths.map(p => p === 'transaction' ? '*' : p.startsWith('transaction.') ? p.slice(12) : p)); finalSims.push({ stage, browser: name === 'browser-frames.json', digest: parsed.digest, gasOwner: parsed.data.V1.gasData.owner }); }
        }
        if (method === 'ExecuteTransaction') {
          if (name === 'browser-frames.json') browserExecutions++;
          assert(['mint', 'execute'].includes(stage)); const bytes = Buffer.from(req.transaction.bcs.value), parsed = executed(res.transaction, bytes, true, req.readMask.paths);
          const signers = await Promise.all(req.signatures.map(s => verifyTransactionSignature(bytes, Buffer.from(s.bcs.value).toString('base64'))));
          if (stage === 'execute') { assert.equal(bytes.toString('base64'), signed.bytesBase64); assert.equal(req.signatures.length, 2); assert.deepEqual(signers.map(k => k.toRtdAddress()).sort(), verified.map(k => k.toRtdAddress()).sort()); }
          else { assert.equal(req.signatures.length, 1); assert.equal(signers[0].toRtdAddress(), sourceAddresses.source); }
          assert.deepEqual(res.transaction.signatures.map(s => Buffer.from(s.bcs.value).toString('base64')), req.signatures.map(s => Buffer.from(s.bcs.value).toString('base64')));
          executeRows.push({ stage, digest: parsed.digest, requiredSignatures: req.signatures.length, exactCanonicalBytesAndEffects: true });
        }
        if (method === 'GetTransaction' && ['recover-mint', 'recover-execute'].includes(stage)) {
          const tx = res.transaction, parsed = executed(tx, undefined, true, req.readMask.paths); assert(tx.checkpoint !== undefined);
          nativeTerminals.push({ stage, digest: parsed.digest, checkpoint: String(tx.checkpoint) });
        }
      }
      if (name !== 'browser-frames.json') {
        assert.deepEqual(worldBefore, expected);
        if (!failed) { assert.deepEqual(worldAfter, expected); assert.deepEqual(worldAfter, worldBefore); }
      }
    }
    const beforeFile = path.join(base, 'protected-before.json'); files.push(beforeFile); assert.deepEqual(new Map(read(beforeFile).map(o => [o.objectId, o])), expected);
    if (!failed) { const afterFile = path.join(base, 'protected-after.json'); files.push(afterFile); assert.deepEqual(new Map(read(afterFile).map(o => [o.objectId, o])), expected); }
  }
  assert.equal(executeRows.length, 2); assert.equal(browserExecutions, 0); assert(actualLagHeaders >= 2); assert(nativeTerminals.some(x => x.stage === 'recover-execute' && x.digest === digest));
  const same = finalSims.filter(s => s.digest === digest); assert(same.filter(s => s.browser).length === 2 && same.filter(s => !s.browser).length === 1);
  const inputFile = path.join(op, 'approve/authorization-input.json'), afterFile = path.join(op, 'recover-execute/nft-after.json'), balanceFile = path.join(op, 'recover-execute/sponsored-balance-proof.json'), recoveredFile = path.join(op, 'recover-execute/recovered.json');
  const input = read(inputFile), nftAfter = read(afterFile), balance = read(balanceFile), receipt = read(recoveredFile), effects = canonical(bcs.TransactionEffects, Buffer.from(receipt.Transaction.effects.bcs, 'base64'));
  assert.equal(input.nft.owner.AddressOwner, sourceAddresses.source); assert.equal(nftAfter.owner.AddressOwner, sourceAddresses.newTarget); assert.equal(input.nft.objectId, nftAfter.objectId); assert(!expected.has(nftAfter.objectId));
  const write = effects.V2.changedObjects.find(([id]) => id === nftAfter.objectId); assert(write && write[1].outputState.$kind === 'ObjectWrite'); assert.equal(write[1].outputState.ObjectWrite[1].AddressOwner, sourceAddresses.newTarget);
  const gas = effects.V2.gasUsed, charged = BigInt(gas.computationCost) + BigInt(gas.storageCost) - BigInt(gas.storageRebate);
  assert.equal(balance.before.source.balance, balance.after.source.balance); assert.equal(BigInt(balance.sponsorSpent), charged); assert.equal(BigInt(balance.before.sponsor.balance) - BigInt(balance.after.sponsor.balance), charged);
  files.push(inputFile, afterFile, balanceFile, recoveredFile, path.join(op, 'approve/wallet-standard-authorization.json'), path.join(op, 'approve/normal-exit.json'), path.join(op, 'execute/old-signature-mutations.json'), path.join(logs, '20261008-C95-rpc-error-driver-qualification-02.json'), path.join(logs, '20261008-C95-wallet-standard-approval-independent-01.json'), path.join(op, 'external-execute-approval-gate.json'));
  const report = { passed: true, observedAt: new Date().toISOString(), operation: op, originalRequestsDecoded: allRequests, fullSuccessfulRepliesAndTrailers: fullReplies, actualOriginalLagHeaderReplies: actualLagHeaders, actualEnabledSimulations: simulations, exactApprovedNFTFormalSimulations: same.length, actualWalletStandardSenderSignatures: 1, exactSameByteSenderAndSponsorSignaturesVerified: 2, uniqueMintExecuteRequests: 1, uniqueExternalSponsoredExecuteRequests: 1, walletExecuteRequests: 0, executeRows, nativeTerminals, sponsorGasCharge: charged.toString(), senderBalanceUnchanged: true, full27ProtectedObjectsAndC94BaselineHeld: true, singleSignWalletExecuteDenied: true, allThreeJournalStoresHeld: true, actualNormalRelockAndAdmissionSettled: true, originalMintDriverFailureAndCompleteLagHeadersRetained: true, methods,
    auditRequests: 0, auditSimulations: 0, auditSignatures: 0, auditExecuteRequests: 0, faucetRequests: 0, newContainers: 0, serviceSignals: 0, walletSponsoredExecuteAccepted: false, ordinaryChromeAccepted: false, indexedAccepted: false, fullNFTAuthorizationAccepted: false, parentAcceptance: false, inputsSha256: Object.fromEntries(files.map(f => [path.resolve(f), sha(f)])) };
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ passed: true, originalRequestsDecoded: allRequests, exactApprovedNFTFormalSimulations: same.length, sponsoredExecutions: 1, auditExecuteRequests: 0 }));
})().catch(e => { console.error(JSON.stringify({ passed: false, errorType: e.name, message: String(e.message).slice(0, 650) })); process.exitCode = 1; });
