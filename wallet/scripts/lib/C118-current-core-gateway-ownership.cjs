// Fresh complete original lineage plus the precise one-container C102 temporary transport.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../../../..'),logs=path.resolve(__dirname,'../../migrationToGRpcOrGraphQLDoc/workLog');
const startedFile=path.join(logs,'20261008-C118-non-nft-gateway-started-01.json');
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function capture(){
 const proof=JSON.parse(fs.readFileSync(startedFile));assert(proof.passed&&proof.actualOriginOnly&&proof.originalTlsAndMethodsHeld);
 assert.equal(proof.containersCreatedLive,1);assert.equal(proof.originalServicesSignalled,0);
 assert.equal(proof.originalContainerStartedAtAll29Held,false);assert.equal(proof.explicitC116Runtime,true);assert.equal(proof.nftBusinessRequests,0);
 for(const[f,h]of Object.entries(proof.inputsSha256))assert.equal(sha(f),h);
 const program='import sys,json,hashlib;from pathlib import Path;sys.path.insert(0,sys.argv[1]);from manage_wallet_C118_non_nft_gateway import capture,OP,read,inspected,same_configuration;actual=capture();p=read(Path(sys.argv[2]));assert actual==p["originalAuthority"];assert not (OP/"cleanup.json").exists();old=read(OP/"container-before.json");row=inspected([p["containerId"]])[0];same_configuration(row,old);assert row["State"]["Running"] and row["State"]["StartedAt"]==old["State"]["StartedAt"];print(json.dumps({"originalRuntimeCaptureSha256":hashlib.sha256(json.dumps(actual,sort_keys=True).encode()).hexdigest(),"gatewayId":row["Id"],"startedAt":row["State"]["StartedAt"],"origin":p["origin"],"ports":p["ports"]}))';
 return JSON.parse(cp.execFileSync(path.join(root,'rtd-archive-service/localDeploy/data/publisher-venv/bin/python'),['-c',program,path.join(root,'link-u-smart-contract/all-in-one-deploy/localDeploy'),startedFile],{encoding:'utf8',timeout:60000}));
}
module.exports={capture,startedFile};
