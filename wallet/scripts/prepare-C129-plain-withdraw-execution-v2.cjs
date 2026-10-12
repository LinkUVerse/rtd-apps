// Preserve the original executor and bind a new unique dispatch to the plain UI retry.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const old=path.join(__dirname,'execute-C129-fresh-sponsored-withdraw.cjs'),next=path.join(__dirname,'execute-C129-fresh-sponsored-withdraw-v2.cjs'),logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog');
assert(!fs.existsSync(next));let source=fs.readFileSync(old,'utf8');const deltas=[];
for(const [fromText,toText] of [
 ['test-C129-fresh-sponsored-withdraw-ui.cjs','test-C129-fresh-sponsored-withdraw-ui-v2.cjs'],
 ['20261009-C129-fresh-sponsored-withdraw-ui-01.json','20261009-C129-fresh-sponsored-withdraw-ui-02.json'],
 ['20261009-C129-fresh-sponsored-withdraw-ui-independent-01.json','20261009-C129-fresh-sponsored-withdraw-ui-independent-02.json'],
 ['audit-C129-fresh-sponsored-withdraw-ui.cjs','audit-C129-fresh-sponsored-withdraw-ui-v2.cjs'],
 ['// One external dual-sign execution of the independently audited newly approved stake.','// One external dual-sign execution of the independently audited plain approved new-stake withdrawal.']
]){const count=source.split(fromText).length-1;assert(count>0,fromText);source=source.split(fromText).join(toText);deltas.push({fromText,toText,count});}
let inverse=source;for(const d of [...deltas].reverse()){assert.equal(inverse.split(d.toText).length-1,d.count);inverse=inverse.split(d.toText).join(d.fromText);}assert.equal(inverse,fs.readFileSync(old,'utf8'));fs.writeFileSync(next,source,{flag:'wx'});
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');const files=[__filename,old,next,path.join(__dirname,'test-C129-fresh-sponsored-withdraw-ui-v2.cjs'),path.join(__dirname,'audit-C129-fresh-sponsored-withdraw-ui-v2.cjs'),path.join(logs,'20261009-C129-sponsored-withdraw-execution-source-prepared-01.json')];
fs.writeFileSync(path.join(logs,'20261009-C129-plain-withdraw-execution-source-prepared-02.json'),JSON.stringify({passed:true,preparedOnly:true,observedAt:new Date().toISOString(),completeSourceInverse:{old,new:next,deltas},onlyPlainRetryApprovalAccepted:true,observerDiagnosticSignatureNeverUsed:true,originalFailurePreserved:true,exclusiveFsyncPendingDispatchAndOneExecuteHeld:true,onlyFixedDigestRecoveryHeld:true,signatures:0,executeRequests:0,parentCompletion:false,inputsSha256:Object.fromEntries(files.map(f=>[f,sha(f)]))},null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,completeSourceDeltas:deltas.length}));
