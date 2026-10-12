// Read-only handoff of the current build's full internal and twelve-page scopes.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), cp = require('node:child_process');
const root = path.resolve(__dirname, '../../..'), wallet = path.resolve(__dirname, '..');
const docs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc'), logs = path.join(docs, 'workLog');
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const read = f => JSON.parse(fs.readFileSync(f));
const inputFiles = new Set([__filename]);
function proof(name) {
  const file = path.join(logs, name), p = read(file);
  inputFiles.add(file);
  for (const [f, h] of Object.entries(p.inputsSha256 ?? {})) {
    assert.equal(sha(f), h, f); inputFiles.add(f);
  }
  return p;
}
function inverse(p) {
  assert(p.passed && p.preparedOnly);
  for (const row of p.rows) {
    let restored = fs.readFileSync(row.candidate, 'utf8');
    for (const [old, next, count] of [...row.changes].reverse()) {
      assert.equal(restored.split(next).length - 1, count, row.candidate);
      restored = restored.split(next).join(old);
    }
    assert.equal(restored, fs.readFileSync(row.original, 'utf8'));
    assert(row.exactOriginalWholeSourceInverse);
  }
}
function section(file, title, next) {
  const text = fs.readFileSync(file, 'utf8'), start = text.indexOf(title);
  assert(start >= 0); const end = next ? text.indexOf(next, start + title.length) : -1;
  return text.slice(start, end < 0 ? undefined : end);
}
function main() {
  const [output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
  let stage = 'immutable evidence and complete source inverses', result;
  try {
    const internalTools = proof('20261008-C110-complete-internal-tools-prepared-01.json');
    const coreTools = proof('20261008-C110-complete-core-tools-prepared-01.json');
    inverse(internalTools); inverse(coreTools);
    assert(internalTools.originalFullInternalAssertionsHeld);
    assert(coreTools.originalTwelvePagesAndWalletStandardAndThreeServiceFullCaptureHeld);
    assert(coreTools.originalCurrentThreeInternalGateHeld);
    const lineage = require('./lib/C109-product-source-lineage.cjs');
    const q = proof('20261008-C109-production-source-independent-01.json');
    const buildFile = path.join(logs, '20261008-default-generation-positive-C109-build-01.json');
    const source = lineage.validate(q.originalSource, buildFile);
    inputFiles.add(buildFile); inputFiles.add(path.join(__dirname, 'lib/C109-product-source-lineage.cjs'));
    const internal = proof('20261008-C110-current-internal-gas-independent-01.json');
    const core = proof('20261008-C110-current-core-pages-independent-02.json');
    assert(internal.passed && core.passed && internal.currentC109UnsignedInternalAccepted);
    assert.deepEqual(internal.source, source); assert.deepEqual(core.source, source);
    assert.equal(internal.actualEnabledSimulationFrames, 15);
    assert.equal(internal.canonicalFinalEffects, 9); assert.equal(internal.kindFeeSelections, 6);
    assert(internal.originalVisibleApprovalsJournalAndCipherHeld && internal.ownedChromeAbsent);
    assert(core.currentBuildActualCoreReadPagesAccepted && core.actualWalletStandardConnectDisconnectAccepted);
    assert.equal(core.actualReadPages.length, 12);
    assert.equal(core.originalConsumerFramesIndependentlyAccepted, 195);
    assert.equal(core.originalNetworkFramesIndependentlyAccepted, 202);
    assert.equal(core.frames.length, 397);
    assert(core.allRetainedNetworkAndConsumerFramesAccountedFor && core.fullCurrentSourceAndRuntimeHeld);
    assert(!internal.parentTX01Complete && !core.wholeREL02Accepted && !core.parentAcceptance);
    assert(!internal.sustainedAvailabilityAccepted && !core.sustainedAvailabilityAccepted);
    for (const p of [internal, core]) for (const key of ['auditSimulations', 'auditSignatures', 'auditExecuteRequests']) assert.equal(p[key], 0);
    const internalBrowser = proof('20261008-C110-current-internal-gas-chrome-01.json');
    const coreBrowser = proof('20261008-C110-current-core-pages-chrome-02.json');
    assert(internalBrowser.passed && coreBrowser.passed);
    assert(internalBrowser.ownExistingStartupUiReused && internalBrowser.extraPagesCreatedByTest === 0);
    assert(coreBrowser.singleExistingStartupUiReused);
    assert(internalBrowser.checks.some(row => row.label === 'all original1015 private files and imported ciphertext held; normal relock; zero Execute' && row.passed));
    for (const p of [internalBrowser, coreBrowser]) {
      assert.equal(p.executeRequests + p.signatures, 0);
    }
    assert(coreBrowser.normallyRelocked && coreBrowser.ownProfileClosed);
    assert.equal(coreBrowser.simulations + coreBrowser.faucetRequests, 0);
    stage = 'retained failures and precise normal cleanup';
    const oldFailure = proof('20261008-C109-current-internal-gas-chrome-01.json');
    const coreFailure = proof('20261008-C110-current-core-pages-independent-01.json');
    const negative = proof('20261008-C110-core-http-negative-01.json');
    assert.equal(oldFailure.passed, false); assert.equal(coreFailure.passed, false); assert(negative.passed);
    const cleanup = proof('20261008-C110-current-cleanup-independent-01.json');
    const retired = proof('20261008-C110-core-gateway-cleanup-01.json');
    const started = proof('20261008-C110-core-gateway-started-01.json');
    assert(cleanup.passed && retired.passed);
    assert.equal(cleanup.preciseOwnedTemporaryContainerRemoved, started.containerId);
    assert.deepEqual(retired.removedIds, [started.containerId]);
    assert.equal(cleanup.normalStopExitCode, 0);
    assert(cleanup.allOriginalGlobalContainerConfigurationsHeld && cleanup.original29And14Held);
    assert(cleanup.original25ActorsAndCurrentPublisherHeld && cleanup.bothOriginalRtdIndexerGroupsHeld);
    for (const key of ['volumesRemoved', 'imagesRemoved', 'originalServicesSignalled']) assert.equal(cleanup[key], 0);
    const ld = path.join(root, 'link-u-smart-contract/all-in-one-deploy/localDeploy');
    const program = 'import sys,json,hashlib;from pathlib import Path;sys.path.insert(0,sys.argv[1]);from manage_wallet_C110_core_gateway import capture,OP,read,global_inspect,unchanged;actual=capture();p=read(Path(sys.argv[2]));assert actual==p["originalAuthority"];rows=global_inspect();assert p["containerId"] not in {r["Id"] for r in rows};unchanged(rows,read(OP/"global-before.json"));print(json.dumps({"originalRuntimeCaptureSha256":hashlib.sha256(json.dumps(actual,sort_keys=True).encode()).hexdigest(),"retiredContainerAbsent":True,"originalGlobalConfigurationsHeld":True}))';
    const runtime = JSON.parse(cp.execFileSync(path.join(root, 'rtd-archive-service/localDeploy/data/publisher-venv/bin/python'), ['-c', program, ld, path.join(logs, '20261008-C110-core-gateway-started-01.json')], {encoding:'utf8', timeout:60000}));
    assert.equal(runtime.originalRuntimeCaptureSha256, cleanup.freshOriginalRuntimeCaptureSha256);
    stage = 'original counting and aligned technical contract';
    const fineFile = path.join(docs, 'remainingAcceptanceProgress.json');
    const originalFine = path.join(logs, '20261008-C109-before-implementation-archive-01/13-remainingAcceptanceProgress.json.bin');
    assert(fs.readFileSync(fineFile).equals(fs.readFileSync(originalFine)));
    inputFiles.add(fineFile); inputFiles.add(originalFine);
    const parents = [...fs.readFileSync(path.join(docs, 'Task.md'), 'utf8').matchAll(/^- \[([ x])\] `([A-Z]+-[A-Z0-9]+)` /gm)];
    assert.equal(parents.length, 98); assert.equal(parents.filter(p => p[1] === 'x').length, 89);
    const primary = path.join(root, 'rtd-archive-service/docs/wallet/03-SDK契约与功能迁移矩阵.md');
    const merged = path.join(docs, '04-SDK契约与功能迁移矩阵.md');
    assert.equal(section(primary, '### 4.6', '\n## '), section(merged, '### 4.6', '\n## '));
    inputFiles.add(primary); inputFiles.add(merged);
    const title = '### C110 当前构建三内部及十二页完整限定复验';
    assert.equal(section(path.join(root, 'rtd-archive-service/docs/wallet/06-落地批次与验收清单.md'), title), section(path.join(docs, '07-落地批次与验收清单.md'), title));
    result = {passed:true, observedAt:new Date().toISOString(), source, currentThreeInternalCompleteScopeAccepted:true,
      currentTwelveCorePagesCompleteScopeAccepted:true, independentOriginalFrames:397,
      completeOriginalTestAndAuditSourceInversesAccepted:true, allPriorFailuresRetained:true,
      exactOwnedContainerNormallyRemoved:started.containerId, freshRuntime:runtime,
      original98Parents:98, completedOriginalParents:89, originalFineProgressBytesHeld:true,
      originalTechnicalContractAligned:true, parentTX01Complete:false, wholeREL02Accepted:false,
      originalNineRemainingParentsAccepted:false, sustainedAvailabilityAccepted:false,
      auditProfilesOpened:0, auditHttpRequests:0, auditSimulations:0, auditSignatures:0, auditExecuteRequests:0,
      originalServicesSignalled:0,
      scope:'Current C109 build three unsigned internal cases and twelve readonly core pages plus Wallet Standard connect/reload/disconnect only. Full original evidence, exact source inverses, normal precise cleanup and unchanged original runtime. No complete NFT/name, ordinary Chrome TLS/permission, cold/lifecycle or nine-parent final acceptance.'};
  } catch(e) {result={passed:false, observedAt:new Date().toISOString(), stage, errorType:e.name, message:String(e.message).slice(0,1200), parentAcceptance:false};process.exitCode=1;}
  result.inputsSha256=Object.fromEntries([...inputFiles].map(f=>[f,sha(f)]));
  fs.writeFileSync(output, JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({passed:result.passed,stage:result.stage,message:result.message,currentCompleteScopes:result.passed?2:0}));
}
main();
