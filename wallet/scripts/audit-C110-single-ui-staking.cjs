// Original actual browser data plus an explicitly offline replay of complete original GraphQL bodies.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), loader = require('tsx/cjs/api');
const wallet = path.resolve(__dirname, '..'), logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
const read = file => JSON.parse(fs.readFileSync(file));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function main() {
  const output = process.argv[2]; assert(output && !fs.existsSync(output));
  const file = path.join(logs, '20261008-C110-current-staking-single-ui-01.json'), p = read(file);
  assert(p.passed && p.diagnosticOnly && p.diagnosticObservationCompleted && p.ownExistingStartupUiReused);
  assert.equal(p.extraPagesCreatedByDiagnostic + p.originalProfilesOpened + p.signatures + p.executeRequests + p.simulations, 0);
  assert.equal(p.profilesOpened, 1); assert.deepEqual(p.blocked, []); assert(!p.parentAcceptance);
  for (const [file, hash] of Object.entries(p.inputsSha256)) assert.equal(sha(file), hash);
  const lineage = require('./lib/C109-product-source-lineage.cjs'), q = read(lineage.qualificationFile);
  assert.deepEqual(lineage.validate(q.originalSource, q.buildFile), p.source);
  const gateway = require('./lib/C110-current-core-gateway-ownership.cjs'), authority = gateway.capture();
  const started = read(gateway.startedFile), origin = started.origin;
  assert.equal(p.surfaces.length, 3);
  const selected = p.surfaces[0].selectedPageId;
  for (const surface of p.surfaces) {
    assert.equal(surface.selectedPageId, selected);
    assert.equal(surface.pages.filter(page => page.url.startsWith(origin + '/ui.html')).length, 1);
    assert.equal(surface.targets.filter(target => target.type === 'page' && target.url.startsWith(origin + '/ui.html')).length, 1);
  }
  assert(p.requests.length === 88 && p.frames.length === 81 && p.observations.length === 16);
  assert(p.requests.every(request => request.surface.kind === 'page' && request.surface.pageId === selected));
  for (const sample of p.observations)
    assert.equal(sample.browserPages.filter(page => page.url.startsWith(origin + '/ui.html')).length, 1);
  const last = p.observations.at(-1), success = last.queries.filter(query => query.key[0] === 'wallet-staking' && query.status === 'success');
  assert.equal(success.length, 1); assert(success[0].stakingData);
  assert(!last.queries.some(query => query.key[0] === 'wallet-staking' && query.errorType));
  assert(last.queries.some(query => query.key[0] === 'wallet-fresh-balance' && query.status === 'success'));
  const actual = success[0].stakingData;
  assert(BigInt(actual.snapshot.checkpoint) >= 524022n);
  const original = read(path.join(logs, '20261007-C43-staking-forms-live-lock-chrome-01.json'));
  assert(actual.value.positions.some(position => position.objectId === original.stakeId && position.principal === '1000000000'));
  assert.equal(actual.value.validators.length, 1); assert.equal(actual.value.epoch, '1');
  assert(last.body.includes('输入要质押的 RTD 数量') && last.body.includes('预览交易'));
  const startById = new Map(p.requests.map(request => [request.id, request]));
  const originals = p.frames.filter(frame => frame.url === 'http://127.0.0.1:42011/graphql' && frame.responseBase64).map(frame => {
    assert.equal(frame.status, 200);
    const request = JSON.parse(Buffer.from(frame.requestBase64, 'base64'));
    const response = JSON.parse(Buffer.from(frame.responseBase64, 'base64'));
    assert(!response.errors?.length && response.data); assert.equal(request.jsonrpc, undefined);
    assert.equal(response.data.walletGenesis?.digest ?? started.originalAuthority.h0 ?? original.h0, original.h0);
    assert.equal(startById.get(frame.requestId).requestBase64, frame.requestBase64);
    return { frame, request, response };
  });
  const load = name => loader.require(path.join(wallet, 'src/shared/rpc', name + '.ts'), __filename);
  const { WalletReadSession } = load('session'), { validateNetworkProfile } = load('profile');
  const { WalletStakingSnapshotReader } = load('staking-snapshot-reader');
  const session = new WalletReadSession(validateNetworkProfile(read(started.profile)));
  const replayed = [];
  let replay;
  try {
    const reader = await WalletStakingSnapshotReader.open(session, { fetch: async (input, init) => {
      const request = JSON.parse(init.body);
      const row = originals.find(row => row.request.query === request.query &&
        JSON.stringify(row.request.variables) === JSON.stringify(request.variables));
      assert(row, 'Offline replay must use one complete original body for the exact query and variables');
      replayed.push(row.frame.requestId);
      return new Response(Buffer.from(row.frame.responseBase64, 'base64'), { status: 200, headers: { 'content-type': 'application/json' } });
    } });
    replay = await reader.staking(original.owner);
    assert.deepEqual(replay.value, actual.value);
    for (const key of ['checkpoint', 'digest', 'dependencies']) assert.deepEqual(replay.snapshot[key], actual.snapshot[key]);
  } finally { session.close(); }
  assert(replayed.length >= 10);
  const physical = p.observations.map(sample => sample.physicalLocks.held.filter(lock => lock.name.startsWith('wallet-read-transport:v1:')));
  assert(physical.every(locks => locks.length <= 4));
  assert.deepEqual(gateway.capture(), authority); assert.deepEqual(lineage.validate(q.originalSource, q.buildFile), p.source);
  const files = [__filename, file, gateway.startedFile, lineage.qualificationFile,
    path.join(logs, '20261008-C110-single-ui-diagnostic-tools-prepared-01.json'),
    path.join(logs, '20261008-C109-current-staking-ui-diagnostic-02.json'),
    path.join(logs, '20261007-C43-staking-forms-live-lock-chrome-01.json')];
  const result = { passed: true, observedAt: new Date().toISOString(), source: p.source,
    scope: 'Actual single existing UI/current staking and balance success, exact originating page and complete cache value; offline exact-query original-body replay independently verifies full BCS/fold/last revalidation. No full root cause, three internal approvals, twelve pages, ordinary Chrome or parent acceptance.',
    singleExistingWalletUiObserved: true, actualRequestSourcePageId: selected,
    originalRequests: p.requests.length, originalFrames: p.frames.length, actualStakingSnapshot: actual.snapshot,
    actualStakingValue: actual.value, actualVisibleStakeFormObserved: true, actualFreshBalanceSucceeded: true,
    explicitOfflineOriginalBodyReplayRequests: replayed, completeReplayEqualsActualBrowserValue: true,
    productDeadlineUnchanged: true, physicalSlotMaximumObserved: Math.max(...physical.map(locks => locks.length)),
    duplicateReadCauseConfirmed: false, sustainedAvailabilityAccepted: false,
    fullCurrentInternalMatrixAccepted: false, fullCurrentCorePagesAccepted: false,
    parentAcceptance: false, trialReady: false, auditHTTPRequests: 0, auditProfilesOpened: 0,
    signatures: 0, executeRequests: 0, inputsSha256: Object.fromEntries(files.map(file => [file, sha(file)])) };
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ passed: true, actualStakingAndBalanceSucceeded: true,
    replayRequests: replayed.length, currentRootCauseConfirmed: false }));
}
main().catch(error => { console.error(JSON.stringify({ passed: false, errorType: error.name, message: String(error.message).slice(0,1000) })); process.exitCode = 1; });
