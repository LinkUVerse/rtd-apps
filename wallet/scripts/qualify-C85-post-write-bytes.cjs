// Actual historical response qualification; never advances current post-write acceptance.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), parser = require('./lib/C85-post-write-bytes.cjs');
const { GrpcTypes } = require('rtd-typescript/grpc');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const [output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
const logs = path.resolve(__dirname, '../migrationToGRpcOrGraphQLDoc/workLog');
const names = ['20261007-C40-account-nonempty-production-02.json', '20261007-C48-nft-execution-browser-independent-02.json',
  '20261007-C48-nft-execution-browser-01.json', '20261007-C42-framework-post-transfer-production-02.json',
  '20261007-C46-current-authorization-matrix-independent-02.json'];
const files = names.map(n => path.join(logs, n)); let result;
try {
  const [account, original, browser, oldAsset, authorization] = files.map(read);
  for (const proof of [account, original, browser, oldAsset, authorization]) {
    assert(proof.passed); for (const [f, h] of Object.entries(proof.inputsSha256)) assert.equal(sha(f), h);
  }
  const historyFrames = account.raw.filter(r => r.data.accountHistory).map(r => {
    assert.equal(sha(r.file), r.sha256); files.push(r.file);
    const raw = read(r.file); assert.deepEqual(raw.data, r.data); assert(!raw.errors);
    return { role: r.role, url: r.url, status: r.status,
      requestBase64: Buffer.from(JSON.stringify({ query: r.query, variables: r.variables })).toString('base64'),
      responseBase64: fs.readFileSync(r.file).toString('base64') };
  });
  const actualHistories = account.collections.map(c => ({ role: c.role, ...parser.historyPages(
    historyFrames.filter(f => f.role === c.role), c.history, account.h0, c.owner, [], original, browser) }));
  const checkpointFrames = oldAsset.frames.filter(f => f.url.endsWith('/GetCheckpoint'));
  const cp = parser.checkpoint(checkpointFrames, oldAsset.snapshot);
  const genesisFrames = authorization.nativeFrames.filter(f => f.url.endsWith('/GetCheckpoint'));
  const genesis = parser.checkpoint(genesisFrames, { checkpoint: '0', digest: authorization.h0 });
  const details = parser.originalDetails(original.supplementalFrames, original, browser);
  let checks = 5; const rejected = (label, call) => {
    assert.throws(call, undefined, label); checks++;
  };
  const source = account.collections[0], selected = historyFrames.filter(f => f.role === source.role);
  const run = frames => parser.historyPages(frames, source.history, account.h0, source.owner, [], original, browser);
  function changedPage(change) {
    const frames = structuredClone(selected), body = JSON.parse(parser.base64(frames[0].responseBase64));
    change(body.data.accountHistory); frames[0].responseBase64 = Buffer.from(JSON.stringify(body)).toString('base64'); return frames;
  }
  rejected('last page missing', () => run(selected.slice(0, -1)));
  rejected('first page duplicated', () => run([selected[0], ...selected]));
  for (const [label, change] of [
    ['wrong genesis', p => { p.chainId = 'wrong'; }],
    ['upgraded account claim', p => { p.allAccountActivityCertified = true; }],
    ['wrong total', p => { p.totalTransactions++; }],
    ['wrong cursor', p => { p.nextCursor = 'invalid'; }],
    ['wrong sender', p => { p.transactions[0].sender = '0x' + '00'.repeat(32); }],
    ['wrong transaction digest', p => { p.transactions[0].transaction.digest = 'wrong'; }],
    ['wrong checkpoint', p => { p.transactions[0].checkpoint = p.checkpointHi + 1; }],
    ['wrong status', p => { p.transactions[0].status = 'FAILURE'; }],
    ['wrong effects digest', p => { p.transactions[0].transaction.effects.effectsDigest = 'wrong'; }],
    ['transaction bytes changed', p => { const b = parser.base64(p.transactions[0].transaction.transactionBcs); b[b.length - 1] ^= 1; p.transactions[0].transaction.transactionBcs = b.toString('base64'); }],
    ['effects bytes changed', p => { const b = parser.base64(p.transactions[0].transaction.effects.effectsBcs); b[b.length - 1] ^= 1; p.transactions[0].transaction.effects.effectsBcs = b.toString('base64'); }],
  ]) rejected(label, () => run(changedPage(change)));
  rejected('wrong checkpoint snapshot', () => parser.checkpoint(checkpointFrames, { ...oldAsset.snapshot, checkpoint: '0' }));
  rejected('wrong checkpoint digest', () => parser.checkpoint(checkpointFrames, { ...oldAsset.snapshot, digest: 'wrong' }));
  rejected('missing original detail', () => parser.originalDetails(original.supplementalFrames.filter(f => !f.url.endsWith('/GetTransaction')).concat(original.supplementalFrames.filter(f => f.url.endsWith('/GetTransaction')).slice(1)), original, browser));
  const duplicate = structuredClone(original.supplementalFrames.filter(f => f.url.endsWith('/GetTransaction')));
  duplicate[1] = duplicate[0]; rejected('duplicate original detail', () => parser.originalDetails(duplicate, original, browser));
  files.push(__filename, path.join(__dirname, 'lib/C85-post-write-bytes.cjs'), path.join(__dirname, 'audit-C84-nft-post-write-positive.cjs'));
  result = { passed: true, observedAt: new Date().toISOString(), preparedOnly: true, checksPassed: checks,
    historicalWindows: actualHistories, historicalCheckpoint: cp, historicalGenesis: genesis, originalDetails: details,
    rawResponseBodiesHeld: true, requestsReconstructedFromRetainedQueryAndVariables: true,
    postWriteIndexAccepted: false, completeSupportedAccountWindowAccepted: false, chromeAccepted: false,
    parentCompletion: false, networkRequests: 0, signatures: 0, executeRequests: 0,
    inputsSha256: Object.fromEntries(files.map(f => [f, sha(f)])),
    scope: 'Actual historical account response pagination and canonical bytes for every row, two historical typed checkpoint summaries/canonical contents, and original six native details. Corrupted retained responses are rejected. Reconstructed request envelopes preserve retained query/variables but are not original wire bytes. Current checkpoint524022 three-account positive, fixed thirteen archive versions and Chrome remain unexecuted.' };
} catch (error) { result = { passed: false, observedAt: new Date().toISOString(), errorType: error.name,
  message: String(error.message).slice(0, 700) }; process.exitCode = 1; }
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ passed: result.passed, checksPassed: result.checksPassed, errorType: result.errorType, message: result.message }));
