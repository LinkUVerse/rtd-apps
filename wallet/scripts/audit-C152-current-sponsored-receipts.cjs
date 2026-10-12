// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Pure independent audit of the five retained current-debug read responses.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { GrpcTypes } = require('rtd-typescript/grpc');
const { bcs } = require('rtd-typescript/bcs');
const { verifyTransactionSignature } = require('rtd-typescript/verify');
const parser = require('./lib/C88-post-write-bytes.cjs');
const logs = path.resolve(__dirname, '../migrationToGRpcOrGraphQLDoc/workLog');
const read = file => JSON.parse(fs.readFileSync(file));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const h0 = 'BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4';
const names = [
  ['coin', '20261009-C128-executed-independent-03.json', 'actualDualSignCoinExecutionAccepted'],
  ['stake', '20261009-C129-sponsored-stake-execution-independent-01.json', 'actualFreshSponsoredStakeExecuted'],
  ['withdraw', '20261009-C129-sponsored-withdraw-execution-independent-01.json', 'actualFreshSponsoredWithdrawExecuted'],
];

async function audit(p) {
  assert(p.passed && p.currentDebugHistoricalReceiptsRead && p.allCurrentTransactionEffectsAndBothSignaturesIdentical);
  assert.equal(p.h0, h0);
  assert.equal(p.immutableHistoricalLedgerJsonsChecked, 107);
  for (const key of ['newApprovals', 'signatures', 'executeRequests', 'nftBusinessRequests']) assert.equal(p[key], 0);
  for (const key of ['archiveWriteAfterAcceptance', 'parentCompletion', 'fullNonNftAuthorizationAccepted']) assert.equal(p[key], false);
  assert.equal(p.frames.length, 5);
  assert.equal(p.receipts.length, 3);
  for (const [file, hash] of Object.entries(p.inputsSha256)) assert.equal(sha(file), hash);
  const ledger = read(path.join(logs, '20261009-TX01-TX04-non-nft-evidence-ledger-01.json'));
  assert(ledger.passed);
  assert.equal(Object.keys(ledger.linkedImmutableJsonSha256).length, 107);
  for (const [file, hash] of Object.entries(ledger.linkedImmutableJsonSha256)) assert.equal(sha(file), hash);
  const decoded = p.frames.map((row, i) => {
    const method = i === 0 || i === 4 ? 'GetServiceInfo' : 'GetTransaction';
    assert.equal(row.url, 'http://127.0.0.1:41750/rtd.rpc.v2.LedgerService/' + method);
    assert.equal(row.status, 200);
    assert.equal(row.headers['x-rtd-chain-id'], h0);
    for (const field of ['requestBase64', 'responseBase64']) assert.equal(Buffer.from(row[field], 'base64').toString('base64'), row[field]);
    return {
      request: GrpcTypes[method + 'Request'].fromBinary(parser.grpcBody(row.requestBase64, false)),
      response: GrpcTypes[method + 'Response'].fromBinary(parser.grpcBody(row.responseBase64, true)),
    };
  });
  assert.equal(decoded[0].response.chainId, h0);
  assert.equal(decoded[4].response.chainId, h0);
  const receipts = [];
  for (const [i, [kind, name, flag]] of names.entries()) {
    const accepted = read(path.join(logs, name));
    assert(accepted.passed && accepted[flag] && accepted.h0 === h0);
    const files = Object.keys(accepted.inputsSha256).filter(file => file.endsWith('/node-frames.json'));
    assert.equal(files.length, 1);
    assert.equal(sha(files[0]), accepted.inputsSha256[files[0]]);
    const prior = read(files[0]).filter(row => row.url.endsWith('/GetTransaction') && row.status === 200 && row.headers['grpc-status'] !== '5').map(row => ({
      request: GrpcTypes.GetTransactionRequest.fromBinary(parser.grpcBody(row.requestBase64, false)),
      response: GrpcTypes.GetTransactionResponse.fromBinary(parser.grpcBody(row.responseBase64, true)),
    })).filter(row => row.request.digest === accepted.digest).at(-1);
    assert(prior);
    const current = decoded[i + 1], transaction = current.response.transaction;
    assert(transaction && prior.response.transaction);
    assert.deepEqual(current.request, prior.request);
    assert.equal(transaction.digest, accepted.digest);
    assert.equal(transaction.transaction.digest, accepted.digest);
    assert.deepEqual(Buffer.from(transaction.transaction.bcs.value), Buffer.from(prior.response.transaction.transaction.bcs.value));
    assert.deepEqual(Buffer.from(transaction.effects.bcs.value), Buffer.from(prior.response.transaction.effects.bcs.value));
    assert.equal(String(transaction.checkpoint), String(prior.response.transaction.checkpoint));
    assert.equal(parser.typed('TransactionData', transaction.transaction.bcs.value), accepted.digest);
    const data = parser.canonical(bcs.TransactionData, transaction.transaction.bcs.value);
    const effects = parser.canonical(bcs.TransactionEffects, transaction.effects.bcs.value);
    assert.equal(effects.V2.status.$kind, 'Success');
    assert.equal(effects.V2.transactionDigest, accepted.digest);
    assert(transaction.effects.status.success);
    const signatures = transaction.signatures.map(s => Buffer.from(s.bcs.value).toString('base64'));
    assert.deepEqual(signatures, prior.response.transaction.signatures.map(s => Buffer.from(s.bcs.value).toString('base64')));
    assert.equal(signatures.length, 2);
    const addresses = [data.V1.sender, data.V1.gasData.owner];
    assert.notEqual(addresses[0], addresses[1]);
    for (const [j, address] of addresses.entries()) assert.equal((await verifyTransactionSignature(Buffer.from(transaction.transaction.bcs.value), signatures[j], { address })).toRtdAddress(), address);
    const receipt = { kind, digest: accepted.digest, checkpoint: String(transaction.checkpoint),
      currentFullTransactionBytesIdentical: true, currentFullEffectsBytesIdentical: true,
      bothOriginalSignaturesLocallyVerified: true, sender: addresses[0], gasOwner: addresses[1],
      requestMask: prior.request.readMask.paths };
    assert.deepEqual(p.receipts[i], receipt);
    receipts.push(receipt);
  }
  return receipts;
}

