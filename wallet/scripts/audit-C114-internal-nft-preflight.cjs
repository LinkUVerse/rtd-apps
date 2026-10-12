// Independently audit the actual uncovered CLI and its separately recorded no-IO observer.
// This file accepts only a refusal; positive browser/wire acceptance requires its own auditor.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), cp = require('node:child_process'), ts = require('typescript');
const contract = require('./lib/C99-nft-inventory-contract-v2.cjs');
const environment = require('./lib/C113-current-nft-environment.cjs');
const wallet = path.resolve(__dirname, '..'), logs = path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog');
const read = f => JSON.parse(fs.readFileSync(f,'utf8'));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function pins(proof) {assert(proof.inputsSha256);for (const [file,digest] of Object.entries(proof.inputsSha256)) assert.equal(sha(file),digest)}
function audit(proofFile,guardFile) {
  const p = read(proofFile), g = read(guardFile);
  assert(p.passed && g.passed); pins(p); pins(g);
  assert.equal(p.mode,'uncovered-internal-nft-preflight-denied');
  for (const field of ['profilesOpened','requests','privateKeyFilesRead','signatures','executeRequests','newContainers']) assert.equal(p[field],0);
  for (const field of ['actualCurrentInternalNftFormsAccepted','fullNFTAuthorizationAccepted','parentCompletion']) assert.equal(p[field],false);
  assert.equal(g.exitCode,0); assert.equal(g.ownedDirectoryExists,false); assert.equal(g.actualDriverProofExists,true);
  assert.deepEqual(Object.keys(g.counters).sort(),['networkAttempts','browserLaunchAttempts','childProcessAttempts',
    'directoryCreationAttempts','privateKeyReadAttempts','originalProfileReadAttempts'].sort());
  assert(Object.values(g.counters).every(v => v === 0));
  assert.deepEqual(g.argumentsPassed.map(f => path.resolve(f)),[p.inventoryFile,p.inventoryAuditFile,p.readinessFile,path.resolve(proofFile),p.owned]);
  const inventory = read(p.inventoryFile), independent = read(p.inventoryAuditFile), readiness = read(p.readinessFile);
  for (const q of [inventory,independent,readiness]) {assert(q.passed);pins(q)}
  assert.equal(inventory.mode,'uncovered-preflight-denied');assert.equal(inventory.sessionsCreated,0);assert.equal(inventory.frames.length,0);
  assert.equal(independent.mode,'uncovered-preflight-independent');assert.equal(independent.actualZeroIoRefusalVerified,true);
  assert.equal(independent.allFourteenCanonicalObjectsAccepted,false);
  assert.equal(independent.inputsSha256[p.inventoryFile],sha(p.inventoryFile));
  assert.equal(readiness.targetCheckpoint,696489);
  assert.deepEqual(readiness.coverageGates,contract.coverage(readiness));
  assert.throws(() => contract.admission(readiness,Date.parse(p.observedAt)),/Complete current NFT inventory coverage is incomplete/);
  assert.throws(() => contract.admission(readiness,Date.parse(inventory.observedAt)),/Complete current NFT inventory coverage is incomplete/);
  const sourceFile = path.join(wallet,'scripts/test-C114-current-internal-nft-authorization.cjs');
  assert.equal(g.driverSha256,sha(sourceFile));assert.equal(g.inputsSha256[sourceFile],sha(sourceFile));
  const source = fs.readFileSync(sourceFile,'utf8'), ast = ts.createSourceFile(sourceFile,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length,0);
  const main = ast.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === 'main');assert(main?.body);
  const refusal = main.body.statements.find(s => ts.isIfStatement(s) && s.expression.getText(ast) === '!inventory.indexedFixtureAccepted');
  assert(refusal && ts.isBlock(refusal.thenStatement));
  assert(ts.isReturnStatement(refusal.thenStatement.statements.at(-1)));
  const actualCalls = [], walk = n => {if (ts.isCallExpression(n)) actualCalls.push(n.expression.getText(ast));ts.forEachChild(n,walk)};
  walk(refusal.thenStatement);
  assert(actualCalls.includes('gate.admission') && actualCalls.includes('assert.throws') && actualCalls.includes('record'));
  assert(!actualCalls.some(name => /launch|fetch|held|readFile|mkdir|exec|spawn|sign|Execute/.test(name)));
  const keyReads = main.body.statements.filter(s => s.getText(ast).includes("keys = read(keyFile)"));
  const mkdir = main.body.statements.filter(s => s.getText(ast).includes('fs.mkdirSync(owned'));
  const native = main.body.statements.find(s => ts.isTryStatement(s));
  assert.equal(keyReads.length,1);assert.equal(mkdir.length,1);assert(native);
  assert(refusal.end < keyReads[0].pos && refusal.end < mkdir[0].pos && refusal.end < native.pos);
  const oracleFile = path.join(logs,'20261008-C93-recovered-native-independent-01.json'), oracle = read(oracleFile);pins(oracle);
  const actualForms = require(sourceFile).forms(oracle);
  const serial = (values,s) => {const rows = values.filter(n => n.value.serial === s);assert.equal(rows.length,1);return rows[0].objectId};
  const names = ['direct','framework-ordinary','framework-listed','personal','originbyte-existing-target','originbyte-new-target'];
  assert.deepEqual(actualForms.map(x => x.name),names);
  assert.deepEqual(actualForms.map(x => x.route),['direct','framework-kiosk','framework-kiosk','personal-kiosk','originbyte-kiosk','originbyte-kiosk']);
  assert.deepEqual(actualForms.map(x => x.objectId),['6','1','2','5'].map(s => serial(oracle.nfts,s)).concat(['1','2'].map(s => serial(oracle.obNfts,s))));
  for (const f of actualForms) {const expected = f.name === 'originbyte-new-target' ? oracle.addresses.newTarget : oracle.addresses.existingTarget;
    assert.equal(f.to,expected);assert.equal(f.otherTo,expected === oracle.addresses.existingTarget ? oracle.addresses.newTarget : oracle.addresses.existingTarget)}
  const lineage = require('./lib/C109-product-source-lineage.cjs'), qualified = read(lineage.qualificationFile);
  const currentSource = lineage.validate(qualified.originalSource,environment.buildFile);environment.validateOrigin();
  const parameterProofFile = path.join(logs,'20261008-C114-nft-parameter-tool-independent-01.json'), parameterProof = read(parameterProofFile);
  assert(parameterProof.passed && parameterProof.preparedOnly && parameterProof.independentlyCanonicalByteVariants === 48);pins(parameterProof);
  assert.deepEqual(parameterProof.source,currentSource);
  assert.equal(path.dirname(p.owned),'/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03');
  assert(path.basename(p.owned).startsWith('current-C114-internal-nft-authorization-'));assert(!fs.existsSync(p.owned));
  const commands = cp.execFileSync('ps',['-Ao','command='],{encoding:'utf8'});
  assert(!commands.split('\n').some(c => c.includes('Google Chrome') && c.includes('--user-data-dir=' + path.join(p.owned,'profile'))));
  const fineFile = path.join(wallet,'migrationToGRpcOrGraphQLDoc/remainingAcceptanceProgress.json');
  assert.equal(sha(fineFile),'029d59417b1cce5b963bdb64172900ff1b663c1f193065358b233e3145bf509b');
  const files = [__filename,sourceFile,path.resolve(proofFile),path.resolve(guardFile),p.inventoryFile,p.inventoryAuditFile,
    p.readinessFile,oracleFile,parameterProofFile,fineFile,require.resolve('./lib/C99-nft-inventory-contract-v2.cjs'),...environment.pins];
  return {passed:true,observedAt:new Date().toISOString(),scope:'Actual uncovered preflight only; current six-form mapping and prepared parameter lineage',
    actualGuardedCliNoIoRefusalVerified:true,negativeBranchReturnsBeforeKeysDirectoryAndNativeReader:true,allSixCurrentScenarioMappingsVerified:true,
    currentSource,missingGates:readiness.missingGates,publishedHi:readiness.publishedHi,pendingHi:readiness.pendingHi,
    actualCounters:g.counters,ownedDirectoryExists:false,ownedChromeAbsent:true,
    realValidityUiVariantsAccepted:false,actualCurrentInternalNftFormsAccepted:false,actualSponsoredExecutionAccepted:false,
    completePositiveWireAuditorQualified:false,fullNFTAuthorizationAccepted:false,parentCompletion:false,
    auditProfilesOpened:0,auditNetworkRequests:0,auditSignatures:0,auditExecuteRequests:0,
    inputsSha256:Object.fromEntries(files.map(f => [path.resolve(f),sha(f)]))};
}
function main() {
  const [proofFile,guardFile,output] = process.argv.slice(2);assert(output && !fs.existsSync(output));
  const report = audit(proofFile,guardFile);
  fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({passed:true,actualGuardedCliNoIoRefusalVerified:true,scenarioMappings:6,actualCurrentNftAccepted:false}));
}
module.exports = {audit};
if (require.main === module) main();
