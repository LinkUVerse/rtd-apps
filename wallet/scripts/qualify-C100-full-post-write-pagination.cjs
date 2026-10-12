// Offline full-source inverse qualification; never grants production acceptance.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), cp = require('node:child_process');
const logs = path.resolve(__dirname, '../migrationToGRpcOrGraphQLDoc/workLog');
const [output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const files = [__filename]; let result;
try {
  const load = (name, passed = true) => {
    const file = path.join(logs, name); files.push(file); const p = read(file); assert.equal(p.passed, passed);
    for (const [f, h] of Object.entries(p.inputsSha256 ?? {})) assert.equal(sha(f), h); return p;
  };
  const predecessor = load('20261008-C98-successor-post-write-preparation-independent-01.json');
  assert.equal(predecessor.originalContractsHeld, 51); assert.equal(predecessor.fullSummaryQualificationHeld, 29);
  const actual = load('20261008-C98-successor-post-write-positive-01.json', false);
  assert.equal(actual.stage, 'complete three-owner account histories'); assert.equal(actual.errorType, 'TimeoutError');
  assert.equal(actual.requests, 150); assert.equal(actual.frames.length, 150);
  assert(!actual.postWriteIndexAccepted && !actual.completeAccountHistoryAccepted);
  const historyPages = actual.frames.filter(f => f.url.endsWith('/account/graphql'))
    .map(f => JSON.parse(Buffer.from(f.responseBase64, 'base64')).data?.accountHistory).filter(Boolean);
  assert.equal(historyPages.length, 4); assert.equal(historyPages[0].totalTransactions, 9);
  assert.equal(historyPages.reduce((n,p) => n + p.transactions.length, 0), 8);
  assert(historyPages.every(p => p.limit === 2 && p.hasNextPage));
  const pairs = [
    ['probe-C98-successor-post-write-indexed.cjs', 'probe-C100-full-post-write-indexed.cjs', [
      ["minimumCheckpoint: '524022', pageSize: 2", "minimumCheckpoint: '524022', pageSize: 4"]]],
    ['audit-C98-successor-full-post-write-indexed.cjs', 'audit-C100-full-post-write-indexed.cjs', [
      ['20261008-C98-successor-post-write-preparation-independent-01.json', '20261008-C100-full-post-write-preparation-independent-01.json'],
      ['probe-C98-successor-post-write-indexed.cjs', 'probe-C100-full-post-write-indexed.cjs'],
      ["    const intentFile = path.join(readiness.fixture, 'intent.json');", "    require('./lib/C100-history-pagination-policy.cjs').validate(p.frames.filter(f => f.stage === stages[3]), histories, oracle.addresses);\n    files.push(path.join(__dirname, 'lib/C100-history-pagination-policy.cjs'));\n    const intentFile = path.join(readiness.fixture, 'intent.json');"]]],
  ];
  for (const [oldName, newName, changes] of pairs) {
    const oldFile = path.join(__dirname, oldName), newFile = path.join(__dirname, newName); files.push(oldFile, newFile);
    let normalized = fs.readFileSync(newFile, 'utf8');
    for (const [before, after] of changes.slice().reverse()) {
      assert.equal(normalized.split(after).length, 2); normalized = normalized.replace(after, before);
    }
    assert.equal(normalized, fs.readFileSync(oldFile, 'utf8'));
    assert.equal(predecessor.inputsSha256[oldFile], sha(oldFile));
  }
  const readerFile = path.resolve(__dirname, '../src/shared/rpc/account-history-reader.ts'); files.push(readerFile);
  const reader = fs.readFileSync(readerFile, 'utf8');
  for (const line of ['this.#timeout = options.timeoutMs ?? 60_000;', 'this.#timeout > 60_000',
    'this.#pageSize = options.pageSize ?? 20;', 'this.#pageSize < 1', 'this.#pageSize > 50']) assert(reader.includes(line));
  const parser = require('./lib/C88-post-write-bytes.cjs');
  assert.equal(parser.historyPages, require('./lib/C85-post-write-bytes.cjs').historyPages);
  const { validate } = require('./lib/C100-history-pagination-policy.cjs');
  const addresses = {source:'source', existingTarget:'existing', newTarget:'new'};
  const histories = {source:{completePages:3}, existingTarget:{completePages:2}, newTarget:{completePages:1}};
  const frame = a => ({url:'http://127.0.0.1:41956/account/graphql',status:200,
    requestBase64:Buffer.from(JSON.stringify({variables:{address:a,limit:4}})).toString('base64'),
    responseBase64:Buffer.from(JSON.stringify({data:{accountHistory:{address:a,limit:4}}})).toString('base64')});
  const frames = ['source','source','source','existing','existing','new'].map(frame);
  assert.equal(validate(frames, histories, addresses).pageSize, 4); let checks = 1;
  const clone = value => JSON.parse(JSON.stringify(value));
  for (const role of ['source','existingTarget','newTarget']) {
    const missing = clone(histories); missing[role].completePages = 0;
    assert.throws(() => validate(frames, missing, addresses)); checks++;
  }
  for (const role of ['source','existingTarget']) {
    const single = clone(histories); single[role].completePages = 1;
    assert.throws(() => validate(frames, single, addresses)); checks++;
  }
  for (const name of ['limit','address']) {
    const bad = clone(frames), request = JSON.parse(Buffer.from(bad[0].requestBase64, 'base64'));
    request.variables[name] = name === 'limit' ? 20 : 'foreign';
    bad[0].requestBase64 = Buffer.from(JSON.stringify(request)).toString('base64');
    assert.throws(() => validate(bad, histories, addresses)); checks++;
  }
  assert.throws(() => validate(frames.slice(1), histories, addresses)); checks++;
  const fractional = clone(histories); fractional.source.completePages = 2.5;
  assert.throws(() => validate(frames, fractional, addresses)); checks++;
  const syntax = ['probe-C100-full-post-write-indexed.cjs','audit-C100-full-post-write-indexed.cjs',
    'lib/C100-history-pagination-policy.cjs','qualify-C100-full-post-write-pagination.cjs'];
  for (const name of syntax) {const f=path.join(__dirname,name);files.push(f);cp.execFileSync(process.execPath,['--check',f],{timeout:30000});}
  result = {passed:true, observedAt:new Date().toISOString(), preparedOnly:true, originalContractsHeld:51,
    fullSummaryQualificationHeld:29, exactOriginalFullProbeSinglePageSizeDelta:true,
    exactOriginalFullAuditorBindingAndAdditionalPaginationPolicy:true, paginationPolicyChecks:checks,
    original150ReplyTimeoutHeld:true, originalThirteenObjectsFiveCapsThreeHistoriesSixDetailsHeld:true,
    productionReaderDefault20Range1To50Shared60000MsHeld:true, syntaxFiles:syntax.length,
    postWriteIndexAccepted:false, chromeAccepted:false,parentCompletion:false, networkRequests:0,
    profilesOpened:0,signatures:0,executeRequests:0,signals:0,
    inputsSha256:Object.fromEntries([...new Set(files)].map(f=>[f,sha(f)]))};
} catch(error) {result={passed:false,observedAt:new Date().toISOString(),errorType:error.name,message:String(error.message).slice(0,700)};process.exitCode=1;}
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({passed:result.passed,checks:result.paginationPolicyChecks,errorType:result.errorType,message:result.message}));
