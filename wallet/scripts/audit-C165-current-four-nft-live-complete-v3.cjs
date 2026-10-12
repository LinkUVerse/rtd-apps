// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Independent whole-wire, canonical bytes, four real form contexts and full journal audit.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), cp = require('node:child_process');
const assert = require('./lib/C158-bounded-strict-assert.cjs');
const { GrpcTypes, RtdGrpcClient } = require('rtd-typescript/grpc'), { Transaction } = require('rtd-typescript/transactions');
const { bcs } = require('rtd-typescript/bcs'), { toBase64 } = require('rtd-typescript/utils'), { verifyTransactionSignature } = require('rtd-typescript/verify');
const bytes = require('./lib/C88-post-write-bytes.cjs'), contract = require('./lib/C161-current-nft-inventory-contract.cjs');
const environment = require('./lib/C161-current-nft-environment.cjs');
const wallet = path.resolve(__dirname, '..'), read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const loader = require('tsx/cjs/api'), load = n => loader.require(path.join(wallet, 'src/shared/rpc', n + '.ts'), __filename);
const decode = (encoded, type, response) => type.fromBinary(bytes.grpcBody(encoded, response));
async function main() {
  const [input, output] = process.argv.slice(2); assert(input && output && !fs.existsSync(output));
  const p = read(input), files = [__filename, path.resolve(input), path.join(__dirname, 'lib/C161-current-nft-inventory-contract.cjs'),
    path.join(__dirname, 'lib/C88-post-write-bytes.cjs'), path.join(__dirname, 'lib/C85-post-write-bytes.cjs'),
    path.join(__dirname, 'lib/C88-full-summary.cjs'), path.join(__dirname, 'audit-C84-nft-post-write-positive.cjs'), ...environment.pins];
  assert(p.passed);assert(p.distinctFromOriginalC162Approval);assert.notEqual(p.variant.digest,read(path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog/20261009-C162-current-four-nft-live-01.json')).variant.digest); for (const [f, h] of Object.entries(p.inputsSha256)) assert.equal(sha(f), h);
  if (p.mode === 'uncovered-browser-preflight-denied') {
    for (const key of ['profilesOpened', 'signatures', 'executeRequests', 'newContainers']) assert.equal(p[key], 0);
    assert.equal(p.actualFourFormTestExecuted, false); assert.equal(p.parentCompletion, false);
    const result = { passed: true, mode: 'uncovered-browser-preflight-independent', actualFourFormTestExecuted: false,
      actualNoProfileNoSignatureNoExecuteVerified: true, fullFourRouteMatrixAccepted: false, parentCompletion: false,
      inputsSha256: Object.fromEntries(files.map(f => [f, sha(f)])) };
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ passed: true, mode: result.mode })); return;
  }
  assert(['live', 'durable'].includes(p.mode) && p.actualFourFormTestExecuted && p.currentFourNFTFormsAccepted);
  assert(p.ownedBrowserNaturallyClosed && p.forwardedExecuteRequests === 0 && p.journalSeeded === false);
  assert.equal(p.newContainers, 0); assert.equal(p.certificateChanges, 0); assert.equal(p.originalProfilesOpened, 0);
  assert.equal(p.ordinaryChromeAccepted, false); assert.equal(p.parentCompletion, false); assert.deepEqual(p.blocked, []);
  assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), p.source);
  assert.deepEqual(environment.validateBuild(environment.buildFile, environment.profileFile).sourceAfter, p.source);
  const find = pattern => { const f = Object.keys(p.inputsSha256).find(f => pattern.test(f)); assert(f); files.push(f); return f; };
  const oracle = read(find(/C93-recovered-native-independent-01\.json$/)), build = read(find(/default-generation-positive-C136-build-01\.json$/));
  const profileFile = find(/C148-fixed-archive-and-tx-readmission-20261009-01\/isolated-query-runtime\/profile\.json$/);
  const { validateNetworkProfile, executionScopeKey } = load('profile'), profile = validateNetworkProfile(read(profileFile));
  assert.equal(p.h0, profile.expectedGenesisDigest); assert.equal(p.generation, profile.generation); assert.equal(p.owner, oracle.addresses.source);
  assert.deepEqual(p.cases, contract.fourCases(oracle)); assert.equal(p.scopeKey, executionScopeKey(profile, p.owner));
  assert.equal(p.variant.scope, p.scopeKey); assert.equal(await Transaction.from(p.variant.bytesBase64).getDigest(), p.variant.digest);
  const originalBytes = bytes.base64(p.variant.bytesBase64), original = bytes.canonical(bcs.TransactionData, originalBytes).V1;
  assert.equal(original.sender, p.owner); assert.equal(original.gasData.owner, p.owner);
  assert.equal(original.gasData.budget, p.mode === 'live' ? '104000165' : '105000165');
  assert.equal(original.expiration.$kind, 'None'); assert.equal(original.kind.$kind, 'ProgrammableTransaction');
  const originalData = Transaction.from(originalBytes).getData(); assert.equal(originalData.commands.length, 2);
  assert(originalData.commands[0].SplitCoins && originalData.commands[1].TransferObjects);
  assert.equal(originalData.inputs[0].Pure.bytes, bcs.u64().serialize('1').toBase64()); assert.equal(originalData.inputs[1].Pure.bytes, bcs.Address.serialize(p.owner).toBase64());
  assert.equal(crypto.createHash('sha256').update(originalBytes).digest('hex'), p.variant.bytesSha256);
  for (const [f, h] of Object.entries(build.artifacts)) assert.equal(sha(path.join(build.output, f)), h);
  for (const stage of p.stages) { assert(stage.ownExistingStartupUiReused && stage.extraStartupPagesCreated === 0); assert(stage.worker.matchesDisk && stage.ui.matchesDisk); assert.equal(stage.worker.workerSha256, build.artifacts['background.js']);
    for (const row of stage.ui.loadedBundles) assert.equal(row.loadedSha256, build.artifacts[row.file]); }
  assert.equal(p.encryptedAfter, p.encryptedBefore); assert.match(p.encryptedBefore, /^[0-9a-f]{64}$/);
  assert(Object.values(p.initialJournal).every(rows => rows.length === 0));
  const points = new Map();
  function contexts(rows) {
    assert(rows.length > 0);
    for (const row of rows) { assert(JSON.parse(row.bindingKey).includes(p.h0)); const key = JSON.parse(row.assetSnapshotKey);
      assert.equal(key[0], row.readSessionKey); assert(BigInt(key[2]) >= 696489n);
      if (points.has(String(key[2]))) assert.equal(points.get(String(key[2])), key[3]); points.set(String(key[2]), key[3]); }
  }
  const parsedSimulations = [], signatureProofs = [], graphFrames = []; let notFoundHeaders = 0;const completeNativeNegativeReads=[];
  const allowed = new Set(['41750', '42011', '42012', '42013']);
  for (const row of p.frames) {
    const url = new URL(row.url); assert.equal(url.hostname, '127.0.0.1'); assert(allowed.has(url.port)); assert.equal(row.status, 200);
    assert(!url.pathname.endsWith('/ExecuteTransaction'));
    if (url.pathname === '/graphql' || url.pathname === '/account/graphql') {
      const request = JSON.parse(bytes.base64(row.requestBase64)), response = JSON.parse(bytes.base64(row.responseBase64)); assert(!('jsonrpc' in request));
      if (response.data?.walletGenesis) assert.equal(response.data.walletGenesis.digest, p.h0);
      if (!response.errors && response.data?.walletSnapshot) graphFrames.push(row); continue;
    }
    const method = url.pathname.split('/').pop(); assert(GrpcTypes[method + 'Request'] && GrpcTypes[method + 'Response']);
    const request = decode(row.requestBase64, GrpcTypes[method + 'Request'], false);
    if (row.headers?.['grpc-status'] === '5' && row.responseBase64 === '') {
      completeNativeNegativeReads.push(require('./lib/C162-complete-native-negative-reads-v4.cjs').negative(row,request,p,oracle));
      notFoundHeaders++; continue;
    }
    if (method === 'GetTransaction') {
      assert.equal(request.digest, p.variant.digest);
      assert(!row.responseBase64 || Buffer.from(row.responseBase64, 'base64')[0] === 128);
      if (row.responseBase64) assert(/grpc-status:\s*5/.test(Buffer.from(row.responseBase64, 'base64').subarray(5).toString()));
      continue;
    }
    const response = decode(row.responseBase64, GrpcTypes[method + 'Response'], true);
    if (method === 'GetServiceInfo') assert.equal(response.chainId, p.h0);
    if (method === 'GetObject' && response.object?.bcs?.value) {
      const object = response.object, value = bytes.canonical(bcs.Object, object.bcs.value); assert.equal(bytes.typed('Object', object.bcs.value), object.digest);
      assert.equal(object.objectId, request.objectId); if (object.contents?.value) assert.equal(toBase64(value.data.Move.contents), toBase64(object.contents.value));
    }
    if (method === 'SimulateTransaction') {
      assert.equal(request.checks, GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED); assert(response.transaction.effects.status.success);
      if (request.transaction?.bcs?.value) { assert.equal(request.doGasSelection, false);
        const raw = request.transaction.bcs.value; bytes.canonical(bcs.TransactionData, raw); assert.equal(toBase64(response.transaction.transaction.bcs.value), toBase64(raw));
        const effects = bytes.canonical(bcs.TransactionEffects, response.transaction.effects.bcs.value), digest = await Transaction.from(raw).getDigest();
        assert.equal(effects[effects.$kind].transactionDigest, digest); assert.equal(response.transaction.effects.transactionDigest, digest);
      } else { assert(request.doGasSelection && request.transaction.sender === p.owner && request.transaction.gasPayment.owner === p.owner);
        assert.deepEqual(request.transaction.gasPayment.objects, []); require('./lib/audit-legacy-shared-kind.cjs').assertLegacySharedKindEqual(response.transaction.transaction.kind.data,request.transaction.kind.data); }
      parsedSimulations.push({ request, response, phase: row.phase });
    }
    if (method === 'VerifySignature') {
      assert.equal(url.port, '41750'); assert.equal(request.address, p.owner); assert.equal(request.message.name, 'TransactionData'); assert.deepEqual(request.jwks, []);
      assert.equal(toBase64(request.message.value), p.variant.bytesBase64); assert(response.isValid && !response.reason);
      assert.equal((await verifyTransactionSignature(originalBytes, toBase64(request.signature.bcs.value), { address: p.owner })).toRtdAddress(), p.owner); signatureProofs.push(request);
    }
  }
  for (const row of p.captureErrors) { assert.equal(row.status, 200); assert.equal(row.headers?.['grpc-status'], '5'); assert(row.requestBase64 && !row.unexpectedExecute && !row.headersMissing);
    const request = row.url.endsWith('/GetTransaction') ? decode(row.requestBase64, GrpcTypes.GetTransactionRequest, false) : decode(row.requestBase64, GrpcTypes.GetObjectRequest, false);
    if (row.url.endsWith('/GetTransaction')) assert.equal(request.digest, p.variant.digest); else { assert(row.url.endsWith('/GetObject')); assert.equal(request.objectId, p.owner); } }
  assert.equal(signatureProofs.length, 1); assert.equal(parsedSimulations.length, p.mode === 'live' ? 10 : 2);
  for (const row of parsedSimulations.slice(0, 2)) assert.equal(toBase64(row.request.transaction.bcs.value), p.variant.bytesBase64);
  if (p.mode === 'live') {
    assert.equal(p.executeAttempts, 0); assert.deepEqual(p.intercepts, []); assert.equal(p.realPrivateSignDataCompleted, 1); assert.equal(p.signaturesReturnedToDapp, 0); assert(p.realSignerRestored);
    assert.equal(p.signHoldSource.workerSha256, build.artifacts['background.js']); assert(p.signHoldSource.matchesDisk && p.signHoldSource.receiverVerified);
    assert.equal(p.signHoldSource.module, 'dapp-signing'); assert.equal(p.signHoldSource.producerSha256, sha(path.join(wallet, 'src/background/dapp-signing.ts')));
    assert.equal(p.signHoldSource.mapSha256, sha(path.join(build.output, 'background.js.map'))); assert(p.releaseAt - p.heldAt >= 31000); assert(p.originalResultError.includes('网络准入记录未通过精确合同'));
    assert.deepEqual(p.finalJournal, p.initialJournal); assert.equal(p.formsBeforeLock.length, 4); assert.equal(p.competitions.length, 4); assert.equal(p.previews.length, 4);
    for (const [i, item] of p.cases.entries()) {
      const before = p.formsBeforeLock[i], competition = p.competitions[i], preview = p.previews[i];
      assert.equal(before.name, item.name); assert.equal(before.objectId, item.objectId); assert(before.route.endsWith(item.objectId)); assert.equal(before.recipient, oracle.addresses.existingTarget); contexts(before.state.contexts);
      assert.equal(competition.name, item.name); assert(competition.nativeLockUnavailable && competition.text.includes('当前链账户正在签名或恢复，请稍后查看结果')); contexts(competition.state.contexts); assert.deepEqual(competition.state.approvals, []);
      assert.equal(competition.simulationsBefore, 2); assert.equal(competition.simulationsAfter, 2);
      const held = competition.heldState; assert(held.invoked === 1 && held.signaturePresent && !held.released && held.dispatches === 0 && held.intentBytesSha256 === p.variant.bytesSha256);
      assert.equal(preview.name, item.name); contexts(preview.state.contexts); const prepared = preview.approval.prepared;
      assert.equal(prepared.route, item.route); assert.equal(prepared.sender, p.owner); assert.equal(prepared.input.objectId, item.objectId); assert.equal(prepared.input.to, oracle.addresses.existingTarget);
      const data = Transaction.from(prepared.bytesBase64).getData(); bytes.canonical(bcs.TransactionData, bytes.base64(prepared.bytesBase64)); assert.equal(await Transaction.from(prepared.bytesBase64).getDigest(), prepared.digest);
      assert.equal(data.sender, p.owner); assert.equal(data.gasData.owner, p.owner); assert.equal(data.gasData.price, prepared.gasPrice); assert.equal(data.gasData.budget, prepared.gasBudget);
      assert(data.expiration.Validity && data.expiration.Validity.chain === p.h0); assert.equal(BigInt(data.expiration.Validity.maxEpoch), BigInt(data.expiration.Validity.minEpoch) + 1n);
      const [fee, final] = parsedSimulations.slice(2 + i * 2, 4 + i * 2); assert(fee.request.doGasSelection && !fee.request.transaction.bcs?.value);
      assert.equal(toBase64(final.request.transaction.bcs.value), prepared.bytesBase64); assert.equal(final.request.doGasSelection, false);
      const payment = fee.response.transaction.transaction.gasPayment;
      assert.deepEqual(data.gasData.payment, payment.objects.map(o => ({ objectId: o.objectId, version: String(o.version), digest: o.digest })));
      assert.equal(data.gasData.budget, String(payment.budget)); assert.equal(data.gasData.price, String(payment.price));
      require('./lib/audit-legacy-shared-kind.cjs').assertLegacySharedKindEqual(fee.response.transaction.transaction.kind.data,final.response.transaction.transaction.kind.data);
      assert.deepEqual(payment, final.response.transaction.transaction.gasPayment);
    }
  } else {
    assert.equal(p.executeAttempts, 1); assert.equal(p.intercepts.length, 1); assert(p.originalWorkerClosed && p.nativeScopeFreeAfterOriginalClose && p.pendingJournalHeld && p.productCreatedPending);
    assert.equal(p.signaturesInInterceptedRequest, 1); assert.deepEqual(p.finalJournal, p.pendingJournal); assert.equal(p.pendingJournal['journal-v2'].length, 1); assert.equal(p.pendingJournal['pending-scopes-v2'].length, 1); assert.deepEqual(p.pendingJournal['metadata-v2'], []);
    const record = p.pendingJournal['journal-v2'][0]; assert.equal(record.state, 'dispatch-pending'); assert.equal(record.scope, p.scopeKey); assert.equal(record.accountId, p.accountId); assert.equal(record.accountAddress, p.owner); assert.equal(record.digest, p.variant.digest);
    assert.deepEqual(JSON.parse(record.id), [record.scope, record.requestId]); assert.equal(p.pendingJournal['pending-scopes-v2'][0].recordId, record.id);
    const intercepted = p.intercepts[0]; assert.equal(intercepted.forwarded, false); const request = decode(intercepted.requestBase64, GrpcTypes.ExecuteTransactionRequest, false);
    assert.equal(toBase64(request.transaction.bcs.value), p.variant.bytesBase64); assert.equal(request.signatures.length, 1); assert.equal(toBase64(request.signatures[0].bcs.value), toBase64(signatureProofs[0].signature.bcs.value));
    assert.equal((await verifyTransactionSignature(originalBytes, toBase64(request.signatures[0].bcs.value), { address: p.owner })).toRtdAddress(), p.owner);
    assert.equal(p.pendingForms.length, 4);
    for (const [i, item] of p.cases.entries()) { const form = p.pendingForms[i]; assert.equal(form.name, item.name); assert.equal(form.objectId, item.objectId);
      assert(form.route.endsWith(item.objectId) && form.text.includes(p.variant.digest)); contexts(form.state.contexts); assert.deepEqual(form.state.approvals, []); assert.equal(form.simulations, 2); assert.equal(form.executeAttempts, 1); }
    assert(p.frames.some(f => f.url.endsWith('/GetTransaction')) || p.captureErrors.some(f => f.url.endsWith('/GetTransaction')));
  }
  assert(!cp.execFileSync('ps', ['-Ao', 'command='], { encoding: 'utf8' }).split('\n').some(line => line.includes('Google Chrome') && line.includes('--user-data-dir=' + p.profile)));
  // Fresh native identity/object and actual typed S witnesses, independent of page claims.
  const supplemental = [], fetch0 = globalThis.fetch; let session;
  try {
    globalThis.fetch = async (input, init) => { const url = new URL(input instanceof Request ? input.url : String(input)); assert.equal(url.origin, profile.endpoints.fullnodeGrpcWeb); assert(/\/(GetServiceInfo|GetObject|GetCheckpoint)$/.test(url.pathname));
      const response = await fetch0(input, init); supplemental.push({ url: url.href, status: response.status, headers: Object.fromEntries(response.headers), requestBase64: Buffer.from(init?.body ?? []).toString('base64'), responseBase64: Buffer.from(await response.clone().arrayBuffer()).toString('base64') }); return response; };
    const { WalletReadSession } = load('session'), { WalletFullnodeReader } = load('fullnode-reader'); session = new WalletReadSession(profile); const fullnode = new WalletFullnodeReader(session);
    const inventoryFile = find(/C162-current-nft-inventory-\d+\.json$/), inventory = read(inventoryFile);
    assert(inventory.indexedFixtureAccepted && inventory.freshNativeObjects.length === 14);
    for (const expected of inventory.freshNativeObjects) { const fresh = await fullnode.object(expected.objectId); assert(fresh);
      for (const key of ['objectId', 'version', 'digest', 'type', 'previousTransaction']) assert.equal(fresh[key], expected[key]); assert.deepEqual(fresh.owner, expected.owner);
      assert.equal(toBase64(fresh.objectBcs), expected.objectBcsBase64); assert.equal(toBase64(fresh.content), expected.contentBase64); }
    for (const ref of original.gasData.payment) { const gas = await fullnode.object(ref.objectId); assert(gas && gas.owner.AddressOwner === p.owner && gas.version === ref.version && gas.digest === ref.digest); }
    const client = new RtdGrpcClient({ network: profile.sdkNetwork, baseUrl: profile.endpoints.fullnodeGrpcWeb, format: 'binary', fetch: globalThis.fetch, mvr: { url: '' } });
    assert.equal((await client.ledgerService.getServiceInfo({})).response.chainId, p.h0);
    for (const [height, digest] of points) { const checkpoint = (await client.ledgerService.getCheckpoint({ checkpointId: { oneofKind: 'sequenceNumber', sequenceNumber: BigInt(height) }, readMask: { paths: ['sequence_number', 'digest', 'summary', 'contents'] } })).response.checkpoint;
      assert.equal(String(checkpoint.sequenceNumber), height); assert.equal(checkpoint.digest, digest); assert.equal(bytes.typed('CheckpointSummary', checkpoint.summary.bcs.value), digest); assert.equal(bytes.typed('CheckpointContents', checkpoint.contents.bcs.value), checkpoint.contents.digest); assert.equal(checkpoint.summary.contentDigest, checkpoint.contents.digest); }
    assert.equal((await client.ledgerService.getServiceInfo({})).response.chainId, p.h0);
  } finally { session?.close(); globalThis.fetch = fetch0; }
  environment.held(path.join(oracle.operation, 'intent.json'));
  files.push(require.resolve('./lib/C162-complete-native-negative-reads-v4.cjs'),require.resolve('./lib/audit-legacy-shared-kind.cjs'));
  const completeEntities=require('./lib/C173-nft-complete-entities.cjs').validate(p,build);files.push(require.resolve('./lib/C173-nft-complete-entities.cjs'),require.resolve('./lib/C173-original-entity-and-browser-copy-correlation.cjs'));
  const result = { completeEntities,fullCurrentM5BranchAccepted:true,passed: true, mode: p.mode, currentFourNFTFormsAccepted: true, fullFourRouteMatrixAccepted: false,
    actualCurrentOneBranchAccepted: true, actualFormRoutes: p.cases.map(c => c.route), actualEnabledSimulations: parsedSimulations.length,
    originalPrivateSignatureVerified: 1, competingSignatures: 0, forwardedExecuteRequests: 0,
    actualCompleteJournalAndEncryptionRetained: true, freshFourteenObjectsAndGasHeld: true,
    freshTypedSnapshotPoints: [...points], rawCapturedGraphFrames: graphFrames.length, originalReadBodiesComplete: p.captureErrors.length === 0,
    completeNativeNegativeReads,retainedNotFoundHeaders: notFoundHeaders, retainedCaptureErrors: p.captureErrors, supplementalFrames: supplemental,
    ordinaryChromeAccepted: false, parentCompletion: false, inputsSha256: Object.fromEntries(files.map(f => [path.resolve(f), sha(f)])) };
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ passed: true, mode: p.mode, actualCurrentOneBranchAccepted: true }));
}
main().catch(error => { console.error(String(error.stack).slice(0,1800));console.error(JSON.stringify({ passed: false, errorType: error.name, message: String(error.message).slice(0, 300) })); process.exitCode = 1; });
