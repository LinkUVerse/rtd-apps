// Independent actual UI/production location, canonical gas-only delta, original frames and fresh native audit.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), cp = require('node:child_process');
const { GrpcTypes, RtdGrpcClient } = require('rtd-typescript/grpc'), { Transaction } = require('rtd-typescript/transactions'), { bcs } = require('rtd-typescript/bcs');
const { toBase64, toBase58 } = require('rtd-typescript/utils'), { blake2b } = require('@noble/hashes/blake2.js'), loader = require('tsx/cjs/api');
const { assertLegacySharedKindEqual } = require('./lib/audit-legacy-shared-kind.cjs');
const wallet = path.resolve(__dirname, '..'), log = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
const read = file => JSON.parse(fs.readFileSync(file)), sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const load = name => loader.require(path.join(wallet, 'src/shared/rpc', name + '.ts'), __filename);
function frame(encoded, type, response) {
  const bytes = Buffer.from(encoded, 'base64'); assert(bytes.length >= 5 && bytes[0] === 0);
  const end = 5 + bytes.readUInt32BE(1); assert(end <= bytes.length);
  if (response) { assert.equal(bytes[end], 128); assert.equal(end + 5 + bytes.readUInt32BE(end + 1), bytes.length); assert(/(?:^|\r\n)grpc-status:\s*0\r\n/.test(bytes.subarray(end + 5).toString())); }
  else assert.equal(end, bytes.length);
  return type.fromBinary(bytes.subarray(5, end));
}
function canonical(codec, encoded) { const value = codec.parse(Buffer.from(encoded, 'base64')); assert.equal(toBase64(codec.serialize(value).toBytes()), encoded); return value; }
const typed = (type, raw) => toBase58(blake2b(Buffer.concat([Buffer.from(type + '::'), Buffer.from(raw)]), { dkLen: 32 }));

