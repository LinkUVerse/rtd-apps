// Read-only native, original Display response and scoped preference audit.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { bcs } from 'rtd-typescript/bcs';
import { toBase64 } from 'rtd-typescript/utils';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletFullnodeReader } from '../src/shared/rpc/fullnode-reader';

async function main() {
  const [profileFile, output] = process.argv.slice(2);assert(!existsSync(output));
  const dir='migrationToGRpcOrGraphQLDoc/workLog/';
  const read=(f:string)=>JSON.parse(readFileSync(f,'utf8'));
  const sha=(f:string)=>createHash('sha256').update(readFileSync(f)).digest('hex');
  const originalFile=dir+'20261006-positive-C37-display-hidden-chrome-02.json';
  const resumeFile=dir+'20261006-positive-C37-display-hidden-resume-01.json';
  const nativeFile=dir+'20261006-default-generation-display-bcs-01.json';
  const buildFile=dir+'20261006-default-generation-positive-C37-build-01.json';
  const mediaFile=dir+'20261006-postboot-display-media-recovery-01.json';
  const p=read(originalFile),r=read(resumeFile),n=read(nativeFile),build=read(buildFile);
  assert(!p.passed&&r.passed&&n.passed&&build.passed);
  assert.deepEqual(r.source,build.sourceAfter);
  for(const row of [p,r]) {
    assert.equal(row.workerSource.workerSha256,build.artifacts['background.js']);
    assert(row.uiSource.matchesDisk);
    for(const v of row.uiSource.loadedBundles)assert.equal(v.loadedSha256,build.artifacts[v.file]);
  }
  for(const[f,h]of Object.entries(r.inputsSha256))assert.equal(sha(f),h);
  assert.deepEqual(r.before,r.after);assert(r.actualRelock&&r.strictJournalUnchanged);
  assert.deepEqual(r.preferenceRetained,p.preferenceHidden);
  assert.deepEqual(r.preferenceRestored,[{key:p.preferenceHidden[0].key,value:{version:2,ids:[]}}]);
  assert(p.checks.some((c:any)=>c.label==='hidden preference survives actual renderer reload'&&c.passed));
  const profile=validateNetworkProfile(read(profileFile));
  assert.equal(profile.expectedGenesisDigest,n.h0);
  const pref=JSON.parse(p.preferenceHidden[0].key);
  assert.deepEqual(pref.slice(0,2),['wallet-hidden-assets',2]);
  assert.deepEqual(JSON.parse(pref[2]),[profile.expectedGenesisDigest,profile.generation]);
  assert.equal(pref[3],n.nfts[0].owner.AddressOwner);
  const rows=new Map<string,any>();
  function visit(v:any) {
    if(Array.isArray(v)){v.forEach(visit);return;}
    if(!v||typeof v!=='object')return;
    if(n.nfts.some((x:any)=>x.id===v.address)&&v.contents?.display?.output)rows.set(v.address,v);
    Object.values(v).forEach(visit);
  }
  for(const row of p.graphql){assert(!row.errors);visit(row.data);}
  assert.equal(rows.size,2);
  const session=new WalletReadSession(profile),reader=new WalletFullnodeReader(session);
  const original=globalThis.fetch,paths:string[]=[];
  globalThis.fetch=(input,init)=>{
    const u=new URL(input instanceof Request?input.url:String(input));
    assert(u.origin==='http://127.0.0.1:41750'&&['/GetServiceInfo','/GetObject'].some(s=>u.pathname.endsWith(s))||u.href==='http://127.0.0.1:41718/display-v2.png');
    paths.push(u.href);return original(input,init);
  };
  try {
    const nftLayout=bcs.struct('DisplayNFT',{id:bcs.Address,name:bcs.string(),image_url:bcs.string(),serial:bcs.u64()});
    const template=await reader.object(n.display.id);assert(template);
    const templateHash=createHash('sha256').update(template.content).digest('hex');
    const checked=[];
    for(const oracle of n.nfts) {
      const object=await reader.object(oracle.id);assert(object);
      assert.equal(object.version,oracle.version);assert.equal(object.digest,oracle.digest);
      assert(object.owner.$kind==='AddressOwner'&&object.owner.AddressOwner===pref[3]);
      const decoded=nftLayout.parse(object.content);assert.deepEqual(decoded,oracle.value);
      assert.equal(toBase64(nftLayout.serialize(decoded).toBytes()),toBase64(object.content));
      const raw=rows.get(oracle.id),display=raw.contents.display,basis=display.basis;
      assert.equal(raw.contents.bcs,toBase64(object.content));
      assert.equal(raw.contents.type.repr,object.type);
      assert.equal(display.errors,null);
      assert.deepEqual(display.output,{name:decoded.name,image_url:decoded.image_url,description:'RTD local Display V2 migration fixture #'+decoded.serial});
      assert.equal(basis.templateId,template.objectId);assert.equal(String(basis.objectVersion),template.version);
      assert.equal(basis.objectDigest,template.digest);assert.equal(basis.contentsBcsSha256,templateHash);
      assert.equal(basis.historyCoverage.genesisDigest,profile.expectedGenesisDigest);
      assert.equal(basis.historyCoverage.generation,profile.generation);
      assert.equal(basis.historyCoverage.firstCheckpoint,0);
      assert(basis.sourceCheckpoint===68693&&basis.snapshotCheckpoint>=68693&&basis.historyCoverage.lastCheckpoint>=basis.snapshotCheckpoint);
      checked.push({id:object.objectId,nativeBcsAndVersionVerified:true,actualIndexedDisplayOutputVerified:true,basis});
    }
    const response=await fetch('http://127.0.0.1:41718/display-v2.png');assert.equal(response.status,200);
    const pngHash=createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
    assert.equal(pngHash,read(mediaFile).actualPngSha256);
    assert(p.media.complete&&p.media.width===32&&p.media.height===32);
    const result={passed:true,observedAt:new Date().toISOString(),source:build.sourceAfter,
      checkedNativeNfts:checked,pngSha256:pngHash,scopeKey:p.preferenceHidden[0].key,
      originalWholeRunPassed:false,independentResumePassed:true,actualReloadAndCompleteRestartPreferenceRetained:true,
      actualShowAndRelockVerified:true,completeJournalUnchanged:true,paths,
      auditDatabaseWrites:0,auditSimulations:0,auditSignatures:0,auditExecuteRequests:0,
      inputsSha256:Object.fromEntries([profileFile,originalFile,resumeFile,nativeFile,buildFile,mediaFile,process.argv[1]].map(f=>[f,sha(f)])),
      scope:'Original actual C37 Display output matched to current canonical native NFT bytes/owners and retained template basis/history, exact PNG, real hide/reload and separately resumed full browser restart/show/relock with scoped preferences and complete journal retained. Original whole02 failure stays failed; excludes other global UI/transfer/normal HTTPS acceptance.'};
    writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
    console.log(JSON.stringify({passed:true,nfts:checked.length,auditExecuteRequests:0}));
  }finally{session.close();globalThis.fetch=original;}
}
main().catch(e=>{console.error(String(e.message).slice(0,500));process.exitCode=1;});
