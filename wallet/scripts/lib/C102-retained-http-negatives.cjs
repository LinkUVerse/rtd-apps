// Retain the three pinned, correlated gateway errors as negative evidence, never data proof.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {equivalent}=require('./C102-response-header-equivalence.cjs');
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
function classify(browser,diagnostic){
 assert(diagnostic.passed&&diagnostic.readOnly&&diagnostic.serviceSignals===0&&diagnostic.parentCompletion===false);
 assert.equal(diagnostic.negativeResponseCount,3);assert.equal(diagnostic.upstreamConnectTimeouts.length,3);
 const negativeNetwork=browser.frames.filter(f=>f.status!==200),negativeConsumer=browser.consumerFrames.filter(f=>f.status!==200);
 assert.equal(negativeNetwork.length,3);assert.equal(negativeConsumer.length,3);
 const logCounts=new Map();for(const line of diagnostic.upstreamConnectTimeouts){
  const m=line.match(/^(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}).*upstream timed out .*while connecting to upstream,.*request: "POST \/graphql HTTP\/1\.1", upstream: "https:\/\/192\.168\.65\.254:41981\/graphql", host: "127\.0\.0\.1:42011"$/);assert(m);
  const second=m[1].replace(/\//g,'-').replace(' ','T')+'Z';logCounts.set(second,(logCounts.get(second)??0)+1);
 }
 const same=(left,right)=>left.role===right.role&&left.url===right.url&&left.status===right.status&&left.requestBase64===right.requestBase64&&left.responseBase64===right.responseBase64&&JSON.stringify(Object.keys(left.headers).sort())===JSON.stringify(Object.keys(right.headers).sort())&&Object.entries(left.headers).every(([k,v])=>equivalent(k,v,right.headers[k]));
 const negatives=[];
 for(const f of negativeNetwork){
  assert.equal(f.status,504);assert.equal(f.url,'http://127.0.0.1:42011/graphql');assert(['existingTarget','newTarget'].includes(f.role));assert(Number.isSafeInteger(f.requestId));
  const request=JSON.parse(Buffer.from(f.requestBase64,'base64'));assert(/^\s*query WalletSnapshot(?:Admission|Read)\b/.test(request.query));assert(!/\bmutation\b/.test(request.query));assert(request.variables&&typeof request.variables==='object');
  const raw=Buffer.from(f.responseBase64,'base64');assert.equal(String(raw.length),f.headers['content-length']);assert.equal(f.headers['content-type'],'text/html');assert(raw.toString().startsWith('<html>\r\n<head><title>504 Gateway Time-out</title>'));
  const second=new Date(f.headers.date).toISOString().replace('.000Z','Z');assert((logCounts.get(second)??0)>0);logCounts.set(second,logCounts.get(second)-1);
  const consumer=negativeConsumer.filter(c=>same(f,c));assert.equal(consumer.length,1);
  negatives.push({network:f,consumer:consumer[0],upstreamConnectTimeoutObserved:true,negativeOnly:true,requestSha256:digest(Buffer.from(f.requestBase64,'base64')),responseSha256:digest(raw)});
 }
 assert([...logCounts.values()].every(n=>n===0));for(const c of negativeConsumer)assert.equal(negativeNetwork.filter(f=>same(c,f)).length,1);
 return{positiveFrames:[...browser.frames,...browser.consumerFrames].filter(f=>f.status===200),retainedHttpNegatives:negatives,allRetainedFramesAccountedFor:negatives.length*2+[...browser.frames,...browser.consumerFrames].filter(f=>f.status===200).length===browser.frames.length+browser.consumerFrames.length};
}
module.exports={classify};
