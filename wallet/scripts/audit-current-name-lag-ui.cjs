// Independent offline audit of actual name-lag UI fee simulation frames.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { GrpcTypes } = require('rtd-typescript/grpc');
const { Transaction } = require('rtd-typescript/transactions');
const { normalizeStructTag, RTD_TYPE_ARG } = require('rtd-typescript/utils');

(async () => {
 const [input, output] = process.argv.slice(2);
 assert(input && output && !fs.existsSync(output));
 const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 const proof = JSON.parse(fs.readFileSync(input));
 assert(proof.passed && proof.ordinaryAddressEnabled && proof.simulations.length === 2);
 for (const [file, hash] of Object.entries(proof.inputsSha256)) assert.equal(sha(file), hash);
 assert.equal(proof.source.sha256, '03a1df273de748ea3829800fcdb328da5773ea6cf0988b998518a7bc053270ea');
 assert(proof.uiSource.matchesDisk && proof.workerSource.matchesDisk);
 assert.equal(proof.signatures + proof.executeRequests + proof.certificateChanges + proof.originalProfilesOpened, 0);
 assert.equal(proof.errors.length + proof.forbidden.length, 0);
 assert.deepEqual(proof.aliases.map(row => row.name), ['wallet-migration.rtd', 'leaf.wallet-migration.rtd']);
 assert(proof.aliases.every(row => row.reviewDisabled && row.recipientUnchanged));
 const allowed = new Set(['39400', '39610', '39613', '39616']);
 for (const row of proof.traffic) {
  const url = new URL(row.url);
  assert.equal(url.hostname, '127.0.0.1'); assert.equal(url.protocol, 'http:'); assert(allowed.has(url.port));
  assert(!/ExecuteTransaction|jsonrpc/i.test(url.pathname));
 }
 assert.equal(proof.actualSimulationRequests, 2);
 assert.equal(proof.traffic.filter(row => row.url.endsWith('/SimulateTransaction')).length, 2);
 const decode = (base64, type, response) => {
  const bytes = Buffer.from(base64, 'base64'); assert.equal(bytes[0], 0);
  const end = 5 + bytes.readUInt32BE(1); assert(end <= bytes.length);
  const value = type.toJson(type.fromBinary(bytes.subarray(5, end)));
  if (response) {
   assert.equal(bytes[end], 128); const trailerEnd = end + 5 + bytes.readUInt32BE(end + 1);
   assert.equal(trailerEnd, bytes.length);
   assert.match(bytes.subarray(end + 5).toString(), /(?:^|\r\n)grpc-status:0\r\n/);
  } else assert.equal(end, bytes.length);
  return value;
 };
 const decoded = proof.simulations.map(row => {
  assert.equal(row.status, 200);
  const request = decode(row.requestBase64, GrpcTypes.SimulateTransactionRequest, false);
  const response = decode(row.responseBase64, GrpcTypes.SimulateTransactionResponse, true);
  assert.deepEqual(request, row.request); assert.deepEqual(response, row.response);
  assert.equal(request.checks, 'ENABLED'); assert.equal(response.transaction.effects.status.success, true);
  return { request, response };
 });
 const selection = decoded.find(row => row.request.doGasSelection);
 const final = decoded.find(row => row.request.doGasSelection === false);
 assert(selection && final);
 assert.equal(selection.request.transaction.sender, proof.owner);
 const first = selection.request.transaction.kind.programmableTransaction;
 assert.equal(Buffer.from(first.inputs[2].pure, 'base64').readBigUInt64LE(), 1n);
 assert.equal('0x' + Buffer.from(first.inputs[3].pure, 'base64').toString('hex'), proof.recipient);
 const bytes = final.request.transaction.bcs.value;
 const transaction = Transaction.from(bytes), data = transaction.getData(), digest = await transaction.getDigest();
 assert.equal(data.sender, proof.owner); assert.equal(data.gasData.owner, proof.owner);
 assert.deepEqual(data.commands.map(row => row.$kind), ['MergeCoins', 'SplitCoins', 'TransferObjects']);
 assert.equal(data.inputs[2].Pure.bytes, first.inputs[2].pure);
 assert.equal(data.inputs[3].Pure.bytes, first.inputs[3].pure);
 const actual = final.response.transaction;
 assert.equal(actual.transaction.bcs.value, bytes); assert.equal(actual.transaction.digest, digest);
 assert.equal(actual.effects.transactionDigest, digest);
 assert.equal(actual.transaction.sender, proof.owner);
 assert.equal(data.gasData.budget, actual.transaction.gasPayment.budget);
 assert.equal(data.gasData.price, actual.transaction.gasPayment.price);
 assert.equal(data.gasData.owner, actual.transaction.gasPayment.owner);
 assert.deepEqual(data.gasData.payment, actual.transaction.gasPayment.objects);
 assert(BigInt(data.gasData.budget) > 0n && data.gasData.payment.length === 1);
 assert.equal(data.expiration.Validity.chain, '3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj');
 const changes = actual.balanceChanges;
 const sum = (owner, type) => changes.filter(row => row.address === owner && normalizeStructTag(row.coinType) === normalizeStructTag(type)).reduce((sum, row) => sum + BigInt(row.amount), 0n);
 assert.equal(sum(proof.recipient, proof.coinType), 1n); assert.equal(sum(proof.owner, proof.coinType), -1n);
 const gas = actual.effects.gasUsed;
 const netGas = BigInt(gas.computationCost) + BigInt(gas.storageCost) - BigInt(gas.storageRebate);
 assert.equal(sum(proof.owner, RTD_TYPE_ARG), -netGas);
 const report = { passed: true, observedAt: new Date().toISOString(), aliasesBlocked: 2,
  checksEnabledSimulations: 2, finalByteDigest: digest, sender: data.sender, recipient: proof.recipient,
  coinType: proof.coinType, amountAtomic: '1', gasBudget: data.gasData.budget, gasPrice: data.gasData.price,
  gasPayment: data.gasData.payment, expiration: data.expiration, netGas: netGas.toString(),
  originalTrafficRequests: proof.traffic.length, inputsSha256: { [input]: sha(input), [__filename]: sha(__filename), ...proof.inputsSha256 },
  auditNetworkRequests: 0, simulations: 0, signatures: 0, executeRequests: 0,
  scope: 'Offline independent raw gRPC-Web frame/trailer/final BCS audit of actual profile5 Chrome name-lag rejection and ordinary-address fee simulation. No Review click, approval, signature or execution. No positive name, expiry/rename/renewal or full QA-A15 acceptance.' };
 fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
 console.log(JSON.stringify({ passed: true, checksEnabledSimulations: 2, aliasesBlocked: 2, executeRequests: 0 }));
})().catch(error => { console.error(error); process.exitCode = 1; });
