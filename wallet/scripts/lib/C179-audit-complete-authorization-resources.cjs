// Bind complete immutable fixture bytes to original HTTP entities and normal Wallet Standard requests.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('./C158-bounded-strict-assert.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function validate(p,rows,result,expectedCount){
 assert.equal(result.authorizationResources.length,expectedCount);const names=new Set();
 for(const r of result.authorizationResources){assert(/^authorization-[0-9]{2}\.json$/.test(r.name));assert(!names.has(r.name));names.add(r.name);const b=fs.readFileSync(r.file);assert.equal(b.length,r.bytes);assert.equal(sha(b),r.sha256);assert.equal(p.inputsSha256[r.file],r.sha256);}
 const evidence=[];
 for(const row of rows){const r=row.authorizationResource;assert(r);assert.deepEqual(result.authorizationResources.find(x=>x.name===r.name),r);assert.equal(r.scenario,row.name);assert.equal(r.variant,row.variant.name);const body=Buffer.from(row.variant.json,'utf8');assert.equal(sha(body),r.sha256);assert.deepEqual(fs.readFileSync(r.file),body);const url=result.demoOrigin+'/'+r.name,captures=p.completeCaptureRecords.filter(c=>c.url===url&&c.kind==='static-readonly');assert(captures.length);for(const c of captures){assert.equal(c.method,'GET');assert.equal(c.status,200);assert(c.upstreamBodyComplete);assert.equal(c.responseBase64,body.toString('base64'));assert.equal(c.responseSha256,r.sha256);}
  assert.equal(typeof row.pageUrl,'string');const u=new URL(row.pageUrl);assert.equal(u.origin,result.demoOrigin);assert(u.href.length<=4096);assert.equal(u.searchParams.get('authorizationFile'),r.name);assert(!u.searchParams.has('authorization'));
  evidence.push({scenario:row.name,variant:row.variant.name,resource:r.name,sha256:r.sha256,completeOriginalHttpReads:captures.length});
 }
 return{boundedPageUrls:true,completeOriginalLocalDataEntitiesAccepted:true,resourceCount:expectedCount,actualRequests:rows.length,evidence};
}
module.exports={validate};
