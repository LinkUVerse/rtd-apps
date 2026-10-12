// Independent exact source delta and retained qualification checks; no network or chain actions.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), cp = require('node:child_process');
const logs = path.resolve(__dirname, '../migrationToGRpcOrGraphQLDoc/workLog');
const [output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const files = [__filename];
const load = (name, pass = true) => {
  const f = path.join(logs, name); files.push(f); const p = read(f); assert.equal(p.passed, pass);
  for (const [f,h] of Object.entries(p.inputsSha256 ?? {})) assert.equal(sha(f), h); return p;
};
let result;
try {
  const authority = load('20261008-C88-summary-source-authority-01.json');
  assert.equal(authority.fixedSuiCommit, '712c7263297c01fce764e8f99c17150c9b8120f6');
  assert.equal(authority.normalizedTypes.length, 4);
  assert(authority.normalizedTypes.every(r => r.fixedSuiAndRtdIdentical));
  const qualification = load('20261008-C88-full-summary-qualification-01.json');
  assert.equal(qualification.checksPassed, 29);
  assert.equal(qualification.historicalFullSummaries.length, 2);
  assert.equal(qualification.actualRetainedSummaryBytes, 273);
  assert(qualification.historicalFullSummaries.every(r => r.fullOuterSummaryCanonical && r.canonicalSummaryFields === 10));
  assert.equal(qualification.counterexamples.length, 13);
  assert(qualification.counterexamples.every(r => r.oldPrefixAuditAccepted && r.fullSummaryRejected));
  assert(!qualification.actualEpochSummaryRead && !qualification.fixturesAreQuorumCertificates);
  assert(!qualification.opaquePayloadInterpreted && !qualification.postWriteIndexAccepted && !qualification.parentCompletion);
  assert.equal(qualification.networkRequests, 0); assert.equal(qualification.signatures, 0); assert.equal(qualification.executeRequests, 0);
  const tests = load('20261008-C88-original-post-write-contracts-01.json');
  assert.equal(tests.checksPassed, 51); assert.equal(tests.networkRequests, 0);
  const predecessor = path.join(__dirname, 'audit-C85-full-post-write-indexed.cjs');
  const successor = path.join(__dirname, 'audit-C88-full-post-write-indexed.cjs');
  files.push(predecessor, successor);
  let normalized = fs.readFileSync(successor, 'utf8');
  const differences = [
    ["const parser = require('./lib/C88-post-write-bytes.cjs')", "const parser = require('./lib/C85-post-write-bytes.cjs')"],
    ["path.join(__dirname, 'lib/C88-post-write-bytes.cjs'), path.join(__dirname, 'lib/C88-full-summary.cjs'),", "path.join(__dirname, 'lib/C85-post-write-bytes.cjs'),"],
    ["    load('20261008-C88-full-summary-qualification-01.json');\n", ''],
    ['canonical full ten-field outer summary with every protobuf metadata field matched and canonical contents; opaque protocol payload compared exactly, quorum signature not reverified', 'typed summary and canonical contents with serialized summary prefix'],
  ];
  for (const [from,to] of differences) { assert.equal(normalized.split(from).length, 2); normalized = normalized.replace(from,to); }
  assert.equal(normalized, fs.readFileSync(predecessor, 'utf8'));
  const old = require('./lib/C85-post-write-bytes.cjs'), next = require('./lib/C88-post-write-bytes.cjs');
  assert.deepEqual(Object.keys(next), Object.keys(old));
  for (const key of Object.keys(old)) if (key !== 'checkpoint') assert.equal(next[key], old[key]);
  const prepared = load('20261008-C85-full-positive-auditor-prepared-01.json');
  assert.equal(prepared.inputsSha256[predecessor], sha(predecessor));
  const refusal = load('20261008-C88-uncovered-positive-refusal-01.json', false);
  assert.equal(refusal.errorType, 'AssertionError'); assert(!refusal.postWriteIndexAccepted && !refusal.parentCompletion);
  assert(refusal.message.includes("p.mode === 'covered-post-write-read'"));
  const syntax = ['audit-C88-full-post-write-indexed.cjs', 'audit-C88-full-summary-preparation.cjs',
    'qualify-C88-full-summary.cjs', 'lib/C88-post-write-bytes.cjs', 'lib/C88-full-summary.cjs'];
  for (const name of syntax) {
    const f = path.join(__dirname, name); files.push(f);
    cp.execFileSync(process.execPath, ['--check', f], {encoding:'utf8', timeout:30000});
  }
  result = {passed:true,observedAt:new Date().toISOString(),preparedOnly:true,
    qualificationChecks:29,originalPostWriteContracts:51,actualHistoricalFullSummaries:2,
    actualMetadataCounterexamplesRejected:13,exactPredecessorDeltaAccepted:true,
    originalThirteenObjectsFiveCapsThreeHistoriesAndSixDetailsHeld:true,
    originalOtherParserFunctionsHeld:true,uncoveredPositiveRefused:true,syntaxFiles:syntax.length,
    networkRequests:0,signatures:0,executeRequests:0,postWriteIndexAccepted:false,
    chromeAccepted:false,parentCompletion:false,inputsSha256:Object.fromEntries([...new Set(files)].map(f=>[f,sha(f)])),
    scope:'Independent preparation audit only: fixed official source pins and29 decoder checks; original51 post-write contracts; exact four allowed changes from already qualified C85 full auditor; all other reader functions by identity; actual negative preflight refused. No current positive publication/index/window, epoch quorum, browser or parent completion.'};
} catch(error) {
  result={passed:false,observedAt:new Date().toISOString(),errorType:error.name,message:String(error.message).slice(0,700)};
  process.exitCode=1;
}
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({passed:result.passed,qualificationChecks:result.qualificationChecks,
  originalPostWriteContracts:result.originalPostWriteContracts,errorType:result.errorType,message:result.message}));