(async () => {
  const [proofFile, output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
  const p = read(proofFile), supplementalFrames = [], originalFetch = globalThis.fetch;
  let session, stage = 'current exact UI source and explicit fault contract', report = {};
  try {
    assert(p.passed && p.currentC109UnsignedInternalAccepted && p.faultInjectionExplicit);
    assert(p.ownExistingStartupUiReused && p.extraPagesCreatedByTest===0 && p.singleUiSurfaces.length===4);
    for(const s of p.singleUiSurfaces)assert.equal(s.pages.filter(page=>page.url.startsWith(p.gatewayAuthority.origin+'/ui.html')).length,1);
    assert.equal(p.originalApprovalObjectsModified, false); assert.equal(p.responsesOrJournalInjected, false);
    assert.equal(p.signatures, 0); assert.equal(p.executeRequests, 0); assert(!p.parentTX01Complete);
    assert.deepEqual(p.forbidden, []); assert.equal(p.cases.length, 3); assert.deepEqual(p.pageErrors, []); assert(p.isolatedGatewayOnly && p.coinUnhandledRejectionResolved && !p.C44RuntimeReplaced);
    assert.deepEqual(p.initialJournal, p.finalJournal); assert(Object.values(p.initialJournal).every(rows => rows.length === 0)); assert.deepEqual(p.cipherBefore, p.cipherAfter); assert.equal(p.cipherBefore.owner, p.owner);
    for (const [file, digest] of Object.entries(p.inputsSha256)) assert.equal(sha(file), digest);
    const buildFile = path.join(log, '20261008-default-generation-positive-C109-build-01.json'), build = read(buildFile);
    const lineage=require('./lib/C109-product-source-lineage.cjs'),q=read(lineage.qualificationFile);assert.deepEqual(lineage.validate(q.originalSource,buildFile),p.source);assert.deepEqual(require('./lib/C110-current-core-gateway-ownership.cjs').capture(),p.gatewayAuthority); assert.deepEqual(build.sourceAfter, p.source);
    for (const [file, digest] of Object.entries(build.artifacts)) assert.equal(sha(path.join(build.output, file)), digest);
    assert.equal(p.workerSource.workerSha256, build.artifacts['background.js']); for (const row of p.uiSource.loadedBundles) assert.equal(row.loadedSha256, build.artifacts[row.file]);
    
    const dependency = path.resolve(__dirname, '../../node_modules/.pnpm/source-map@0.6.1/node_modules/source-map'), { SourceMapConsumer } = require(dependency);
    const gas = new Map(), points = new Map(), auditedCases = [];
    assert.deepEqual(p.cases.map(row => row.kind), ['coin', 'stake', 'withdraw']);
    for (const [index, row] of p.cases.entries()) {
      stage = row.kind + ' actual source-verified gas-only parameter and complete original simulation frames';
      const sourceFile = path.join(wallet, 'src/shared/rpc', row.kind === 'coin' ? 'coin-transfer-preparation.ts' : 'staking-preparation.ts'), source = fs.readFileSync(sourceFile, 'utf8');
      assert.equal(row.partial, false); assert.notEqual(row.freshApproval.requestId, row.approval.requestId); assert.equal(await Transaction.from(row.freshApproval.prepared.bytesBase64).getDigest(), row.freshApproval.prepared.digest);
      const prepared = row.approval.prepared, oldTx = Transaction.from(prepared.bytesBase64), data = oldTx.getData();
      canonical(bcs.TransactionData, prepared.bytesBase64); assert.equal(await oldTx.getDigest(), prepared.digest);
      assert.equal(data.sender, p.owner); assert.equal(data.gasData.owner, p.owner); assert.equal(data.gasData.budget, prepared.gasBudget); assert.equal(data.gasData.price, prepared.gasPrice);
      if (row.kind === 'coin') { assert.equal(prepared.input.to, p.owner); assert.equal(prepared.input.amount, '0.000000001'); } else assert.equal(prepared.input.kind, row.kind); if (row.kind === 'stake') { assert.equal(prepared.input.validator, p.validator); assert.equal(prepared.input.amount, '1000000000'); } else if (row.kind === 'withdraw') assert.equal(prepared.input.objectId, p.stakeId);
      const newTx = Transaction.from(row.changedGas.bytesBase64), altered = newTx.getData(); canonical(bcs.TransactionData, row.changedGas.bytesBase64);
      assert.deepEqual(altered, { ...data, gasData: { ...data.gasData, budget: (BigInt(data.gasData.budget) + 1000n).toString() } });
      assert.equal(row.changedGas.budget, altered.gasData.budget); assert.equal(await newTx.getDigest(), row.changedGas.digest); assert.notEqual(row.changedGas.digest, prepared.digest);
      const projection = Object.fromEntries(['bytesBase64', 'digest', 'gasBudget', 'sender', 'bindingKey', 'readSessionKey', 'input'].map(key => [key, prepared[key]]));
      assert.deepEqual(row.injection.before, projection); assert.deepEqual(row.injection.after, { ...projection, bytesBase64: row.changedGas.bytesBase64 }); assert(row.injection.injectedOnlyClonedParameterBytes);
      assert(row.textBefore.includes(prepared.digest) && row.textAfter.includes(prepared.digest)); assert(!row.textAfter.includes(row.changedGas.digest)); assert(row.textAfter.includes(row.kind === 'coin' ? '已授权的交易模拟未通过，请重新预览并授权' : '原批准交易模拟未通过，请重新预览并授权'));
      const location = row.sourceProof, bundleFile = path.join(build.output, location.bundle), mapFile = bundleFile + '.map';
      assert.equal(location.bundleSha256, sha(bundleFile)); assert.equal(location.mapSha256, sha(mapFile)); assert.equal(location.producerSha256, sha(sourceFile)); assert.equal(location.dependencySha256, sha(require.resolve(dependency)));
      assert(location.loadedBundleEqualsDisk && location.mappedProducerEqualsDisk); assert(p.uiSource.loadedBundles.some(bundle => bundle.file === location.bundle && bundle.loadedSha256 === location.bundleSha256));
      const map = JSON.parse(fs.readFileSync(mapFile)), consumer = new SourceMapConsumer(map), mapSource = consumer.sources.find(s => s.endsWith('/shared/rpc/' + path.basename(sourceFile))); assert.equal(consumer.sourceContentFor(mapSource), source);
      for (const [key, needle, name] of [['receiver', 'rpc.simulateTransaction(', 'rpc'], ['prepared', 'prepared.bytesBase64,', 'prepared']]) {
        const offset = source.indexOf(needle, source.indexOf(row.kind === 'coin' ? 'export async function revalidateCoinTransfer(' : 'export async function revalidateStaking(')), before = source.slice(0, offset);
        const original = { source: mapSource, line: before.split('\n').length, column: before.split('\n').at(-1).length };
        assert.deepEqual(location[key].original, original); assert.deepEqual(consumer.generatedPositionFor(original), location[key].generated); assert.deepEqual(consumer.originalPositionFor(location[key].generated), location[key].reverse); assert.equal(location[key].reverse.name, name);
      }
      const compiled = fs.readFileSync(bundleFile, 'utf8').split('\n'), receiverText = compiled[location.receiver.generated.line - 1].slice(location.receiver.generated.column), parameterText = compiled[location.prepared.generated.line - 1].slice(location.prepared.generated.column);
      const receiverName = /^([A-Za-z_$][\w$]*)\.simulateTransaction\(/.exec(receiverText)?.[1], parameter = /^([A-Za-z_$][\w$]*)\.bytesBase64/.exec(parameterText)?.[1]; assert(receiverName && parameter); assert.equal(parameter, location.generatedParameter);
      assert.equal(location.actualLocation.lineNumber, location.receiver.generated.line - 1); assert.equal(location.actualLocation.columnNumber, location.receiver.generated.column + receiverName.length + 1); assert.deepEqual(row.injection.actualCallFrameLocation, location.actualLocation);
      const selectedWires = [...row.originalSimulations, ...row.faultSimulations]; assert.equal(row.originalSimulations.length, 2); assert.equal(row.faultSimulations.length, 1); for (const wire of selectedWires) assert(p.simulations.some(actual => JSON.stringify(actual) === JSON.stringify(wire))); const decoded = selectedWires.map(wire => {
        assert.equal(wire.url, 'http://127.0.0.1:41750/rtd.rpc.v2.TransactionExecutionService/SimulateTransaction'); assert.equal(wire.status, 200);
        const request = frame(wire.requestBase64, GrpcTypes.SimulateTransactionRequest, false), response = frame(wire.responseBase64, GrpcTypes.SimulateTransactionResponse, true);
        assert.equal(request.checks, GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED); assert(response.transaction.effects.status.success); return { request, response };
      });
      const [fee, final, changed] = decoded; assert(fee.request.doGasSelection && !fee.request.transaction.bcs?.value); assertLegacySharedKindEqual(fee.response.transaction.transaction.kind.data, fee.request.transaction.kind.data);
      const selected = fee.response.transaction.transaction.gasPayment; assert.deepEqual(data.gasData.payment, selected.objects.map(o => ({ objectId: o.objectId, version: String(o.version), digest: o.digest }))); assert.equal(data.gasData.price, String(selected.price)); assert.equal(data.gasData.budget, String(selected.budget)); assert.equal(selected.owner, p.owner);
      for (const [entry, bytesBase64, digest] of [[final, prepared.bytesBase64, prepared.digest], [changed, row.changedGas.bytesBase64, row.changedGas.digest]]) {
        assert.equal(entry.request.doGasSelection, false); assert.equal(toBase64(entry.request.transaction.bcs.value), bytesBase64); assert.equal(toBase64(entry.response.transaction.transaction.bcs.value), bytesBase64);
        const effects = canonical(bcs.TransactionEffects, toBase64(entry.response.transaction.effects.bcs.value)); assert.equal(effects[effects.$kind].transactionDigest, digest); assert.equal(entry.response.transaction.effects.transactionDigest, digest);
      }
      assert.equal(p.simulations.length, 15);
      assert.deepEqual(row.originalSimulations, p.simulations.slice(index*5,index*5+2)); assert.deepEqual(row.faultSimulations,p.simulations.slice(index*5+2,index*5+3));
      const freshWires = p.simulations.slice(index*5+3,index*5+5);
      if (row.kind === 'coin') { assert.equal(row.repeatedSimulations.length,0); assert(freshWires.every(wire => wire.stage === 'actual coin gas fault revalidation')); }
      else assert.deepEqual(row.repeatedSimulations, freshWires);
      const repeated = freshWires.map(wire => {
        assert(p.simulations.some(actual => JSON.stringify(actual) === JSON.stringify(wire))); assert.equal(wire.status, 200); assert.equal(wire.url, 'http://127.0.0.1:41750/rtd.rpc.v2.TransactionExecutionService/SimulateTransaction');
        const request = frame(wire.requestBase64, GrpcTypes.SimulateTransactionRequest, false), response = frame(wire.responseBase64, GrpcTypes.SimulateTransactionResponse, true);
        assert.equal(request.checks, GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED); assert(response.transaction.effects.status.success); return {request, response};
      });
      const freshData = Transaction.from(row.freshApproval.prepared.bytesBase64).getData(); canonical(bcs.TransactionData, row.freshApproval.prepared.bytesBase64);
      const [repeatFee, repeatFinal] = repeated; assert(repeatFee.request.doGasSelection && !repeatFee.request.transaction.bcs?.value); assertLegacySharedKindEqual(repeatFee.response.transaction.transaction.kind.data, repeatFee.request.transaction.kind.data);
      const repeatGas = repeatFee.response.transaction.transaction.gasPayment; assert.deepEqual(freshData.gasData.payment, repeatGas.objects.map(o => ({objectId:o.objectId,version:String(o.version),digest:o.digest}))); assert.equal(freshData.gasData.owner, repeatGas.owner); assert.equal(freshData.gasData.price, String(repeatGas.price)); assert.equal(freshData.gasData.budget, String(repeatGas.budget));
      assert.equal(repeatFinal.request.doGasSelection, false); assert.equal(toBase64(repeatFinal.request.transaction.bcs.value), row.freshApproval.prepared.bytesBase64); assert.equal(toBase64(repeatFinal.response.transaction.transaction.bcs.value), row.freshApproval.prepared.bytesBase64);
      const repeatEffects = canonical(bcs.TransactionEffects, toBase64(repeatFinal.response.transaction.effects.bcs.value)); assert.equal(repeatEffects[repeatEffects.$kind].transactionDigest, row.freshApproval.prepared.digest); assert.equal(repeatFinal.response.transaction.effects.transactionDigest, row.freshApproval.prepared.digest);
      assert(row.actualContexts.length); for (const context of row.actualContexts) { const key = JSON.parse(context.assetSnapshotKey); assert.equal(key[0], context.readSessionKey); assert(BigInt(key[2]) >= 332734n); assert(JSON.parse(context.bindingKey).includes(p.h0)); const old = points.get(String(key[2])); if (old) assert.equal(old, key[3]); points.set(String(key[2]), key[3]); }
      for (const ref of data.gasData.payment) { const old = gas.get(ref.objectId); if (old) assert.deepEqual(old, ref); gas.set(ref.objectId, ref); }
      auditedCases.push({ kind: row.kind, originalDigest: prepared.digest, changedDigest: row.changedGas.digest, originalGasBudget: data.gasData.budget, changedGasBudget: altered.gasData.budget, currentSourceAndOnlyGasDeltaVerified: true, actualUiStaleDigestRejection: true, freshPreviewSimulationTiming: row.kind === "coin" ? "post-rejection refresh before Back; Review creates a new approval for that preview" : "after Back/Review" });
    }
    assert(!p.traffic.some(row => /\/(VerifySignature|ExecuteTransaction)$/.test(new URL(row.url).pathname)));
    assert(!p.captureErrors.some(row => row.url.endsWith('/SimulateTransaction')));
    assert(p.checks.some(row => row.label === 'all original1015 private files and imported ciphertext held; normal relock; zero Execute' && row.passed)); const protectedPins = read(Object.keys(p.inputsSha256).find(file => file.endsWith('/nonempty-kiosk-C43-20261007-01/intent.json'))).protectedOriginalsSha256; assert.equal(Object.keys(protectedPins).length, 1015); for (const [file, digest] of Object.entries(protectedPins)) assert.equal(sha(file), digest);
    assert(!cp.execFileSync('ps', ['-Ao', 'command=']).toString().split('\n').some(command => command.includes('Google Chrome') && command.includes('--user-data-dir=' + p.profile)));
    stage = 'fresh native original stake and selected gas plus typed actual current snapshots';
    globalThis.fetch = async (input, init) => { const u = new URL(input instanceof Request ? input.url : String(input)); assert(u.origin==='http://127.0.0.1:41750'&&/\/(GetServiceInfo|GetObject)$/.test(u.pathname)||u.origin==='http://127.0.0.1:42012'&&/^\/archive\/rtd.rpc.v2.LedgerService\/(GetServiceInfo|GetCheckpoint)$/.test(u.pathname)); const opts=u.port==='42012'?{...init,credentials:'omit',redirect:'error',headers:{...Object.fromEntries(new Headers(init?.headers)),Origin:p.gatewayAuthority.origin}}:init; const response = await originalFetch(input, opts); supplementalFrames.push({ url: u.href, status: response.status, requestBase64: Buffer.from(init?.body ?? []).toString('base64'), responseBase64: Buffer.from(await response.clone().arrayBuffer()).toString('base64') }); return response; };
    const liveFile = path.join(log, '20261007-C43-staking-forms-live-lock-chrome-01.json'), live = read(liveFile), profileFile = Object.keys(p.inputsSha256).find(file => file.endsWith('/C110-current-core-gateway-20261008-01/profile.json'));
    const { validateNetworkProfile } = load('profile'), { WalletReadSession } = load('session'), { WalletFullnodeReader } = load('fullnode-reader'), selectedProfile = validateNetworkProfile(read(profileFile)); assert.equal(selectedProfile.expectedGenesisDigest, p.h0);
    session = new WalletReadSession(selectedProfile); const reader = new WalletFullnodeReader(session), objects = [];
    const fixtureFile = path.join(log, '20261007-G3-staking-fixture-native-audit-02.json'), fixture = read(fixtureFile); assert(fixture.passed);
    for (const id of [p.stakeId, ...gas.keys()]) { const object = await reader.object(id); assert(object && object.objectBcs && object.owner.AddressOwner === p.owner); assert.equal(typed('Object', object.objectBcs), object.digest); canonical(bcs.Object, toBase64(object.objectBcs));
      if (gas.has(id)) { assert.equal(object.version, gas.get(id).version); assert.equal(object.digest, gas.get(id).digest); }
      else { assert.equal(object.version, fixture.newStake.version); assert.equal(object.digest, fixture.newStake.digest); assert.equal(toBase64(object.objectBcs), fixture.newStake.objectBcsBase64); }
      objects.push({ objectId: id, version: object.version, digest: object.digest, owner: object.owner, objectBcsBase64: toBase64(object.objectBcs) });
    }
    const client = new RtdGrpcClient({ network: 'localnet', baseUrl: 'http://127.0.0.1:41750', format: 'binary', fetch: globalThis.fetch, mvr: { url: '' } }); assert.equal((await client.ledgerService.getServiceInfo({})).response.chainId, p.h0);
    const archive=new RtdGrpcClient({network:'localnet',baseUrl:'http://127.0.0.1:42012/archive',format:'binary',fetch:globalThis.fetch,mvr:{url:''}});assert.equal((await archive.ledgerService.getServiceInfo({})).response.chainId,p.h0);
    for (const [height, digest] of points) { const c = (await archive.ledgerService.getCheckpoint({ checkpointId: { oneofKind: 'sequenceNumber', sequenceNumber: BigInt(height) }, readMask: { paths: ['sequence_number', 'digest', 'summary', 'contents'] } })).response.checkpoint; assert.equal(String(c.sequenceNumber), height); assert.equal(c.digest, digest); assert.equal(typed('CheckpointSummary', c.summary.bcs.value), digest); assert.equal(typed('CheckpointContents', c.contents.bcs.value), c.contents.digest); assert.equal(c.summary.contentDigest, c.contents.digest); }
    assert.equal((await client.ledgerService.getServiceInfo({})).response.chainId, p.h0);
    for (const wire of supplementalFrames) { assert.equal(wire.status, 200); const method = new URL(wire.url).pathname.split('/').pop(); frame(wire.requestBase64, GrpcTypes[method + 'Request'], false); frame(wire.responseBase64, GrpcTypes[method + 'Response'], true); }
    assert.deepEqual(require('./lib/C110-current-core-gateway-ownership.cjs').capture(),p.gatewayAuthority);report = { snapshotReadAuthority:'Formal published archive canonical S; fresh fullnode H0 and unchanged stake/gas', passed: true, observedAt: new Date().toISOString(), source: p.source, h0: p.h0, generation: p.generation, owner: p.owner, cases: auditedCases, currentC109UnsignedInternalAccepted: true,
      actualEnabledSimulationFrames: p.simulations.length, independentlyAuditedAllFrames: 15, canonicalFinalEffects: 9, kindFeeSelections: 6, unhandledPromises: 0, originalVisibleApprovalsJournalAndCipherHeld: true, explicitClonedParameterFaultOnly: true, noResponseOrFunctionInjection: true,
      ownedChromeAbsent: true, freshNativeUnchangedObjects: objects, freshTypedSnapshotPoints: Array.from(points), retainedOriginalReadCaptureErrors: p.captureErrors,
      auditSimulations: 0, auditSignatures: 0, auditExecuteRequests: 0, parentTX01Complete: false, sustainedAvailabilityAccepted: false, supplementalFrames,
      inputsSha256: Object.fromEntries([__filename, path.resolve(proofFile), buildFile, liveFile, profileFile, fixtureFile, path.join(wallet, 'src/shared/rpc/coin-transfer-preparation.ts'), path.join(wallet, 'src/shared/rpc/staking-preparation.ts'), path.join(__dirname, 'lib/audit-legacy-shared-kind.cjs')].map(file => [file, sha(file)])),
      scope: 'Actual C109 UI three original approvals and clicks into byte/source-map verified production revalidation; only cloned input BCS gas budget+1000 with unchanged old digest, all15 independently audited original/fault/new-preview enabled simulation frames/nine canonical final effects; coin new preview is produced by actual post-error query refresh before Back and approved under a new requestId on Review; actual repaired coin click has no unhandled promise, actual error and original visible approvals/journal/cipher held. Fresh unchanged native stake/gas and actual typed S. Explicit fault, not a user gas edit or native market change; no signing/Execute, injected response, sustained health or parent acceptance.' };
  } catch (error) { report = { passed: false, observedAt: new Date().toISOString(), stage, errorType: error.name, message: String(error.message).slice(0,1200), supplementalFrames }; process.exitCode = 1; }
  finally { session?.close(); globalThis.fetch = originalFetch; fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ passed: report.passed, stage: report.stage, message: report.message, supplementalFrames: supplementalFrames.length })); }
})().catch(error => { console.error(JSON.stringify({ passed: false, errorType: error.name, message: String(error.message).slice(0,300) })); process.exitCode = 1; });
