// Independent original framework transaction and current native ownership audit. No writes.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { GrpcTypes } from 'rtd-typescript/grpc';
import { Transaction } from 'rtd-typescript/transactions';
import { verifyTransactionSignature } from 'rtd-typescript/verify';
import { toBase64, normalizeStructTag } from 'rtd-typescript/utils';
import { bcs } from 'rtd-typescript/bcs';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletExecutionReader } from '../src/shared/rpc/execution-reader';
import { WalletFullnodeReader } from '../src/shared/rpc/fullnode-reader';
import { exactBcs, KIOSK_BCS, KIOSK_CAP_BCS, nativeKioskCap } from '../src/shared/rpc/kiosk-reader';

async function main() {
  const [profileFile, proofFile, output] = process.argv.slice(2);
  assert(output && !existsSync(output));
  const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
  const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
  const p = read(proofFile), fixture = p.fixture;
  assert(typeof fixture === 'string' && fixture.endsWith('/dev-20261006-03/framework-C40-single-execution-20261007-01'));
  const buildFile = resolve('migrationToGRpcOrGraphQLDoc/workLog/20261007-default-generation-positive-C40-build-01.json');
  const oracleFile = resolve('migrationToGRpcOrGraphQLDoc/workLog/20261007-framework-nonempty-native-audit-01.json');
  const build = read(buildFile), oracle = read(oracleFile);
  assert(build.passed && oracle.passed && p.executeRequests === 1 && p.originalExecuteResponseCaptured);
  for (const [file, hash] of Object.entries(p.inputsSha256 ?? {})) assert.equal(sha(file), hash);
  for (const [file, hash] of Object.entries(build.artifacts)) assert.equal(sha(join(build.output, file)), hash);
  assert.equal(p.workerSource.workerSha256, build.artifacts['background.js']);
  for (const row of p.uiSource.loadedBundles) assert.equal(row.loadedSha256, build.artifacts[row.file]);
  assert.equal(p.snapshotAdmission.ready, true);
  assert.equal(sha(p.snapshotProofFile), p.snapshotProofSha256);
  const witness = read(p.snapshotProofFile);
  assert(witness.passed && witness.finiteReadonlyObservation === false
    && witness.catchupAccepted && witness.ownershipSuccessorAccepted);
  assert.equal(witness.kioskId, oracle.kioskId);
  const attemptFile = join(fixture, 'attempt.json'), wireFile = join(fixture, 'execute-wire-1.json');
  const responseFile = join(fixture, 'execute-response.json');
  const attempt = read(attemptFile), wire = read(wireFile), response = read(responseFile);
  assert.deepEqual(readdirSync(fixture).filter(f => /^execute-wire-\d+\.json$/.test(f)), ['execute-wire-1.json']);
  assert.equal(attempt.approvalClicks, 1);
  assert.equal(attempt.route, 'framework-kiosk');
  assert.equal(attempt.nftId, oracle.nftId);
  assert.equal(attempt.accountAddress, oracle.sender);
  assert.notEqual(attempt.recipient, attempt.accountAddress);
  assert.deepEqual(attempt.source, build.sourceAfter);
  function frame(encoded: string, T: any, trailers: boolean) {
    const raw = Buffer.from(encoded, 'base64');
    assert(raw.length >= 5 && raw[0] === 0);
    const n = raw.readUInt32BE(1);
    assert(raw.length >= 5 + n);
    if (trailers) {
      const tail = raw.subarray(5 + n);
      assert(tail.length >= 5 && tail[0] === 128 && tail.length === 5 + tail.readUInt32BE(1));
      assert.match(tail.subarray(5).toString(), /(^|\r\n)grpc-status:[ \t]*0(\r\n|$)/);
    } else assert.equal(raw.length, 5 + n);
    return T.fromBinary(raw.subarray(5, 5 + n));
  }
  const request = frame(wire.requestBase64, GrpcTypes.ExecuteTransactionRequest, false);
  const responseMessage = frame(response.responseBase64, GrpcTypes.ExecuteTransactionResponse, true);
  assert.deepEqual(GrpcTypes.ExecuteTransactionRequest.toJson(request), wire.request);
  assert.deepEqual(GrpcTypes.ExecuteTransactionResponse.toJson(responseMessage), response.response);
  assert.equal(response.status, 200);
  assert.equal(responseMessage.transaction.digest, attempt.digest);
  assert.equal(toBase64(request.transaction.bcs.value), attempt.bytesBase64);
  assert.equal(request.signatures.length, 1);
  const profile = validateNetworkProfile(read(profileFile));
  assert.equal(profile.expectedGenesisDigest, oracle.h0);
  assert.equal(profile.generation, oracle.generation);
  const session = new WalletReadSession(profile);
  const originalFetch = globalThis.fetch, paths: string[] = [];
  let stage = 'original transaction and native receipt';
  let report: Record<string, unknown> = { passed: false };
  globalThis.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.origin, 'http://127.0.0.1:41750');
    assert(['/GetServiceInfo', '/GetTransaction', '/GetObject'].some(s => url.pathname.endsWith(s)));
    assert(!String(init?.body).includes('"jsonrpc"'));
    paths.push(url.href);
    return originalFetch(input, init);
  };
  try {
    const execution = new WalletExecutionReader(session), fullnode = new WalletFullnodeReader(session);
    const receipt = await execution.lookup(attempt.digest), details = await execution.details(attempt.digest);
    assert(receipt?.success && receipt.checkpoint !== null && details);
    assert.equal(receipt.effectsBase64, response.response.transaction.effects.bcs.value);
    assert.equal(toBase64(details.transaction.bcs), attempt.bytesBase64);
    assert.equal(await Transaction.from(details.transaction.bcs).getDigest(), attempt.digest);
    assert.equal(details.transaction.signatures.length, 1);
    assert.equal(details.transaction.signatures[0], toBase64(request.signatures[0].bcs.value));
    assert.equal((await verifyTransactionSignature(details.transaction.bcs, details.transaction.signatures[0])).toRtdAddress(), attempt.accountAddress);
    const data = Transaction.from(details.transaction.bcs).getData();
    assert.equal(data.sender, attempt.accountAddress);
    assert.equal(data.gasData.owner, attempt.accountAddress);
    assert.deepEqual(data.commands.map(c => c.$kind), ['MoveCall', 'TransferObjects']);
    const take = data.commands[0].MoveCall!;
    assert.equal(take.package, profile.packages.kiosk);
    assert.equal(take.module, 'kiosk');
    assert.equal(take.function, 'take');
    assert.deepEqual(take.typeArguments.map(normalizeStructTag), [normalizeStructTag(oracle.nftType)]);
    const [kioskArg, capArg, itemArg] = take.arguments;
    assert(kioskArg.$kind === 'Input' && capArg.$kind === 'Input' && itemArg.$kind === 'Input');
    assert.equal(data.inputs[kioskArg.Input].Object!.SharedObject!.objectId, oracle.kioskId);
    assert.equal(data.inputs[capArg.Input].Object!.ImmOrOwnedObject!.objectId, oracle.capId);
    assert.equal(bcs.Address.parse(Buffer.from(data.inputs[itemArg.Input].Pure!.bytes, 'base64')), oracle.nftId);
    stage = 'current empty framework and recipient ownership';
    const kiosk = await fullnode.object(oracle.kioskId), cap = await fullnode.object(oracle.capId);
    const nft = await fullnode.object(oracle.nftId), wrapper = await fullnode.object(oracle.wrapperId);
    assert(kiosk && cap && nft && wrapper === null);
    const decodedKiosk = exactBcs(KIOSK_BCS, kiosk.content);
    assert.equal(decodedKiosk.item_count, 0);
    assert.equal(decodedKiosk.owner, attempt.accountAddress);
    assert(kiosk.owner.$kind === 'Shared');
    const decodedCap = nativeKioskCap(cap, profile.packages);
    assert(decodedCap && !decodedCap.isPersonal && decodedCap.kioskId === oracle.kioskId);
    assert(cap.owner.$kind === 'AddressOwner' && cap.owner.AddressOwner === attempt.accountAddress);
    assert.deepEqual(exactBcs(KIOSK_CAP_BCS, cap.content), { id: oracle.capId, for: oracle.kioskId });
    assert(nft.owner.$kind === 'AddressOwner' && nft.owner.AddressOwner === attempt.recipient);
    assert.equal(nft.type, normalizeStructTag(oracle.nftType));
    assert.equal(nft.previousTransaction, attempt.digest);
    assert(BigInt(nft.version) > BigInt(p.beforeObject.version));
    assert.notEqual(nft.digest, p.beforeObject.digest);
    const wholeBrowserPassed = p.passed === true;
    if (wholeBrowserPassed) {
      assert.equal(p.execution.approvalClicks, 1);
      assert.equal(p.execution.executeRequests, 1);
      const terminal = p.execution.terminal;
      assert.equal(terminal['journal-v2'].length, 1);
      assert.equal(terminal['journal-v2'][0].digest, attempt.digest);
      assert.equal(terminal['journal-v2'][0].state, 'confirmed-success');
      assert.equal(terminal['journal-v2'][0].receipt.effectsBase64, receipt.effectsBase64);
      assert.equal(terminal['pending-scopes-v2'].length, 0);
      assert.deepEqual(p.finalJournal, terminal);
    }
    report = { passed: true, observedAt: new Date().toISOString(), source: build.sourceAfter,
      h0: profile.expectedGenesisDigest, generation: profile.generation, digest: attempt.digest,
      receipt, owner: attempt.accountAddress, recipient: attempt.recipient, nftId: nft.objectId,
      currentNftOwner: nft.owner, currentNftVersion: nft.version, currentNftDigest: nft.digest,
      sourceKiosk: decodedKiosk, originalCapId: cap.objectId, originalCapOwner: cap.owner,
      itemWrapperDeleted: true, originalApprovedBcsUnchanged: true, signatureVerified: true,
      originalExecuteGrpcStatusVerified: true, nativeEffectsMatch: true, wholeBrowserPassed,
      strictJournalVerified: wholeBrowserPassed, actualBrowserExecuteRequests: 1,
      auditExecuteRequests: 0, auditSignatures: 0, auditSimulations: 0, paths,
      inputsSha256: Object.fromEntries([profileFile, proofFile, buildFile, oracleFile, resolve(process.argv[1]),
        attemptFile, wireFile, responseFile, p.snapshotProofFile].map(f => [resolve(f), sha(f)])),
      scope: 'Original current C40 one framework take/transfer approval and dispatch: signed bytes/signature/native '
        + 'receipt/effects, current controlled recipient NFT ownership, empty shared source Kiosk, original cap held '
        + 'and item wrapper absent. UI whole-run and terminal journal checked separately. '
        + 'No audit writes, indexed write-after-read, pending competition or full parent acceptance.' };
  } catch (error: any) {
    report = { passed: false, observedAt: new Date().toISOString(), stage, errorType: error.name,
      message: String(error.message).slice(0, 500), auditExecuteRequests: 0, auditSignatures: 0, auditSimulations: 0, paths };
    process.exitCode = 1;
  } finally {
    session.close(); globalThis.fetch = originalFetch;
    writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: report.passed, digest: report.digest,
      checkpoint: (report.receipt as any)?.checkpoint, wholeBrowserPassed: report.wholeBrowserPassed }));
  }
}
main().catch(error => { console.error(JSON.stringify({ passed: false, errorType: error.name })); process.exitCode = 1; });
