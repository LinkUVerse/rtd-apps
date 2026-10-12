// Qualification uses complete retained C48 wires only. It never opens a reader or browser.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const {GrpcTypes} = require('rtd-typescript/grpc');
const {bcs} = require('rtd-typescript/bcs');
const {toBase64} = require('rtd-typescript/utils');
const contract = require('./lib/C114-nft-wire-contract-v3.cjs'), parser = require('./lib/C88-post-write-bytes.cjs');
const wallet = path.resolve(__dirname,'..'),logs = path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog');
const read = f => JSON.parse(fs.readFileSync(f,'utf8')),sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function encode(type,value,reply=false) {
  const body = Buffer.from(type.toBinary(value)),prefix = Buffer.alloc(5);prefix.writeUInt32BE(body.length,1);
  if (!reply) return Buffer.concat([prefix,body]).toString('base64');
  const trailer = Buffer.from('grpc-status:0\r\n'),tail = Buffer.alloc(5);tail[0] = 128;tail.writeUInt32BE(trailer.length,1);
  return Buffer.concat([prefix,body,tail,trailer]).toString('base64');
}
async function main() {
  const [output] = process.argv.slice(2);assert(output && !fs.existsSync(output));
  const oldFile = path.join(logs,'20261007-C48-nft-execution-browser-01.json'),old = read(oldFile),approvedFile = path.join(logs,'20261007-C48-nft-execution-browser-independent-02.json'),approved = read(approvedFile);
  assert(old.passed && approved.passed);for (const p of [old,approved]) for (const [f,h] of Object.entries(p.inputsSha256)) assert.equal(sha(f),h);
  const failureFile = path.join(logs,'20261008-C114-full-wire-contract-qualified-01.json');assert.equal(read(failureFile).passed,false);
  const priorFile = path.join(logs,'20261008-C114-full-wire-contract-qualified-02.json'),prior = read(priorFile);assert(prior.passed && prior.completeRetainedSimulationFrames === 24 && prior.mutatedWireRefusals === 102);
  const formerFetch = globalThis.fetch;let attemptedNetwork = 0;
  globalThis.fetch = () => {attemptedNetwork++;throw Error('Wire qualification is offline')};
  const successes = [],rejects = [];let failure;
  try {
    const previews = old.previews;assert.deepEqual(previews.map(p => p.label),['direct','framework-ordinary','framework-listed','personal','originbyte-existing-target','originbyte-new-target']);
    assert.equal(old.simulations.length,24);
    for (const row of previews) {
      const prepared = row.approval.prepared,item = {name:row.label,route:row.route,objectId:row.id,objectType:prepared.input.objectType,to:row.to};
      const wires = old.simulations.filter(w => w.stage.startsWith(row.label + ' '));assert.equal(wires.length,4);
      for (const [index,w] of wires.entries()) {
        const request = GrpcTypes.SimulateTransactionRequest.fromBinary(parser.grpcBody(w.requestBase64,false)),resolution = !request.transaction.bcs?.value;
        const checked = await contract.simulation(w,prepared,{resolution,item});
        successes.push({scenario:row.label,index,stage:w.stage,kind:resolution ? 'complete-kind-gas-selection' : 'canonical-final',abi:checked.abi?.abi,objects:checked.objects?.length,outcome:checked.outcome});
      }
      const finalWire = wires.find(w => GrpcTypes.SimulateTransactionRequest.fromBinary(parser.grpcBody(w.requestBase64,false)).transaction.bcs?.value);assert(finalWire);
      const reject = async (name,wire=structuredClone(finalWire),grant=prepared,route=item) => {
        let refused = false;try {await contract.simulation(wire,grant,{item:route})} catch {refused = true}
        assert(refused,name);rejects.push({scenario:row.label,name,refused:true});
      };
      await reject('missing successful body',{...finalWire,responseBase64:undefined});
      await reject('truncated successful body',{...finalWire,responseBase64:Buffer.from(finalWire.responseBase64,'base64').subarray(0,-1).toString('base64')});
      const request = GrpcTypes.SimulateTransactionRequest.fromBinary(parser.grpcBody(finalWire.requestBase64,false)),response = GrpcTypes.SimulateTransactionResponse.fromBinary(parser.grpcBody(finalWire.responseBase64,true));
      const wrongChecks = structuredClone(request);wrongChecks.checks = GrpcTypes.SimulateTransactionRequest_TransactionChecks.DISABLED;
      await reject('checks disabled',{...finalWire,requestBase64:encode(GrpcTypes.SimulateTransactionRequest,wrongChecks)});
      const wrongSelection = structuredClone(request);wrongSelection.doGasSelection = !wrongSelection.doGasSelection;
      await reject('changed final gas-selection flag',{...finalWire,requestBase64:encode(GrpcTypes.SimulateTransactionRequest,wrongSelection)});
      const changeResponse = async (name,change) => {const r = structuredClone(response);change(r);await reject(name,{...finalWire,responseBase64:encode(GrpcTypes.SimulateTransactionResponse,r,true)})};
      await changeResponse('proto sender changed',r => {r.transaction.transaction.sender = '0x' + '3'.repeat(64)});
      await changeResponse('proto gas owner changed',r => {r.transaction.transaction.gasPayment.owner = '0x' + '3'.repeat(64)});
      await changeResponse('proto gas price changed',r => {r.transaction.transaction.gasPayment.price += 1n});
      await changeResponse('proto gas budget changed',r => {r.transaction.transaction.gasPayment.budget += 1n});
      await changeResponse('proto gas reference version changed',r => {r.transaction.transaction.gasPayment.objects[0].version += 1n});
      await changeResponse('proto expiration epoch changed',r => {r.transaction.transaction.expiration.epoch += 1n});
      await changeResponse('proto allowed proposer changed',r => {r.transaction.transaction.expiration.allowedProposers.proposers = [999]});
      await changeResponse('proto effects digest changed',r => {r.transaction.effects.transactionDigest = '11111111111111111111111111111111'});
      await changeResponse('proto gas cost changed',r => {r.transaction.effects.gasUsed.computationCost += 1n});
      await changeResponse('effects bytes truncated',r => {r.transaction.effects.bcs.value = r.transaction.effects.bcs.value.subarray(0,-1)});
      await changeResponse('object native digest changed',r => {r.transaction.objects.objects[0].digest = '11111111111111111111111111111111'});
      await reject('wrong NFT recipient',finalWire,prepared,{...item,to:'0x' + '3'.repeat(64)});
      await reject('wrong NFT identity',finalWire,prepared,{...item,objectId:'0x' + '3'.repeat(64)});
    }
    assert.equal(successes.length,24);assert.equal(successes.filter(r => r.kind === 'complete-kind-gas-selection').length,6);assert.equal(rejects.length,102);
  } catch (error) {failure = {errorType:error.name,message:String(error.message).slice(0,900)};process.exitCode = 1}
  finally {globalThis.fetch = formerFetch}
  assert.equal(attemptedNetwork,0);
  const files = [__filename,oldFile,approvedFile,failureFile,priorFile,require.resolve('./lib/C114-nft-wire-contract-v3.cjs'),require.resolve('./lib/C88-post-write-bytes.cjs'),require.resolve('./lib/audit-legacy-shared-kind.cjs')];
  const p = {passed:!failure,observedAt:new Date().toISOString(),preparedOnly:true,historicalCurrentBusinessAccepted:false,
    historicalSixCanonicalApprovalsAudited:!failure ? 6 : false,completeRetainedSimulationFrames:successes.length,
    completeGasSelections:successes.filter(r => r.kind === 'complete-kind-gas-selection').length,
    canonicalFinalSimulations:successes.filter(r => r.kind === 'canonical-final').length,mutatedWireRefusals:rejects.length,
    successes,rejects,failure,networkAttempts:attemptedNetwork,profilesOpened:0,signatures:0,executeRequests:0,
    actualCurrentInternalNftFormsAccepted:false,realValidityUiVariantsAccepted:false,actualSponsoredExecutionAccepted:false,parentCompletion:false,
    inputsSha256:Object.fromEntries(files.map(f => [f,sha(f)]))};
  fs.writeFileSync(output,JSON.stringify(p,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({passed:p.passed,completeRetainedSimulationFrames:p.completeRetainedSimulationFrames,canonicalFinalSimulations:p.canonicalFinalSimulations,mutatedWireRefusals:p.mutatedWireRefusals,failure}));
}
if (require.main === module) main().catch(error => {console.error(JSON.stringify({passed:false,errorType:error.name,message:String(error.message).slice(0,450)}));process.exitCode = 1});
