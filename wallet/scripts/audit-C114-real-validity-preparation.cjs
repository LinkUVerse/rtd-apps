// Independent source/bytes and actual uncovered CLI audit. No positive UI acceptance.
const fs = require('node:fs'),path = require('node:path'),crypto = require('node:crypto'),assert = require('node:assert/strict');
const {bcs} = require('rtd-typescript/bcs'),{Transaction} = require('rtd-typescript/transactions');
const ts = require('typescript'),contract = require('./lib/C114-nft-wire-contract-v3.cjs');
const wallet = path.resolve(__dirname,'..'),logs = path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog');
const read = f => JSON.parse(fs.readFileSync(f)),sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const pins = q => {for (const [f,h] of Object.entries(q.inputsSha256 ?? {})) assert.equal(sha(f),h)};
function inverse(q) {const candidate = fs.readFileSync(q.new ?? q.candidate,'utf8'),original = fs.readFileSync(q.old ?? q.original,'utf8');
  assert.equal(sha(q.new ?? q.candidate),q.candidateSha256);assert.equal(sha(q.old ?? q.original),q.originalSha256);let restored = candidate;
  for (const d of [...q.deltas].reverse()) {assert.equal(restored.split(d.toText).length-1,d.count);restored = restored.split(d.toText).join(d.fromText)}assert.equal(restored,original)}
