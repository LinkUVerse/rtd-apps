// Offline facts only: original request bodies, timing, lock observations and canonical BCS.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const logs = path.resolve(__dirname, '../migrationToGRpcOrGraphQLDoc/workLog');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file));
const wallet = path.resolve(__dirname, '..');
function main() {
  const output = process.argv[2]; assert(output && !fs.existsSync(output));
  const diagnosticFile = path.join(logs, '20261008-C109-current-staking-ui-diagnostic-02.json');
  const failureFile = path.join(logs, '20261008-C109-current-internal-gas-chrome-01.json');
  const cleanupFile = path.join(logs, '20261008-C109-current-cleanup-independent-01.json');
  const p = read(diagnosticFile), failure = read(failureFile), cleanup = read(cleanupFile);
  assert(p.passed && p.diagnosticOnly && p.diagnosticObservationCompleted && !p.parentAcceptance);
  assert(!failure.passed && failure.stage === 'actual stake original approval');
  assert(cleanup.passed && cleanup.bothOriginalRtdIndexerGroupsHeld && !cleanup.businessAccepted);
  assert.equal(p.observations.length, 16); assert.equal(p.requests.length, 117);
  assert.equal(p.frames.length, 106); assert.deepEqual(p.blocked, []);
  assert.equal(p.profilesOpened, 1); assert.equal(p.originalProfilesOpened, 0);
  assert.equal(p.signatures + p.executeRequests + p.simulations, 0);
  for (const [file, hash] of Object.entries(p.inputsSha256)) assert.equal(sha(file), hash);
  const lineage = require('./lib/C109-product-source-lineage.cjs'), q = read(lineage.qualificationFile);
  assert.deepEqual(lineage.validate(q.originalSource, q.buildFile), p.source);
  const contexts = p.observations.flatMap(o => o.contexts).filter(c => c.readSessionKey);
  assert.equal(new Set(contexts.map(c => c.readSessionKey)).size, 1);
  const clear = p.observations.filter(o => o.contexts.length && o.contexts.every(c =>
    c.readAdmission?.phase === 'observed' && c.readAdmission.blocked.length === 0));
  assert(clear.length > 2);
  assert.equal(new Set(clear.flatMap(o => o.contexts.map(c => c.readAdmission.keys.staking))).size, 1);
  const last = p.observations.at(-1), staking = last.queries.filter(q => q.key[0] === 'wallet-staking');
  assert.equal(staking.length, 1); assert.equal(staking[0].status, 'error');
  assert.equal(staking[0].errorType, 'TimeoutError');
  assert(last.queries.some(q => q.key[0] === 'wallet-fresh-balance' && q.status === 'success'));
  const timing = new Map(p.requests.map(r => [r.id, r]));
  const decoded = p.frames.filter(f => f.url.endsWith('/graphql') && f.responseBase64).map(f => {
    const request = JSON.parse(Buffer.from(f.requestBase64, 'base64'));
    const response = JSON.parse(Buffer.from(f.responseBase64, 'base64'));
    assert.equal(request.jsonrpc, undefined); assert(!response.errors?.length && response.data);
    assert.equal(f.status, 200); assert.equal(timing.get(f.requestId).at, f.startedAt);
    assert(f.bodyAt >= f.headerAt && f.headerAt >= f.startedAt);
    return { frame: f, request, response, elapsedMs: f.bodyAt - f.startedAt };
  });
  const sorted = decoded.map(r => r.elapsedMs).sort((a, b) => a - b);
  const median = sorted.length % 2 ? sorted[(sorted.length - 1) / 2]
    : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  const wrapperFrames = decoded.filter(r => r.request.variables.keys?.[0]?.address === '0x' + '0'.repeat(63) + '5');
  assert.equal(wrapperFrames.length, 2);
  const { require: tsRequire } = require('tsx/cjs/api');
  const bcsFile = path.join(wallet, 'src/shared/rpc/staking-bcs.ts');
  const { stakingBcs, SYSTEM_WRAPPER_BCS, SYSTEM_V1_BCS, SYSTEM_V2_BCS } = tsRequire(bcsFile, __filename);
  const systems = wrapperFrames.map(row => {
    const wrapper = stakingBcs(SYSTEM_WRAPPER_BCS, Buffer.from(
      row.response.data.walletSnapshot.query.multiGetObjects[0].asMoveObject.contents.bcs, 'base64'));
    assert(['1', '2'].includes(wrapper.version));
    const innerFrames = decoded.filter(r => r.request.variables.parent === wrapper.id &&
      r.request.variables.name?.type === 'u64');
    assert.equal(innerFrames.length, 2);
    const system = stakingBcs(wrapper.version === '1' ? SYSTEM_V1_BCS : SYSTEM_V2_BCS,
      Buffer.from(innerFrames[0].response.data.walletSnapshot.query.address.field.value.bcs, 'base64'));
    assert.equal(system.system_state_version, wrapper.version);
    return { wrapperVersion: wrapper.version, epoch: system.epoch,
      activeValidators: system.validators.active_validators.length,
      inactiveValidators: system.validators.inactive_validators.size,
      inactiveTable: system.validators.inactive_validators.id,
      pools: system.validators.active_validators.map(v => ({ poolId: v.staking_pool.id,
        rateTable: v.staking_pool.exchange_rates.id, declaredRates: v.staking_pool.exchange_rates.size })) };
  });
  assert.deepEqual(systems[0], systems[1]); assert.equal(systems[0].activeValidators, 1);
  assert.equal(systems[0].inactiveValidators, '0'); assert.equal(systems[0].pools[0].declaredRates, '2');
  const locks = p.observations.map(o => ({ at: o.at,
    held: o.physicalLocks.held.filter(l => l.name.startsWith('wallet-read-transport:v1:')),
    pending: o.physicalLocks.pending.filter(l => l.name.startsWith('wallet-read-transport:v1:')) }));
  assert(locks.every(o => o.held.length <= 4)); assert(locks.some(o => o.held.length === 4 && o.pending.length === 16));
  const clients = [...new Set(locks.flatMap(o => o.held.map(l => l.clientId)))];
  const repeated = decoded.filter(r => ['multiGetObjects', 'dynamicField', 'objects(first']
    .some(s => r.request.query.includes(s)) && r.request.query.startsWith('query WalletSnapshotRead'))
    .map(r => ({ requestId: r.frame.requestId, startedAt: r.frame.startedAt, headerAt: r.frame.headerAt,
      bodyAt: r.frame.bodyAt, variables: r.request.variables, elapsedMs: r.elapsedMs }));
  const inputs = [__filename, diagnosticFile, failureFile, cleanupFile, lineage.qualificationFile, bcsFile];
  const proof = { passed: true, observedAt: new Date().toISOString(), offlineDiagnosticFactsOnly: true,
    source: p.source, readSessionCount: 1, stableClearStakingAdmissionKeyCount: 1,
    samples: p.observations.length, requests: p.requests.length, retainedFrames: p.frames.length,
    capturedCompleteGraphQLResponses: sorted.length,
    graphQLRequestEventToCompleteBodyMs: { min: sorted[0], median, max: sorted.at(-1) },
    canonicalSystem: systems[0], physicalSlotMaximumObserved: 4,
    maxPendingPhysicalLockEntries: Math.max(...locks.map(o => o.pending.length)), physicalClientIds: clients,
    pendingEntriesAreLockAlternativesNotLogicalRequestCounts: true, repeatedCapturedReads: repeated,
    lastStakingStatus: 'TimeoutError', lastFreshBalanceStatus: 'success',
    duplicateReadCauseConfirmed: false, fullRootCauseConfirmed: false,
    actualBrowserStakingFixed: false, fullCurrentInternalMatrixAccepted: false,
    parentAcceptance: false, trialReady: false, auditHTTPRequests: 0, auditProfilesOpened: 0,
    auditSignatures: 0, auditExecuteRequests: 0,
    scope: 'Only original diagnostic02 timing/physical locks/stable gate and canonical BCS facts. No page or worker origin attribution, logical queue count, full internal/core pages acceptance, or parent completion.',
    inputsSha256: Object.fromEntries(inputs.map(file => [file, sha(file)])) };
  fs.writeFileSync(output, JSON.stringify(proof, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ passed: true, graphQLResponses: sorted.length, medianMs: median,
    physicalClientIds: clients.length, actualBrowserStakingFixed: false }));
}
main();
