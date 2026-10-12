import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { RtdGrpcClient } from 'rtd-typescript/grpc';
import { validateNetworkProfile } from '../src/shared/rpc/profile';

async function main() {
  const [output] = process.argv.slice(2); assert(output && !existsSync(output));
  const wallet = resolve(__dirname, '..'), root = resolve(wallet, '../..');
  const log = join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
  const rt = join(homedir(), '.local/state/rtd-wallet-migration/dev-20261006-03');
  const raw = join(rt, 'C41-account-ui-independent-native-20261007-02');
  assert(!existsSync(raw)); mkdirSync(raw, { mode: 0o700 });
  const read = (f: string) => JSON.parse(readFileSync(f, 'utf8'));
  const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');
  const names = ['20261007-C41-account-recipient-ui-02.json', '20261007-C41-account-sender-ui-02.json',
    '20261007-default-generation-positive-C41-build-01.json', '20261007-C41-budget-delta-audit-02.json',
    '20261007-C40-account-native-independent-audit-02.json', '20261007-C40-account-nonempty-production-02.json'];
  const files = names.map(n => join(log, n));
  const [recipient, sender, build, delta, native, production] = files.map(read);
  assert(files.every(f => read(f).passed));
  for (const proof of [recipient, sender, delta, native]) for (const [f, h] of Object.entries(proof.inputsSha256)) assert.equal(sha(f), h);
  for (const [file, digest] of Object.entries(build.artifacts)) assert.equal(sha(join(build.output, file)), digest);
  const old = join(homedir(), '.local/state/rtd-wallet-migration/dev-20261003-01/publication-foundation');
  const installedFile = join(old, 'message-budget-debug-install-20261006-01/installed-provenance.json');
  const debugFile = join(old, 'supported-publisher-capacity-20261006-03/plan.json');
  const installed = read(installedFile), pins = read(debugFile).eightDebug;
  assert(installed.passed);
  assert.equal(execFileSync('git', ['-C', join(root, 'rtd'), 'rev-parse', 'HEAD']).toString().trim(), installed.sourceHead);
  assert.equal(createHash('sha256').update(execFileSync('git', ['-C', join(root, 'rtd'), 'diff', '--binary', 'HEAD'])).digest('hex'), installed.sourceDiffSha256);
  for (const [file, digest] of Object.entries(pins)) assert.equal(sha(join(root, 'rtd/target/debug', file)), digest);
  const profileFile = join(rt, 'certified-positive-transport-release-20261006-01/profile.json');
  const profile = validateNetworkProfile(read(profileFile)), calls: any[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.origin, new URL(profile.endpoints.fullnodeGrpcWeb).origin);
    assert(['/GetCheckpoint', '/GetServiceInfo'].some(n => url.pathname.endsWith(n)));
    const response = await globalThis.fetch(input, init), body = new Uint8Array(await response.clone().arrayBuffer());
    const f = join(raw, `native-${calls.length}.bin`); writeFileSync(f, body, { flag: 'wx', mode: 0o600 });
    calls.push({ url: url.href, status: response.status, file: f, sha256: sha(f) }); assert.equal(response.status, 200);
    return response;
  };
  const client = new RtdGrpcClient({ network: profile.sdkNetwork, baseUrl: profile.endpoints.fullnodeGrpcWeb, format: 'binary', fetch, mvr: { url: '' } });
  const before = (await client.ledgerService.getServiceInfo({})).response;
  assert.equal(before.chainId, profile.expectedGenesisDigest);
  const windows = [];
  for (const proof of [sender, recipient]) {
    assert.equal(proof.checks.length, 9); assert.deepEqual(proof.source, build.sourceAfter);
    assert.equal(proof.h0, profile.expectedGenesisDigest); assert.equal(proof.executeRequests, 0);
    assert.equal(proof.simulations, 0); assert.equal(proof.signatures, 0);
    assert.deepEqual(proof.blocked, []); assert.deepEqual(proof.errors, []); assert.deepEqual(proof.captureErrors, []);
    assert.deepEqual(proof.encryptedBefore, proof.encryptedAfter); assert.deepEqual(proof.initialJournal, proof.finalJournal);
    for (const set of [proof.initialSources, proof.coldSources]) {
      assert.equal(set.workerSource.workerSha256, build.artifacts['background.js']);
      for (const bundle of set.uiSource.loadedBundles) assert(bundle.matchesDisk && bundle.loadedSha256 === build.artifacts[bundle.file]);
    }
    for (const c of proof.controlledCloseCaptures ?? []) assert(c.controlledColdClose && c.status === 200 && c.message === 'response.body: Target page, context or browser has been closed');
    const history = proof.historyObserver.data, expected = production.collections.find((c: any) => c.owner === history.address).history;
    assert.equal(history.address, proof.owner); assert.equal(history.checkpointLo, 0);
    assert.deepEqual(history.coverage, expected.coverage);
    assert(!history.coverage.registrationComplete && !history.coverage.allAccountActivityCertified && !history.coverage.allAccountTransfersCertified);
    const projection = (h: any) => h.transactions.map((t: any) => ({ digest: t.digest, checkpoint: t.checkpoint, sender: t.sender, status: t.status, origins: t.origins }));
    assert.deepEqual(projection(history), projection(expected));
    assert.deepEqual(history.transactions.map((t: any) => t.nativeTransaction), expected.transactions.map((t: any) => t.nativeTransaction));
    assert.equal(history.transactions.length, history.totalTransactions);
    assert.deepEqual(proof.activityCards.map((c: any) => new URLSearchParams(c.href.split('?')[1]).get('txdigest')), history.transactions.map((t: any) => t.digest));
    const checkpoint = (await client.ledgerService.getCheckpoint({ checkpointId: { oneofKind: 'sequenceNumber', sequenceNumber: BigInt(history.checkpointHi) }, readMask: { paths: ['sequence_number', 'digest'] } })).response.checkpoint;
    assert(checkpoint); assert.equal(Number(checkpoint.sequenceNumber), history.checkpointHi); assert.equal(checkpoint.digest, history.checkpointDigest);
    windows.push({ owner: history.address, lo: history.checkpointLo, hi: history.checkpointHi, digest: checkpoint.digest, transactions: history.totalTransactions });
  }
  const after = (await client.ledgerService.getServiceInfo({})).response;
  assert.equal(after.chainId, before.chainId); assert(after.checkpointHeight! >= before.checkpointHeight!);
  const report = { passed: true, observedAt: new Date().toISOString(), source: build.sourceAfter,
    actualUiChecks: 18, windows, calls, currentEightDebugVerified: true,
    prior22CanonicalNativeTransactionProofPreserved: native.passed, currentCanonicalKioskMovementAuthorityAccepted: false,
    simulations: 0, signatures: 0, executeRequests: 0, fullHistoryCertified: false, parentQA13Complete: false,
    inputsSha256: Object.fromEntries([__filename, ...files, installedFile, debugFile, profileFile].map(f => [f, sha(f)])),
    scope: 'Independent actual C41 UI/current and cold bundle hashes, two protected cipher/full journal invariance, all22/2 actual cards and six coverage flags, same original22 canonical transaction set and fresh two fullnode window digests/H0/eight debug. Kiosk transaction-relative ownership proof audit and full QA-A13 remain open.' };
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ passed: true, actualUiChecks: 18, windows, parentQA13Complete: false }));
}
main().catch(e => { console.error(JSON.stringify({ passed: false, errorType: e.name, message: String(e.message).slice(0, 500) })); process.exitCode = 1; });
