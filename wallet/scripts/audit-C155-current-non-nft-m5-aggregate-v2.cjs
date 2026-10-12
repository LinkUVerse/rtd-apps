// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Bind complete current non-NFT live/cold facts, without re-running business actions.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const logs = path.resolve(__dirname, '../migrationToGRpcOrGraphQLDoc/workLog');
const read = file => JSON.parse(fs.readFileSync(file));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const methods = ['accounts/ImportedAccount', 'accounts/MnemonicAccount', 'accounts/zklogin/ZkLoginAccount'];

function complete(cold, live) {
  assert(cold.passed && live.passed);
  assert.equal(cold.h0, 'BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4');
  assert.equal(live.h0, cold.h0);
  assert.deepEqual(live.source, cold.source);
  assert.equal(cold.source.files, 1122);
  assert.equal(cold.source.sha256, 'cf896265507583ccda66d584e9b207d4524a277f41e7eb5fe730aa624d201817');
  for (const key of ['actualCurrentNonNftColdDurableAccepted', 'actualCurrentCoinStakeWithdrawAndDappRefusalsAccepted',
    'actualThreeJournalStoresAndCipherRetained', 'actualFullInitialUiWorkerAndPopupBytesAccepted',
    'directPrivateSignDataObserved', 'allOriginalHttpBodiesCaptured', 'allIntermediateEntitiesIndependentlyVerified',
    'captureScopeIncludesTeardown', 'actualBrowserResponseCoverageCorrelated', 'allOwnBrowserAndDemoNormallyClosed',
    'allOriginalFixedDigestLookupsActuallyNotFound']) assert.equal(cold[key], true, key);
  assert.equal(cold.actualThreePrivateEntryCallsObserved, 0);
  assert.equal(cold.capturedOriginalEntities, 470);
  assert.equal(cold.savedIntermediateEvents, 3283);
  assert.equal(cold.artifactMutationRefusals, 25);
  for (const key of ['newSimulations', 'newNativeVerifications', 'newSignatures', 'newExecuteRequests',
    'nftBusinessRequests', 'unknownPositiveBodyGaps', 'missingRecoveryBodies']) assert.equal(cold[key], 0, key);
  assert.equal(cold.creatorRerun, false); assert.equal(cold.journalSeeded, false);
  assert.equal(cold.parentCompletion, false);
  for (const key of ['allOriginalEntitiesAndTeardownAccepted', 'directThreePrivateEntryCallsAccepted',
    'allOriginalHttpResponseBodiesCaptured', 'allEightCriticalSimulationResponsesCaptured',
    'actualCoinDappLiveRefusalsAccepted', 'actualCurrentLoadedSourceCipherAndClosedPendingProfileHeld',
    'nativeLockReleaseAndSignerRestoreAccepted', 'completeJournalUnchangedAndNormalRelock', 'ownedChromeAbsent',
    'currentC137StakeWithdrawReleasePreviewsAccepted', 'currentC137NonNftFourLiveRefusalsAccepted']) assert.equal(live[key], true, key);
  assert.equal(live.currentLiveAcceptanceCase, 'C154-new-6-MIST');
  assert.equal(live.actualCurrentFullFormsLockRefusals, 4);
  assert.equal(live.originalSimulationFramesVerified, 8);
  assert.equal(live.realOriginalPrivateSignDataCompleted, 1);
  assert.equal(live.signaturesReturned, 0);
  assert.deepEqual(live.actualPrivateSignDataCalls, Object.fromEntries(methods.map((key, i) => [key, i === 0 ? 1 : 0])));
  assert.equal(live.readCaptureGapMutationsRejected, 22);
  assert(live.capturedOriginalEntities > 0 && live.intermediateEvents > live.capturedOriginalEntities);
  assert(live.canonicalFinalEffectsVerified >= 5);
  assert.deepEqual(live.retainedOriginalReadCaptureErrors, []);
  for (const key of ['auditSimulations', 'auditSignatures', 'auditExecuteRequests', 'nftBusinessRequests']) assert.equal(live[key], 0, key);
  assert.equal(live.parentTX04Complete, false); assert.equal(live.parentTX01Complete, false);
  return ['coin', 'stake', 'withdraw', 'dApp'].map(entry => ({ entry, actualLiveRefusal: true,
    actualDurableRefusal: true, entireInitialSourceAndHttpBodiesAccepted: true,
    actualPrivateCallsSeparatelyObserved: true, originalThreeStoresAndCipherHeld: true }));
}

