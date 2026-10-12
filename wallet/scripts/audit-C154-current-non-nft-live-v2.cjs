// Independent whole-wire, canonical transaction and fresh native audit of current full staking forms.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto'), assert = require('node:assert/strict'), cp = require('node:child_process');
const { verifyTransactionSignature } = require('rtd-typescript/verify');
const { GrpcTypes } = require('rtd-typescript/grpc'), { Transaction } = require('rtd-typescript/transactions'), { bcs } = require('rtd-typescript/bcs');
const { toBase64, toBase58, normalizeRtdAddress } = require('rtd-typescript/utils'), { blake2b } = require('@noble/hashes/blake2.js'), loader = require('tsx/cjs/api');
const wallet = path.resolve(__dirname, '..'), load = n => loader.require(path.join(wallet, 'src/shared/rpc', n + '.ts'), __filename);
const read = f => JSON.parse(fs.readFileSync(f)), sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const typed = (type, raw) => toBase58(blake2b(Buffer.concat([Buffer.from(type + '::'), Buffer.from(raw)]), { dkLen: 32 }));
const sharedComparatorFile = path.join(__dirname, 'lib/audit-legacy-shared-kind.cjs');
const { assertLegacySharedKindEqual } = require(sharedComparatorFile);
function canonical(codec, encoded) { const value = codec.parse(Buffer.from(encoded, 'base64')); assert.equal(toBase64(codec.serialize(value).toBytes()), encoded); return value; }
function frame(encoded, T, trailer) {
  const raw = Buffer.from(encoded, 'base64'); assert(raw.length >= 5 && raw[0] === 0); const end = 5 + raw.readUInt32BE(1); assert(end <= raw.length);
  if (trailer) { assert.equal(raw[end], 128); assert.equal(end + 5 + raw.readUInt32BE(end + 1), raw.length); assert(/(?:^|\r\n)grpc-status:\s*0\r\n/.test(raw.subarray(end + 5).toString('ascii'))); }
  else assert.equal(end, raw.length);
  return T.fromBinary(raw.subarray(5, end));
}

function actualFourLive(p){
 assert.equal(p.creatorC133Rerun,false);assert.equal(p.fixedC133PendingUntouched,true);assert.equal(p.fullNonNftM5Accepted,false);assert.equal(p.ordinaryChromeAccepted,false);assert.equal(p.nftBusinessRequests,0);assert.deepEqual(p.initialCipher,p.finalCipher);assert(p.c133ClosedProfileBefore.files>0);assert.deepEqual(p.c133ClosedProfileBefore,p.c133ClosedProfileAfter);
 const original=p.originalApprovedTransaction;
 for(const row of [p.coinCompetition,p.dappCompetition]){assert(row.nativeLockUnavailable);assert.equal(row.simulationsBefore,2);assert.equal(row.simulationsAfter,2);assert.deepEqual(row.journal,p.initialJournal);assert.equal(row.held.invoked,1);assert.equal(row.held.signaturePresent,true);assert.equal(row.held.released,false);assert.equal(row.held.dispatches,0);assert.equal(row.held.intentBytesSha256,original.bytesSha256);}
 const coin=p.coinCompetition;assert.equal(coin.route,'#/send?type=0x2%3A%3Artd%3A%3ARTD');assert(coin.queries.length>0);for(const q of coin.queries){assert.equal(q.key[0],'wallet-transfer-preparation');assert.equal(JSON.parse(q.key[1])[5],p.h0);assert.equal(q.status,'error');assert.equal(q.hasData,false);assert.equal(q.error,'当前链账户正在签名或恢复，请稍后查看结果');assert.equal(q.key[3].amount,'0.000000001');assert.equal(q.key[3].to,p.owner);assert.equal(q.key[3].activeAddress,p.owner);}
 const d=p.dappCompetition;assert.equal(d.request.tx.justSign,true);assert.equal(d.request.binding.mode,'sign');assert.equal(d.request.tx.account,p.owner);assert.equal(d.request.tx.chain,'rtd:localnet');assert.equal(d.request.tx.data,original.json);assert.notEqual(d.request.id,original.requestId);assert.equal(d.request.approved,null);assert.match(d.request.origin,/^http:\/\/127\.0\.0\.1:\d+$/);assert.deepEqual(d.prepared,[]);assert(d.source.matchesDisk);assert.equal(d.refusal.error,true);assert.equal(d.refusal.message,'当前链账户正在签名或恢复，请稍后查看结果');
}

