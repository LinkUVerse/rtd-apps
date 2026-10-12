// Independent original transaction/native ownership audit; never signs or executes.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { GrpcTypes } from 'rtd-typescript/grpc';
import { Transaction } from 'rtd-typescript/transactions';
import { verifyTransactionSignature } from 'rtd-typescript/verify';
import { deriveDynamicFieldID, toBase64 } from 'rtd-typescript/utils';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletExecutionReader } from '../src/shared/rpc/execution-reader';
import { WalletFullnodeReader } from '../src/shared/rpc/fullnode-reader';
import { exactBcs, KIOSK_BCS, KIOSK_ITEM_BCS } from '../src/shared/rpc/kiosk-reader';
import { originByteOwnerToken } from '../src/shared/rpc/originbyte-kiosk';

async function main() {
  const [profileFile, proofFile, output, retainedFixture] = process.argv.slice(2);
  assert(!existsSync(output));
  const read = (f: string) => JSON.parse(readFileSync(f, 'utf8'));
  const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');
  const p = read(proofFile);
  const fixture = p.fixture ?? retainedFixture;
  assert(typeof fixture === 'string' && fixture.includes('/dev-20261006-03/C37-ob-existing-execution-chrome-'));
  const buildFile = 'migrationToGRpcOrGraphQLDoc/workLog/20261006-default-generation-positive-C37-build-01.json';
  const build = read(buildFile);
  assert(build.passed && p.executeRequests === 1 && p.originalExecuteResponseCaptured);
  assert.deepEqual(p.source ?? p.execution?.source ?? read(join(fixture, 'attempt.json')).source, build.sourceAfter);
  for (const [f, h] of Object.entries(p.inputsSha256 ?? {})) assert.equal(sha(f), h);
  assert.equal(p.workerSource.workerSha256, build.artifacts['background.js']);
  for (const row of p.uiSource.loadedBundles) assert.equal(row.loadedSha256, build.artifacts[row.file]);
  const attemptFile = join(fixture, 'attempt.json');
  const wireFile = join(fixture, 'execute-wire-1.json');
  const responseFile = join(fixture, 'execute-response.json');
  const attempt = read(attemptFile), wire = read(wireFile), response = read(responseFile);
  assert.equal(attempt.approvalClicks, 1);
  assert.equal(attempt.route, 'originbyte-kiosk');
  assert.deepEqual(attempt.source, build.sourceAfter);
  function decode(value: string, T: any) {
    const raw = Buffer.from(value, 'base64');
    assert.equal(raw[0], 0);
    const n = raw.readUInt32BE(1);
    assert(raw.length >= 5 + n);
    if (raw.length > 5 + n) {
      const trailer = raw.subarray(5 + n);
      assert.equal(trailer[0], 128);
      assert.equal(trailer.length, 5 + trailer.readUInt32BE(1));
      assert.match(trailer.subarray(5).toString(), /(^|\r\n)grpc-status:[ \t]*0(\r\n|$)/);
    }
    return T.fromBinary(raw.subarray(5, 5 + n));
  }
  const request = decode(wire.requestBase64, GrpcTypes.ExecuteTransactionRequest);
  const result = decode(response.responseBase64, GrpcTypes.ExecuteTransactionResponse);
  assert.deepEqual(GrpcTypes.ExecuteTransactionRequest.toJson(request), wire.request);
  assert.deepEqual(GrpcTypes.ExecuteTransactionResponse.toJson(result), response.response);
  assert.equal(response.status, 200);
  assert.equal(result.transaction.digest, attempt.digest);
  assert.equal(toBase64(request.transaction.bcs.value), attempt.bytesBase64);
  assert.equal(request.signatures.length, 1);
  const profile = validateNetworkProfile(read(profileFile));
  assert.equal(profile.expectedGenesisDigest, 'BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4');
  const session = new WalletReadSession(profile);
  const execution = new WalletExecutionReader(session), fullnode = new WalletFullnodeReader(session);
  const original = globalThis.fetch, paths: string[] = [];
  globalThis.fetch = (input, init) => {
    const u = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(u.origin, 'http://127.0.0.1:41750');
    assert(['/GetServiceInfo', '/GetTransaction', '/GetObject'].some(s => u.pathname.endsWith(s)));
    paths.push(u.href);
    return original(input, init);
  };
  try {
    const receipt = await execution.lookup(attempt.digest), details = await execution.details(attempt.digest);
    assert(receipt?.success && receipt.checkpoint !== null && details);
    assert.equal(receipt.effectsBase64, response.response.transaction.effects.bcs.value);
    assert.equal(toBase64(details.transaction.bcs), attempt.bytesBase64);
    assert.equal(await Transaction.from(details.transaction.bcs).getDigest(), attempt.digest);
    assert.equal(details.transaction.signatures.length, 1);
    assert.equal(toBase64(request.signatures[0].bcs.value), details.transaction.signatures[0]);
    assert.equal((await verifyTransactionSignature(details.transaction.bcs, details.transaction.signatures[0])).toRtdAddress(), attempt.accountAddress);
    const tx = Transaction.from(details.transaction.bcs).getData();
    assert.equal(tx.sender, attempt.accountAddress);
    assert.equal(tx.gasData.owner, attempt.accountAddress);
    assert.deepEqual(tx.commands.map(c => c.$kind), ['MoveCall']);
    assert.equal(tx.commands[0].MoveCall!.package, profile.packages.originByte!.executionPackage);
    assert.equal(tx.commands[0].MoveCall!.module, 'ob_kiosk');
    assert.equal(tx.commands[0].MoveCall!.function, 'p2p_transfer');
    const seed = read('migrationToGRpcOrGraphQLDoc/workLog/20261006-default-generation-nft-fixtures-native-audit-01.json');
    const tokens = seed.operations.find((o:any) => o.stage === 'seed').createdObjects.filter((o:any) => o.type.endsWith('::ob_kiosk::OwnerToken'));
    const sourceToken = tokens.find((o:any) => o.owner.AddressOwner === attempt.accountAddress);
    const targetToken = tokens.find((o:any) => o.owner.AddressOwner === attempt.recipient);
    assert(sourceToken && targetToken);
    const source = await fullnode.object(sourceToken.kiosk), target = await fullnode.object(targetToken.kiosk);
    const sourceCap = await fullnode.object(sourceToken.objectId), targetCap = await fullnode.object(targetToken.objectId);
    assert(source && target && sourceCap && targetCap);
    assert.equal(originByteOwnerToken(sourceCap, attempt.accountAddress, profile.packages)!.kioskId, source.objectId);
    assert.equal(originByteOwnerToken(targetCap, attempt.recipient, profile.packages)!.kioskId, target.objectId);
    const sourceKiosk = exactBcs(KIOSK_BCS, source.content), targetKiosk = exactBcs(KIOSK_BCS, target.content);
    assert.equal(sourceKiosk.owner, attempt.accountAddress);assert.equal(targetKiosk.owner, attempt.recipient);
    assert.equal(sourceKiosk.item_count, 1);assert.equal(targetKiosk.item_count, 1);
    const wrapper = deriveDynamicFieldID(target.objectId, '0x2::dynamic_object_field::Wrapper<0x2::kiosk::Item>', KIOSK_ITEM_BCS.serialize({id:attempt.nftId}).toBytes());
    const calls = tx.commands[0].MoveCall!;
    const inputIds = calls.arguments.slice(0,2).map((a:any)=>{assert(a.$kind==='Input');return tx.inputs[a.Input].Object!.SharedObject!.objectId});
    assert.deepEqual(inputIds,[source.objectId,target.objectId]);
    const nft = await fullnode.object(attempt.nftId);
    assert(nft?.owner.$kind === 'ObjectOwner' && nft.owner.ObjectOwner === wrapper);
    const wholeBrowserPassed = p.passed === true;
    if (wholeBrowserPassed) {
      assert.equal(p.execution.approvalClicks, 1);
      const terminal = p.execution.terminal;
      assert.equal(terminal['journal-v2'].length, 1);
      assert.equal(terminal['journal-v2'][0].digest, attempt.digest);
      assert.equal(terminal['journal-v2'][0].state, 'confirmed-success');
      assert.equal(terminal['pending-scopes-v2'].length, 0);
      assert.equal(terminal['journal-v2'][0].receipt.effectsBase64, receipt.effectsBase64);
      assert.deepEqual(p.finalJournal, terminal);
    }
    const report = {
      passed: true, observedAt: new Date().toISOString(), source: build.sourceAfter,
      h0: profile.expectedGenesisDigest, generation: profile.generation,
      digest: attempt.digest, receipt, nftId: attempt.nftId,
      owner: attempt.accountAddress, recipient: attempt.recipient, currentNftOwner: nft.owner, sourceKiosk, targetKiosk, targetItemWrapper: wrapper, ownerTokensRetained: true,
      originalApprovedBcsUnchanged: true, signatureVerified: true, nativeEffectsMatch: true,
      originalExecuteGrpcStatusVerified: true, wholeBrowserPassed,
      strictJournalVerified: wholeBrowserPassed, actualBrowserExecuteRequests: 1,
      auditExecuteRequests: 0, auditSignatures: 0, auditSimulations: 0, paths,
      inputsSha256: Object.fromEntries([profileFile, proofFile, buildFile, resolve(process.argv[1]), attemptFile, wireFile, responseFile].map(f => [resolve(f), sha(f)])),
      scope: 'Original current C37 OriginByte existing-target NFT once approved and dispatched, exact signed BCS/effects and current native recipient ownership. Browser whole-run status kept separately; no audit writes, index catchup or other route/full parent acceptance.'
    };
    writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: true, digest: attempt.digest, checkpoint: receipt.checkpoint, wholeBrowserPassed }));
  } finally { session.close(); globalThis.fetch = original; }
}
main().catch(e => { console.error(String(e.message).slice(0, 500)); process.exitCode = 1; });
