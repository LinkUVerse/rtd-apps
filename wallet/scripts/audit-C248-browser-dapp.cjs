// Audit only saved native Chrome artifacts. This script never connects or signs.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { GrpcTypes } = require('rtd-typescript/grpc');
const { Transaction } = require('rtd-typescript/transactions');
const { verifyPersonalMessageSignature, verifyTransactionSignature } = require('rtd-typescript/verify');
const L = 'migrationToGRpcOrGraphQLDoc/workLog';
const owner = '0xd50b47e5956effdff99b840cc1a34eb7e23a6a1997ec2e324ff4960b7f27077c';
const h0 = 'BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4';
const inputs = [__filename];
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = name => { const p = `${L}/${name}`; inputs.push(p); return JSON.parse(fs.readFileSync(p)); };
function decode(bytes, type, response) {
  assert(bytes.length >= 5 && bytes[0] === 0);
  const end = 5 + bytes.readUInt32BE(1);
  assert(end <= bytes.length);
  if (response) {
    assert.equal(bytes[end], 128);
    assert.equal(end + 5 + bytes.readUInt32BE(end + 1), bytes.length);
    assert.match(bytes.subarray(end + 5).toString(), /(?:^|\r\n)grpc-status:\s*0\r\n/);
  } else assert.equal(end, bytes.length);
  return type.fromBinary(bytes.subarray(5, end));
}
async function main() {
  const ui = read('20261011-C248-native-ui-01.json');
  assert.match(ui.rejected, /Permission rejected/);
  assert.match(ui.permissions, /共享钱包地址/);
  assert.match(ui.permissions, /建议需要批准的交易/);
  assert.match(ui.connected, new RegExp(owner));
  const negatives = [];
  for (const key of ['wrongAccountExecute', 'wrongAccountSign', 'wrongAccountMessage']) {
    assert.match(ui[key], /Operation not allowed, dapp doesn't have the required permissions/);
    negatives.push(key);
  }
  for (const action of ['Send transaction', 'Sign transaction']) {
    const key = `Omit chain / ${action}`;
    assert.match(ui[key], /必须明确提供有效的交易链/); negatives.push(key);
  }
  for (const action of ['Send transaction', 'Sign transaction', 'Sign message']) {
    const key = `Omit account / ${action}`;
    assert.match(ui[key], /必须明确提供有效的钱包账户/); negatives.push(key);
    const wrong = `Use wrong chain / ${action}`;
    assert.match(ui[wrong], /文本 Error/);
    assert.match(ui[wrong], /链.*(?:不匹配|不一致|不支持)/); negatives.push(wrong);
  }
  assert.match(ui.omitChainMessagePopup, /签名消息/);
  assert.match(ui.omitChainMessagePopup, /Test message/);
  assert.match(ui.omitChainMessageRejected, /文本 Error/);
  const cancellations = [
    'Already aborted / Start cancellable sign', 'Already aborted / Start cancellable execute',
    'Serialization / Start cancellable sign', 'Serialization / Start cancellable execute',
    'cancelApprovalSignResult', 'cancelApprovalExecuteResult',
  ];
  for (const key of cancellations) assert.match(ui[key], /Demo transaction cancelled/);
  assert.match(ui.cancelApprovalSignReady, /批准交易/);
  assert.match(ui.cancelApprovalExecuteReady, /批准交易/);
  const message = JSON.parse(ui.messageSigned.match(/文本 (\{\n  "bytes":[\s\S]*?\n\})/)[1]);
  assert.equal(Buffer.from(message.bytes, 'base64').toString(), 'Test message');
  assert.equal((await verifyPersonalMessageSignature(Buffer.from(message.bytes, 'base64'), message.signature, { address: owner })).toRtdAddress(), owner);
  const signature = ui.signTransactionResult.match(/"signature": "([^"]+)"/)[1];
  const bytesBase64 = ui.signResultSelected.match(/"bytes": "([^"]+)"/)[1];
  const bytes = Buffer.from(bytesBase64, 'base64');
  assert.equal((await verifyTransactionSignature(bytes, signature, { address: owner })).toRtdAddress(), owner);
  const tx = Transaction.from(bytes), data = tx.getData(), digest = await tx.getDigest();
  assert.equal(digest, 'Fh8g1ypGFP4AKM89CFggdfrTkeFRf9TqVY9WWchByuit');
  assert.match(ui.signTransactionReady, new RegExp(digest));
  assert.equal(data.sender, owner);
  assert.equal(data.gasData.owner, owner);
  assert.equal(data.gasData.budget, '2988000');
  assert.equal(data.inputs.length, 2);
  assert.equal(Buffer.from(data.inputs[0].Pure.bytes, 'base64').readBigUInt64LE(), 1n);
  assert.equal('0x' + Buffer.from(data.inputs[1].Pure.bytes, 'base64').toString('hex'), owner);
  assert.deepEqual(data.commands.map(c => c.$kind), ['SplitCoins', 'TransferObjects']);
  assert.match(ui.authorizationCleared, /text \[\] Network:/);
  assert.match(ui.authorizationCleared, /按钮 Connect/);
  assert.match(ui.afterDisconnectRequest, /Connect a wallet account first/);
  const captures = [], verifiedSignatures = [], formalSimulations = [];
  for (const name of ['worker-before-sign', 'approval-before-sign', 'worker-complete', 'demo-complete']) {
    const har = read(`20261011-C248-${name}-01.har`), entries = har.log.entries;
    const counts = {}, failed = [], destinations = new Set();
    for (const e of entries) {
      const url = new URL(e.request.url), method = url.pathname.split('/').pop();
      assert.equal(url.hostname, '127.0.0.1');
      assert.equal(e.request.method, 'POST');
      assert(!e.request.postData?.text?.includes('"jsonrpc"'));
      assert(['graphql', 'GetServiceInfo', 'SimulateTransaction', 'VerifySignature'].includes(method));
      destinations.add(url.origin); counts[method] = (counts[method] ?? 0) + 1;
      if (e.response.status === 0) {
        assert.equal(name, 'approval-before-sign'); assert.equal(method, 'graphql');
        assert(!e.response.content.text);
        failed.push({ startedDateTime: e.startedDateTime, url: e.request.url, error: e._error ?? e.response._error ?? null });
        continue;
      }
      assert.equal(e.response.status, 200);
      if (method === 'graphql') {
        assert.equal(url.origin, 'http://127.0.0.1:41957');
        const response = JSON.parse(e.response.content.text); assert(!response.errors?.length); continue;
      }
      assert(url.origin === 'http://127.0.0.1:41750' || url.origin === 'https://127.0.0.1:41903');
      if (url.port === '41903') assert.equal(url.pathname, '/archive/rtd.rpc.v2.LedgerService/GetServiceInfo');
      const req = decode(Buffer.from(e.request.postData.text, 'latin1'), GrpcTypes[method + 'Request'], false);
      assert.equal(e.response.content.encoding, 'base64');
      const res = decode(Buffer.from(e.response.content.text, 'base64'), GrpcTypes[method + 'Response'], true);
      if (method === 'GetServiceInfo') assert.equal(res.chainId, h0);
      if (method === 'VerifySignature') {
        assert.equal(url.port, '41750'); assert.equal(req.address, owner); assert(res.isValid);
        assert.equal(Buffer.from(req.message.value).toString('base64'), bytesBase64);
        assert.equal(Buffer.from(req.signature.bcs.value).toString('base64'), signature);
        verifiedSignatures.push({ capture: name, startedDateTime: e.startedDateTime, digest });
      }
      if (method === 'SimulateTransaction') {
        assert.equal(url.port, '41750'); assert.equal(req.checks, GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED);
        assert(res.transaction.effects.status.success);
        if (req.transaction?.bcs?.value && Buffer.from(req.transaction.bcs.value).equals(bytes)) {
          assert.equal(req.doGasSelection, false);
          assert(Buffer.from(res.transaction.transaction.bcs.value).equals(bytes));
          assert.equal(res.transaction.effects.transactionDigest, digest);
          formalSimulations.push({ capture: name, startedDateTime: e.startedDateTime, digest });
        }
      }
    }
    captures.push({ name, requests: entries.length, counts, destinations: [...destinations], failed, startedAt: entries[0]?.startedDateTime, lastStartedAt: entries.at(-1)?.startedDateTime });
  }
  assert.equal(captures[2].requests, 145); assert.equal(captures[3].requests, 145);
  assert.deepEqual(captures[2].counts, captures[3].counts);
  assert.equal(captures[1].failed.length, 18);
  assert(verifiedSignatures.some(r => r.capture === 'worker-complete'));
  assert(formalSimulations.some(r => r.capture === 'worker-complete'));
  const output = {
    passed: true, observedAt: new Date().toISOString(), ordinaryChrome: true, installedBuild: 'C241',
    scope: 'C248 connection/rejection, eleven required argument/account/chain denials, six cancellation cases, actual message and transaction sign-only, disconnect; saved native UI and HAR audit',
    owner, network: 'rtd:localnet', h0, negativeCases: negatives, cancellationCases: cancellations,
    optionalMessageChainReachedApprovalAndRejected: true,
    personalMessage: { verified: true, bytesSha256: sha(Buffer.from(message.bytes, 'base64')), signatureSha256: sha(message.signature) },
    signedTransaction: { verified: true, digest, bytesSha256: sha(bytes), sender: data.sender, gasBudget: data.gasData.budget, expiration: data.expiration, amount: '1', recipient: owner },
    captures, verifiedSignatures, formalSimulations, executesInCapturedTraffic: 0,
    limits: ['145-entry worker and dApp views overlap; do not sum them as unique requests', 'The 68-entry approval capture retains 18 aborted GraphQL requests during reload/session changes; not all requests succeeded', 'Initial connection and personal-message UI preceded complete worker capture', 'GraphQL replies structurally checked here, not a complete query-reader replay', 'Includes cancellations and page reload; not one-operation request budget or latency benchmark', 'No executed transaction or all REL-02 acceptance claimed'],
    parentCompletion: false, files: Object.fromEntries(inputs.map(p => [p, sha(fs.readFileSync(p))])),
  };
  fs.writeFileSync(`${L}/20261011-C248-browser-dapp-audit-01.json`, JSON.stringify(output, (_k,v) => typeof v === 'bigint' ? v.toString() : v, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ passed: true, negativeCases: negatives.length, cancellationCases: cancellations.length, messageVerified: true, transactionVerified: true, digest, captures: captures.map(c => ({name: c.name, requests: c.requests, cancelled: c.failed.length})), executeRequests: 0 }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
