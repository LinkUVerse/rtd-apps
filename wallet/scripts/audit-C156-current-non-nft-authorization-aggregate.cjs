// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Compose independently accepted contracts without relabelling historical runs.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('./lib/C158-bounded-strict-assert.cjs');
const { bcs } = require('rtd-typescript/bcs');
const { Transaction } = require('rtd-typescript/transactions');
const { verifyTransactionSignature } = require('rtd-typescript/verify');
const wallet = path.resolve(__dirname, '..'), root = path.resolve(wallet, '../..');
const logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
const read = file => JSON.parse(fs.readFileSync(file));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const source = { sha256: 'cf896265507583ccda66d584e9b207d4524a277f41e7eb5fe730aa624d201817', files: 1122 };
const h0 = 'BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4';
const kinds = ['coin', 'stake', 'withdraw'];
const reportFiles = {
  account: '20261009-C150-current-authorization-matrix-independent-01.json',
  internal: '20261009-C157-current-internal-complete-capture-independent-02.json',
  recover: '20261009-C152-current-debug-historical-sponsored-receipts-independent-01.json',
  m5: '20261009-C155-current-non-nft-m5-complete-01.json',
  validity: '20261008-C117-non-nft-validity-independent-04.json',
  self: '20261009-C125-non-nft-signing-independent-01.json',
  sponsored: '20261009-C126-non-nft-signing-independent-03.json',
  shared: '20261009-C156-current-shared-authorization-source-independent-01.json',
  admission: '20261009-C124-production-source-independent-02.json',
};
function coverage(p) {
  for (const report of Object.values(p)) assert(report.passed);
  for (const name of ['account', 'internal', 'recover', 'm5']) {
    assert.deepEqual(p[name].source, source);
    assert.equal(p[name].h0, h0);
  }
  assert.deepEqual(p.shared.currentSource, source);
  assert(p.shared.currentPlacementInverseAndAll1122FilesHeld && p.shared.completeOriginalProductionInverseAccepted);
  assert(p.shared.onlyOrphanExplicitFalseMetadataCleanup && p.shared.activeApprovalSubjectTimingHeld && p.shared.durableJournalHeld);
  assert.equal(p.shared.sharedBusinessFilesCompared, 1118);
  assert.equal(p.shared.signOrExecuteRetries, 0);
  assert.deepEqual(p.shared.added, []); assert.deepEqual(p.shared.deleted, []);
  assert(p.admission.completeOriginalProductionInverseAccepted && p.admission.originalNativeWindowAssertionsHeld && p.admission.originalTicketAndTotalDeadlineHeld);
  assert.equal(p.admission.maximumReadonlyProbeAttempts, 2); assert.equal(p.admission.signOrExecuteRetries, 0);
  assert.deepEqual(p.validity.source, p.admission.originalSource);
  assert.deepEqual(p.self.source, p.admission.currentSource);
  assert.deepEqual(p.sponsored.source, p.self.source);
  assert.deepEqual(p.shared.originalSource, p.self.source);
  const a = p.account;
  assert(a.currentC150ActualAuthorizationMatrix && a.defaultValidityFullyPreserved && a.allThreeJournalStoresUnchanged && a.normalRelockAndOwnedChromeAbsent);
  assert.equal(a.actualWalletSignatures, 10); assert.equal(a.independentlyVerifiedTransactionSignatures, 6);
  assert.equal(a.independentlyVerifiedPersonalSignatures, 4); assert.equal(a.actualEnabledSimulationFrames, 14);
  assert.equal(a.canonicalFinalEffects, 12); assert.equal(a.executeRequests, 0);
  assert.deepEqual(a.retainedOtherCaptureErrors, []);
  assert.deepEqual(a.records.map(row => [row.type, row.name]), ['mnemonic-derived', 'imported'].flatMap(type =>
    ['default', 'explicit-gas-no-expiration', 'external-owner-future-epoch'].map(name => [type, name])));
  assert(a.records.every(row => row.signatureVerified && row.formalSimulations === 2));
  const i = p.internal;
  for (const flag of ['fullCurrentInternalCaptureAccepted', 'actualFullInitialUiAndWorkerBytesAccepted', 'allOriginalInternalHttpEntitiesAccepted',
    'directPrivateSignDataObserved', 'allIntermediateEntitiesIndependentlyVerified', 'actualBrowserResponseCoverageCorrelated',
    'captureScopeIncludesTeardown', 'allOwnBrowserNormallyClosed', 'originalVisibleApprovalsJournalAndCipherHeld']) assert(i[flag]);
  assert.equal(i.actualThreePrivateEntryCallsObserved, 0); assert.equal(i.unknownPositiveBodyGaps, 0);
  assert.equal(i.actualEnabledSimulationFrames, 15); assert.equal(i.canonicalFinalEffects, 9); assert.equal(i.kindFeeSelections, 6);
  assert.equal(i.artifactMutationRefusals, 23); assert.deepEqual(i.retainedOriginalReadCaptureErrors, []);
  assert.deepEqual(i.cases.map(row => row.kind), kinds);
  assert(i.cases.every(row => row.currentSourceAndOnlyGasDeltaVerified && row.actualUiStaleDigestRejection));
  const v = p.validity;
  assert(v.actualNonNftWalletStandardValidityUiAccepted && v.actualNormalRejectAndDisconnectAccepted);
  assert.equal(v.actualNormalDappCases, 27); assert.equal(v.actualCanonicalPositiveFinalEffects, 12);
  assert.equal(v.actualTimestampErrors, 12); assert.equal(v.actualExpiredEpochErrors, 3); assert.equal(v.actualWireAndUiMutationRefusals, 108);
  for (const name of ['self', 'sponsored']) {
    const s = p[name]; assert(s.actualNonNftWalletStandardSigningAccepted && s.actualNormalApproveAndDisconnectAccepted);
    assert.equal(s.actualNormalDappCases, 12); assert.equal(s.actualWalletSignatures, 12);
    assert.equal(s.actualCanonicalPositiveFinalEffects, 24); assert.equal(s.actualNativeSignatureVerificationFrames, 12);
    assert.equal(s.actualWireAndUiMutationRefusals, 84);
  }
  const r = p.recover;
  assert(r.currentDebugHistoricalReceiptsIndependentlyAccepted && r.originalTransactionAndEffectsBytesIdentical && r.originalSixSignaturesLocallyVerified);
  assert.equal(r.originalReadFramesIndependentlyAudited, 5); assert.equal(r.linkedImmutableJsonsChecked, 107);
  assert.equal(r.actualMutationRefusals, 15); assert.equal(r.signatures, 0); assert.equal(r.executeRequests, 0);
  assert.equal(r.newApprovals, 0); assert.equal(r.archiveWriteAfterAcceptance, false);
  assert.deepEqual(r.receipts.map(row => row.kind), kinds);
  assert(r.receipts.every(row => row.sender !== row.gasOwner && row.bothOriginalSignaturesLocallyVerified && row.currentFullTransactionBytesIdentical && row.currentFullEffectsBytesIdentical));
  assert(p.m5.nonNftFourEntryFullM5Accepted && p.m5.allOriginalEvidenceSha256Held);
  assert.equal(p.m5.actualAggregateMutationRefusals, 22);
  assert.deepEqual(p.m5.matrix.map(row => row.entry), [...kinds, 'dApp']);
  assert(p.m5.matrix.every(row => row.actualLiveRefusal && row.actualDurableRefusal && row.entireInitialSourceAndHttpBodiesAccepted && row.originalThreeStoresAndCipherHeld));
  assert.equal(p.m5.fullOriginalTxParentsAccepted, false); assert.equal(p.m5.fullNftM5Accepted, false);
  return kinds.map(kind => ({ kind, currentInternalFinalBytesAndNewAuthorization: true,
    actualHistoricalValidityCases: 9, actualHistoricalSelfGasSignatures: 4, actualHistoricalSponsoredSenderSignatures: 4,
    currentOrdinaryAndImportedSharedSignerAndLifecycle: true, historicalUniqueDualSignExecution: true,
    currentSameBytesNativeReceiptRecovery: true, currentCompleteLiveAndDurableM5: true,
    historicalUiRerunOnCurrentSource: false, historicalWholeUiCaptureRelabelledComplete: false }));
}
async function auditHistoricalUi(file, report, signed, sponsored) {
  const p = read(file), rows = p.validityUi.records;
  assert(p.passed && p.validityUi.passed); assert.deepEqual(p.source, report.source); assert.equal(p.h0, h0);
  assert.equal(rows.length, signed ? 12 : 27);
  const variants = signed ? ['expirationLargeEpoch', 'expirationNone', 'originalWindow', 'validDuringNoTimestamp'] :
    ['expirationLargeEpoch', 'expirationNone', 'expiredEpoch', 'originalWindow', 'validDuringMaxTimestamp', 'validDuringMinTimestamp', 'validDuringNoTimestamp', 'windowMaxTimestamp', 'windowMinTimestamp'];
  for (const kind of kinds) assert.deepEqual(rows.filter(row => row.kind === kind).map(row => row.variant.name).sort(), variants);
  let verified = 0;
  for (const row of rows) {
    const variant = row.variant, raw = Buffer.from(variant.bytesBase64, 'base64'), parsed = bcs.TransactionData.parse(raw);
    assert.equal(Buffer.from(bcs.TransactionData.serialize(parsed).toBytes()).toString('base64'), variant.bytesBase64);
    assert.equal(await Transaction.from(raw).getDigest(), variant.digest);
    assert.equal(parsed.V1.sender, p.owner); assert.deepEqual(parsed.V1.expiration, variant.expiration);
    assert.equal(parsed.V1.gasData.owner !== parsed.V1.sender, sponsored);
    if (signed) {
      assert(row.approvedClicked && row.normalApproveClosedPopup && !row.noSignatureReturned);
      assert.equal(row.signedResult.bytes, variant.bytesBase64);
      assert.equal((await verifyTransactionSignature(raw, row.signedResult.signature, { address: p.owner })).toRtdAddress(), p.owner);
      assert.equal(row.locallyVerifiedSigner, p.owner); verified++;
    } else assert(!row.approvedClicked && row.normalRejectClosedPopup && row.noSignatureReturned);
  }
  return { file, originalSource: p.source, actualCases: rows.length, independentlyReverifiedCanonicalBytes: rows.length,
    independentlyReverifiedOriginalSignatures: verified, historicalUnknownBodiesPreserved: p.captureErrors.length,
    currentUiRerun: false, fullHistoricalUiCaptureAccepted: false };
}
(async () => {
  const [output] = process.argv.slice(2); assert(output && !fs.existsSync(output)); let result;
  try {
    const p = Object.fromEntries(Object.entries(reportFiles).map(([key, name]) => [key, read(path.join(logs, name))]));
    const matrix = coverage(p), pins = {};
    const pin = file => { const value = sha(file); if (pins[file]) assert.equal(pins[file], value); pins[file] = value; };
    for (const report of Object.values(p)) for (const [file, digest] of Object.entries(report.inputsSha256)) { assert.equal(sha(file), digest); pin(file); }
    for (const name of Object.values(reportFiles)) pin(path.join(logs, name));
    const ledgerFile = path.join(logs, '20261009-TX01-TX04-non-nft-evidence-ledger-01.json'), ledger = read(ledgerFile);
    assert(ledger.passed && ledger.acceptedIndependentReports === 16); assert.equal(Object.keys(ledger.linkedImmutableJsonSha256).length, 107);
    for (const [file, digest] of Object.entries(ledger.linkedImmutableJsonSha256)) { assert.equal(sha(file), digest); pin(file); } pin(ledgerFile);
    const shared = require('./qualify-C156-current-shared-authorization-source.cjs').auditDelta();
    for (const key of ['changed', 'added', 'deleted', 'originalSource', 'currentSource', 'inputsSha256']) assert.deepEqual(shared[key], p.shared[key]);
    const before = read(read(path.join(logs, '20261009-C131-before-implementation-01.json')).productManifest);
    const current = require('./qualify-C109-product-delta.cjs').currentManifest();
    const sharedPaths = ['src/background/dapp-signing.ts', 'src/background/dapp-execution.ts', 'src/background/execution.ts',
      'src/background/accounts/MnemonicAccount.ts', 'src/background/accounts/ImportedAccount.ts',
      'src/shared/rpc/coin-transfer-preparation.ts', 'src/shared/rpc/staking-preparation.ts',
      'src/shared/rpc/execution-coordinator.ts', 'src/shared/rpc/execution-journal.ts', 'src/shared/rpc/execution-reader.ts',
      'src/shared/rpc/transaction-move-admission.ts'];
    for (const relative of sharedPaths) {
      const file = path.join(wallet, relative), key = path.relative(root, file);
      assert(before[key]); assert.equal(current.rows[key], before[key]); pin(file);
    }
    const historical = [];
    for (const [key, name, signed, sponsored] of [
      ['validity', '20261008-C117-non-nft-validity-ui-02.json', false, false],
      ['self', '20261009-C125-non-nft-signing-ui-01.json', true, false],
      ['sponsored', '20261009-C126-non-nft-signing-ui-01.json', true, true],
    ]) { const file = path.join(logs, name); historical.push(await auditHistoricalUi(file, p[key], signed, sponsored)); pin(file); }
    const ownership = require('./lib/C148-current-core-gateway-ownership.cjs').capture();
    assert.deepEqual(ownership, p.m5.currentRuntimeAuthority);
    const lineage = require('./lib/C136-product-source-lineage.cjs'), qualification = read(lineage.qualificationFile);
    assert.deepEqual(lineage.validate(qualification.originalSource, qualification.buildFile), source);
    const negatives = [
      ['account', x => x.actualWalletSignatures = 9], ['account', x => x.records.pop()],
      ['account', x => x.records[0].type = 'imported'], ['account', x => x.records[0].signatureVerified = false],
      ['account', x => x.retainedOtherCaptureErrors.push({ missing: true })], ['account', x => x.normalRelockAndOwnedChromeAbsent = false],
      ['internal', x => x.cases.pop()], ['internal', x => x.actualThreePrivateEntryCallsObserved = 1],
      ['internal', x => x.unknownPositiveBodyGaps = 1], ['internal', x => x.canonicalFinalEffects = 8],
      ['internal', x => x.allOriginalInternalHttpEntitiesAccepted = false], ['internal', x => x.captureScopeIncludesTeardown = false],
      ['validity', x => x.actualNormalDappCases = 26], ['validity', x => x.actualExpiredEpochErrors = 0],
      ['self', x => x.actualWalletSignatures = 11], ['sponsored', x => x.actualNativeSignatureVerificationFrames = 11],
      ['shared', x => x.sharedBusinessFilesCompared = 1117], ['shared', x => x.onlyOrphanExplicitFalseMetadataCleanup = false],
      ['admission', x => x.signOrExecuteRetries = 1], ['admission', x => x.originalTicketAndTotalDeadlineHeld = false],
      ['recover', x => x.receipts.pop()], ['recover', x => x.receipts[1].gasOwner = x.receipts[1].sender],
      ['recover', x => x.originalTransactionAndEffectsBytesIdentical = false], ['recover', x => x.signatures = 1],
      ['recover', x => x.archiveWriteAfterAcceptance = true], ['m5', x => x.matrix.pop()],
      ['m5', x => x.fullOriginalTxParentsAccepted = true], ['m5', x => x.matrix[0].actualDurableRefusal = false],
      ['internal', x => x.source.sha256 = '0'.repeat(64)], ['recover', x => x.h0 = 'wrong'],
    ];
    for (const [key, mutate] of negatives) { const changed = structuredClone(p); mutate(changed[key]); assert.notDeepEqual(changed, p); assert.throws(() => coverage(changed)); global.gc?.(); }
    for (const file of [__filename, require.resolve('./qualify-C156-current-shared-authorization-source.cjs'), lineage.qualificationFile,
      require.resolve('./lib/C158-bounded-strict-assert.cjs'), path.join(logs, '20261009-C156-current-non-nft-final-authorization-design.md')]) pin(file);
    result = { passed: true, observedAt: new Date().toISOString(), source, h0, matrix, historical,
      currentOrdinaryAndImportedAuthorizationAccepted: true, currentAllThreeInternalFinalGasReauthorizationAccepted: true,
      unchangedAllSharedBusinessBytesAndCurrentLifecycleAccepted: true, currentCompleteFourEntryM5Accepted: true,
      historicalUniqueSponsoredExecutionAndCurrentPersistentRecoveryAccepted: true,
      nonNftAuthorizationContractsComposedAndAccepted: true, nonNftTxDevelopmentAcceptanceComplete: true,
      historicalCurrentCartesianUiRerun: false, fullHistoricalSponsoredStakeUiCaptureAccepted: false,
      historical51CanonicalBytesIndependentlyReverified: true, historical24SignaturesIndependentlyReverified: true,
      historicalUnknownBodiesPreserved: historical.map(row => row.historicalUnknownBodiesPreserved),
      currentRuntimeAuthority: ownership, actualAggregateNegativeRefusals: negatives.length,
      newHttpRequests: 0, newApprovals: 0, newSignatures: 0, newExecuteRequests: 0, originalStakeConsumed: false,
      nftBusinessRequests: 0, fullFirstPhaseAccepted: false, fullOriginalTxParentsAccepted: false,
      ordinaryChromeAccepted: false, original98DenominatorHeld: true, originalNftConditionsHeld: true,
      parentCompletion: false, inputsSha256: pins };
  } catch (error) { result = { passed: false, observedAt: new Date().toISOString(), errorType: error.name,
    message: String(error.message).slice(0, 1200), stack: String(error.stack).slice(0, 2000), parentCompletion: false }; process.exitCode = 1; }
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ passed: result.passed, composed: result.nonNftAuthorizationContractsComposedAndAccepted, message: result.message }));
})().catch(error => { console.error(error.name, String(error.message).slice(0, 200)); process.exitCode = 1; });