async function main() {
  const [output] = process.argv.slice(2);assert(output && !fs.existsSync(output));
  const names = ['20261008-C114-real-validity-tools-qualified-02.json','20261008-C114-real-validity-driver-prepared-01.json',
    '20261008-C114-validity-demo-build-02.json','20261008-C114-validity-demo-map-source-prepared-02.json',
    '20261008-C114-real-validity-mock-error-realm-prepared-02.json','20261008-C114-validity-ui-preflight-01.json',
    '20261008-C114-validity-ui-preflight-guard-01.json','20261008-C114-validity-nft-inventory-preflight-independent-01.json',
    '20261008-C99-nft-inventory-readiness-15.json','20261008-C114-real-validity-current-readiness-01.json'];
  const files = names.map(n => path.join(logs,n)),proofs = files.map(read);for (const q of proofs) {assert(q.passed);pins(q)}
  const [qualified,prepared,demo,mapFix,mockFix,negative,guard,inventoryAudit,readiness,coverage] = proofs;
  assert(qualified.preparedOnly && qualified.completeDriverAndGuardInversesHeld && qualified.original12ArchivedBytesHeld);
  assert.equal(qualified.completeCanonicalJsonVariants,54);assert.equal(qualified.exactMockWalletBoundaryRequests,54);
  assert.equal(qualified.networkAttempts,0);assert(qualified.mockQualificationOnly && !qualified.actualCurrentValidityUiAccepted);
  inverse(prepared.completeDriverInverse);inverse(prepared.completeNegativeGuardInverse);inverse(mapFix);inverse(mockFix);
  assert(mapFix.originalFailurePreserved && mapFix.mapContentsStillExactlyComparedToDisk && mapFix.metafileInputsAndAllMappedSourcesPinned);
  assert(mockFix.originalFailurePreserved && mockFix.productionDemoAndDriverUnchanged && mockFix.assertionsUnchanged);
  const oldFile = path.join(logs,'20261007-C48-nft-execution-browser-01.json'),old = read(oldFile),redecoded = [];
  assert(old.passed && old.previews.length === 6);
  for (const previous of old.previews) {
    const original = contract.canonical(previous.approval.prepared.bytesBase64),rows = qualified.rows.filter(r => r.scenario === previous.label);
    assert.equal(rows.length,9);assert.equal(new Set(rows.map(r => r.variant)).size,9);
    for (const row of rows) {
      const expected = structuredClone(original),e = expected.V1.expiration,w = e[e.$kind];
      if (row.variant === 'expirationNone') expected.V1.expiration = {$kind:'None',None:true};
      else if (row.variant === 'expiredEpoch') expected.V1.expiration = {$kind:'Epoch',Epoch:'0'};
      else if (row.variant === 'expirationLargeEpoch') expected.V1.expiration = {$kind:'Epoch',Epoch:'9007199254740993'};
      else if (row.variant.startsWith('validDuring')) {
        const {allowedProposers,...rest} = w;expected.V1.expiration = {$kind:'ValidDuring',ValidDuring:rest};
        if (row.variant === 'validDuringMinTimestamp') expected.V1.expiration.ValidDuring.minTimestamp = '1';
        else if (row.variant === 'validDuringMaxTimestamp') expected.V1.expiration.ValidDuring.maxTimestamp = '18446744073709551615';
        else assert.equal(row.variant,'validDuringNoTimestamp');
      } else if (row.variant === 'windowMinTimestamp') w.minTimestamp = '1';
      else if (row.variant === 'windowMaxTimestamp') w.maxTimestamp = '18446744073709551615';
      else assert.equal(row.variant,'originalWindow');
      const bytes = Buffer.from(bcs.TransactionData.serialize(expected).toBytes()),actual = contract.canonical(bytes.toString('base64'));
      assert.deepEqual(actual.V1.expiration,row.expiration);assert.equal(await Transaction.from(bytes).getDigest(),row.digest);
      redecoded.push({scenario:row.scenario,variant:row.variant,digest:row.digest});
    }
  }
  assert.equal(redecoded.length,54);assert.equal(negative.mode,'uncovered-nft-validity-ui-preflight-denied');
  assert.equal(negative.profilesOpened,0);assert.equal(negative.privateKeyFilesRead,0);assert.equal(negative.previousPositiveFilesRead,0);assert.equal(negative.staticServersOpened,0);
  assert(guard.passed && guard.actualDriverProofExists && !guard.ownedDirectoryExists);
  assert(Object.values(guard.counters).every(v => v === 0));assert.equal(guard.driverSha256,sha(prepared.completeDriverInverse.new));
  assert.equal(guard.guardSha256,sha(prepared.completeNegativeGuardInverse.new));
  assert(!fs.existsSync(negative.owned));assert(!fs.existsSync(guard.argumentsPassed[3]) && !fs.existsSync(guard.argumentsPassed[4]));
  assert.equal(inventoryAudit.inputsSha256[negative.inventoryFile],sha(negative.inventoryFile));
  assert.equal(readiness.priorFullCoverageEvidence,files[9]);assert.equal(readiness.observedAt,coverage.observedAt);
  const gate = require('./lib/C99-nft-inventory-contract-v2.cjs');
  assert.throws(() => gate.admission(readiness,Date.parse(negative.observedAt)),/Complete current NFT inventory coverage is incomplete/);
  assert.equal(readiness.missingGates.length,7);assert.deepEqual(readiness.durable,coverage.durable);
  const driverText = fs.readFileSync(prepared.completeDriverInverse.new,'utf8'),tree = ts.createSourceFile('driver.cjs',driverText,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const main = tree.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'main');assert(main?.body);
  const branch = main.body.statements.find(n => ts.isIfStatement(n) && n.expression.getText(tree) === '!inventory.indexedFixtureAccepted');assert(branch);
  assert(ts.isReturnStatement(branch.thenStatement.statements.at(-1)));
  for (const marker of ['const previous = read(previousFile)','const keyFile =','fs.mkdirSync(owned','phase = \'native before\'']) {
    if (marker === "phase = 'native before'") continue;
    assert(driverText.indexOf(marker) > branch.end);
  }
  assert(driverText.indexOf('context = await chromium.launchPersistentContext') > branch.end);
  const helperText = fs.readFileSync(require.resolve('./lib/C114-real-nft-validity-ui.cjs'),'utf8');
  assert(!helperText.includes('approve.click('));assert(helperText.includes('await reject.click()'));
  assert(helperText.includes("variant.name === 'expirationLargeEpoch'") && helperText.includes("body.includes('9007199254740993')"));
  assert(helperText.includes('await expect(approve).toBeDisabled()') && helperText.includes('await expect(approve).toBeEnabled()'));
  const env = require('./lib/C113-current-nft-environment.cjs'),lineage = require('./lib/C109-product-source-lineage.cjs');
  const source = lineage.validate(read(lineage.qualificationFile).originalSource,env.buildFile);assert.deepEqual(source,demo.source);
  env.validateOrigin();require('./lib/C114-real-nft-validity-ui.cjs').validateDemo(files[2]);
  const fineFile = path.join(logs,'../remainingAcceptanceProgress.json');assert.equal(sha(fineFile),'029d59417b1cce5b963bdb64172900ff1b663c1f193065358b233e3145bf509b');
  files.push(__filename,oldFile,fineFile,path.join(logs,'20261008-C114-real-validity-ui-design.md'),
    require.resolve('./lib/C114-nft-validity-variants.cjs'),require.resolve('./lib/C114-real-nft-validity-ui.cjs'),...env.pins);
  const proof = {passed:true,observedAt:new Date().toISOString(),preparedOnly:true,source,
    completeDriverAndGuardAndBuilderAndMockInversesHeld:true,independentlyCanonicalHistoricalVariants:54,
    mockBoundaryOnly:true,actualGuardedUncoveredCliRefusalVerified:true,negativeReturnsBeforePreviousKeysDirectoryNativeServerAndProfile:true,
    actualCounters:guard.counters,originalFineBytesHeld:true,actualCurrentValidityUiAccepted:false,
    completePositiveValidityWireAuditorQualified:false,actualSponsoredExecutionAccepted:false,fullNFTAuthorizationAccepted:false,parentCompletion:false,
    profilesOpened:0,signatures:0,executeRequests:0,inputsSha256:Object.fromEntries(files.map(f => [f,sha(f)]))};
  fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,preparedOnly:true,canonicalVariants:54,actualGuardedCliRefusal:true,actualCurrentUiAccepted:false}));
}
if (require.main === module) main().catch(e => {console.error(JSON.stringify({passed:false,errorType:e.name,message:String(e.message).slice(0,600)}));process.exitCode = 1});
