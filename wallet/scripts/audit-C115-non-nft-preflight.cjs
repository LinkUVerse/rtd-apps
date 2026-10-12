// Independent actual wire replay and ordinary installed-byte comparison; no network.
const fs = require('node:fs'),path = require('node:path'),crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {bcs} = require('rtd-typescript/bcs'),{toBase64} = require('rtd-typescript/utils');
const {GrpcTypes} = require('rtd-typescript/grpc');
const contract = require('./lib/C114-nft-wire-contract-v3.cjs'),parser = require('./lib/C88-post-write-bytes.cjs');
const wallet = path.resolve(__dirname,'..'),logs = path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog');
const read = f => JSON.parse(fs.readFileSync(f,'utf8')),sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const resolveRecorded = f => path.isAbsolute(f) ? f : path.resolve(wallet,f);
const pins = q => {for (const [f,h] of Object.entries(q.inputsSha256 ?? q.sourcePins)) assert.equal(sha(resolveRecorded(f)),h)};
const names = ['expiredEpoch','windowMinTimestamp','windowMaxTimestamp','validDuringMinTimestamp','validDuringMaxTimestamp'];
function expectedVariant(base,name) {
  const original = contract.canonical(base.bytesBase64),data = structuredClone(original),d = data.V1;
  assert(['Validity','ValidDuring'].includes(d.expiration.$kind));const window = d.expiration[d.expiration.$kind];
  assert.equal(window.minTimestamp,null);assert.equal(window.maxTimestamp,null);
  if (name === 'expiredEpoch') d.expiration = {$kind:'Epoch',Epoch:'0'};
  else if (name.startsWith('validDuring')) {
    const {minEpoch,maxEpoch,minTimestamp,maxTimestamp,chain,nonce} = window;
    d.expiration = {$kind:'ValidDuring',ValidDuring:{minEpoch,maxEpoch,minTimestamp,maxTimestamp,chain,nonce}};
    d.expiration.ValidDuring[name === 'validDuringMinTimestamp' ? 'minTimestamp' : 'maxTimestamp'] = name === 'validDuringMinTimestamp' ? '1' : '18446744073709551615';
  } else window[name === 'windowMinTimestamp' ? 'minTimestamp' : 'maxTimestamp'] = name === 'windowMinTimestamp' ? '1' : '18446744073709551615';
  const bytesBase64 = toBase64(bcs.TransactionData.serialize(data).toBytes());
  return {bytesBase64,digest:parser.typed('TransactionData',Buffer.from(bytesBase64,'base64')),data};
}
async function audit() {
  const wrapperFile = path.join(logs,'20261008-C115-non-nft-native-validity-01.json'),wrapper = read(wrapperFile);
  assert(wrapper.passed && wrapper.originalNativeProcessAndListenerHeld && wrapper.sourceAndEightDebugHeld);pins(wrapper);
  assert.equal(wrapper.nftInputs,0);assert.equal(wrapper.newRuntimeAuthorityIssued,false);assert.equal(wrapper.parentCompletion,false);
  const nativeFile = resolveRecorded(wrapper.nativeEvidence),native = read(nativeFile);pins(native);
  const originalFile = path.join(logs,'20261008-C110-current-internal-gas-chrome-01.json'),original = read(originalFile);
  assert(native.passed && native.actualNativeNonNftValidityRefusalsAccepted && original.passed);pins(original);
  assert.deepEqual(native.source,original.source);assert.equal(native.h0,original.h0);
  assert.equal(native.records.length,15);assert.equal(native.frames.length,17);
  const initialFetch = globalThis.fetch;let networkAttempts = 0,mutants = 0;const rows = [];
  globalThis.fetch = () => {networkAttempts++;throw Error('Independent audit is offline')};
  try {
    for (const [i,row] of native.records.entries()) {
      const kind = ['coin','stake','withdraw'][Math.floor(i/5)],name = names[i%5];
      assert.equal(row.kind,kind);assert.equal(row.variant.name,name);assert.equal(row.actualWireIndex,i+1);
      const base = original.cases.find(r => r.kind === kind).approval.prepared,expected = expectedVariant(base,name);
      assert.equal(row.originalApprovalDigest,base.digest);assert.equal(row.variant.bytesBase64,expected.bytesBase64);assert.equal(row.variant.digest,expected.digest);
      assert.equal(row.variant.approvalEnabled,false);assert.equal(row.variant.expired,name === 'expiredEpoch');assert.equal(row.variant.timestampUnsupported,name !== 'expiredEpoch');
      const frame = native.frames[i+1],value = await contract.simulation(frame,row.variant,{allowFailure:true});
      assert(value.error);assert.deepEqual(value.error,row.expectedError);assert.equal(value.error.status,name === 'expiredEpoch' ? 13 : 3);
      assert.equal(value.error.message,name === 'expiredEpoch' ? 'Transaction Expired' : 'Error checking transaction input objects: Feature is not supported: Timestamp-based transaction expiration is not yet supported');
      await assert.rejects(() => contract.simulation({...frame,status:503},row.variant,{allowFailure:true}));mutants++;
      await assert.rejects(() => contract.simulation(frame,{...row.variant,digest:base.digest},{allowFailure:true}));mutants++;
      const request = GrpcTypes.SimulateTransactionRequest.fromBinary(parser.grpcBody(frame.requestBase64,false));
      request.checks = GrpcTypes.SimulateTransactionRequest_TransactionChecks.DISABLED;
      const bytes = Buffer.from(GrpcTypes.SimulateTransactionRequest.toBinary(request)),header = Buffer.alloc(5);header.writeUInt32BE(bytes.length,1);
      await assert.rejects(() => contract.simulation({...frame,requestBase64:Buffer.concat([header,bytes]).toString('base64')},row.variant,{allowFailure:true}));mutants++;
      rows.push({kind,variant:name,digest:expected.digest,actualErrorStatus:value.error.status,completeDetailsBase64:value.error.detailsBase64,
        fullCanonicalOriginalNonExpirationFieldsHeld:true});
    }
    for (const frame of [native.frames[0],native.frames.at(-1)]) {
      assert.equal(frame.url,'http://127.0.0.1:41750/rtd.rpc.v2.LedgerService/GetServiceInfo');assert.equal(frame.status,200);
      GrpcTypes.GetServiceInfoRequest.fromBinary(parser.grpcBody(frame.requestBase64,false));
      const response = GrpcTypes.GetServiceInfoResponse.fromBinary(parser.grpcBody(frame.responseBase64,true));assert.equal(response.chainId,native.h0);assert(BigInt(response.epoch)>0n);
    }
  } finally {globalThis.fetch = initialFetch}
  assert.equal(networkAttempts,0);assert.equal(mutants,45);
  const installedFile = path.join(logs,'20261008-C115-ordinary-bytecode-01.json'),installed = read(installedFile);pins(installed);
  const startedFile = path.join(logs,'20261007-C51-ordinary-chrome-started-01.json'),started = read(startedFile);pins(started);
  assert(installed.passed && installed.actualUiStaticBytesAccepted && installed.actualWorkerStaticBytesAccepted && installed.completeInstalledBytecodeAccepted);
  assert.equal(installed.origin,started.expectedOrigin);assert.equal(installed.ordinaryChromeVersion,started.ordinaryChromeVersion);
  assert.deepEqual(installed.allowedProtocolMethods,['Debugger.enable','Debugger.getScriptSource','Debugger.disable']);
  for (const key of ['runtimeOrDomEvaluations','uiActions','accountOrCredentialReads','permissionsChanged','signatures','executeRequests']) assert.equal(installed[key],0);
  for (const row of installed.scripts) {
    assert(row.url.startsWith(installed.origin+'/'));assert.equal(row.sha256,sha(row.artifact));assert.equal(row.bytes,fs.statSync(row.artifact).size);
    assert.equal(started.inputsSha256[row.artifact],row.sha256);
  }
  assert(installed.scripts.some(r => r.targetType === 'service_worker' && path.basename(r.artifact) === 'background.js'));
  const inventoryFile = path.join(logs,'20261008-C115-ordinary-owned-target-inventory-01.json'),inventory = read(inventoryFile);
  assert(inventory.passed && inventory.commandHashHeld);assert.equal(inventory.browserPid,started.browserPid);
  assert(inventory.ownTargets.some(t => t.type === 'page' && t.url.includes('#/accounts/protect-account')));
  const fineFile = path.join(wallet,'migrationToGRpcOrGraphQLDoc/remainingAcceptanceProgress.json');
  assert.equal(sha(fineFile),'029d59417b1cce5b963bdb64172900ff1b663c1f193065358b233e3145bf509b');
  const files = [__filename,wrapperFile,nativeFile,originalFile,installedFile,startedFile,inventoryFile,fineFile,
    require.resolve('./lib/C114-nft-wire-contract-v3.cjs'),require.resolve('./lib/C88-post-write-bytes.cjs')];
  return {passed:true,observedAt:new Date().toISOString(),scope:'Complete recorded actual non-NFT negative preflight and installed ordinary C46 bytecode only.',
    actualNonNftNativeErrorsIndependentlyAccepted:true,actualTimestampErrors:12,actualEpoch0Errors:3,enabledNegativeSimulations:15,
    nativeFramesIndependentlyReplayed:17,actualWireMutantsRejected:45,canonicalOriginalFieldsHeld:true,
    actualInstalledC46UiAndWorkerBytesAccepted:true,currentC109OrdinaryUpgradeAccepted:false,
    original98AndFineWeightsHeld:true,nativeRows:rows,networkAttempts,auditProfilesOpened:0,auditSignatures:0,auditExecuteRequests:0,nftInputs:0,
    ordinaryInitializationAccepted:false,ordinaryTlsAccepted:false,actualValidityUiAccepted:false,
    fullNonNftAuthorizationAccepted:false,fullNonNftPhaseAccepted:false,newRuntimeAuthorityIssued:false,parentCompletion:false,
    inputsSha256:Object.fromEntries(files.map(f => [f,sha(f)]))};
}
async function main() {
  const [output] = process.argv.slice(2);assert(output && !fs.existsSync(output));const result = await audit();
  fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({passed:true,actualNonNftTimestampErrors:12,actualEpoch0Errors:3,wireMutants:45,ordinaryInstalledBytes:true,fullPhaseAccepted:false}));
}
module.exports = {audit,expectedVariant};
if (require.main === module) main().catch(error => {console.error(JSON.stringify({passed:false,errorType:error.name,message:String(error.message).slice(0,800)}));process.exitCode = 1});
