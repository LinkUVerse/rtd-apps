const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const admit=require('./lib/framework-snapshot-admission.cjs');
const [evidence,output]=process.argv.slice(2);assert(evidence&&output&&!fs.existsSync(output));
const actual=JSON.parse(fs.readFileSync(evidence));assert(actual.passed&&actual.finiteReadonlyObservation);
const row=actual.objects.find(row=>row.role==='fullnode'),height=Number(actual.snapshot.checkpoint);
const facts={now:Date.parse(actual.observedAt),h0:actual.h0,generation:actual.generation,target:180806,
  commonLo:actual.nativeRangeAfter.minCheckpoint,commonHi:actual.nativeRangeAfter.maxCheckpoint,
  nativeRange:actual.nativeRangeAfter,kioskId:actual.kioskId,capId:actual.capId,
  item:{objectId:row.objectId,version:row.version,digest:row.digest,owner:row.owner},placementDigest:row.previousTransaction};
const clone=value=>JSON.parse(JSON.stringify(value)),checks=[];
function check(label,proof,observed,ready){assert.equal(admit(proof,observed).ready,ready,label);checks.push({label,passed:true});}
check('actual finite positive read cannot authorize execution',actual,facts,false);
// Synthetic completion flags exercise arithmetic and field boundaries only;
// they never constitute real restoration or positive execution evidence.
const complete={...clone(actual),finiteReadonlyObservation:false,catchupAccepted:true,ownershipSuccessorAccepted:true};
assert(facts.target<facts.nativeRange.minCheckpoint&&height>=facts.nativeRange.minCheckpoint);
check('synthetic current S after T while T outside historical window',complete,facts,true);
const cases=[
 ['missing witness',null,facts],
 ['proof expired',complete,{...facts,now:facts.now+180001}],
 ['wrong H0',{...clone(complete),h0:'wrong'},facts],
 ['wrong generation',{...clone(complete),generation:'wrong'},facts],
 ['restore not accepted',{...clone(complete),ownershipSuccessorAccepted:false},facts],
 ['target above S',complete,{...facts,target:height+1}],
 ['empty common range',complete,{...facts,commonLo:height+1,commonHi:height}],
 ['native range moved beyond S',complete,{...facts,nativeRange:{minCheckpoint:height+1,maxCheckpoint:height+5}}],
 ['fresh digest changed',complete,{...facts,item:{...facts.item,digest:'changed'}}],
 ['fresh version changed',complete,{...facts,item:{...facts.item,version:'0'}}],
 ['fresh owner changed',complete,{...facts,item:{...facts.item,owner:'wrong'}}],
 ['keystore opened',{...clone(complete),keystoreRead:true},facts],
 ['transaction issued',{...clone(complete),executeRequests:1},facts],
];
for(const[label,proof,observed]of cases)check(label,proof,observed,false);
let changed=clone(complete);changed.snapshot.dependencies.pop();check('one dependency absent',changed,facts,false);
changed=clone(complete);changed.snapshot.dependencies[0]={type:'Query',field:'wrong'};check('dependency substituted',changed,facts,false);
changed=clone(complete);changed.snapshot.dependencies.reverse();check('complete dependency order is irrelevant',changed,facts,true);
changed=clone(complete);changed.snapshot.displayHistory.coverage.lastCheckpoint='not-a-height';check('invalid Display bound',changed,facts,false);
changed=clone(complete);changed.snapshot.displayHistory.coverage.snapshotCheckpointDigest='wrong';check('Display snapshot digest differs',changed,facts,false);
changed=clone(complete);changed.objects[1].contentSha256='0'.repeat(64);check('archive and current body differ',changed,facts,false);
changed=clone(complete);changed.objects[1].role='fullnode';check('duplicate role cannot replace archive',changed,facts,false);
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
fs.writeFileSync(output,JSON.stringify({passed:true,observedAt:new Date().toISOString(),checks,
  realFiniteWitnessRejected:true,syntheticPolicyCasesOnly:true,actualCompletedRestoreProven:false,
  networkRequests:0,chromeStarted:false,keystoreRead:false,simulations:0,signatures:0,executeRequests:0,
  inputsSha256:Object.fromEntries([__filename,path.join(__dirname,'lib/framework-snapshot-admission.cjs'),evidence].map(file=>[file,sha(file)])),
  scope:'Policy tests against actual finite witness plus explicitly synthetic completion flags. Arithmetic, complete dependency set, current native/window/Display/object identity and no-execution boundaries only. No real restoration, Chrome or parent completion.'},null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({passed:true,checks:checks.length,realFiniteWitnessRejected:true,executeRequests:0}));