(async () => {
  const [file, output] = process.argv.slice(2);
  assert(output && !fs.existsSync(output));
  let result;
  try {
    const p = read(file), receipts = await audit(p);
    const mutations = [x => x.frames.pop(), x => x.frames[0].headers['x-rtd-chain-id'] = 'wrong',
      x => x.frames[4].responseBase64 = '', x => x.frames[1].requestBase64 = x.frames[2].requestBase64,
      x => x.frames[1].responseBase64 = x.frames[2].responseBase64, x => x.frames[2].status = 503,
      x => x.receipts[0].checkpoint = '0', x => x.receipts[1].gasOwner = x.receipts[1].sender,
      x => x.receipts[2].bothOriginalSignaturesLocallyVerified = false, x => x.receipts[0].requestMask = [],
      x => x.signatures = 1, x => x.executeRequests = 1, x => x.parentCompletion = true,
      x => x.archiveWriteAfterAcceptance = true, x => x.immutableHistoricalLedgerJsonsChecked = 106];
    for (const mutate of mutations) {
      const changed = structuredClone(p); mutate(changed); assert.notDeepEqual(changed, p);
      await assert.rejects(() => audit(changed));
    }
    const lineage = require('./lib/C136-product-source-lineage.cjs'), qualification = read(lineage.qualificationFile);
    assert.deepEqual(lineage.validate(qualification.originalSource, qualification.buildFile), p.source);
    assert.deepEqual(require('./lib/C148-current-core-gateway-ownership.cjs').capture(), p.currentRuntimeAuthority);
    result = { passed: true, observedAt: new Date().toISOString(), source: p.source, h0,
      currentDebugHistoricalReceiptsIndependentlyAccepted: true, receipts,
      originalReadFramesIndependentlyAudited: 5, originalTransactionAndEffectsBytesIdentical: true,
      originalSixSignaturesLocallyVerified: true, linkedImmutableJsonsChecked: 107,
      actualMutationRefusals: mutations.length, newRequests: 0, newApprovals: 0,
      signatures: 0, executeRequests: 0, archiveWriteAfterAcceptance: false, parentCompletion: false,
      inputsSha256: { ...p.inputsSha256, ...Object.fromEntries([__filename, path.resolve(file),
        require.resolve('./lib/C88-post-write-bytes.cjs'), lineage.qualificationFile,
        require.resolve('./lib/C148-current-core-gateway-ownership.cjs')].map(f => [f, sha(f)])) } };
  } catch (error) {
    result = { passed: false, observedAt: new Date().toISOString(), errorType: error.name,
      message: String(error.message).slice(0, 1200), stack: String(error.stack).slice(0, 1600), parentCompletion: false };
    process.exitCode = 1;
  }
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ passed: result.passed, mutations: result.actualMutationRefusals, message: result.message }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
