// Offline whole-frame, canonical object/effects/final withdrawal audit. No network or signing.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { GrpcTypes } = require('rtd-typescript/grpc');
const { Transaction } = require('rtd-typescript/transactions');
const { bcs } = require('rtd-typescript/bcs');
const { toBase64, toBase58 } = require('rtd-typescript/utils');
const { blake2b } = require('@noble/hashes/blake2.js');
const read = file => JSON.parse(fs.readFileSync(file));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const typed = (name, bytes) => toBase58(blake2b(Buffer.concat([Buffer.from(name + '::'), Buffer.from(bytes)]), { dkLen: 32 }));
function frame(encoded, type, response) {
  const raw = Buffer.from(encoded, 'base64');
  assert(raw.length >= 5 && raw[0] === 0);
  const length = raw.readUInt32BE(1), end = length + 5;
  assert(end <= raw.length);
  if (response) {
    assert.equal(raw[end], 128);
    const tail = raw.readUInt32BE(end + 1);
    assert.equal(end + 5 + tail, raw.length);
    assert(/(?:^|\r\n)grpc-status:\s*0\r\n/i.test(raw.subarray(end + 5).toString('ascii')));
  } else assert.equal(end, raw.length);
  return type.fromBinary(raw.subarray(5, end));
}
(async () => {
  const [proofFile, output] = process.argv.slice(2);
  assert(output && !fs.existsSync(output));
  const proof = read(proofFile);
  assert(proof.passed && proof.signatures === 0 && proof.executeRequests === 0 && proof.browserLaunches === 0);
  assert(!proof.indexedStakeAccepted && !proof.withdrawalExecuted && !proof.rewardsPaid);
  for (const [file, digest] of Object.entries(proof.inputsSha256)) assert.equal(sha(file), digest);
  const rows = proof.frames.map(row => {
    const url = new URL(row.url), method = url.pathname.split('/').pop();
    assert.equal(url.origin, 'http://127.0.0.1:41750'); assert.equal(row.status, 200);
    assert(/^(GetServiceInfo|GetObject|GetCheckpoint|GetBalance|GetCoinInfo|GetDatatype|GetFunction|GetPackage|ListOwnedObjects|SimulateTransaction)$/.test(method));
    assert(GrpcTypes[method + 'Request'] && GrpcTypes[method + 'Response']);
    return { ...row, method, request: frame(row.requestBase64, GrpcTypes[method + 'Request'], false), response: frame(row.responseBase64, GrpcTypes[method + 'Response'], true) };
  });
  const infos = rows.filter(row => row.method === 'GetServiceInfo');
  assert(infos.length >= 2);
  assert(infos.every(row => row.response.chainId === proof.h0));
  assert(infos.every((row, index) => !index || row.response.checkpointHeight >= infos[index - 1].response.checkpointHeight));
  const objects = rows.filter(row => row.method === 'GetObject');
  for (const row of objects) {
    const raw = row.response.object; assert(raw?.bcs?.value);
    assert.equal(raw.objectId, row.request.objectId);
    const parsed = bcs.Object.parse(raw.bcs.value);
    assert.equal(toBase64(bcs.Object.serialize(parsed).toBytes()), toBase64(raw.bcs.value));
    assert.equal(typed('Object', raw.bcs.value), raw.digest);
    assert.equal(parsed.previousTransaction, raw.previousTransaction);
    assert.equal(parsed.data.Move.version, String(raw.version));
  }
  const stakes = objects.filter(row => row.request.objectId === proof.stakeId);
  assert(stakes.length >= 3);
  assert(stakes.every(row => toBase64(row.response.object.bcs.value) === proof.nativeBefore.stake.objectBcsBase64));
  assert(stakes.some(row => row.phase === 'native-before') && stakes.some(row => row.phase === 'native-after'));
  const stake = bcs.Object.parse(Buffer.from(proof.nativeBefore.stake.objectBcsBase64, 'base64'));
  assert.deepEqual(stake.owner, { AddressOwner: proof.owner, $kind: 'AddressOwner' });
  assert.equal(stake.previousTransaction, proof.originalStakeDigest);
  const balances = rows.filter(row => row.method === 'GetBalance');
  assert.equal(balances.length, 2);
  assert.deepEqual(GrpcTypes.GetBalanceResponse.toJson(balances[0].response), GrpcTypes.GetBalanceResponse.toJson(balances[1].response));
  assert.equal(String(balances[0].response.balance.balance), proof.nativeBefore.balance.balance);
  const prepared = proof.prepared, data = Transaction.from(prepared.bytesBase64).getData();
  assert.equal(await Transaction.from(prepared.bytesBase64).getDigest(), prepared.digest);
  const canonical = bcs.TransactionData.parse(Buffer.from(prepared.bytesBase64, 'base64'));
  assert.equal(toBase64(bcs.TransactionData.serialize(canonical).toBytes()), prepared.bytesBase64);
  assert.equal(prepared.sender, proof.owner); assert.equal(data.sender, proof.owner);
  assert.equal(data.gasData.owner, proof.owner); assert.equal(data.gasData.budget, prepared.gasBudget);
  assert.equal(data.gasData.price, prepared.gasPrice); assert.equal(prepared.gasPaymentKind, 'coins');
  assert.equal(prepared.withdrawal.principal, '1000000000');
  assert(data.expiration.Validity && data.expiration.Validity.chain === proof.h0);
  assert(BigInt(data.expiration.Validity.minEpoch) <= BigInt(data.expiration.Validity.maxEpoch));
  assert.equal(data.commands.length, 1);
  const call = data.commands[0].MoveCall;
  assert.equal(call.package, '0x' + '0'.repeat(63) + '3');
  assert.equal(call.module, 'rtd_system'); assert.equal(call.function, 'request_withdraw_stake');
  assert.deepEqual(call.typeArguments, []); assert.equal(call.arguments.length, 2);
  const systemRef = data.inputs[call.arguments[0].Input].Object.SharedObject;
  const stakeRef = data.inputs[call.arguments[1].Input].Object.ImmOrOwnedObject;
  assert.deepEqual(systemRef, { objectId: '0x' + '0'.repeat(63) + '5', initialSharedVersion: '1', mutable: true });
  assert.deepEqual(stakeRef, { objectId: proof.stakeId, version: proof.nativeBefore.stake.version, digest: proof.nativeBefore.stake.digest });
  const simulations = rows.filter(row => row.method === 'SimulateTransaction');
  assert.equal(simulations.length, 4); assert.equal(proof.actualSimulationRequests, 4);
  assert.deepEqual(simulations.map(row => row.phase), ['withdraw-prepare', 'withdraw-prepare', 'withdraw-revalidate', 'changed-gas-stale-digest']);
  const fee = simulations[0];
  assert(fee.request.doGasSelection && !fee.request.transaction.bcs?.value);
  assert.equal(fee.request.transaction.sender, proof.owner);
  assert.equal(fee.request.checks, GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED);
  assert(fee.response.transaction.effects.status.success);
  const selected = fee.response.transaction.transaction.gasPayment;
  assert.deepEqual(selected.objects.map(ref => ({ objectId: ref.objectId, version: String(ref.version), digest: ref.digest })), data.gasData.payment);
  assert.equal(String(selected.budget), data.gasData.budget); assert.equal(String(selected.price), data.gasData.price);
  const finals = [];
  for (const [index, row] of simulations.slice(1).entries()) {
    assert.equal(row.request.checks, GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED);
    assert(!row.request.doGasSelection);
    const expected = index < 2 ? prepared.bytesBase64 : proof.changedGas.bytesBase64;
    const digest = index < 2 ? prepared.digest : proof.changedGas.digest;
    assert.equal(toBase64(row.request.transaction.bcs.value), expected);
    assert.equal(toBase64(row.response.transaction.transaction.bcs.value), expected);
    assert.equal(await Transaction.from(expected).getDigest(), digest);
    const effects = bcs.TransactionEffects.parse(row.response.transaction.effects.bcs.value);
    assert.equal(toBase64(bcs.TransactionEffects.serialize(effects).toBytes()), toBase64(row.response.transaction.effects.bcs.value));
    assert.equal(effects[effects.$kind].transactionDigest, digest);
    assert.equal(row.response.transaction.effects.transactionDigest, digest);
    assert.equal(effects[effects.$kind].status.$kind, 'Success'); assert(row.response.transaction.effects.status.success);
    finals.push({ phase: row.phase, digest, effectsDigest: typed('TransactionEffects', row.response.transaction.effects.bcs.value), gasBudget: Transaction.from(expected).getData().gasData.budget });
  }
  const changed = Transaction.from(proof.changedGas.bytesBase64).getData();
  assert.equal(BigInt(changed.gasData.budget) - BigInt(data.gasData.budget), 1000n);
  assert.notEqual(proof.changedGas.digest, prepared.digest);
  const normalized = { ...changed, gasData: { ...changed.gasData, budget: data.gasData.budget } };
  assert.deepEqual(normalized, data);
  assert.equal(proof.rejected.length, 4); assert.deepEqual(proof.rejected.map(row => row.simulations), [1, 0, 0, 0]);
  assert.equal(proof.rejected[0].message, '原批准交易模拟未通过，请重新预览并授权');
  assert(proof.checks.some(row => row.label === 'actual simulations do not consume original stake or change balance' && row.passed));
  const outputProof = { passed: true, observedAt: new Date().toISOString(), h0: proof.h0, source: proof.source, owner: proof.owner, stakeId: proof.stakeId,
    originalStakeDigest: proof.originalStakeDigest, originalStakeCheckpoint: proof.originalStakeCheckpoint, originalPreviewDigest: prepared.digest, changedGasDigest: proof.changedGas.digest,
    completeOriginalFramesVerified: rows.length, canonicalObjectFramesVerified: objects.length, enabledSimulationFramesVerified: 4, canonicalFinalSimulations: finals,
    gasBudgetChanged: true, gasDelta: '1000', oldDigestRejectedAfterRealChangedGasSimulation: true, freshStakeAndBalanceUnchanged: true,
    auditNetworkRequests: 0, auditSimulations: 0, auditSignatures: 0, auditExecuteRequests: 0, currentC42BrowserAccepted: false, indexedStakeAccepted: false, withdrawalExecuted: false,
    inputsSha256: Object.fromEntries([__filename, path.resolve(proofFile)].map(file => [file, sha(file)])),
    scope: 'Offline independent whole43 request/response frames/status0, canonical object/effects bytes and hashes, original pending stake and V2 shared reference, canonical withdrawal command/owner/gas/Validity, exact original prepare/revalidation and actual changed Gas+1000 final simulation. Wrong owner/type/binding refusals and original stake/balance unchanged. No current browser preparation guard/lock/journal, indexed new stake, signing/dispatch/payout or parent acceptance.' };
  fs.writeFileSync(output, JSON.stringify(outputProof, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ passed: true, frames: rows.length, simulations: 4, gasBudgetChanged: true, auditNetworkRequests: 0 }));
})().catch(error => { console.error(JSON.stringify({ passed: false, errorType: error.name, message: String(error.message).slice(0, 700) })); process.exitCode = 1; });
