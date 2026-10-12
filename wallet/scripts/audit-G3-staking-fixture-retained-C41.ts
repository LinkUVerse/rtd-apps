// Independently read the one original G3 stake. Never approve, sign or execute.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { GrpcTypes, RtdGrpcClient } from 'rtd-typescript/grpc';
import { Transaction } from 'rtd-typescript/transactions';
import { verifyTransactionSignature } from 'rtd-typescript/verify';
import { toBase64, toBase58, normalizeStructTag, RTD_TYPE_ARG } from 'rtd-typescript/utils';
import { bcs } from 'rtd-typescript/bcs';
import { blake2b } from '@noble/hashes/blake2.js';
import { receiptStakeEvents } from 'rtd-apps-core/src/rpc/transaction-view';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletExecutionReader } from '../src/shared/rpc/execution-reader';
import { WalletFullnodeReader } from '../src/shared/rpc/fullnode-reader';
import { STAKED_RTD_BCS, stakingBcs } from '../src/shared/rpc/staking-bcs';

async function main() {
  const [profileFile, proofFile, output] = process.argv.slice(2);
  assert(output && !existsSync(output));
  const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
  const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
  const p = read(proofFile), fixture = p.fixture;
  assert(fixture.endsWith('/dev-20261006-03/current-G3-staking-fixture-20261007-01'));
  const logs = resolve('migrationToGRpcOrGraphQLDoc/workLog');
  const buildFile = join(logs, '20261007-default-generation-positive-C41-build-01.json');
  const preflightFile = join(logs, '20261007-C42-staking-preflight-01.json');
  const deltaFile = join(logs, '20261007-C42-draft-delta-audit-01.json');
  const build = read(buildFile), preflight = read(preflightFile), delta = read(deltaFile);
  assert(build.passed && preflight.passed && delta.passed && !preflight.withdrawalFixtureAvailable);
  assert(p.passed && p.execution.passed && p.originalExecuteResponseCaptured);
  assert.equal(p.executeRequests, 1); assert.equal(p.signatures, 1);
  assert.equal(p.errors.length, 0); assert.equal(p.forbidden.length, 0);
  for (const [f, h] of Object.entries(p.inputsSha256)) assert.equal(sha(f), h);
  for (const [f, h] of Object.entries(build.artifacts)) assert.equal(sha(join(build.output, f)), h);
  assert.equal(p.workerSource.workerSha256, build.artifacts['background.js']);
  for (const row of p.uiSource.loadedBundles) assert.equal(row.loadedSha256, build.artifacts[row.file]);
  assert.deepEqual(p.currentProductSource, preflight.source);
  const files = ['attempt.json', 'execute-wire.json', 'execute-response.json', 'confirmed.json'].map(f => join(fixture, f));
  const [attempt, wire, response, confirmed] = files.map(read);
  assert.deepEqual(attempt.source, build.sourceAfter); assert.equal(attempt.approvalClicks, 1);
  assert.equal(attempt.accountAddress, p.owner); assert.equal(attempt.atomicAmount, '1000000000');
  assert.equal(attempt.stakeId, null); assert.equal(wire.digest, attempt.digest);
  function frame(encoded: string, type: any, trailer: boolean) {
    const raw = Buffer.from(encoded, 'base64'); assert(raw.length > 5 && raw[0] === 0);
    const n = raw.readUInt32BE(1); assert(n > 0 && n + 5 <= raw.length);
    if (trailer) {
      const tail = raw.subarray(5 + n); assert(tail.length >= 5 && tail[0] === 128);
      assert.equal(tail.length, 5 + tail.readUInt32BE(1));
      assert.match(tail.subarray(5).toString('ascii'), /(^|\r\n)grpc-status:\s*0\r\n/);
    } else assert.equal(raw.length, n + 5);
    return type.fromBinary(raw.subarray(5, 5 + n));
  }
  const request = frame(wire.requestBase64, GrpcTypes.ExecuteTransactionRequest, false);
  const result = frame(response.responseBase64, GrpcTypes.ExecuteTransactionResponse, true);
  assert.deepEqual(GrpcTypes.ExecuteTransactionRequest.toJson(request), wire.request);
  assert.deepEqual(GrpcTypes.ExecuteTransactionResponse.toJson(result), response.response);
  assert.equal(response.status, 200); assert.equal(result.transaction.digest, attempt.digest);
  assert.equal(toBase64(request.transaction.bcs.value), attempt.bytesBase64); assert.equal(request.signatures.length, 1);
  assert.equal(p.simulations.length, 4); assert.equal(p.actualSimulationRequests, 4);
  for (const row of p.simulations) {
    assert.equal(row.status, 200);
    const req = frame(row.requestBase64, GrpcTypes.SimulateTransactionRequest, false);
    const res = frame(row.responseBase64, GrpcTypes.SimulateTransactionResponse, true);
    assert.deepEqual(GrpcTypes.SimulateTransactionRequest.toJson(req), row.request);
    assert.deepEqual(GrpcTypes.SimulateTransactionResponse.toJson(res), row.response);
    assert.equal(row.request.checks, 'ENABLED'); assert.equal(row.response.transaction.effects.status.success, true);
  }
  const finalSimulations = p.simulations.filter((r: any) => !r.request.doGasSelection);
  assert.equal(finalSimulations.length, 3);
  for (const row of finalSimulations) assert.equal(row.request.transaction.bcs.value, attempt.bytesBase64);
  assert(p.simulations[0].request.doGasSelection);
  const profile = validateNetworkProfile(read(profileFile));
  assert.equal(profile.expectedGenesisDigest, preflight.h0); assert.equal(profile.generation, 'dev-20261006-03');
  const session = new WalletReadSession(profile), originalFetch = globalThis.fetch;
  const frames: any[] = []; let stage = 'fresh original transaction'; let report: any;
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.origin, 'http://127.0.0.1:41750');
    assert(['/GetServiceInfo', '/GetTransaction', '/GetObject', '/GetBalance', '/GetCheckpoint'].some(s => url.pathname.endsWith(s)));
    const response = await originalFetch(input, init), bytes = Buffer.from(await response.clone().arrayBuffer());
    const req = Buffer.from((init?.body ?? []) as any);
    assert(bytes.length <= 8 * 1024 * 1024 && response.status === 200);
    frames.push({ url: url.href, status: response.status, requestBase64: req.toString('base64'), responseBase64: bytes.toString('base64') });
    return response;
  };
  try {
    const execution = new WalletExecutionReader(session), native = new WalletFullnodeReader(session);
    const receipt = await execution.lookup(attempt.digest), details = await execution.details(attempt.digest);
    assert(receipt?.success && receipt.checkpoint !== null && details);
    assert.equal(receipt.effectsBase64, response.response.transaction.effects.bcs.value);
    assert.equal(toBase64(details.transaction.bcs), attempt.bytesBase64);
    assert.equal(await Transaction.from(details.transaction.bcs).getDigest(), attempt.digest);
    const canonical = bcs.TransactionData.parse(details.transaction.bcs);
    assert.equal(toBase64(bcs.TransactionData.serialize(canonical).toBytes()), attempt.bytesBase64);
    const effects = bcs.TransactionEffects.parse(Buffer.from(receipt.effectsBase64, 'base64'));
    assert.equal(toBase64(bcs.TransactionEffects.serialize(effects).toBytes()), receipt.effectsBase64);
    assert.equal(effects[effects.$kind].transactionDigest, attempt.digest);
    assert.equal(details.transaction.signatures.length, 1);
    assert.equal(details.transaction.signatures[0], toBase64(request.signatures[0].bcs.value));
    assert.equal((await verifyTransactionSignature(details.transaction.bcs, details.transaction.signatures[0])).toRtdAddress(), p.owner);
    const data = Transaction.from(details.transaction.bcs).getData();
    assert.equal(data.sender, p.owner); assert.equal(data.gasData.owner, p.owner);
    assert.deepEqual(data.commands.map(c => c.$kind), ['SplitCoins', 'MoveCall']);
    const call = data.commands[1].MoveCall!;
    assert.equal(call.package, '0x' + '0'.repeat(63) + '3'); assert.equal(call.module, 'rtd_system');
    assert.equal(call.function, 'request_add_stake'); assert.deepEqual(call.typeArguments, []);
    assert.equal(call.arguments.length, 3);
    const system = data.inputs[call.arguments[0].Input!].Object!.SharedObject!;
    assert.equal(system.objectId, '0x' + '0'.repeat(63) + '5'); assert.equal(system.initialSharedVersion, '1'); assert(system.mutable);
    assert.equal(call.arguments[1].$kind, 'NestedResult'); assert.deepEqual(call.arguments[1].NestedResult, [0, 0]);
    const split = data.commands[0].SplitCoins!;
    assert.equal(split.coin.$kind, 'GasCoin'); assert.equal(split.amounts.length, 1);
    assert.equal(bcs.u64().parse(Buffer.from(data.inputs[split.amounts[0].Input!].Pure!.bytes, 'base64')), attempt.atomicAmount);
    assert.equal(bcs.Address.parse(Buffer.from(data.inputs[call.arguments[2].Input!].Pure!.bytes, 'base64')), attempt.validator);
    assert(data.expiration.Validity); assert.equal(data.expiration.Validity.minEpoch, preflight.senderDomain.value.epoch);
    assert.equal(data.expiration.Validity.chain, profile.expectedGenesisDigest);
    assert.equal(BigInt(data.expiration.Validity.maxEpoch!), BigInt(data.expiration.Validity.minEpoch!) + 1n);
    assert.deepEqual(data.expiration.Validity.allowedProposers, { epoch: preflight.senderDomain.value.epoch, proposers: [0] });
    assert(p.approvalText.includes(attempt.digest) && p.approvalText.includes(attempt.validator));
    const events = receiptStakeEvents(details.transaction, p.owner); assert.equal(events.length, 1);
    const event = events[0]; assert.equal(event.kind, 'stake'); if (event.kind !== 'stake') throw Error('stake event');
    assert.equal(event.amount, attempt.atomicAmount); assert.equal(event.validatorAddress, attempt.validator);
    assert.equal(event.poolId, preflight.senderDomain.value.validators.find((v: any) => v.address === attempt.validator).poolId);
    stage = 'actual newly created canonical position'; let newStake: any = null;
    for (const change of details.transaction.effects.changedObjects.filter(c => c.outputState === 'ObjectWrite' && c.outputOwner?.AddressOwner === p.owner)) {
      const obj = await native.object(change.objectId);
      if (obj?.type !== normalizeStructTag('0x3::staking_pool::StakedRtd')) continue;
      assert(!newStake); const decoded = stakingBcs(STAKED_RTD_BCS, obj.content);
      assert.equal(decoded.id, obj.objectId); assert.equal(decoded.principal.value, attempt.atomicAmount);
      assert.equal(decoded.pool_id, event.poolId); assert.equal(BigInt(decoded.stake_activation_epoch), BigInt(event.epoch) + 1n);
      assert.equal(obj.previousTransaction, attempt.digest);
      assert(obj.owner.$kind === 'AddressOwner' && obj.owner.AddressOwner === p.owner);
      assert(!preflight.controlledOwners.flatMap((r: any) => r.positions).some((s: any) => s.objectId === obj.objectId));
      newStake = { objectId: obj.objectId, version: obj.version, digest: obj.digest, owner: obj.owner, decoded, objectBcsBase64: toBase64(obj.objectBcs) };
    }
    assert(newStake);
    stage = 'checkpoint membership and exact net balance';
    const client = new RtdGrpcClient({ network: profile.sdkNetwork, baseUrl: profile.endpoints.fullnodeGrpcWeb, format: 'binary', fetch: globalThis.fetch, mvr: { url: '' } });
    const cp = (await client.ledgerService.getCheckpoint({ checkpointId: { oneofKind: 'sequenceNumber', sequenceNumber: BigInt(receipt.checkpoint) }, readMask: { paths: ['sequence_number', 'digest', 'summary', 'contents'] } }, { timeout: 20000 })).response.checkpoint!;
    assert.equal(String(cp.sequenceNumber), String(receipt.checkpoint));
    const typedHash = (name: string, bytes: Uint8Array) => toBase58(blake2b(Buffer.concat([Buffer.from(name + '::'), Buffer.from(bytes)]), { dkLen: 32 }));
    assert.equal(typedHash('CheckpointSummary', cp.summary!.bcs!.value!), cp.digest);
    assert.equal(typedHash('CheckpointContents', cp.contents!.bcs!.value!), cp.contents!.digest);
    assert.equal(cp.summary!.contentDigest, cp.contents!.digest);
    const digestCodec = bcs.byteVector().transform({ input: () => { throw Error('read-only'); }, output: (v: number[]) => { assert.equal(v.length, 32); return toBase58(Uint8Array.from(v)); } });
    const pair = bcs.struct('ExecutionDigests', { transaction: digestCodec, effects: digestCodec }), sig = bcs.byteVector();
    const contentsCodec = bcs.enum('CheckpointContents', {
      V1: bcs.struct('V1', { transactions: bcs.vector(pair), user_signatures: bcs.vector(bcs.vector(sig)) }),
      V2: bcs.struct('V2', { transactions: bcs.vector(bcs.struct('Entry', { digest: pair, user_signatures: bcs.vector(bcs.tuple([sig, bcs.option(bcs.u64())])) })) }),
    });
    const parsed = contentsCodec.parse(cp.contents!.bcs!.value!);
    const ordered = parsed.$kind === 'V1' ? parsed.V1.transactions : parsed.V2.transactions.map(t => t.digest);
    assert.deepEqual(ordered, cp.contents!.transactions.map(t => ({ transaction: t.transaction, effects: t.effects })));
    const matches = ordered.filter(t => t.transaction === attempt.digest); assert.equal(matches.length, 1);
    assert.equal(matches[0].effects, typedHash('TransactionEffects', Buffer.from(receipt.effectsBase64, 'base64')));
    const gas = details.transaction.effects.gasUsed;
    const cost = BigInt(gas.computationCost) + BigInt(gas.storageCost) - BigInt(gas.storageRebate);
    const net = details.transaction.balanceChanges.filter(c => c.address === p.owner && normalizeStructTag(c.coinType) === normalizeStructTag(RTD_TYPE_ARG)).reduce((sum, c) => sum + BigInt(c.amount), 0n);
    assert.equal(net, -BigInt(attempt.atomicAmount) - cost);
    const after = await native.balance(p.owner, RTD_TYPE_ARG); assert.equal(BigInt(after.balance) - BigInt(attempt.balanceBefore.balance), net);
    stage = 'original whole journal and normal relock';
    for (const k of ['journal-v2', 'pending-scopes-v2', 'metadata-v2']) assert.deepEqual(p.beforeJournal[k], []);
    assert.deepEqual(p.afterJournal, p.execution.terminal); assert.deepEqual(confirmed.terminal, p.afterJournal);
    assert(confirmed.passed && confirmed.digest === attempt.digest && confirmed.executeRequests === 1);
    assert.equal(p.afterJournal['journal-v2'].length, 1); assert.equal(p.afterJournal['pending-scopes-v2'].length, 0); assert.equal(p.afterJournal['metadata-v2'].length, 0);
    const journal = p.afterJournal['journal-v2'][0]; assert.equal(journal.state, 'confirmed-success'); assert.equal(journal.digest, attempt.digest);
    assert.equal(journal.chainId, profile.expectedGenesisDigest); assert.equal(journal.generation, profile.generation);
    assert.equal(journal.accountId, attempt.accountId); assert.equal(journal.accountAddress, p.owner);
    assert.equal(journal.receipt.effectsBase64, receipt.effectsBase64);
    assert(p.checks.some((c: any) => c.label === 'controlled account normally relocked' && c.passed));
    assert(p.execution.actualReceiptRoute.includes(attempt.digest));
    report = { passed: true, observedAt: new Date().toISOString(), owner: p.owner, h0: profile.expectedGenesisDigest, generation: profile.generation,
      retainedSource: build.sourceAfter, currentProductSource: preflight.source, digest: attempt.digest, receipt, event, newStake,
      checkpoint: { sequenceNumber: String(cp.sequenceNumber), digest: cp.digest, contentsDigest: cp.contents!.digest, ordinal: ordered.findIndex(t => t.transaction === attempt.digest), typedHashesAndMembershipVerified: true },
      data, netBalanceChange: net.toString(), gasCost: cost.toString(), balanceBefore: attempt.balanceBefore, balanceAfter: after,
      originalApprovedBcsUnchanged: true, signatureVerified: true, nativeEffectsMatch: true, simulationFramesVerified: 4, canonicalFinalSimulations: 3,
      originalJournalVerified: true, normallyRelocked: true, actualBrowserExecuteRequests: 1, auditExecuteRequests: 0, auditSimulations: 0, auditSignatures: 0,
      currentC42BrowserAccepted: false, indexedPositionAccepted: false, frames,
      inputsSha256: Object.fromEntries([profileFile, proofFile, buildFile, preflightFile, deltaFile, resolve(process.argv[1]), ...files].map(f => [resolve(f), sha(f)])),
      scope: 'One retained C41 normal controlled new-chain fixture: original binary request/response and four simulations, exact canonical final bytes and signature, native transaction/effects/event/new stake, checkpoint membership and exact gas-adjusted balance; complete terminal journal and normal relock. C42 only has unaffected staking emitted leaves. No audit write, current C42 UI claim, indexed stake admission, redeem or parent completion.' };
  } catch (error: any) {
    report = { passed: false, observedAt: new Date().toISOString(), stage, errorType: error.name, message: String(error.message).slice(0, 600), frames,
      auditExecuteRequests: 0, auditSimulations: 0, auditSignatures: 0 }; process.exitCode = 1;
  } finally {
    session.close(); globalThis.fetch = originalFetch;
    writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: report.passed, stage: report.stage, digest: report.digest, checkpoint: report.receipt?.checkpoint, stakeId: report.newStake?.objectId, frames: frames.length }));
  }
}
main().catch(error => { console.error(JSON.stringify({ passed: false, errorType: error.name, message: String(error.message).slice(0, 400) })); process.exitCode = 1; });
