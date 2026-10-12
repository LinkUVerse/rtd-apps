// Controlled local fixture only. One UI approval; all later runs recover its original digest.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const assert=require('node:assert/strict');const {execFileSync}=require('node:child_process');
const {expect}=require('@playwright/test');const {Transaction}=require('rtd-typescript/transactions');
const {bcs}=require('rtd-typescript/bcs');const {RtdGrpcClient}=require('rtd-typescript/grpc');
const {RTD_TYPE_ARG}=require('rtd-typescript/utils');const {journal}=require('./test-dapp-execution.cjs');
const runtime=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261003-01');
const root=path.join(runtime,'mixed-execution-browser-01');
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const fixture=()=>json(path.join(runtime,'address-funding-fixture-01/fixture.json'));
const record=(name,data)=>{const fd=fs.openSync(path.join(root,name),'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify(data,(_,v)=>typeof v==='bigint'?v.toString():v,2)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}const dir=fs.openSync(root,'r');try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}};
const client=()=>new RtdGrpcClient({network:'localnet',baseUrl:fixture().endpoint,format:'binary',mvr:{url:''}});
async function admit(){
 const proof=json(path.resolve('migrationToGRpcOrGraphQLDoc/evidence/20261003-rtd-debug-reverified.json'));
 const source=path.resolve('../../rtd');const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
 assert.equal(execFileSync('git',['-C',source,'rev-parse','HEAD']).toString().trim(),proof.source.head);
 assert.equal(hash(execFileSync('git',['-C',source,'diff','--binary','HEAD'])),proof.source.diffSha256);
 for(const [file,sha]of Object.entries(proof.source.changedFiles))assert.equal(hash(fs.readFileSync(path.join(source,file))),sha);
 for(const binary of Object.values(proof.binaries))assert.equal(hash(fs.readFileSync(binary.path)),binary.sha256);
 const meta=json(path.join(runtime,'runtime.json'));assert(meta.ready);assert.equal(meta.binary,proof.binaries.rtd.path);process.kill(meta.pid,0);
 const f=fixture(),c=client();assert.equal(f.endpoint,'http://127.0.0.1:39400');assert.equal((await c.ledgerService.getServiceInfo({})).response.chainId,f.h0);
 const reviewed=[];
 for(const dir of fs.readdirSync(runtime,{withFileTypes:true}).filter(row=>row.isDirectory())){
  const pendingFile=path.join(runtime,dir.name,'pending.json');if(!fs.existsSync(pendingFile))continue;
  const pending=json(pendingFile);if(![f.sender,f.target].includes(pending.sender))continue;
  const digest=await Transaction.from(pending.bytesBase64).getDigest();if(pending.digest!==undefined)assert.equal(digest,pending.digest);
  const saved=json(path.join(runtime,dir.name,'receipt.json'));assert.equal((saved.Transaction??saved).digest,digest);
  const result=await c.core.getTransaction({digest,include:{effects:true}});assert.equal(result.$kind,'Transaction');assert.equal(result.Transaction.digest,digest);assert.equal(result.Transaction.status.success,true);
  reviewed.push(digest);
 }
 assert(reviewed.includes('6TAz5CW2KUTDHVZjDfT2L2U4BXtEL6zh4WqA39vtAcdf'));
 const balance=(await c.stateService.getBalance({owner:f.target,coinType:RTD_TYPE_ARG})).response.balance;
 assert.equal(balance.coinBalance,1000000000n);assert.equal(balance.addressBalance,1000000000n);assert.equal(balance.balance,2000000000n);
 return {verifiedAt:new Date().toISOString(),sourceHead:proof.source.head,binariesMatch:true,reviewed,balance};
}
async function observe(page){
 await page.addInitScript(()=>{const connect=chrome.runtime.connect.bind(chrome.runtime);chrome.runtime.connect=(...args)=>{const port=connect(...args),post=port.postMessage.bind(port);port.postMessage=message=>{if(message?.payload?.method==='executePreparedTransaction'){const {digest,requestId,bytesBase64}=message.payload.args;window.__mixedApproval={digest,requestId,bytesBase64};}return post(message);};return port;};});
}
function effectsReceipt(row,digest){
 assert.equal(row.state,'confirmed-success');assert.equal(row.receipt.success,true);
 const e=bcs.TransactionEffects.parse(Buffer.from(row.receipt.effectsBase64,'base64')),body=e.$kind==='V2'?e.V2:e.V1;
 assert.equal(body.transactionDigest,digest);assert.equal(body.status.$kind,'Success');return body;
}
async function execute({page,accountId,accountAddress,setStage}){
 const f=fixture();assert.equal(accountAddress,f.target);assert.equal((await journal(page)).length,0);
 return require('./test-extension-coin-preview.cjs')({page,accountAddress:f.sender,amountText:'1.5',atomicAmount:'1500000000',setStage,execute:async({send})=>{
  record('attempt.json',{accountId,accountAddress,recipient:f.sender,atomicAmount:'1500000000',beforeBalance:'2000000000',startedAt:new Date().toISOString()});
  setStage('mixed: single real UI approval');await send.click();
  await expect.poll(()=>page.evaluate(()=>!!window.__mixedApproval),{timeout:60000}).toBe(true);
  const approval=await page.evaluate(()=>window.__mixedApproval);record('approved.json',approval);
  const tx=Transaction.from(approval.bytesBase64);assert.equal(await tx.getDigest(),approval.digest);assert.equal(tx.getData().sender,accountAddress);
  setStage('mixed: original digest journal result');await expect.poll(async()=>(await journal(page)).find(row=>row.digest===approval.digest)?.state,{timeout:90000,intervals:[500,1000,3000]}).toBe('confirmed-success');
  const row=(await journal(page)).find(row=>row.digest===approval.digest);assert.equal(row.requestId,approval.requestId);effectsReceipt(row,approval.digest);
  await expect.poll(()=>new URL(page.url()).hash,{timeout:30000}).toContain('/receipt?');assert.equal(new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('txdigest'),approval.digest);
  const result={passed:true,digest:approval.digest,requestId:approval.requestId,approvedBytesDigestMatches:true,effectsSuccess:true,receiptNavigation:true};record('confirmed.json',result);return result;
 }});
}
async function verify({page,command,accountId}){
 const f=fixture(),attempt=json(path.join(root,'attempt.json'));assert.equal(accountId,attempt.accountId);
 assert.equal((await command('getStoredEntities',{type:'accounts'})).args.entities[0].isLocked,true);
 const recovery=await command('recoverPreparedTransaction',{accountId});assert.notEqual(recovery.error,true);
 const rows=await journal(page),tokenFile=path.join(root,'mixed-token-attempt-01.json');
 const token=fs.existsSync(tokenFile)?json(tokenFile):null;
 assert.equal(rows.length,token?2:1,'exactly the recorded native and optional token attempts permitted');
 const approved=fs.existsSync(path.join(root,'approved.json'))?json(path.join(root,'approved.json')):{digest:rows[0].digest,requestId:rows[0].requestId};
 const original=rows.find(row=>row.digest===approved.digest);assert(original);assert.equal(original.requestId,approved.requestId);assert.equal(original.accountAddress,f.target);
 const effects=effectsReceipt(original,approved.digest),c=client();assert.equal((await c.ledgerService.getServiceInfo({})).response.chainId,f.h0);
 const result=await c.core.getTransaction({digest:approved.digest,include:{effects:true,balanceChanges:true,transaction:true}});
 assert.equal(result.$kind,'Transaction');const tx=result.Transaction;assert.equal(tx.digest,approved.digest);assert.equal(tx.status.success,true);
 assert.deepEqual(Buffer.from(tx.effects.bcs),Buffer.from(original.receipt.effectsBase64,'base64'));
 const gas=effects.gasUsed,netGas=BigInt(gas.computationCost)+BigInt(gas.storageCost)-BigInt(gas.storageRebate);
 const changes=tx.balanceChanges;assert(changes);const sum=owner=>changes.filter(row=>row.address===owner&&row.coinType===RTD_TYPE_ARG).reduce((n,row)=>n+BigInt(row.amount),0n);
 assert.equal(sum(f.sender),1500000000n);assert.equal(sum(f.target),-1500000000n-netGas);
 let tokenGas=0n;
 if(token){
  assert.equal(token.accountId,accountId);assert.equal(token.accountAddress,f.target);assert.equal(token.h0,f.h0);
  assert.deepEqual(new Set(rows.map(row=>row.digest)),new Set([approved.digest,token.digest]));
  const row=rows.find(row=>row.digest===token.digest);assert.equal(row.requestId,token.requestId);assert.equal(row.accountAddress,f.target);
  const effect=effectsReceipt(row,token.digest),result=await c.core.getTransaction({digest:token.digest,include:{effects:true,balanceChanges:true,transaction:true,bcs:true}});
  assert.equal(result.$kind,'Transaction');assert.equal(result.Transaction.digest,token.digest);assert.equal(result.Transaction.status.success,true);
  assert.deepEqual(Buffer.from(result.Transaction.bcs),Buffer.from(token.bytesBase64,'base64'));
  assert.deepEqual(Buffer.from(result.Transaction.effects.bcs),Buffer.from(row.receipt.effectsBase64,'base64'));
  assert.equal(result.Transaction.balanceChanges.filter(change=>change.address===f.sender&&change.coinType===token.coinType).reduce((n,change)=>n+BigInt(change.amount),0n),1500000n);
  const used=effect.gasUsed;tokenGas=BigInt(used.computationCost)+BigInt(used.storageCost)-BigInt(used.storageRebate);
 }
 const expected=500000000n-netGas-tokenGas;let after;
 await expect.poll(async()=>{after=(await c.stateService.getBalance({owner:f.target,coinType:RTD_TYPE_ARG})).response.balance;return after?.balance?.toString();},{timeout:30000}).toBe(expected.toString());
 return {passed:true,digest:approved.digest,lockedRestartJournalPreserved:true,recipient:f.sender,received:'1500000000',netGas:netGas.toString(),knownTokenDigest:token?.digest,additionalTokenGas:tokenGas.toString(),after:JSON.parse(JSON.stringify(after,(_,v)=>typeof v==='bigint'?v.toString():v)),checkpoint:tx.checkpoint,executionReceiptCheckpoint:original.receipt.checkpoint,scope:'real mixed native transfer and locked restart original-digest recovery, exact optional recorded token attempt; indexed balance catch-up and full trial not accepted'};
}
module.exports={root,record,admit,observe,execute,verify};
