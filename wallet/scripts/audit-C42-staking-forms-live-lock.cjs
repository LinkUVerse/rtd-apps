// Independent whole-wire, canonical transaction and fresh native audit of current full staking forms.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto'), assert = require('node:assert/strict'), cp = require('node:child_process');
const { GrpcTypes } = require('rtd-typescript/grpc'), { Transaction } = require('rtd-typescript/transactions'), { bcs } = require('rtd-typescript/bcs');
const { toBase64, toBase58, normalizeRtdAddress } = require('rtd-typescript/utils'), { blake2b } = require('@noble/hashes/blake2.js'), loader = require('tsx/cjs/api');
const wallet = path.resolve(__dirname, '..'), load = n => loader.require(path.join(wallet, 'src/shared/rpc', n + '.ts'), __filename);
const read = f => JSON.parse(fs.readFileSync(f)), sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const typed = (type, raw) => toBase58(blake2b(Buffer.concat([Buffer.from(type + '::'), Buffer.from(raw)]), { dkLen: 32 }));
function canonical(codec, encoded) { const value = codec.parse(Buffer.from(encoded, 'base64')); assert.equal(toBase64(codec.serialize(value).toBytes()), encoded); return value; }
function frame(encoded, T, trailer) {
  const raw = Buffer.from(encoded, 'base64'); assert(raw.length >= 5 && raw[0] === 0); const end = 5 + raw.readUInt32BE(1); assert(end <= raw.length);
  if (trailer) { assert.equal(raw[end], 128); assert.equal(end + 5 + raw.readUInt32BE(end + 1), raw.length); assert(/(?:^|\r\n)grpc-status:\s*0\r\n/.test(raw.subarray(end + 5).toString('ascii'))); }
  else assert.equal(end, raw.length);
  return T.fromBinary(raw.subarray(5, end));
}
(async () => {
  const [proofFile, output] = process.argv.slice(2); assert(output && !fs.existsSync(output)); const p = read(proofFile), supplementalFrames = [], originalFetch = globalThis.fetch;
  let report = {}, stage = 'current C42 authority and actual lock matrix', session;
  try {
    assert(p.passed && p.currentC42StakeWithdrawFormsAccepted && p.journalUnchanged && !p.currentDurablePendingMatrixAccepted && !p.parentTX04Complete);
    assert.equal(p.signatureCount, 0); assert.equal(p.executeRequests, 0); assert.equal(p.realSignDataCompleted, 1); assert.equal(p.realSignerRestored, true);
    assert.equal(p.originalProfilesOpened, 0); assert.equal(p.certificateChanges, 0); assert.equal(p.normalChromeHttpsAccepted, false); assert.deepEqual(p.forbidden, []);
    assert.deepEqual(p.initialJournal, p.finalJournal); assert(Object.values(p.initialJournal).every(v => Array.isArray(v) && v.length === 0));
    assert(p.captureErrors.every(e => e.closing)); assert.equal(p.preCloseNetworkWitness.captureErrors, 0); assert.equal(p.preCloseNetworkWitness.simulations, 8);
    for (const [f, h] of Object.entries(p.inputsSha256)) assert.equal(sha(f), h);
    assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), p.source);
    const buildFile = Object.keys(p.inputsSha256).find(f => f.endsWith('/20261007-default-generation-positive-C42-build-01.json')), build = read(buildFile); assert(build.passed);
    for (const [f, h] of Object.entries(build.artifacts)) assert.equal(sha(path.join(build.output, f)), h);
    assert.equal(p.workerSource.workerSha256, build.artifacts['background.js']); for (const row of p.uiSource.loadedBundles) assert.equal(row.loadedSha256, build.artifacts[row.file]);
    assert.equal(p.signHoldSource.workerSha256, build.artifacts['background.js']); assert(p.signHoldSource.matchesDisk && p.signHoldSource.receiverVerified); assert.equal(p.signHoldSource.module, 'dapp-signing');
    assert.equal(p.signHoldSource.producerSha256, sha(path.join(wallet, 'src/background/dapp-signing.ts'))); assert.equal(p.signHoldSource.mapSha256, sha(path.join(build.output, 'background.js.map')));
    assert.equal(p.originalStakingCheckpoint, '332734'); const fixture = read(path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog/20261007-G3-staking-fixture-native-audit-02.json')); assert(fixture.passed);
    assert.equal(p.originalStakingDigest, fixture.digest); assert.equal(p.owner, fixture.newStake.owner.AddressOwner); assert.equal(p.stakeId, fixture.newStake.objectId);
    const originalStakeBody = canonical(bcs.Object, fixture.newStake.objectBcsBase64);
    const originalStakeContent = toBase64(originalStakeBody.data.Move.contents);
    const profileFile = Object.keys(p.inputsSha256).find(f => f.endsWith('/certified-positive-transport-release-20261006-01/profile.json'));
    const { validateNetworkProfile, executionScopeKey } = load('profile'), selected = validateNetworkProfile(read(profileFile)); assert.equal(selected.expectedGenesisDigest, p.h0); assert.equal(selected.generation, p.generation);
    assert.equal(p.scopeKey, executionScopeKey(selected, p.owner)); assert.equal(p.competitions.length, 2); assert.deepEqual(p.competitions.map(r => r.kind), ['stake', 'withdraw']);
    assert.equal(p.formsBeforeLock.length, 2); assert(p.formsBeforeLock[0].route.includes('address=' + p.validator)); assert(p.formsBeforeLock[1].route.includes('staked=' + p.stakeId));
    const original = p.originalApprovedTransaction; assert.equal(await Transaction.from(original.bytesBase64).getDigest(), original.digest); canonical(bcs.TransactionData, original.bytesBase64);
    assert.equal(crypto.createHash('sha256').update(Buffer.from(original.bytesBase64, 'base64')).digest('hex'), original.bytesSha256);
    for (const row of p.competitions) {
      assert(row.nativeLockUnavailable && row.text.includes('当前链账户正在签名或恢复，请稍后查看结果'));
      assert.deepEqual(row.preparedRows, []); assert.equal(row.simulationsBefore, 2); assert.equal(row.simulationsAfter, 2);
      assert.equal(row.held.invoked, 1); assert.equal(row.held.signaturePresent, true); assert.equal(row.held.released, false); assert.equal(row.held.dispatches, 0); assert.equal(row.held.intentBytesSha256, original.bytesSha256);
    }
    assert(p.releaseAt - p.heldAt >= 31000); assert(p.originalResultError.includes('网络准入记录未通过精确合同'));
    stage = 'complete original HTTP and enabled simulation frames';
    let graphCount = 0, rpcCount = 0; const transient = [], graph = [], recordedObjects = new Map();
    for (const row of p.frames) {
      const u = new URL(row.url); assert.equal(u.hostname, '127.0.0.1'); assert(['41750', '41954', '41955', '41956'].includes(u.port));
      assert(!/\/(ExecuteTransaction|VerifySignature)$/.test(u.pathname));
      if ([503, 504].includes(row.status)) { assert(u.port !== '41750'); transient.push({ url: row.url, status: row.status }); continue; }
      assert.equal(row.status, 200);
      if (u.port !== '41750') {
        assert.equal(u.pathname, u.port === '41955' ? '/archive' : '/graphql'); const request = JSON.parse(Buffer.from(row.requestBase64, 'base64')), response = JSON.parse(Buffer.from(row.responseBase64, 'base64')); assert(!('jsonrpc' in request));
        // Actual GraphQL errors are retained and do not stand in for a successful snapshot.
        if (!response.errors && response.data?.walletSnapshot) { assert.equal(response.data.walletGenesis.digest, p.h0); assert(Number.isSafeInteger(response.data.walletSnapshot.sequenceNumber)); graph.push({ request, data: response.data }); }
        graphCount++;
      } else {
        const method = u.pathname.split('/').pop(); assert(GrpcTypes[method + 'Request'] && GrpcTypes[method + 'Response']);
        const request = frame(row.requestBase64, GrpcTypes[method + 'Request'], false), response = frame(row.responseBase64, GrpcTypes[method + 'Response'], true); rpcCount++;
        if (method === 'GetServiceInfo') assert.equal(response.chainId, p.h0);
        if (method === 'GetObject' && response.object?.bcs?.value) {
          const o = response.object; assert.equal(request.objectId, o.objectId); assert.equal(typed('Object', o.bcs.value), o.digest); const body = canonical(bcs.Object, toBase64(o.bcs.value));
          if (o.contents?.value) assert.equal(toBase64(body.data.Move.contents), toBase64(o.contents.value));
          const key = o.objectId + '/' + String(o.version) + '/' + o.digest; const old = recordedObjects.get(key); if (old) assert.equal(toBase64(old.bcs.value), toBase64(o.bcs.value)); else recordedObjects.set(key, o);
        }
      }
    }
    assert.equal(p.simulations.length, 8); const parsed = p.simulations.map(row => {
      assert.equal(row.status, 200); assert(p.frames.some(f => f.url === row.url && f.requestBase64 === row.requestBase64 && f.responseBase64 === row.responseBase64));
      const request = frame(row.requestBase64, GrpcTypes.SimulateTransactionRequest, false), response = frame(row.responseBase64, GrpcTypes.SimulateTransactionResponse, true);
      assert.equal(request.checks, GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED); assert(response.transaction.effects.status.success);
      assert.equal(row.bytesBase64, request.transaction?.bcs?.value ? toBase64(request.transaction.bcs.value) : null); return { request, response };
    });
    assert(p.simulations.slice(0, 2).every(r => r.bytesBase64 === original.bytesBase64)); assert.equal(p.previews.length, 3); assert.deepEqual(p.previews.map(r => [r.kind, r.amount]), [['stake', '1'], ['stake', '2'], ['withdraw', null]]);
    for (const entry of parsed) {
      const effects = canonical(bcs.TransactionEffects, toBase64(entry.response.transaction.effects.bcs.value));
      if (entry.request.transaction?.bcs?.value) {
        const digest = await Transaction.from(toBase64(entry.request.transaction.bcs.value)).getDigest();
        assert.equal(entry.response.transaction.effects.transactionDigest, digest);
        assert.equal(effects[effects.$kind].transactionDigest, digest);
        assert.equal(toBase64(entry.response.transaction.transaction.bcs.value), toBase64(entry.request.transaction.bcs.value));
      }
    }
    const refs = new Map(), summaries = [];
    for (const [i, preview] of p.previews.entries()) {
      const prepared = preview.approval.prepared; assert.deepEqual(preview.simulations, p.simulations.slice(2 + 2 * i, 4 + 2 * i)); const [fee, final] = parsed.slice(2 + 2 * i, 4 + 2 * i);
      assert(fee.request.doGasSelection && !fee.request.transaction.bcs?.value); assert.equal(fee.request.transaction.sender, p.owner); assert(!final.request.doGasSelection); assert.equal(toBase64(final.request.transaction.bcs.value), prepared.bytesBase64);
      canonical(bcs.TransactionData, prepared.bytesBase64); const tx = Transaction.from(prepared.bytesBase64), data = tx.getData(); assert.equal(await tx.getDigest(), prepared.digest);
      assert.equal(data.sender, p.owner); assert.equal(data.gasData.owner, p.owner); assert.equal(prepared.gasOwner, p.owner); assert.equal(data.gasData.price, prepared.gasPrice); assert.equal(data.gasData.budget, prepared.gasBudget);
      assert.equal(prepared.gasPaymentKind, 'coins'); const selectedGas = fee.response.transaction.transaction.gasPayment;
      assert.deepEqual(data.gasData.payment, selectedGas.objects.map(o => ({ objectId: o.objectId, version: String(o.version), digest: o.digest })));
      assert.equal(data.gasData.budget, String(selectedGas.budget)); assert.equal(data.gasData.price, String(selectedGas.price));
      assert(data.expiration.Validity && data.expiration.Validity.chain === p.h0);
      assert.equal(BigInt(data.expiration.Validity.maxEpoch), BigInt(data.expiration.Validity.minEpoch) + 1n);
      assert.equal(data.expiration.Validity.allowedProposers.epoch, data.expiration.Validity.minEpoch);
      assert.deepEqual(fee.response.transaction.transaction.kind.data, final.response.transaction.transaction.kind.data);
      assert.deepEqual(fee.response.transaction.transaction.gasPayment, final.response.transaction.transaction.gasPayment);
      assert.deepEqual(fee.response.transaction.transaction.expiration, final.response.transaction.transaction.expiration);
      assert.equal(prepared.input.kind, preview.kind); assert.equal(prepared.input.sender, p.owner); assert(preview.text.includes(prepared.digest) && preview.text.includes(p.owner));
      const call = data.commands.at(-1).MoveCall; assert(call); assert.equal(call.package, normalizeRtdAddress('0x3')); assert.equal(call.module, 'rtd_system'); assert.deepEqual(call.typeArguments, []);
      const system = data.inputs[call.arguments[0].Input].Object.SharedObject; assert.equal(system.objectId, normalizeRtdAddress('0x5')); assert.equal(system.mutable, true);
      if (preview.kind === 'stake') {
        assert.deepEqual(data.commands.map(c => c.$kind), ['SplitCoins', 'MoveCall']); assert.equal(call.function, 'request_add_stake'); assert.equal(call.arguments.length, 3); assert.deepEqual(call.arguments[1].NestedResult, [0, 0]);
        const split = data.commands[0].SplitCoins; assert.equal(split.coin.$kind, 'GasCoin'); assert.equal(split.amounts.length, 1); const amount = canonical(bcs.u64(), data.inputs[split.amounts[0].Input].Pure.bytes);
        assert.equal(amount, (BigInt(preview.amount) * 1000000000n).toString()); assert.equal(prepared.input.amount, amount); assert.equal(canonical(bcs.Address, data.inputs[call.arguments[2].Input].Pure.bytes), p.validator); assert.equal(prepared.input.validator, p.validator);
      } else {
        assert.deepEqual(data.commands.map(c => c.$kind), ['MoveCall']); assert.equal(call.function, 'request_withdraw_stake'); assert.equal(call.arguments.length, 2); assert.equal(prepared.input.objectId, p.stakeId);
        const stake = data.inputs[call.arguments[1].Input].Object.ImmOrOwnedObject; assert(stake); assert.deepEqual(stake, { objectId: fixture.newStake.objectId, version: fixture.newStake.version, digest: fixture.newStake.digest });
        assert.equal(prepared.withdrawal.principal, fixture.newStake.decoded.principal.value); assert.equal(prepared.withdrawal.poolId, fixture.newStake.decoded.pool_id); assert.equal(prepared.withdrawal.activationEpoch, fixture.newStake.decoded.stake_activation_epoch);
      }
      for (const ref of data.gasData.payment) { const old = refs.get(ref.objectId); if (old) assert.deepEqual(old, ref); refs.set(ref.objectId, ref); }
      summaries.push({ kind: preview.kind, amount: preview.amount, requestId: preview.approval.requestId, digest: prepared.digest, gas: data.gasData, validity: data.expiration.Validity, bindingKey: prepared.bindingKey, readSessionKey: prepared.readSessionKey, sharedSystem: system });
    }
    assert.notEqual(summaries[0].requestId, summaries[1].requestId); assert.notEqual(summaries[0].digest, summaries[1].digest);
    const stakingNodes = graph.flatMap(r => r.data.walletSnapshot.query?.address?.objects?.nodes ?? []).filter(n => n.address === p.stakeId);
    assert(stakingNodes.length); for (const node of stakingNodes) { assert.equal(String(node.version), fixture.newStake.version); assert.equal(node.digest, fixture.newStake.digest); assert.equal(node.contents.bcs, originalStakeContent); }
    const markers = new Map(); for (const r of graph) if (r.data.walletSnapshot.sequenceNumber >= 332734) markers.set(String(r.data.walletSnapshot.sequenceNumber), r.data.walletSnapshot.digest); assert(markers.size);
    assert(p.checks.some(c => c.name === 'controlled current account normally relocked' && c.passed)); for (const kind of ['stake', 'withdraw']) assert(p.checks.some(c => c.name === kind + ' complete form preparation rejected with no competing simulation signature dispatch or journal write' && c.passed));
    assert(!cp.execFileSync('ps', ['-Ao', 'command='], { encoding: 'utf8' }).split('\n').some(s => s.includes('Google Chrome') && s.includes('--user-data-dir=' + p.profile)));
    stage = 'fresh native original stake shared system gas and typed markers';
    globalThis.fetch = async (input, init) => {
      const u = new URL(input instanceof Request ? input.url : String(input)); assert.equal(u.origin, 'http://127.0.0.1:41750'); assert(/\/(GetServiceInfo|GetObject|GetCheckpoint)$/.test(u.pathname));
      const response = await originalFetch(input, { ...init, credentials: 'omit', redirect: 'error' }); supplementalFrames.push({ url: u.href, status: response.status, requestBase64: Buffer.from(init?.body ?? []).toString('base64'), responseBase64: Buffer.from(await response.clone().arrayBuffer()).toString('base64') }); return response;
    };
    const { WalletReadSession } = load('session'), { WalletFullnodeReader } = load('fullnode-reader'); session = new WalletReadSession(selected); const native = new WalletFullnodeReader(session), freshObjects = [];
    for (const id of [p.stakeId, normalizeRtdAddress('0x5'), ...refs.keys()]) {
      const o = await native.object(id); assert(o && o.objectBcs); assert.equal(typed('Object', o.objectBcs), o.digest); canonical(bcs.Object, toBase64(o.objectBcs));
      if (id === p.stakeId) { assert.equal(o.version, fixture.newStake.version); assert.equal(o.digest, fixture.newStake.digest); assert.equal(o.owner.AddressOwner, p.owner); assert.equal(toBase64(o.content), originalStakeContent); assert.equal(o.previousTransaction, fixture.digest); }
      if (refs.has(id)) { assert.equal(o.version, refs.get(id).version); assert.equal(o.digest, refs.get(id).digest); assert.equal(o.owner.AddressOwner, p.owner); }
      if (id === normalizeRtdAddress('0x5')) for (const summary of summaries) assert.equal(summary.sharedSystem.initialSharedVersion, o.owner.Shared.initialSharedVersion);
      freshObjects.push({ objectId: o.objectId, version: o.version, digest: o.digest, owner: o.owner, objectBcsBase64: toBase64(o.objectBcs) });
    }
    const { RtdGrpcClient } = require('rtd-typescript/grpc'), client = new RtdGrpcClient({ network: 'localnet', baseUrl: 'http://127.0.0.1:41750', format: 'binary', fetch: globalThis.fetch, mvr: { url: '' } });
    assert.equal((await client.ledgerService.getServiceInfo({})).response.chainId, p.h0);
    for (const [height, digest] of markers) {
      const c = (await client.ledgerService.getCheckpoint({ checkpointId: { oneofKind: 'sequenceNumber', sequenceNumber: BigInt(height) }, readMask: { paths: ['sequence_number', 'digest', 'summary', 'contents'] } }, { timeout: 20000 })).response.checkpoint;
      assert.equal(String(c.sequenceNumber), height); assert.equal(c.digest, digest); assert.equal(typed('CheckpointSummary', c.summary.bcs.value), digest); assert.equal(typed('CheckpointContents', c.contents.bcs.value), c.contents.digest); assert.equal(c.summary.contentDigest, c.contents.digest);
    }
    assert.equal((await client.ledgerService.getServiceInfo({})).response.chainId, p.h0);
    for (const row of supplementalFrames) { assert.equal(row.status, 200); const method = new URL(row.url).pathname.split('/').pop(); frame(row.requestBase64, GrpcTypes[method + 'Request'], false); frame(row.responseBase64, GrpcTypes[method + 'Response'], true); }
    report = { passed: true, observedAt: new Date().toISOString(), source: p.source, h0: p.h0, generation: p.generation, owner: p.owner, stakeId: p.stakeId,
      originalFramesVerified: p.frames.length, rpcFrames: rpcCount, graphqlOrArchiveFrames: graphCount, retained503Or504: transient, retainedClosingCaptureErrors: p.captureErrors,
      originalSimulationFramesVerified: 8, actualCurrentFullFormsLockRefusals: 2, realOriginalPrivateSignDataCompleted: 1, signaturesReturned: 0,
      exactStakeAmountRevisionsAndOriginalWithdrawal: summaries, freshObjects, freshTypedSnapshotMarkers: markers.size, nativeLockReleaseAndSignerRestoreAccepted: true,
      completeJournalUnchangedAndNormalRelock: true, ownedChromeAbsent: true, currentC42StakeWithdrawFormsAccepted: true,
      durablePendingMatrixAccepted: false, parentTX04Complete: false, parentTX01Complete: false, auditSimulations: 0, auditSignatures: 0, auditExecuteRequests: 0, supplementalFrames,
      inputsSha256: Object.fromEntries([__filename, path.resolve(proofFile), buildFile, profileFile].map(f => [f, sha(f)])),
      scope: 'Original actual current C42 forms selected before real original sign-only lock; two real Review refusals/zero competing simulation/sign/dispatch/journal; original actual31s failed release, native lock and signer restored; three canonical1/2RTD and original withdrawal previews, all eight original enabled simulation frames; fresh native stake/system/gas and typed S. Capture errors/transient503504 retained, not sustained health. No durable pending, actual withdrawal, all NFT matrix, normal Chrome trust or parent completion.' };
  } catch (e) { report = { passed: false, observedAt: new Date().toISOString(), stage, errorType: e.name, message: String(e.message).slice(0, 850), supplementalFrames }; process.exitCode = 1; }
  finally { session?.close(); globalThis.fetch = originalFetch; fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ passed: report.passed, stage: report.stage, message: report.message, originalFrames: report.originalFramesVerified, supplementary: supplementalFrames.length })); }
})().catch(e => { console.error(JSON.stringify({ passed: false, message: String(e.message).slice(0, 250) })); process.exitCode = 1; });
