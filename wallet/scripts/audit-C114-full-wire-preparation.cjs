// Independent complete source inverses, canonical historical wires and actual expired error headers.
const fs = require('node:fs'),path = require('node:path'),crypto = require('node:crypto'),assert = require('node:assert/strict');
const {GrpcTypes} = require('rtd-typescript/grpc');
const contract = require('./lib/C114-nft-wire-contract-v3.cjs'),parser = require('./lib/C88-post-write-bytes.cjs');
const wallet = path.resolve(__dirname,'..'),logs = path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog');
const read = f => JSON.parse(fs.readFileSync(f,'utf8')),sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function pins(p) {for (const [f,h] of Object.entries(p.inputsSha256)) assert.equal(sha(f),h)}
function inverse(p) {
  assert.equal(sha(p.old),p.originalSha256);assert.equal(sha(p.new),p.candidateSha256);let source = fs.readFileSync(p.new,'utf8');
  for (const row of [...p.deltas].reverse()) {assert.equal(source.split(row.toText).length-1,row.count);source = source.split(row.toText).join(row.fromText)}
  assert.equal(source,fs.readFileSync(p.old,'utf8'));
}
async function main() {
  const [output] = process.argv.slice(2);assert(output && !fs.existsSync(output));
  const qualifierFile = path.join(logs,'20261008-C114-full-wire-contract-qualified-03.json'),q = read(qualifierFile);assert(q.passed && q.preparedOnly);pins(q);
  assert.equal(q.completeRetainedSimulationFrames,24);assert.equal(q.completeGasSelections,6);assert.equal(q.canonicalFinalSimulations,18);assert.equal(q.mutatedWireRefusals,102);
  assert.equal(q.networkAttempts,0);assert.equal(q.actualCurrentInternalNftFormsAccepted,false);
  const prepFiles = ['20261008-C114-full-wire-audit-schema-prepared-02.json','20261008-C114-full-wire-audit-rtd-discriminator-prepared-03.json'].map(n => path.join(logs,n));
  for (const file of prepFiles) {const proof = read(file);assert(proof.passed && proof.preparedOnly);pins(proof);inverse(proof.completeHelperInverse);inverse(proof.completeQualifierInverse)}
  const oldFile = path.join(logs,'20261007-C48-nft-execution-browser-01.json'),old = read(oldFile);
  const names = ['direct','framework-ordinary','framework-listed','personal','originbyte-existing-target','originbyte-new-target'];
  const refusals = ['missing successful body','truncated successful body','checks disabled','changed final gas-selection flag',
    'proto sender changed','proto gas owner changed','proto gas price changed','proto gas budget changed','proto gas reference version changed',
    'proto expiration epoch changed','proto allowed proposer changed','proto effects digest changed','proto gas cost changed',
    'effects bytes truncated','object native digest changed','wrong NFT recipient','wrong NFT identity'];
  assert.deepEqual(q.rejects.map(r => [r.scenario,r.name,r.refused]),names.flatMap(name => refusals.map(rejection => [name,rejection,true])));
  const initialFetch = globalThis.fetch;let networkAttempts = 0;const canonicalRows = [],expiredMutants = [];
  globalThis.fetch = () => {networkAttempts++;throw Error('Full wire preparation audit is offline')};
  const C94File = path.join(logs,'20261008-C94-current-nft-core-authorization-03.json');
  const negativeFile = path.join(logs,'20261008-C114-internal-nft-preflight-01.json');
  let actualExpired;
  try {
    for (const row of old.previews) {
      const wires = old.simulations.filter(w => w.stage.startsWith(row.label+' '));assert.equal(wires.length,4);
      for (const [index,wire] of wires.entries()) {
        const request = GrpcTypes.SimulateTransactionRequest.fromBinary(parser.grpcBody(wire.requestBase64,false));
        const checked = await contract.simulation(wire,row.approval.prepared,{resolution:!request.transaction.bcs?.value,item:{route:row.route,objectId:row.id,objectType:row.approval.prepared.input.objectType,to:row.to}});
        canonicalRows.push({scenario:row.label,index,gasSelection:checked.gasSelection === true,canonicalFinal:checked.canonicalFinalBytesAndEffects === true,outcome:checked.outcome});
      }
    }
    const C94 = read(C94File);assert(C94.passed);pins(C94);
    const candidates = C94.frames.filter(w => w.url.endsWith('/SimulateTransaction') && w.headers?.['grpc-status'] === '13' && !w.responseBase64);assert.equal(candidates.length,1);
    const wire = candidates[0],request = GrpcTypes.SimulateTransactionRequest.fromBinary(parser.grpcBody(wire.requestBase64,false)),bytes = Buffer.from(request.transaction.bcs.value),prepared = {bytesBase64:bytes.toString('base64'),digest:parser.typed('TransactionData',bytes)};
    assert.equal(contract.canonical(prepared.bytesBase64).V1.expiration.Epoch,'0');
    actualExpired = (await contract.simulation(wire,prepared,{allowFailure:true})).error;
    assert.equal(actualExpired.status,13);assert.equal(actualExpired.message,'Transaction Expired');
    for (const [name,change] of [
      ['missing status details',w => {delete w.headers['grpc-status-details-bin']}],
      ['changed status code',w => {w.headers['grpc-status'] = '14'}],
      ['changed error message',w => {w.headers['grpc-message'] = 'different error'}],
      ['success headers with no body',w => {w.headers['grpc-status'] = '0'}],
      ['malformed binary status',w => {w.headers['grpc-status-details-bin'] = 'AAAA'}],
    ]) {const changed = structuredClone(wire);change(changed);await assert.rejects(() => contract.simulation(changed,prepared,{allowFailure:true}));expiredMutants.push({name,refused:true})}
    const positive = require('./audit-C114-current-internal-nft-authorization.cjs');
    await assert.rejects(() => positive.audit(negativeFile));
  } finally {globalThis.fetch = initialFetch}
  assert.equal(networkAttempts,0);assert.equal(canonicalRows.length,24);
  const environment = require('./lib/C113-current-nft-environment.cjs'),lineage = require('./lib/C109-product-source-lineage.cjs');
  const source = lineage.validate(read(lineage.qualificationFile).originalSource,environment.buildFile);environment.validateOrigin();
  const files = [__filename,qualifierFile,...prepFiles,oldFile,C94File,negativeFile,
    path.join(__dirname,'audit-C114-current-internal-nft-authorization.cjs'),
    path.join(__dirname,'test-C114-current-internal-nft-authorization.cjs'),
    path.join(wallet,'src/shared/rpc/originbyte-kiosk.ts'),
    require.resolve('./lib/C114-nft-wire-contract-v3.cjs'),require.resolve('./lib/C88-post-write-bytes.cjs'),...environment.pins];
  const proof = {passed:true,observedAt:new Date().toISOString(),preparedOnly:true,source,
    fullOriginalHelperAndQualifierInversesHeld:true,completeHistoricalCanonicalFrames:24,completeGasSelections:6,canonicalFinals:18,
    originalMutationRefusalsIndependentlyEnumerated:102,actualRecordedExpiredEpochError:actualExpired,
    expiredHeaderMutantsRefused:expiredMutants,positiveAuditorRejectedActualUncoveredInput:true,
    currentNftDriverAndPositiveAuditorSourcesPinned:true,allSixRouteOwnershipOutcomes:canonicalRows,
    networkAttempts,profilesOpened:0,signatures:0,executeRequests:0,newContainers:0,signals:0,
    actualCurrentInternalNftFormsAccepted:false,realValidityUiVariantsAccepted:false,actualSponsoredExecutionAccepted:false,
    completeCurrentPositiveMatrixAccepted:false,fullNFTAuthorizationAccepted:false,parentCompletion:false,
    inputsSha256:Object.fromEntries(files.map(f => [f,sha(f)]))};
  fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({passed:true,preparedOnly:true,completeFrames:24,canonicalFinals:18,expiredHeaderRefusals:5,networkAttempts:0}));
}
if (require.main === module) main().catch(error => {console.error(JSON.stringify({passed:false,errorType:error.name,message:String(error.message).slice(0,600)}));process.exitCode = 1});
