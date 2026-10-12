// Offline qualification against retained actual replies. No request or profile is opened.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),cp=require('node:child_process');
const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog');
const read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const [output]=process.argv.slice(2);assert(output&&!fs.existsSync(output));const files=[__filename];let result;
try {
 const load=(name,passed)=>{const f=path.join(logs,name);files.push(f);const p=read(f);if(passed!==undefined)assert.equal(p.passed,passed);for(const[f,h]of Object.entries(p.inputsSha256??{}))assert.equal(sha(f),h);return p;};
 const qualification=load('20261008-C102-consumer-cancellation-qualification-01.json',true);assert(qualification.originalCompleteBrowserAndRawAuditHeld&&qualification.offlineChecks===14&&qualification.incompleteCloneNeverPositive);
 const browser=load('20261008-C102-current-three-owner-browser-02.json',true);assert.equal(browser.frames.length,955);assert.equal(browser.consumerFrames.length,356);assert.equal(browser.profilesOpened,3);assert.equal(browser.executeRequests+browser.signatures+browser.simulations,0);
 const failure=load('20261008-C102-current-three-owner-browser-independent-01.json',false);assert(failure.message.includes('assert(originalComplete||originalAborted)'));assert.equal(failure.supplementalFrames.length,0);
 const authority=load('20261008-C102-http-vary-authority-01.json');assert.deepEqual(authority.sources.map(s=>s.url),['https://www.rfc-editor.org/rfc/rfc9110.html#section-5.1','https://www.rfc-editor.org/rfc/rfc9110.html#section-12.5.5']);assert.equal(authority.actualDiagnostic.uniqueActualReplies,3);assert.equal(authority.actualDiagnostic.onlyHeaderDifference,'Vary list ordering');
 const delta=load('20261008-C102-browser-audit-v5-source-delta-01.json');files.push(delta.originalSource,delta.candidateSource);assert.equal(qualification.inputsSha256[delta.originalSource],sha(delta.originalSource));assert.equal(delta.changes.length,3);
 let inverse=fs.readFileSync(delta.candidateSource,'utf8');for(const[before,after]of delta.changes.slice().reverse()){assert.equal(inverse.split(after).length-1,1);inverse=inverse.replace(after,before);}assert.equal(inverse,fs.readFileSync(delta.originalSource,'utf8'));
 const helper=path.join(__dirname,'lib/C102-response-header-equivalence.cjs');files.push(helper);const {equivalent}=require(helper);
 const matches=(role,c,f)=>f.role===role&&f.url===c.url&&f.requestBase64===c.requestBase64&&f.status===c.status&&Object.entries(c.headers).every(([k,v])=>equivalent(k,v,f.headers[k.toLowerCase()]));
 const all=browser.observationFlushes.flatMap(flush=>(flush.cancelledClones??[]).map(c=>({role:flush.role,c})));assert.equal(all.length,34);
 const unique=Array.from(new Map(all.map(({role,c})=>[JSON.stringify([role,c.url,c.requestBase64,c.status,c.headers['x-rtd-request-id']]),{role,c}])).values());assert.equal(unique.length,3);let checks=0;const actual=[];
 for(const {role,c}of unique){
  assert(c.signalAborted&&c.incompleteResponse&&c.stage==='response-body'&&c.errorType==='AbortError'&&!Object.hasOwn(c,'responseBase64'));
  const rows=browser.frames.filter(f=>matches(role,c,f));assert.equal(rows.length,1);const f=rows[0];
  assert.deepEqual(Object.entries(c.headers).filter(([k,v])=>f.headers[k.toLowerCase()]!==v).map(([k])=>k.toLowerCase()),['vary']);
  assert.equal(f.headers['x-rtd-request-id'],c.headers['x-rtd-request-id']);assert.equal(f.headers.date,c.headers.date);actual.push({role,requestId:c.headers['x-rtd-request-id'],headerDifference:'Vary list ordering',uniqueCompleteOriginalNetworkReply:true});checks++;
  for(const [key,value]of [['role',role+'-other'],['url',f.url+'/other'],['requestBase64',f.requestBase64+'AA=='],['status',201]]){assert(!matches(role,c,{...f,[key]:value}));checks++;}
  for(const key of ['date','x-rtd-request-id','content-length','content-type']){assert.equal(typeof f.headers[key],'string');assert(!matches(role,c,{...f,headers:{...f.headers,[key]:f.headers[key]+'different'}}));checks++;}
  for(const vary of [f.headers.vary+', x-foreign',f.headers.vary.split(',').slice(1).join(','),f.headers.vary.replace(/origin/i,'x-other-origin')]){assert(!matches(role,c,{...f,headers:{...f.headers,vary}}));checks++;}
 }
 for(const {role,c}of all)assert.equal(browser.frames.filter(f=>matches(role,c,f)).length,1);
 const cases=[
  ['Vary','Origin, ACCEPT','accept, origin',true],['vary','origin, Origin','Origin, origin',true],
  ['vary','origin, Origin','origin',false],['vary','origin','origin, ORIGIN',false],
  ['vary','Origin, Accept','origin, content-type',false],['vary','Origin','Origin, Accept',false],
  ['vary','Origin, Accept','Origin',false],['vary','Origin','',false],['vary','Origin','Origin,',false],
  ['vary','Origin','Ori gin',false],['vary','Origin','Origin\n',false],['vary','Origin',undefined,false],
  ['vary','Origin','*',false],['vary','*','*',true],['vary','*','*, Origin',false],
  ['vary','\t Origin ,  Accept\t','accept,origin',true],
  ['date','Thu, 08 Oct 2026 04:53:00 GMT','thu, 08 oct 2026 04:53:00 gmt',false],
  ['x-rtd-request-id','abc123','ABC123',false],['content-length','100','0100',false],
  ['content-type','application/json','APPLICATION/JSON',false],['x-any','origin, accept','accept, origin',false],
  ['x-any','same','same',true]
 ];
 for(const [name,left,right,expected]of cases){assert.equal(equivalent(name,left,right),expected);checks++;}
 for(const f of [__filename,helper,delta.candidateSource])cp.execFileSync(process.execPath,['--check',f],{timeout:30000});
 result={passed:true,preparedOnly:true,observedAt:new Date().toISOString(),offlineChecks:checks,cumulativeCancelledClones:all.length,uniqueActualCompleteReplies:actual,wholeOriginalAuditorInverseHeld:true,onlyVaryFieldNameMultisetChanged:true,duplicateCountPreserved:true,everyOtherHeaderAndRequestIdentityExact:true,incompleteCloneNeverPositive:true,originalFailedIndependentAuditHeld:true,networkRequests:0,profilesOpened:0,parentCompletion:false,currentThreeOwnerBrowserAccepted:false,inputsSha256:Object.fromEntries([...new Set(files)].map(f=>[f,sha(f)]))};
}catch(error){result={passed:false,errorType:error.name,message:String(error.message).slice(0,1400)};process.exitCode=1;}
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:result.passed,offlineChecks:result.offlineChecks,uniqueActualReplies:result.uniqueActualCompleteReplies?.length,errorType:result.errorType,message:result.message}));
