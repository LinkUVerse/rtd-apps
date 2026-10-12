// Exact ownership of the three isolated query containers and the fresh guard.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../../../..'),logs=path.resolve(__dirname,'../../migrationToGRpcOrGraphQLDoc/workLog');
const startedFile=path.join(logs,'20261009-C125-isolated-query-runtime-started-01.json');
const qualifiedFile=path.join(logs,'20261009-C125-isolated-query-network-qualified-01.json');
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function capture({requireNetwork=true}={}){
 const proof=JSON.parse(fs.readFileSync(startedFile));assert(proof.passed&&proof.installed&&proof.originalFullScopeHeld);
 assert.equal(proof.containersCreatedLive,3);assert.equal(proof.originalServicesSignalled,0);assert.equal(proof.nftBusinessRequests,0);
 for(const[f,h]of Object.entries(proof.inputsSha256))assert.equal(sha(f),h);
 if(requireNetwork){const q=JSON.parse(fs.readFileSync(qualifiedFile));assert(q.passed&&q.actualOriginOnly&&q.originalTlsAndMethodsHeld&&!q.businessAccepted);for(const[f,h]of Object.entries(q.inputsSha256))assert.equal(sha(f),h)}
 const program=`import sys,json,hashlib;from pathlib import Path;sys.path.insert(0,sys.argv[1]);from manage_wallet_C125_isolated_query_runtime import capture,OP,read,inspected,same_configuration,ARCHIVE;actual=capture();intent=read(OP/'intent.json');assert actual==intent['sourceOriginalAuthority'];assert not (OP/'cleanup.json').exists();old=read(OP/'owned-containers.json');rows=inspected([r['Id'] for r in old]);assert len(rows)==3
for row,previous in zip(rows,old):
 same_configuration(row,previous);assert row['State']['Running'] and row['State']['StartedAt']==previous['State']['StartedAt']
sys.path.insert(0,str(ARCHIVE/'localDeploy'));import dev_native_live_source;saved=read(OP/'guard/process.json');assert dev_native_live_source.state(OP/'guard',saved['command'])['running'];assert dev_native_live_source.process_identity(saved['pid'])==saved['processIdentity'];print(json.dumps({'originalRuntimeCaptureSha256':hashlib.sha256(json.dumps(actual,sort_keys=True).encode()).hexdigest(),'gatewayIds':[r['Id'] for r in rows],'startedAt':[r['State']['StartedAt'] for r in rows],'guardPid':saved['pid'],'guardIdentitySha256':hashlib.sha256(saved['processIdentity'].encode()).hexdigest(),'origin':'chrome-extension://mkihdgajnjcingajgjlkibdiijjkeaef','ports':[42011,42012,42013]}))`;
 return JSON.parse(cp.execFileSync(path.join(root,'rtd-archive-service/localDeploy/data/publisher-venv/bin/python'),['-c',program,path.join(root,'link-u-smart-contract/all-in-one-deploy/localDeploy')],{encoding:'utf8',timeout:60000}));
}
module.exports={capture,startedFile,qualifiedFile};
