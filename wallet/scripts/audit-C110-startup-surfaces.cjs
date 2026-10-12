// Original startup transition inventory only; no online attribution or parent acceptance.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const wallet = path.resolve(__dirname, '..'), logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
const read = file => JSON.parse(fs.readFileSync(file));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function main() {
  const output = process.argv[2]; assert(output && !fs.existsSync(output));
  const file = path.join(logs, '20261008-C110-own-startup-surfaces-02.json'), p = read(file);
  assert(p.passed && p.startupSurfaceInventoryCompleted && p.offlineInventoryOnly && p.ownProfileClosed && p.originalRuntimeHeld);
  assert(!p.parentAcceptance && p.offlineMode && p.mandatoryUnavailableProxyPort === 42199);
  assert.equal(p.surfaces.length, 4);
  assert.equal(p.extraPagesCreatedByDiagnostic + p.originalProfilesOpened + p.agentCredentialReads +
    p.agentCredentialInputs + p.forwardedHTTPRequests + p.signatures + p.executeRequests, 0);
  for (const [file, hash] of Object.entries(p.inputsSha256)) assert.equal(sha(file), hash);
  const lineage = require('./lib/C109-product-source-lineage.cjs'), q = read(lineage.qualificationFile), build = read(q.buildFile);
  assert.deepEqual(lineage.validate(q.originalSource, q.buildFile), p.source);
  assert(p.workerEvidence.matchesDisk); assert.equal(p.workerEvidence.workerSha256, build.artifacts['background.js']);
  const origin = new URL(read(path.join(logs, '20261008-C109-current-origin-probe-01.json')).origin).href.replace(/\/$/, '');
  const ui = origin + '/ui.html';
  for (const sample of p.surfaces) {
    assert.equal(sample.pages.length, 2); assert(sample.pages.some(page => page.url === 'about:blank'));
    assert.equal(sample.targets.filter(target => target.type === 'service_worker' && target.url === origin + '/background.js').length, 1);
    assert.equal(sample.targets.filter(target => target.type === 'page' && target.url.startsWith(ui)).length, 1);
  }
  assert(p.surfaces[0].pages.some(page => page.url === ''));
  for (const sample of p.surfaces.slice(1))
    assert.deepEqual(sample.pages.filter(page => page.url.startsWith(ui)), [{ url: ui + '#/tokens', closed: false }]);
  const oldTool = path.join(__dirname, 'diagnose-C110-own-startup-surfaces.cjs');
  const newTool = path.join(__dirname, 'diagnose-C110-own-startup-surfaces-v2.cjs');
  const repairFile = path.join(logs, '20261008-C110-startup-inventory-tool-repair-prepared-01.json'), repair = read(repairFile);
  assert(repair.passed && repair.preparedOnly && repair.exactOnePropertyAccessCorrection);
  for (const [file, hash] of Object.entries(repair.inputsSha256)) assert.equal(sha(file), hash);
  assert.equal(fs.readFileSync(newTool, 'utf8').replace('url: target.url }', 'url: target.url() }'), fs.readFileSync(oldTool, 'utf8'));
  const prior = path.join(logs, '20261008-C110-own-startup-surfaces-01.json');
  assert(!read(prior).passed && read(prior).ownProfileClosed);
  const rejectedFile = path.join(logs, '20261008-C110-startup-surface-independent-failure-01.json'), rejected = read(rejectedFile);
  assert(!rejected.passed && !rejected.parentAcceptance && rejected.errorType === 'AssertionError');
  assert.deepEqual(rejected.actualFirstPageURLs, p.surfaces[0].pages.map(page => page.url));
  for (const [file, hash] of Object.entries(rejected.inputsSha256)) assert.equal(sha(file), hash);
  const files = [__filename, file, repairFile, prior, rejectedFile, oldTool, newTool, lineage.qualificationFile,
    path.join(logs, '20261008-C109-current-origin-probe-01.json')];
  const result = { passed: true, observedAt: new Date().toISOString(), offlineStartupInventoryOnly: true, source: p.source,
    samples: 4, existingWalletCDPTargetsPerSample: 1, observedStartupTransition: 'Empty page URL with ui.html CDP target, then tokens in three samples',
    ownStartupWalletPage: ui + '#/tokens', ownBlankPages: 1, diagnosticCreatedPages: 0,
    currentWorkerSourceAccepted: true, originalToolAndAuditFailuresRetained: true,
    observedOfflineHTTPAttempts: p.observedHTTPAttempts.length, forwardedHTTPRequests: 0,
    currentStakingRootCauseConfirmed: false, duplicateOnlineRequestAttributionAccepted: false,
    productChanged: false, parentAcceptance: false, trialReady: false,
    profilesOpenedByAudit: 0, HTTPRequestsByAudit: 0, signatures: 0, executeRequests: 0,
    inputsSha256: Object.fromEntries(files.map(file => [file, sha(file)])) };
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ passed: true, samples: 4, existingWalletTargets: 1, startupTransitionRetained: true, rootCauseConfirmed: false }));
}
main();
