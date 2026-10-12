// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {files,productSource}=require('./build-reviewed-generation-production-extension.cjs');
const W=path.resolve(__dirname,'..'),L=path.join(W,'migrationToGRpcOrGraphQLDoc/workLog');
const pins={},sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function read(p){p=path.resolve(p);pins[p]=sha(p);return JSON.parse(fs.readFileSync(p));}
function proof(name){const p=path.join(L,name),r=read(p);assert.equal(r.passed,true);return r;}
const prepared=proof('20261012-C292-ordinary-upgrade-prepared-01.json');
assert.deepEqual(productSource(),prepared.source);assert.deepEqual(files(prepared.stable),prepared.newArtifacts);
const current=proof('20261012-C313-late-read-audit-01.json');assert(current.allFourLateReadCategoriesAccepted&&current.fixtureCleaned);
for(const[p,h]of Object.entries(current.inputsSha256))assert.equal(sha(path.isAbsolute(p)?p:path.join(W,p)),h);
const critical=['profile.ts','profile-registry.ts','session.ts','WalletRpcProvider.ts','network-admission-store.ts',
 'capability-observation-lifetime.ts','read-capability-observation.ts','read-capability-view.ts','display-history.ts'];
const reused=[];
for(const name of ['20261011-C266-qualification-01.json','20261011-C270-qualification-01.json']){
 const r=proof(name),changed=[];let same=0;
 for(const[p,h]of Object.entries(r.inputsSha256))if(p.includes('/wallet/src/shared/rpc/')){
  if(sha(p)===h)same++;else changed.push(path.basename(p));
 }
 for(const name of critical){const p=path.join(W,'src/shared/rpc',name);assert.equal(sha(p),r.inputsSha256[p]);pins[p]=sha(p);}
 if(name.includes('C270'))for(const file of ['src/ui/app/pages/home/hidden-assets/HiddenAssetsProvider.tsx','src/background/NetworkEnv.ts']){
  const p=path.join(W,file);assert.equal(sha(p),r.inputsSha256[p]);pins[p]=sha(p);
 }
 assert.equal(same,103);assert.deepEqual(changed.sort(),['name-reader.ts','snapshot-pagination.ts','staking-snapshot-reader.ts']);
 reused.push({proof:name,sameRpcFiles:same,changedRpcFiles:changed,lifecycleCriticalFilesUnchanged:critical});
}
const nameProof=proof('20261012-C279-name-registry-audit-01.json');
assert(nameProof.wrongRegistryReturnedNoRecipient&&nameProof.restoredRegistryReturnedCurrentRecipient);
for(const[p,h]of Object.entries(nameProof.inputsSha256))assert.equal(sha(p),h);
const installed=proof('20261012-C292-ordinary-upgrade-installed-01.json');
const expected=new Set(['shared/rpc/name-reader.ts','shared/rpc/profile.ts','shared/rpc/session.ts',
 'shared/rpc/profile-registry.ts','background/NetworkEnv.ts','ui/app/pages/home/hidden-assets/HiddenAssetsProvider.tsx']);
const matched=new Set();
for(const n of fs.readdirSync(installed.archive).filter(n=>n.endsWith('.js.map'))){
 const m=read(path.join(installed.archive,n));
 m.sources.forEach((s,i)=>{const relative=s.replace(/^webpack:\/\/\/\.\//,'');if(!expected.has(relative))return;
  const local=path.join(W,'src',relative);assert.equal(fs.readFileSync(local,'utf8'),m.sourcesContent[i]);pins[local]=sha(local);matched.add(relative);
 });
}
assert.deepEqual(matched,expected);
const h0=proof('20261012-C296-lifecycle-accepted-01.json');assert(h0.actualSameUrlFourRoleWrongChainMatrix);
const result={passed:true,at:new Date().toISOString(),acceptedPackage:'QA-A17.10',currentInstalledBuild:'C292',
 currentSource:prepared.source,installedArtifactsVerified:46,actualLateReadRoles:current.reports.map(r=>r.role),
 actualRegistryInvalidationAndRecovery:true,actualSameUrlWrongH0Roles:4,
 providerLateSuccessAndFailureModes:['account','revision','endpoint','generation','chain','reenter'],
 currentFocusedTestsPassed:105,reusedEvidence:reused,previousRegistryAndHiddenBindingSourcesUnchanged:[...matched],
 matrixScope:'Four real browser delayed read categories; actual URL, client generation, registry and H0 cases reused with explicit source applicability; six provider switch modes include ignored-cancellation late success and failure in code tests. Not every Cartesian combination was replayed in Chrome.',
 actualBackendGenerationReplacementAccepted:false,completeArchiveRebuildAccepted:false,walRecoveryAccepted:false,
 entireQAA17Complete:false,inputsSha256:pins};
pins[__filename]=sha(__filename);
fs.writeFileSync(path.join(L,'20261012-C313-lifecycle-qualified-01.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({passed:true,acceptedPackage:result.acceptedPackage,realLateReadRoles:4,testsPassed:105,sourceMatchesInstalledC292:true}));