(async () => {
  const [proofFile, output] = process.argv.slice(2); assert(output && !fs.existsSync(output)); const p = read(proofFile), supplementalFrames = [], originalFetch = globalThis.fetch;
  let report = {}, stage = 'current C43 authority and actual lock matrix', session;
  try {
    assert(p.passed && p.currentC137NonNftFourLiveRefusalsAccepted && p.currentC137StakeWithdrawReleasePreviewsAccepted && p.journalUnchanged && !p.currentDurablePendingMatrixAccepted && !p.parentTX04Complete);
    assert.equal(p.signatureCount, 0); assert.equal(p.executeRequests, 0); assert.equal(p.realSignDataCompleted, 1); assert.equal(p.realSignerRestored, true);
    assert.equal(p.originalProfilesOpened, 0); assert.equal(p.certificateChanges, 0); assert.equal(p.normalChromeHttpsAccepted, false); assert.deepEqual(p.forbidden, []);
    assert.deepEqual(p.initialJournal, p.finalJournal); assert(Object.values(p.initialJournal).every(v => Array.isArray(v) && v.length === 0));
    assert(p.allEightCriticalSimulationResponsesCaptured && p.allOriginalHttpResponseBodiesCaptured);assert.deepEqual(p.captureErrors,[]);assert.equal(p.preCloseNetworkWitness.simulations,8);const gaps=require('./lib/C154-live-entity-correlation-v2.cjs');let gapProof;
    for (const [f, h] of Object.entries(p.inputsSha256)) assert.equal(sha(f), h);
    assert.deepEqual((()=>{const l=require('./lib/C136-product-source-lineage.cjs'),q=read(l.qualificationFile);return l.validate(q.originalSource,q.buildFile)})(), p.source);
    const buildFile = Object.keys(p.inputsSha256).find(f => f.endsWith('/20261009-default-generation-positive-C136-build-01.json')), build = read(buildFile); assert(build.passed);
    for (const [f, h] of Object.entries(build.artifacts)) assert.equal(sha(path.join(build.output, f)), h);gapProof=gaps.validate(p,build);
    assert.equal(p.workerSource.workerSha256, build.artifacts['background.js']); for (const row of p.uiSource.loadedBundles) assert.equal(row.loadedSha256, build.artifacts[row.file]);
    assert.equal(p.signHoldSource.workerSha256, build.artifacts['background.js']); assert(p.signHoldSource.matchesDisk && p.signHoldSource.receiverVerified); assert.equal(p.signHoldSource.module, 'dapp-signing');
    assert.equal(p.signHoldSource.producerSha256, sha(path.join(wallet, 'src/background/dapp-signing.ts'))); assert.equal(p.signHoldSource.mapSha256, sha(path.join(build.output, 'background.js.map')));
    assert.equal(p.originalStakingCheckpoint, '332734'); const fixture = read(path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog/20261007-G3-staking-fixture-native-audit-02.json')); assert(fixture.passed);
    assert.equal(p.originalStakingDigest, fixture.digest); assert.equal(p.owner, fixture.newStake.owner.AddressOwner); assert.equal(p.stakeId, fixture.newStake.objectId);
    const originalStakeBody = canonical(bcs.Object, fixture.newStake.objectBcsBase64);
    const originalStakeContent = toBase64(originalStakeBody.data.Move.contents);
    const profileFile = Object.keys(p.inputsSha256).find(f => f.endsWith('/C102-isolated-parallel-gateway-20261008-01/profile.json'));
    const { validateNetworkProfile, executionScopeKey } = load('profile'), selected = validateNetworkProfile(read(profileFile)); assert.equal(selected.expectedGenesisDigest, p.h0); assert.equal(selected.generation, p.generation);
    assert.equal(p.scopeKey, executionScopeKey(selected, p.owner)); assert.equal(p.competitions.length, 2); assert.deepEqual(p.competitions.map(r => r.kind), ['stake', 'withdraw']);
    assert.equal(p.formsBeforeLock.length, 2); assert(p.formsBeforeLock[0].route.includes('address=' + p.validator)); assert(p.formsBeforeLock[1].route.includes('staked=' + p.stakeId));
    actualFourLive(p);assert.equal(p.distinctInputAmount,'6');assert.equal(p.distinctFromApproved03,true);assert.equal(p.distinctFromApproved05,true);const failed05=read(path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog/20261009-C134-current-non-nft-live-05.json'));assert.equal(failed05.approvedClicked,true);assert.equal(failed05.passed,false);assert.notEqual(p.originalApprovedTransaction.digest,failed05.originalApprovedTransaction.digest);assert.equal(p.secondConnectCompleted,true);const failed03=read(path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog/20261009-C134-current-non-nft-live-03.json'));assert.equal(failed03.passed,false);assert.equal(failed03.approvedClicked,true);assert.notEqual(p.originalApprovedTransaction.digest,failed03.originalApprovedTransaction.digest); let actualLiveMutationRefusals=0; for(const mutate of [x=>x.coinCompetition.nativeLockUnavailable=false,x=>x.coinCompetition.held.invoked=2,x=>x.coinCompetition.held.dispatches=1,x=>x.coinCompetition.simulationsAfter=3,x=>x.coinCompetition.queries[0].hasData=true,x=>x.coinCompetition.queries[0].key[3].amount='2',x=>x.coinCompetition.queries[0].key[3].to=p.validator,x=>x.dappCompetition.request.tx.justSign=false,x=>x.dappCompetition.refusal.message='wrong guard',x=>x.dappCompetition.prepared=[{}],x=>x.dappCompetition.source.matchesDisk=false,x=>x.finalCipher.sha256='0'.repeat(64),x=>x.c133ClosedProfileAfter.sha256='0'.repeat(64),x=>x.creatorC133Rerun=true,x=>x.fullNonNftM5Accepted=true]){const wrong=structuredClone(p);mutate(wrong);assert.throws(()=>actualFourLive(wrong));actualLiveMutationRefusals++;} const original = p.originalApprovedTransaction; const currentPending=read(path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog/20261009-C133-current-non-nft-pending-creator-02.json'));assert(currentPending.passed);assert.notEqual(original.digest,currentPending.input.digest);const originalData=Transaction.from(original.bytesBase64).getData();assert.equal(originalData.commands[0].$kind,'SplitCoins');assert.equal(canonical(bcs.u64(),originalData.inputs[originalData.commands[0].SplitCoins.amounts[0].Input].Pure.bytes),'6'); assert.equal(await Transaction.from(original.bytesBase64).getDigest(), original.digest); canonical(bcs.TransactionData, original.bytesBase64);
    assert.equal(crypto.createHash('sha256').update(Buffer.from(original.bytesBase64, 'base64')).digest('hex'), original.bytesSha256);
    for (const row of p.competitions) {
      assert(row.nativeLockUnavailable && row.text.includes('当前链账户正在签名或恢复，请稍后查看结果'));
      assert.deepEqual(row.preparedRows, []); assert.equal(row.simulationsBefore, 2); assert.equal(row.simulationsAfter, 2);
      assert.equal(row.held.invoked, 1); assert.equal(row.held.signaturePresent, true); assert.equal(row.held.released, false); assert.equal(row.held.dispatches, 0); assert.equal(row.held.intentBytesSha256, original.bytesSha256);
    }
    assert(p.releaseAt - p.heldAt >= 31000); assert(p.originalResultError.includes('网络准入记录未通过精确合同'));
    stage = 'complete original HTTP and enabled simulation frames';
    let graphCount = 0, rpcCount = 0, originalPrivateSignatureVerifications = 0; const transient = [], graph = [], recordedObjects = new Map();
    for (const row of p.frames) {
      const u = new URL(row.url); assert.equal(u.hostname, '127.0.0.1'); assert(['41750', '42011', '42012', '42013'].includes(u.port));
      assert(!/\/ExecuteTransaction$/.test(u.pathname));
      if ([503, 504].includes(row.status)) { assert(u.port !== '41750'); transient.push({ url: row.url, status: row.status }); continue; }
      assert.equal(row.status, 200);
      if (u.pathname === '/graphql' || u.pathname === '/account/graphql') {
        assert((u.port === '42011' && u.pathname === '/graphql') || (u.port === '42013' && u.pathname === '/account/graphql')); const request = JSON.parse(Buffer.from(row.requestBase64, 'base64')), response = JSON.parse(Buffer.from(row.responseBase64, 'base64')); assert(!('jsonrpc' in request));
        // Actual GraphQL errors are retained and do not stand in for a successful snapshot.
        if (!response.errors && response.data?.walletSnapshot) { assert.equal(response.data.walletGenesis.digest, p.h0); assert(Number.isSafeInteger(response.data.walletSnapshot.sequenceNumber)); graph.push({ request, data: response.data }); }
        graphCount++;
      } else {
        assert(u.port === '41750' || (u.port === '42012' && /^\/archive\/rtd\.rpc\.v2\.LedgerService\/(GetServiceInfo|GetCheckpoint)$/.test(u.pathname)));
        const method = u.pathname.split('/').pop(); assert(GrpcTypes[method + 'Request'] && GrpcTypes[method + 'Response']);
        if (method === 'GetObject' && row.responseHeaders?.['grpc-status'] === '5') { const request = frame(row.requestBase64, GrpcTypes.GetObjectRequest, false); assert([p.owner, ...p.previews.map(x => x.approval.prepared.sender)].includes(request.objectId)); assert.equal(row.responseBase64, ''); rpcCount++; continue; }
        const request = frame(row.requestBase64, GrpcTypes[method + 'Request'], false), response = frame(row.responseBase64, GrpcTypes[method + 'Response'], true); rpcCount++;
        if (method === 'VerifySignature') { assert.equal(u.port, '41750'); assert.equal(u.pathname, '/rtd.rpc.v2.SignatureVerificationService/VerifySignature'); assert.equal(request.address, p.owner); assert.equal(request.message.name, 'TransactionData'); assert.deepEqual(request.jwks, []); assert.equal(toBase64(request.message.value), original.bytesBase64); assert(response.isValid && !response.reason); assert.equal((await verifyTransactionSignature(request.message.value, toBase64(request.signature.bcs.value), { address: p.owner })).toRtdAddress(), p.owner); originalPrivateSignatureVerifications++; }
        if (method === 'GetCheckpoint') { assert(response.checkpoint?.digest && response.checkpoint.sequenceNumber !== undefined); if (response.checkpoint.summary?.bcs?.value) assert.equal(typed('CheckpointSummary', response.checkpoint.summary.bcs.value), response.checkpoint.digest); }
        if (method === 'GetServiceInfo') assert.equal(response.chainId, p.h0);
        if (method === 'GetObject' && response.object?.bcs?.value) {
          const o = response.object; assert.equal(request.objectId, o.objectId); assert.equal(typed('Object', o.bcs.value), o.digest); const body = canonical(bcs.Object, toBase64(o.bcs.value));
          if (o.contents?.value) assert.equal(toBase64(body.data.Move.contents), toBase64(o.contents.value));
          const key = o.objectId + '/' + String(o.version) + '/' + o.digest; const old = recordedObjects.get(key); if (old) assert.equal(toBase64(old.bcs.value), toBase64(o.bcs.value)); else recordedObjects.set(key, o);
        }
      }
    }
    assert.equal(originalPrivateSignatureVerifications, 1); assert.equal(p.simulations.length, 8); const parsed = p.simulations.map(row => {
      assert.equal(row.status, 200); assert(p.frames.some(f => f.url === row.url && f.requestBase64 === row.requestBase64 && f.responseBase64 === row.responseBase64));
      const request = frame(row.requestBase64, GrpcTypes.SimulateTransactionRequest, false), response = frame(row.responseBase64, GrpcTypes.SimulateTransactionResponse, true);
      assert.equal(request.checks, GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED); assert(response.transaction.effects.status.success);
      assert.equal(row.bytesBase64, request.transaction?.bcs?.value ? toBase64(request.transaction.bcs.value) : null); return { request, response };
    });
    assert(p.simulations.slice(0, 2).every(r => r.bytesBase64 === original.bytesBase64)); assert.equal(p.previews.length, 3); assert.deepEqual(p.previews.map(r => [r.kind, r.amount]), [['stake', '1'], ['stake', '2'], ['withdraw', null]]);
    let canonicalFinalEffects = 0, observedKindFeeSelections = 0, rejectedSharedKindMutations = 0;
    for (const entry of parsed) {
      if (entry.request.transaction?.bcs?.value) {
        assert.equal(entry.request.doGasSelection, false);
        const effects = canonical(bcs.TransactionEffects, toBase64(entry.response.transaction.effects.bcs.value));
        const digest = await Transaction.from(toBase64(entry.request.transaction.bcs.value)).getDigest();
        assert.equal(entry.response.transaction.effects.transactionDigest, digest);
        assert.equal(effects[effects.$kind].transactionDigest, digest);
        assert.equal(toBase64(entry.response.transaction.transaction.bcs.value), toBase64(entry.request.transaction.bcs.value));
        canonicalFinalEffects++;
      } else {
        assert.equal(entry.request.doGasSelection, true);
        assert.equal(entry.request.transaction.sender, p.owner);
        assert.equal(entry.request.transaction.gasPayment.owner, p.owner);
        assert.deepEqual(entry.request.transaction.gasPayment.objects, []);
        const originalKind = entry.request.transaction.kind.data, resolvedKind = entry.response.transaction.transaction.kind.data;
        assertLegacySharedKindEqual(resolvedKind, originalKind);
        // Mutate the actual captured response: no server call or replacement evidence.
        // These prove the compatibility step cannot hide a semantic change.
        const pt = resolvedKind.programmableTransaction, sharedIndex = pt.inputs.findIndex(input => input.kind === 3);
        assert(sharedIndex >= 0);
        for (const change of [{ mutable: false }, { mutability: 0 }, { mutability: 3 }, { version: pt.inputs[sharedIndex].version + 1n }, { objectId: normalizeRtdAddress('0x6') }]) {
          const altered = { ...resolvedKind, programmableTransaction: { ...pt, inputs: pt.inputs.map((input, i) => i === sharedIndex ? { ...input, ...change } : input) } };
          assert.throws(() => assertLegacySharedKindEqual(altered, originalKind)); rejectedSharedKindMutations++;
        }
        const alteredCommand = { ...resolvedKind, programmableTransaction: { ...pt, commands: pt.commands.slice(0, -1) } };
        assert.throws(() => assertLegacySharedKindEqual(alteredCommand, originalKind)); rejectedSharedKindMutations++;
        assert.equal(entry.response.transaction.transaction.gasPayment.owner, p.owner);
        assert(entry.response.transaction.transaction.gasPayment.objects.length);
        assert(BigInt(entry.response.transaction.transaction.gasPayment.budget) > 0n);
        observedKindFeeSelections++;
      }
    }
    assert.equal(canonicalFinalEffects, 5); assert.equal(observedKindFeeSelections, 3);
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
      originalFramesVerified: p.frames.length, rpcFrames: rpcCount, graphqlOrArchiveFrames: graphCount, retained503Or504: transient, retainedOriginalReadCaptureErrors: p.captureErrors, exactFourReadCaptureGapsQualifiedOnly:false,allOriginalEntitiesAndTeardownAccepted:true,directThreePrivateEntryCallsAccepted:true,actualPrivateSignDataCalls:gapProof.actualPrivateCalls,readCaptureGapMutationsRejected:gapProof.mutationsRejected,readCaptureRootCauseAccepted:false,allOriginalHttpResponseBodiesCaptured: p.allOriginalHttpResponseBodiesCaptured, allEightCriticalSimulationResponsesCaptured: true, originalPrivateSignatureVerifications,
      originalSimulationFramesVerified: 8, actualCurrentFullFormsLockRefusals: 4, actualCoinDappLiveRefusalsAccepted:true, actualLiveMutationRefusals, actualCurrentLoadedSourceCipherAndClosedPendingProfileHeld:true, ordinaryChromeAccepted:false, fullNonNftM5Accepted:false, nftBusinessRequests:0, realOriginalPrivateSignDataCompleted: 1, signaturesReturned: 0,
      canonicalFinalEffectsVerified: canonicalFinalEffects, kindFeeSelectionsVerified: observedKindFeeSelections, kindFeeCanonicalEffectsClaimed: false,
      sharedInputCompatibility: { legacyBoolAndMatchingEnumOnly: true, originalCapturedSelections: observedKindFeeSelections, rejectedOriginalFrameMutations: rejectedSharedKindMutations, reference: 'https://mystenlabs.github.io/sui/sui_rpc_api/proto/sui/rpc/v2/struct.Input.html' },
      exactStakeAmountRevisionsAndOriginalWithdrawal: summaries, freshObjects, freshTypedSnapshotMarkers: markers.size, nativeLockReleaseAndSignerRestoreAccepted: true,
      completeJournalUnchangedAndNormalRelock: true, ownedChromeAbsent: true, currentC137StakeWithdrawReleasePreviewsAccepted: true, currentC137NonNftFourLiveRefusalsAccepted:true,
      durablePendingMatrixAccepted: false, parentTX04Complete: false, parentTX01Complete: false, auditSimulations: 0, auditSignatures: 0, auditExecuteRequests: 0, supplementalFrames,
      inputsSha256: { ...p.inputsSha256,...Object.fromEntries([__filename, sharedComparatorFile, require.resolve('./lib/C154-live-entity-correlation-v2.cjs'),path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog/20261009-C149-live-independent-source-inverses-01.json'), path.resolve(proofFile), buildFile, profileFile].map(f => [f, sha(f)]))},
      currentLiveAcceptanceCase:'C154-new-6-MIST',capturedOriginalEntities:gapProof.capturedOriginalEntities,intermediateEvents:gapProof.intermediateEvents,scope: 'Original actual current C43 forms selected before real original sign-only lock; two real Review refusals/zero competing simulation/sign/dispatch/journal; original actual31s failed release, native lock and signer restored; three canonical1/2RTD and original withdrawal previews, all eight original enabled simulation frames; fresh native stake/system/gas and typed S. Capture errors/transient503504 retained, not sustained health. No durable pending, actual withdrawal, all NFT matrix, normal Chrome trust or parent completion.' };
  } catch (e) { report = { passed: false, observedAt: new Date().toISOString(), stage, errorType: e.name, message: String(e.message).slice(0, 850), supplementalFrames }; process.exitCode = 1; }
  finally { session?.close(); globalThis.fetch = originalFetch; fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ passed: report.passed, stage: report.stage, message: report.message, originalFrames: report.originalFramesVerified, supplementary: supplementalFrames.length })); }
})().catch(e => { console.error(JSON.stringify({ passed: false, message: String(e.message).slice(0, 250) })); process.exitCode = 1; });
