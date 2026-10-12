#!/usr/bin/env python3
"""Independently qualify bounded C28 ownership evidence; never infer full parent acceptance."""
import argparse, hashlib, importlib.util, json, re, shutil, subprocess, uuid
from pathlib import Path
from datetime import datetime, timezone

def main():
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--snapshot',type=Path,required=True);a=p.parse_args()
    assert not a.output.exists() and not a.snapshot.exists()
    w=Path(__file__).resolve().parents[1];root=w.parent.parent;l=w/'migrationToGRpcOrGraphQLDoc/workLog'
    sha=lambda f:hashlib.sha256(Path(f).read_bytes()).hexdigest()
    read=lambda f:json.loads(Path(f).read_text())
    spec=importlib.util.spec_from_file_location('builder',w/'scripts/build-reviewed-local-extension.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
    h,n=m.source_hash(w);source={'sha256':h,'files':n}
    assert source=={'sha256':'4ccafc8f1fb55685171a6b1516aaae014e8324087a500ffc12d32e2d914a5a06','files':1113}
    prior=read(l/'20261006-C27-cold-read-ui-audit-01.json');before_file=Path(prior['snapshotManifest']);before=read(before_file)
    changed=[]
    for name,digest in before['rows'].items():
        assert sha(before_file.parent/name)==digest
        if sha(root/name)!=digest:changed.append(name)
    prefix='rtd-apps/wallet/src/shared/rpc/'
    assert set(changed)=={prefix+f for f in ['network-admission-database.ts','network-admission-store.ts','network-admission-store.test.ts','read-capability-observation.ts','read-capability-observation-provider.test.ts']}
    names=['20261006-C28-name-production-build-01.json','20261006-C28-name-production-audit-01.json','20261006-C28-name-production-chrome-03.json','20261006-C28-current-settings-ui-03.json','20261006-C28-name-loopback-origin-01.json','20261006-C28-owner-native-01.json','20261006-C28-current-owner-restart-04.json']
    build,audit,chrome,ui,origin,native,handoff=[read(l/name) for name in names]
    assert all(v['passed'] for v in [build,audit,chrome,ui,origin,native,handoff])
    assert build['sourceBefore']==build['sourceAfter']==audit['source']==ui['source']==native['source']==handoff['source']==source
    assert build['sourceUnchanged'] and build['currentDevelopmentDistUnchanged'] and build['compilationErrors']==0
    for name,digest in build['artifacts'].items():assert sha(Path(build['output'])/name)==digest
    assert chrome['networkIdentityAccepted'] and len(chrome['identities'])==4 and all(r['status']==200 and r['sameGenesis'] for r in chrome['identities'])
    assert chrome['externalRequests']==chrome['forbiddenRequests']==chrome['pageErrorCount']==chrome['certificateChanges']==0
    assert not chrome['normalChromeHttpsAccepted']
    for v in [chrome,ui,handoff]:
        assert v['workerSource']['matchesDisk'] and v['workerSource']['workerSha256']==build['artifacts']['background.js'] and v['uiSource']['matchesDisk']
        for row in v['uiSource']['loadedBundles']:assert row['loadedSha256']==build['artifacts'][row['file']]
    assert ui['restartedWorkerSource']['matchesDisk'] and ui['restartedWorkerSource']['workerSha256']==build['artifacts']['background.js']
    assert len(ui['checks'])==24 and ui['normalBrowserRestart'] and ui['retainedAccountLocked'] and ui['nativeAdmissionAfterRestart']=={'pending':0,'faults':0,'owners':0}
    assert len(native['checks'])==17 and native['upgrade']==[{'version':1,'originalRowsPreserved':True,'newVersion':3},{'version':2,'originalRowsPreserved':True,'newVersion':3}]
    assert len(handoff['checks'])==13 and handoff['originalProfilePreserved']
    for v in [ui,native,handoff]:
        assert all(r['passed'] for r in v['checks']) and v['errors']==v['forbidden']==[]
        assert v['simulations'] in (0,[]) and v['signatures']==v['executeRequests']==v['certificateChanges']==v['originalProfilesOpened']==0
    old=handoff['reserved']['owners'][0];new=handoff['successor']['owners'][0]
    assert len(handoff['reserved']['owners'])==len(handoff['successor']['owners'])==1
    assert old['id']==new['id'] and old['incarnation']!=new['incarnation']
    assert all(uuid.UUID(v).version==4 for v in [old['id'],old['incarnation'],new['incarnation']])
    assert {k:v for k,v in old.items() if k!='incarnation'}=={k:v for k,v in new.items() if k!='incarnation'}
    assert handoff['reserved']['admission']==handoff['successor']['admission']
    assert handoff['reserved']['admission'][0]['pending'][0]['id']==old['id']
    assert handoff['final']['owners']==[] and all(row['pending']==row['faults']==[] for row in handoff['final']['admission'])
    assert handoff['admitted']['status']=='success' and any(row['coinType'].endswith('::migration_coin::MIGRATION_COIN') and row['balance']=='1500000' for row in handoff['admitted']['balances'])
    assert len(handoff['heldFrames'])==2 and len(handoff['dispatches'])==2
    for index,row in enumerate(handoff['dispatches']):
        assert row['state']['owners'][0]==[old,new][index] and row['state']['admission'][0]['pending'][0]['id']==old['id']
    decode="const fs=require('fs'),{GrpcTypes}=require('rtd-typescript/grpc');const rows=JSON.parse(fs.readFileSync(process.argv[1]));console.log(JSON.stringify(rows.map(r=>{const b=fs.readFileSync(r.file);if(b[0]!==0||b.length<5+b.readUInt32BE(1))throw Error('frame');return GrpcTypes.GetServiceInfoResponse.fromBinary(b.subarray(5,5+b.readUInt32BE(1))).chainId})))"
    # The full proof is immutable; pass frame paths without creating or editing inputs.
    decode=decode.replace("JSON.parse(fs.readFileSync(process.argv[1]))","JSON.parse(fs.readFileSync(process.argv[1])).heldFrames")
    result=subprocess.run(['node','-e',decode,str(l/names[-1])],cwd=w,capture_output=True,text=True,check=True)
    assert json.loads(result.stdout)==['3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj']*2
    for row in handoff['heldFrames']:assert row['status']==200 and sha(row['file'])==row['sha256']
    for row in handoff['retainedOriginalFiles']:assert sha(Path(ui['fixture'])/'profile'/row['file'])==row['sha256']
    assert origin['retainedOrigins']==10 and origin['actualOrigin']=='chrome-extension://'+chrome['actualExtensionId']
    for v in [audit,chrome,ui,origin,native,handoff]:
        for f,digest in v['inputsSha256'].items():assert sha(f)==digest
    store=read(l/'20261006-C28-admission-v3-native-01.log');assert store['passed'] and store['count']==len(store['tests'])==33 and store['chainRequests']==store['signingCalls']==store['simulations']==store['executions']==0
    full=(l/'20261006-C28-full-unit-01.log').read_text();assert '183 passed (183)' in full and '2573 passed (2573)' in full and not re.search(r'Test Files.*failed',full)
    assert (l/'20261006-C28-types-02.log').read_text()==''
    tasks=re.findall(r'^- \[([ x])\] `([A-Z]+-[A-Z0-9]+)`',(l.parent/'Task.md').read_text(),re.M);assert len(tasks)==98 and sum(mark=='x' for mark,_ in tasks)==78
    rows={}
    for base in (w/'src',w/'configs',w.parent/'core/src',root/'rtd-ts-sdk/packages/typescript/src'):
        for f in base.rglob('*'):
            if f.is_file():rows[str(f.relative_to(root))]=sha(f)
    for f in (w/'package.json',w/'webpack.config.ts',w.parent/'pnpm-lock.yaml'):rows[str(f.relative_to(root))]=sha(f)
    assert len(rows)==n and set(rows)-set(before['rows'])=={prefix+'capability-owner-lock.ts',prefix+'capability-owner-lock.test.ts'}
    a.snapshot.mkdir(mode=0o700)
    for name,digest in rows.items():
        target=a.snapshot/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(root/name,target);assert sha(target)==digest
    manifest={'source':source,'rows':rows,'previousSnapshot':str(before_file.parent),'changedOriginalFiles':changed,'newFiles':sorted(set(rows)-set(before['rows']))}
    (a.snapshot/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    files=[l/name for name in names]+[before_file,l/'20261006-C28-full-unit-01.log',l/'20261006-C28-types-02.log',l/'20261006-C28-admission-v3-native-01.log',Path(__file__).resolve()]
    report={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'currentRevision':'C28','source':source,'fullUnitFiles':183,'fullUnitTests':2573,'browserSettingsChecks':24,'productionOwnerHandoffChecks':13,'nativeOwnershipChecks':17,'nativeOriginalContractChecks':33,'parentsComplete':78,'parentsTotal':98,'trialReady':False,'normalChromeHttpsAccepted':False,'snapshotManifest':str(a.snapshot/'manifest.json'),'snapshotManifestSha256':sha(a.snapshot/'manifest.json'),'proofs':[{'file':str(f),'sha256':sha(f)} for f in files],'scope':'v3 marked read-observation native ownership, same original ticket retained and freshly adopted across ordinary actual production browser restart, no early admission, unchanged same-H0 raw frames, fresh full WMIG balance read. Unmarked legacy reservations remain blocked. No arbitrary crash/BFCache, transaction recovery, TLS, positive name/NFT or full parent acceptance.'}
    a.output.open('x').write(json.dumps(report,indent=2)+'\n');print(json.dumps({k:report[k] for k in ['passed','currentRevision','fullUnitTests','parentsComplete']}))

if __name__=='__main__':main()
