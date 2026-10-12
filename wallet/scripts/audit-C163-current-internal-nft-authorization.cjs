// Complete current six-scenario clone-parameter matrix audit. Refusals use a separate auditor.
const fs = require('node:fs'),path = require('node:path'),crypto = require('node:crypto'),cp = require('node:child_process');
const assert = require('./lib/C158-bounded-strict-assert.cjs'),{GrpcTypes,RtdGrpcClient} = require('rtd-typescript/grpc');
const {bcs} = require('rtd-typescript/bcs'),{Transaction} = require('rtd-typescript/transactions');
const {toBase64} = require('rtd-typescript/utils');
const contract = require('./lib/C114-nft-wire-contract-v3.cjs'),parser = require('./lib/C88-post-write-bytes.cjs');
const environment = require('./lib/C161-current-nft-environment.cjs'),gate = require('./lib/C161-current-nft-inventory-contract.cjs');
const wallet = path.resolve(__dirname,'..'),logs = path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog');
const read = f => JSON.parse(fs.readFileSync(f,'utf8')),sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const pins = q => {for (const [f,h] of Object.entries(q.inputsSha256)) assert.equal(sha(f),h)};
const names = ['direct','framework-ordinary','framework-listed','personal','originbyte-existing-target','originbyte-new-target'];
const changes = ['gasBudget','gasPrice','sender','sponsor','expirationNone','expiredEpoch','expirationLargeEpoch','unsupportedTimestamp','invalidCanonicalBytes'];
function prepared(approval,item,owner) {
  const p = approval.prepared;assert(approval.requestId && p);const d = contract.canonical(p.bytesBase64);
  assert.equal(d.V1.sender,owner);assert.equal(p.sender,owner);assert.equal(p.route,item.route);
  assert.equal(p.input.objectId,item.objectId);assert.equal(p.input.to,item.to);
  assert.equal(p.gasOwner,d.V1.gasData.owner);assert.equal(p.gasPrice,d.V1.gasData.price);assert.equal(p.gasBudget,d.V1.gasData.budget);
  assert.equal(p.digest,parser.typed('TransactionData',parser.base64(p.bytesBase64)));contract.route(d,{...item,objectType:p.input.objectType});
  return p;
}
function onlyChange(base,variant,name,p) {
  const original = contract.canonical(base.bytesBase64);assert.equal(variant.originalDigest,base.digest);
  if (name === 'invalidCanonicalBytes') {assert.equal(variant.bytesBase64,'invalid-bcs');assert.equal(variant.digest,null);return}
  const expected = structuredClone(original),d = expected.V1;
  if (name === 'gasBudget') d.gasData.budget = String(BigInt(d.gasData.budget)+1000n);
  else if (name === 'gasPrice') d.gasData.price = String(BigInt(d.gasData.price)+1n);
  else if (name === 'sender') d.sender = p.sponsorObjectBefore.owner.AddressOwner;
  else if (name === 'sponsor') {d.gasData.owner = p.sponsorObjectBefore.owner.AddressOwner;d.gasData.payment = [p.sponsorCoin]}
  else if (name === 'expirationNone') d.expiration = {$kind:'None',None:true};
  else if (name === 'expiredEpoch') d.expiration = {$kind:'Epoch',Epoch:'0'};
  else if (name === 'expirationLargeEpoch') d.expiration = {$kind:'Epoch',Epoch:'9007199254740993'};
  else {assert.equal(name,'unsupportedTimestamp');assert(['Validity','ValidDuring'].includes(d.expiration.$kind));d.expiration[d.expiration.$kind].minTimestamp = '1'}
  contract.canonical(variant.bytesBase64);assert.equal(toBase64(bcs.TransactionData.serialize(expected).toBytes()),variant.bytesBase64);
  assert.notEqual(variant.bytesBase64,base.bytesBase64);assert.equal(variant.digest,parser.typed('TransactionData',parser.base64(variant.bytesBase64)));assert.notEqual(variant.digest,base.digest);
}
function sourceLocation(location,injection,base,variant,build) {
  const bundle = path.join(build.output,location.bundle),mapFile = bundle+'.map',sourceFile = path.join(wallet,'src/shared/rpc/nft-transfer-preparation.ts');
  const dependency = path.resolve(__dirname,'../../node_modules/.pnpm/source-map@0.6.1/node_modules/source-map');
  assert.equal(location.bundleSha256,sha(bundle));assert.equal(location.mapSha256,sha(mapFile));assert.equal(location.producerSha256,sha(sourceFile));assert.equal(location.dependencySha256,sha(require.resolve(dependency)));
  assert(location.loadedBundleEqualsDisk && location.mappedProducerEqualsDisk);
  const source = fs.readFileSync(sourceFile,'utf8'),map = read(mapFile),{SourceMapConsumer} = require(dependency),consumer = new SourceMapConsumer(map);
  const mapSources = consumer.sources.filter(s => s.endsWith('/shared/rpc/nft-transfer-preparation.ts'));assert.equal(mapSources.length,1);assert.equal(consumer.sourceContentFor(mapSources[0]),source);
  for (const [key,needle,variable] of [['receiver','rpc.simulateTransaction(','rpc'],['prepared','prepared.bytesBase64,','prepared']]) {
    const offset = source.indexOf(needle,source.indexOf('export async function revalidateNftTransfer('));assert(offset >= 0);const prefix = source.slice(0,offset),original = {source:mapSources[0],line:prefix.split('\n').length,column:prefix.split('\n').at(-1).length};
    assert.deepEqual(location[key].original,original);assert.deepEqual(location[key].generated,consumer.generatedPositionFor(original));assert.deepEqual(location[key].reverse,consumer.originalPositionFor(location[key].generated));assert.equal(location[key].reverse.name,variable);
  }
  const body = fs.readFileSync(bundle,'utf8').split('\n'),receiver = /^([A-Za-z_$][\w$]*)\.simulateTransaction\(/.exec(body[location.receiver.generated.line-1].slice(location.receiver.generated.column))?.[1],argument = /^([A-Za-z_$][\w$]*)\.bytesBase64/.exec(body[location.prepared.generated.line-1].slice(location.prepared.generated.column))?.[1];
  assert(receiver && argument);assert.equal(argument,location.generatedParameter);
  assert.equal(location.actualLocation.lineNumber,location.receiver.generated.line-1);assert.equal(location.actualLocation.columnNumber,location.receiver.generated.column+receiver.length+1);assert.deepEqual(injection.actualCallFrameLocation,location.actualLocation);
  const projection = Object.fromEntries(['bytesBase64','digest','gasBudget','sender','bindingKey','readSessionKey','input'].map(k => [k,base[k]]));
  assert.deepEqual(injection.before,projection);assert.deepEqual(injection.after,{...projection,bytesBase64:variant.bytesBase64});assert.equal(injection.injectedOnlyClonedParameterBytes,true);
  return {bundle,mapFile,sourceFile,dependency};
}
async function audit(proofFile) {
  const p = read(proofFile);assert(p.passed && p.mode === 'current-six-internal-nft-cloned-parameter-matrix');
  assert(p.currentUnsignedInternalNftClonedParameterMatrixAccepted && p.explicitClonedParameterFaultOnly && !p.originalApprovalObjectsModified);
  assert(p.ownExistingStartupUiReused && p.extraStartupPagesCreated === 0 && p.profilesOpened === 1 && p.ownedChromeNaturallyClosed);
  assert.equal(p.signatures,0);assert.equal(p.executeRequests,0);assert.equal(p.realValidityUiVariantsAccepted,false);assert.equal(p.actualSponsoredExecutionAccepted,false);assert.equal(p.fullNFTAuthorizationAccepted,false);assert.equal(p.parentCompletion,false);
  assert.deepEqual(p.forbidden,[]);assert.deepEqual(p.pageErrors,[]);pins(p);
  const inventory = read(p.inventoryFile),inventoryAudit = read(p.inventoryAuditFile),readiness = read(p.readinessFile);
  for (const q of [inventory,inventoryAudit,readiness]) {assert(q.passed);pins(q)}
  assert(inventory.indexedFixtureAccepted && inventoryAudit.allFourteenCanonicalObjectsAccepted);assert.equal(inventoryAudit.inputsSha256[p.inventoryFile],sha(p.inventoryFile));
  gate.admission(readiness,Date.parse(p.positiveAdmissionAt));
  assert.equal(p.h0,inventory.h0);const build = environment.validateBuild(environment.buildFile,environment.profileFile);
  assert.deepEqual(p.source,build.sourceAfter);environment.held(path.join(inventory.fixture,'intent.json'));
  assert.equal(p.workerSource.workerSha256,build.artifacts['background.js']);assert(p.workerSource.matchesDisk && p.uiSource.matchesDisk);
  for (const row of p.uiSource.loadedBundles) assert.equal(row.loadedSha256,build.artifacts[row.file]);
  const oracleFile = path.join(logs,'20261008-C93-recovered-native-independent-01.json'),oracle = read(oracleFile);pins(oracle);
  const forms = require('./test-C114-current-internal-nft-authorization.cjs').forms(oracle);assert.deepEqual(p.forms,forms);assert.deepEqual(forms.map(f => f.name),names);
  assert.equal(p.owner,oracle.addresses.source);assert.equal(p.cases.length,54);assert.equal(p.recipients.length,6);assert.equal(p.surfaces.length,120);
  assert(p.surfaces.every(s => s.extensionUiPages === 1));assert.deepEqual(p.initialJournal,p.finalJournal);assert(Object.values(p.initialJournal).every(rows => rows.length === 0));assert.equal(p.cipherBefore,p.cipherAfter);
  assert.deepEqual(p.nativeBefore,p.nativeAfter);assert.equal(p.nativeBefore.length,14);assert.deepEqual(p.sponsorObjectBefore,p.sponsorObjectAfter);assert.equal(p.sponsorObjectBefore.owner.AddressOwner,oracle.addresses.sponsor);
  assert.deepEqual(p.sponsorCoin,{objectId:p.sponsorObjectBefore.objectId,version:p.sponsorObjectBefore.version,digest:p.sponsorObjectBefore.digest});
  const ids = p.nativeBefore.map(o => o.objectId);
  const before = parser.nativeObjects(p.frames.filter(f => f.channel === 'native' && f.phase === 'native before'),ids);
  const after = parser.nativeObjects(p.frames.filter(f => f.channel === 'native' && f.phase === 'normal relock and complete unchanged state'),ids);
  assert.deepEqual(before,after);
  for (const row of p.nativeBefore) {const value = before.get(row.objectId);assert(value);for (const k of ['version','digest','type']) assert.equal(value[k],row[k]);assert.deepEqual(value.owner,row.owner);assert.equal(value.content.toString('base64'),row.contentBase64);assert.equal(value.objectBcs.toString('base64'),row.objectBcsBase64)}
  const sponsorFrames = p.frames.filter(f => f.channel === 'native' && f.phase === 'fresh sponsor coins');
  const sponsor = parser.nativeObjects(sponsorFrames,[p.sponsorCoin.objectId]);const originalSponsor = sponsor.get(p.sponsorCoin.objectId);
  assert.equal(originalSponsor.objectBcs.toString('base64'),p.sponsorObjectBefore.objectBcsBase64);
  const points = new Map(),selection = [],audited = [],sourceFiles = new Set();let finals = 0,selections = 0,expired = 0,timestampUnsupported = 0;
  const contexts = state => {assert(state.contexts.length);for (const c of state.contexts) {const key = JSON.parse(c.assetSnapshotKey);assert.equal(key[0],c.readSessionKey);assert(BigInt(key[2]) >= 696489n);assert(JSON.parse(c.bindingKey).includes(p.h0));if (points.has(String(key[2]))) assert.equal(points.get(String(key[2])),key[3]);points.set(String(key[2]),key[3])}};
  const addWire = wire => {assert(p.frames.some(f => JSON.stringify(f) === JSON.stringify(wire)));selection.push(wire)};
  const preview = async (approval,state,wires,item) => {
    const base = prepared(approval,item,p.owner);assert.equal(wires.length,2);contexts(state);assert.deepEqual(state.approvals,[approval]);
    for (const w of wires) addWire(w);
    await contract.simulation(wires[0],base,{resolution:true,item:{...item,objectType:base.input.objectType}});selections++;
    const final = await contract.simulation(wires[1],base,{item:{...item,objectType:base.input.objectType}});assert(final.success);finals++;
    const caps = [oracle.frameworkCap,oracle.personalCap];
    if (item.route === 'framework-kiosk' || item.route === 'personal-kiosk') {
      const kind = final.data.V1.kind.ProgrammableTransaction,call = kind.commands.find(c => c.MoveCall?.function === (item.route === 'personal-kiosk' ? 'borrow_val' : 'take')).MoveCall;
      const argument = call.arguments[item.route === 'personal-kiosk' ? 0 : 1],input = kind.inputs[argument.Input].Object,cap = input[input.$kind],expected = caps[item.route === 'personal-kiosk' ? 1 : 0];assert.equal(cap.objectId,expected.objectId);assert.equal(cap.version,expected.version);assert.equal(cap.digest,expected.digest);
    }
    return {base,final};
  };
  for (const [index,row] of p.cases.entries()) {
    const item = forms[Math.floor(index/changes.length)];assert.equal(row.name,item.name);assert.equal(row.mutation,changes[index%changes.length]);
    const original = await preview(row.originalApproval,row.originalState,row.originalSimulations,item);onlyChange(original.base,row.variant,row.mutation,p);
    const source = sourceLocation(row.sourceProof,row.injection,original.base,row.variant,build);for (const f of [source.bundle,source.mapFile,source.sourceFile,require.resolve(source.dependency)]) sourceFiles.add(f);
    assert(p.uiSource.loadedBundles.some(b => b.file === row.sourceProof.bundle && b.loadedSha256 === row.sourceProof.bundleSha256));
    assert(row.textBefore.includes(original.base.digest) && row.textAfter.includes(original.base.digest));if (row.variant.digest) assert(!row.textAfter.includes(row.variant.digest));
    assert.notEqual(row.freshApproval.requestId,row.originalApproval.requestId);
    const faults = row.faultSimulations;assert.equal(faults.length,['sender','invalidCanonicalBytes'].includes(row.mutation) ? 0 : 1);
    if (faults.length) {
      addWire(faults[0]);const changed = await contract.simulation(faults[0],row.variant,{allowFailure:['expiredEpoch','unsupportedTimestamp'].includes(row.mutation),item:{...item,objectType:original.base.input.objectType}});
      if (row.mutation === 'expiredEpoch') {assert(changed.error);assert.equal(changed.error.status,13);assert.equal(changed.error.message,'Transaction Expired');expired++}
      else if (row.mutation === 'unsupportedTimestamp') {assert(changed.error);assert.equal(changed.error.status,3);assert.equal(changed.error.message,'Error checking transaction input objects: Feature is not supported: Timestamp-based transaction expiration is not yet supported');timestampUnsupported++}
      else {assert(changed.success && changed.canonicalFinalBytesAndEffects);finals++}
    }
    await preview(row.freshApproval,row.freshState,row.freshSimulations,item);
    audited.push({scenario:item.name,mutation:row.mutation,originalDigest:original.base.digest,newDigest:row.variant.digest,oldGrantPreserved:true,newRequestId:row.freshApproval.requestId});
  }
  for (const [index,row] of p.recipients.entries()) {
    const item = forms[index];assert.equal(row.name,item.name);assert.notEqual(row.originalApproval.requestId,row.changedApproval.requestId);
    const old = await preview(row.originalApproval,row.originalState,row.originalSimulations,item),changed = await preview(row.changedApproval,row.changedState,row.changedSimulations,{...item,to:item.otherTo});
    assert.notEqual(old.base.digest,changed.base.digest);assert.notDeepEqual(old.final.data.V1.kind,changed.final.data.V1.kind);
    if (item.route === 'originbyte-kiosk') assert.notEqual(old.final.abi.abi,changed.final.abi.abi);
  }
  const simulations = p.frames.filter(f => f.url.endsWith('/SimulateTransaction'));assert.equal(simulations.length,282);assert.deepEqual(selection,simulations);
  assert.equal(selections,120);assert.equal(finals,150);assert.equal(expired,6);assert.equal(timestampUnsupported,6);
  assert(!p.frames.some(f => /\/(ExecuteTransaction|VerifySignature)$/.test(new URL(f.url).pathname)));
  const expiredWires = new Set(p.cases.filter(r => ['expiredEpoch','unsupportedTimestamp'].includes(r.mutation)).map(r => JSON.stringify(r.faultSimulations[0])));
  for (const frame of p.frames) {
    assert.equal(frame.status,200);assert(frame.headers && !frame.transportError);const u = new URL(frame.url);
    assert(['41750','42011','42012','42013','41718'].includes(u.port));if (expiredWires.has(JSON.stringify(frame))) continue;
    assert(frame.responseBase64 && !frame.bodyUnavailable);
    if (u.pathname.endsWith('/graphql')) {const response = JSON.parse(parser.base64(frame.responseBase64));assert(response.data && !response.errors);if (response.data.walletGenesis) assert.equal(response.data.walletGenesis.digest,p.h0)}
    else if (u.pathname.includes('/rtd.rpc.v2.')) {const method = u.pathname.split('/').pop();assert(GrpcTypes[method+'Request'] && GrpcTypes[method+'Response']);GrpcTypes[method+'Request'].fromBinary(parser.grpcBody(frame.requestBase64,false));const value = GrpcTypes[method+'Response'].fromBinary(parser.grpcBody(frame.responseBase64,true));if (method === 'GetServiceInfo') assert.equal(value.chainId,p.h0)}
  }
  assert(p.captureErrors.every(e => e.url.endsWith('/SimulateTransaction') && e.headers && ([['13','Transaction Expired'],['3','Error checking transaction input objects: Feature is not supported: Timestamp-based transaction expiration is not yet supported']].some(([code,message]) => e.headers['grpc-status'] === code && decodeURIComponent(e.headers['grpc-message']) === message))));
  assert(!cp.execFileSync('ps',['-Ao','command='],{encoding:'utf8'}).split('\n').some(c => c.includes('Google Chrome') && c.includes('--user-data-dir='+p.profile)));
  const supplementalFrames = [],originalFetch = globalThis.fetch,freshNative = [],typedPoints = [];
  try {
    globalThis.fetch = async (input,init) => {
      const u = new URL(input instanceof Request ? input.url : String(input));
      assert(u.origin === 'http://127.0.0.1:41750' && /\/(GetServiceInfo|GetObject)$/.test(u.pathname) ||
        u.origin === 'http://127.0.0.1:42012' && /^\/archive\/rtd.rpc.v2.LedgerService\/(GetServiceInfo|GetCheckpoint)$/.test(u.pathname));
      const opts = u.port === '42012' ? {...init,credentials:'omit',redirect:'error',headers:{...Object.fromEntries(new Headers(init?.headers)),Origin:environment.actualOrigin}} : init;
      const response = await originalFetch(input,opts);
      supplementalFrames.push({url:u.href,status:response.status,headers:Object.fromEntries(response.headers),requestBase64:Buffer.from(init?.body ?? []).toString('base64'),responseBase64:Buffer.from(await response.clone().arrayBuffer()).toString('base64')});
      return response;
    };
    const native = new RtdGrpcClient({network:'localnet',baseUrl:'http://127.0.0.1:41750',format:'binary',fetch:globalThis.fetch,mvr:{url:''}});
    const archive = new RtdGrpcClient({network:'localnet',baseUrl:'http://127.0.0.1:42012/archive',format:'binary',fetch:globalThis.fetch,mvr:{url:''}});
    assert.equal((await native.ledgerService.getServiceInfo({},{timeout:20000})).response.chainId,p.h0);
    assert.equal((await archive.ledgerService.getServiceInfo({},{timeout:20000})).response.chainId,p.h0);
    const required = new Map(p.nativeBefore.concat(p.sponsorObjectBefore).map(o => [o.objectId,o]));
    for (const row of p.cases) for (const ref of contract.canonical(row.originalApproval.prepared.bytesBase64).V1.gasData.payment) {
      const old = required.get(ref.objectId);if (old) {assert.equal(old.version,ref.version);assert.equal(old.digest,ref.digest)} else required.set(ref.objectId,ref);
    }
    for (const [id,expected] of required) {
      const object = (await native.ledgerService.getObject({objectId:id,readMask:{paths:['object_id','version','digest','owner','object_type','bcs','contents','previous_transaction','storage_rebate']}},{timeout:20000})).response.object;
      const value = contract.object(object);assert.equal(value.objectId,id);assert.equal(value.version,expected.version);assert.equal(value.digest,expected.digest);
      if (expected.objectBcsBase64) {assert.equal(value.objectBcs.toString('base64'),expected.objectBcsBase64);assert.equal(value.content.toString('base64'),expected.contentBase64);assert.deepEqual(value.owner,expected.owner)}
      else assert.equal(value.owner.AddressOwner,p.owner);
      freshNative.push({objectId:value.objectId,version:value.version,digest:value.digest,owner:value.owner,objectBcsBase64:value.objectBcs.toString('base64')});
    }
    for (const [height,digest] of points) {
      const start = supplementalFrames.length;
      await archive.ledgerService.getCheckpoint({checkpointId:{oneofKind:'sequenceNumber',sequenceNumber:BigInt(height)},readMask:{paths:['sequence_number','digest','summary','contents']}},{timeout:20000});
      const audited = parser.checkpoint(supplementalFrames.slice(start),{checkpoint:height,digest});
      typedPoints.push({height,digest,...audited});
    }
    assert.equal((await native.ledgerService.getServiceInfo({},{timeout:20000})).response.chainId,p.h0);
    for (const frame of supplementalFrames) {assert.equal(frame.status,200);const method = new URL(frame.url).pathname.split('/').pop();GrpcTypes[method+'Request'].fromBinary(parser.grpcBody(frame.requestBase64,false));GrpcTypes[method+'Response'].fromBinary(parser.grpcBody(frame.responseBase64,true))}
  } finally {globalThis.fetch = originalFetch}
  environment.held(path.join(inventory.fixture,'intent.json'));
  const files = [__filename,path.resolve(proofFile),oracleFile,environment.buildFile,p.inventoryFile,p.inventoryAuditFile,p.readinessFile,...sourceFiles,require.resolve('./lib/C114-nft-wire-contract-v3.cjs')];
  const completeEntities=require('./lib/C163-nft-complete-entities.cjs').validate(p,build);files.push(require.resolve('./lib/C163-nft-complete-entities.cjs'),require.resolve('./lib/C154-live-entity-correlation-v4.cjs'));
  return {completeEntities,allOriginalHttpResponseBodiesCaptured:true,passed:true,observedAt:new Date().toISOString(),source:p.source,currentUnsignedInternalNftClonedParameterMatrixAccepted:true,
    scenarios:6,faultRows:54,normalRecipientChanges:6,actualEnabledSimulationRequests:282,completeKindGasSelections:120,
    completeCanonicalFinalSimulations:150,actualExpiredHeaders:6,actualUnsupportedTimestampHeaders:6,completeRecordedFourteenObjectsAndSponsorHeld:true,
    actualUniqueProductionLocationsAndClonedParametersHeld:true,originalJournalAndCipherHeld:true,ownedChromeAbsent:true,
    auditedCases:audited,typedSnapshotPoints:typedPoints,freshNativeUnchangedObjects:freshNative,supplementalFrames,retainedCaptureErrors:p.captureErrors,
    auditRequests:supplementalFrames.length,auditProfilesOpened:0,auditSignatures:0,auditExecuteRequests:0,
    realValidityUiVariantsAccepted:false,actualSponsoredExecutionAccepted:false,fullNFTAuthorizationAccepted:false,parentCompletion:false,
    scope:'Current six internal unsigned cloned-parameter faults and normal recipient reauthorization; real validity UI, sponsored signing/execution and complete M5 remain separate',
    inputsSha256:Object.fromEntries(files.map(f => [f,sha(f)]))};
}
async function main() {
  const [input,output] = process.argv.slice(2);assert(output && !fs.existsSync(output));let proof;
  try {proof = await audit(input)} catch (error) {process.exitCode = 1;proof = {passed:false,observedAt:new Date().toISOString(),errorType:error.name,message:String(error.message).slice(0,900),actualCurrentInternalNftAccepted:false,parentCompletion:false}}
  fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:proof.passed,errorType:proof.errorType,actualCurrentInternalNftAccepted:proof.currentUnsignedInternalNftClonedParameterMatrixAccepted === true}));
}
module.exports = {audit,prepared,onlyChange,sourceLocation};
if (require.main === module) main().catch(error => {console.error(JSON.stringify({passed:false,errorType:error.name}));process.exitCode = 1});
