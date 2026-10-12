// Native negative preflight for existing coin/stake/withdraw approvals; no NFT requests.
const fs = require('node:fs'),path = require('node:path'),crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {RtdGrpcClient,GrpcTypes} = require('rtd-typescript/grpc');
const variants = require('./lib/C114-nft-validity-variants-v2.cjs');
const wire = require('./lib/C114-nft-wire-contract-v3.cjs');
const wallet = path.resolve(__dirname,'..'),logs = path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog');
const read = file => JSON.parse(fs.readFileSync(file,'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const message = 'Error checking transaction input objects: Feature is not supported: Timestamp-based transaction expiration is not yet supported';
async function main() {
  const [output] = process.argv.slice(2);assert(output && !fs.existsSync(output));
  const originalFile = path.join(logs,'20261008-C110-current-internal-gas-chrome-01.json');
  const auditedFile = path.join(logs,'20261008-C110-current-internal-gas-independent-01.json');
  const proof = read(originalFile),audit = read(auditedFile);
  assert(proof.passed && audit.passed && proof.currentC109UnsignedInternalAccepted && audit.currentC109UnsignedInternalAccepted);
  for (const q of [proof,audit]) for (const [f,h] of Object.entries(q.inputsSha256)) assert.equal(sha(f),h);
  assert.equal(audit.inputsSha256[originalFile],sha(originalFile));
  const sourceProof = read(path.join(logs,'20261008-C109-production-source-independent-01.json'));
  const source = require('./lib/C109-product-source-lineage.cjs').validate(sourceProof.originalSource,sourceProof.buildFile);
  assert.deepEqual(proof.source,source);assert.deepEqual(proof.cases.map(r => r.kind),['coin','stake','withdraw']);
  const frames = [],records = [],errors = [],originalFetch = globalThis.fetch;
  const url = 'http://127.0.0.1:41750/rtd.rpc.v2.TransactionExecutionService/SimulateTransaction';
  globalThis.fetch = async (input,init) => {
    const u = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(u.origin,'http://127.0.0.1:41750');
    assert(['/rtd.rpc.v2.LedgerService/GetServiceInfo','/rtd.rpc.v2.TransactionExecutionService/SimulateTransaction'].includes(u.pathname));
    const response = await originalFetch(input,init);
    frames.push({url:u.href,status:response.status,headers:Object.fromEntries(response.headers),
      requestBase64:Buffer.from(init?.body ?? []).toString('base64'),responseBase64:Buffer.from(await response.clone().arrayBuffer()).toString('base64')});
    return response;
  };
  let result;
  try {
    const client = new RtdGrpcClient({network:'localnet',baseUrl:'http://127.0.0.1:41750',format:'binary',fetch:globalThis.fetch,mvr:{url:''}});
    const before = (await client.ledgerService.getServiceInfo({},{timeout:20000})).response;
    assert.equal(before.chainId,proof.h0);assert(BigInt(before.epoch) > 0n);
    const selected = ['expiredEpoch','windowMinTimestamp','windowMaxTimestamp','validDuringMinTimestamp','validDuringMaxTimestamp'];
    for (const row of proof.cases) {
      const original = row.approval.prepared;assert(original);
      const generated = await variants.build(original);
      for (const name of selected) {
        const variant = generated.find(v => v.name === name);assert(variant);
        assert(variant.expired || variant.timestampUnsupported);assert.equal(variant.approvalEnabled,false);
        const canonical = wire.canonical(variant.bytesBase64);assert.equal(canonical.V1.sender,proof.owner);
        const expected = wire.canonical(original.bytesBase64),restored = structuredClone(canonical);
        restored.V1.expiration = expected.V1.expiration;assert.deepEqual(restored,expected);
        const start = frames.length;let refused = false;
        try {
          await client.transactionExecutionService.simulateTransaction({
            transaction:{bcs:{value:Buffer.from(variant.bytesBase64,'base64')}},
            checks:GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED,
            doGasSelection:canonical.V1.gasData.payment.length === 0 && BigInt(canonical.V1.gasData.price) > 0n,
            readMask:{paths:['transaction','command_outputs']},
          },{timeout:20000});
        } catch (error) {refused = true;assert(error instanceof Error)}
        assert(refused);assert.equal(frames.length-start,1);assert.equal(frames[start].url,url);
        const parsed = await wire.simulation(frames[start],variant,{allowFailure:true});
        assert(parsed.error);assert.equal(parsed.error.status,variant.expired ? 13 : 3);
        assert.equal(parsed.error.message,variant.expired ? 'Transaction Expired' : message);
        records.push({kind:row.kind,variant,expectedError:parsed.error,actualWireIndex:start,
          canonicalAllNonExpirationFieldsHeld:true,originalApprovalDigest:original.digest});
      }
    }
    const after = (await client.ledgerService.getServiceInfo({},{timeout:20000})).response;
    assert.equal(after.chainId,proof.h0);assert(BigInt(after.epoch) >= BigInt(before.epoch));
    assert.equal(records.length,15);assert.equal(frames.length,17);
    assert.equal(records.filter(r => r.expectedError.status === 3).length,12);
    assert.equal(records.filter(r => r.expectedError.status === 13).length,3);
    const files = [__filename,originalFile,auditedFile,require.resolve('./lib/C114-nft-validity-variants-v2.cjs'),
      require.resolve('./lib/C114-nft-wire-contract-v3.cjs'),require.resolve('./lib/C109-product-source-lineage.cjs')];
    result = {passed:true,observedAt:new Date().toISOString(),scope:'Actual native negative preflight of coin/stake/withdraw only; not UI, signing, successful simulation, runtime recovery authority or full parent acceptance.',
      source,h0:proof.h0,nativeEpochBefore:String(before.epoch),nativeEpochAfter:String(after.epoch),records,frames,
      actualNativeNonNftValidityRefusalsAccepted:true,actualTimestampHeaders:12,actualEpoch0Headers:3,
      actualEnabledNegativeSimulations:15,profilesOpened:0,privateKeysRead:0,nftInputs:0,signatures:0,executeRequests:0,
      databaseWrites:0,objectWrites:0,newContainers:0,signals:0,fullNonNftAuthorizationAccepted:false,
      actualValidityUiAccepted:false,newRuntimeAuthorityIssued:false,parentCompletion:false,
      inputsSha256:Object.fromEntries(files.map(f => [f,sha(f)]))};
  } catch (error) {
    process.exitCode = 1;result = {passed:false,observedAt:new Date().toISOString(),errorType:error.name,
      message:String(error.message).slice(0,800),records,frames,errors,profilesOpened:0,privateKeysRead:0,
      nftInputs:0,signatures:0,executeRequests:0,parentCompletion:false};
  } finally {globalThis.fetch = originalFetch}
  fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({passed:result.passed,actualTimestampHeaders:result.actualTimestampHeaders,
    actualEpoch0Headers:result.actualEpoch0Headers,nftInputs:0,errorType:result.errorType}));
}
if (require.main === module) main().catch(error => {console.error(JSON.stringify({passed:false,errorType:error.name,message:String(error.message).slice(0,500)}));process.exitCode = 1});