(async () => {
  const [output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
  let result;
  try {
    const coldFile = path.join(logs, '20261009-C148-current-non-nft-complete-cold-independent-05.json');
    const liveFile = path.join(logs, '20261009-C154-current-non-nft-live-independent-02.json');
    const cold = read(coldFile), live = read(liveFile), matrix = complete(cold, live);
    const inputPins = { [coldFile]: sha(coldFile), [liveFile]: sha(liveFile), [__filename]: sha(__filename) };
    for (const report of [cold, live]) for (const [file, hash] of Object.entries(report.inputsSha256)) {
      assert.equal(sha(file), hash, file);
      if (inputPins[file]) assert.equal(inputPins[file], hash);
      inputPins[file] = hash;
    }
    const coldActualFile = path.join(logs, '20261009-C148-current-non-nft-pending-cold-05.json');
    const liveActualFile = path.join(logs, '20261009-C154-current-non-nft-live-01.json');
    const coldActual = read(coldActualFile), liveActual = read(liveActualFile);
    assert(coldActual.passed && liveActual.passed);
    assert(coldActual.normalUnlock && coldActual.normalReject && coldActual.normalDisconnect && coldActual.normalRelock);
    assert(liveActual.distinctFromFailedC149 && liveActual.distinctFromOriginalC137);
    assert.equal(liveActual.executeRequests, 0);
    assert.equal(liveActual.currentLiveAcceptanceCase, 'C154-new-6-MIST');
    assert.deepEqual(liveActual.currentGatewayAuthority, coldActual.currentGatewayAuthority);
    const ownership = require('./lib/C148-current-core-gateway-ownership.cjs');
    assert.deepEqual(ownership.capture(), coldActual.currentGatewayAuthority);
    const lineage = require('./lib/C136-product-source-lineage.cjs'), qualification = read(lineage.qualificationFile);
    assert.deepEqual(lineage.validate(qualification.originalSource, qualification.buildFile), cold.source);
    const cases = [
      ['cold', x => x.passed = false], ['live', x => x.passed = false],
      ['cold', x => x.newSignatures = 1], ['cold', x => x.newExecuteRequests = 1],
      ['cold', x => x.actualThreePrivateEntryCallsObserved = 1], ['cold', x => x.allOriginalHttpBodiesCaptured = false],
      ['cold', x => x.actualBrowserResponseCoverageCorrelated = false], ['cold', x => x.creatorRerun = true],
      ['cold', x => x.journalSeeded = true], ['cold', x => x.parentCompletion = true],
      ['cold', x => x.artifactMutationRefusals = 24], ['cold', x => x.source.files = 1121],
      ['live', x => x.currentLiveAcceptanceCase = 'old-case'], ['live', x => x.allOriginalEntitiesAndTeardownAccepted = false],
      ['live', x => x.signaturesReturned = 1], ['live', x => x.actualPrivateSignDataCalls[methods[0]] = 0],
      ['live', x => x.actualPrivateSignDataCalls[methods[1]] = 1], ['live', x => x.actualCurrentFullFormsLockRefusals = 3],
      ['live', x => x.originalSimulationFramesVerified = 7], ['live', x => x.completeJournalUnchangedAndNormalRelock = false],
      ['live', x => x.parentTX04Complete = true], ['live', x => x.readCaptureGapMutationsRejected = 21],
    ];
    for (const [side, mutate] of cases) {
      const pair = { cold: structuredClone(cold), live: structuredClone(live) };
      mutate(pair[side]); assert.notDeepEqual(pair[side], side === 'cold' ? cold : live);
      assert.throws(() => complete(pair.cold, pair.live));
    }
    result = { passed: true, observedAt: new Date().toISOString(), source: cold.source, h0: cold.h0,
      nonNftFourEntryFullM5Accepted: true, matrix, capturedColdEntities: cold.capturedOriginalEntities,
      capturedLiveEntities: live.capturedOriginalEntities, actualPrivateCallsCold: 0,
      actualPrivateCallsLive: live.actualPrivateSignDataCalls, liveSignaturesReturned: 0,
      actualAggregateMutationRefusals: cases.length, allOriginalEvidenceSha256Held: true,
      newRequests: 0, newSignatures: 0, newExecuteRequests: 0, oldCreatorReplayed: false,
      original98DenominatorHeld: true, originalNftConditionsHeld: true,
      fullNftM5Accepted: false, fullOriginalTxParentsAccepted: false, parentCompletion: false,
      currentRuntimeAuthority: coldActual.currentGatewayAuthority,
      inputsSha256: { ...inputPins, ...Object.fromEntries([coldActualFile, liveActualFile,
        lineage.qualificationFile, require.resolve('./lib/C148-current-core-gateway-ownership.cjs')].map(f => [f, sha(f)])) } };
  } catch (error) {
    result = { passed: false, observedAt: new Date().toISOString(), errorType: error.name,
      message: String(error.message).slice(0, 1400), stack: String(error.stack).slice(0, 2000), parentCompletion: false };
    process.exitCode = 1;
  }
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ passed: result.passed, nonNftM5: result.nonNftFourEntryFullM5Accepted, message: result.message }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
