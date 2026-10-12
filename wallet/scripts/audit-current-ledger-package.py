#!/usr/bin/env python3
"""Audit exact current product delta, new compiler closure and original-digest dev evidence."""
import argparse,hashlib,importlib.util,json,re,shutil
from pathlib import Path
from datetime import datetime,timezone
def main():
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--snapshot',type=Path,required=True);a=p.parse_args();assert not a.output.exists() and not a.snapshot.exists()
 w=Path(__file__).resolve().parents[1];d=w/'migrationToGRpcOrGraphQLDoc';l=d/'workLog';read=lambda f:json.loads(Path(f).read_text());sha=lambda f:hashlib.sha256(Path(f).read_bytes()).hexdigest()
 spec=importlib.util.spec_from_file_location('builder',w/'scripts/build-reviewed-local-extension.py');builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder);h,n=builder.source_hash(w);source={'sha256':h,'files':n};assert source=={'sha256':'03a1df273de748ea3829800fcdb328da5773ea6cf0988b998518a7bc053270ea','files':1110}
 original=l/'20261006-QA-A08-current-inputs/manifest.json';m=read(original);assert m['source']=={'sha256':'7b97be4b6a6f3209a4fecf1edae965c8d0d50efd9221dd149b1ef37378422076','files':1110};rows=m['files'][:m['completeProductFiles']];assert len(rows)==1110
 changed=[]
 for row in rows:
  assert sha(original.parent/row['relative'])==row['sha256']
  if sha(row['source'])!=row['sha256']:changed.append(row['relative'])
 assert set(changed)=={'rtd-apps/wallet/src/shared/rpc/ledger-reader.ts','rtd-apps/wallet/src/shared/rpc/ledger-reader.test.ts'}
 names=['20261006-personal-production-build-06.json','20261006-personal-production-audit-06.json','20261006-current-c26-source-only-01.json','20261006-current-c26-loopback-origin-01.json','20261006-current-c26-loopback-chrome-02.json','20261006-display-v2-fixture-publication-recovery-01.json','20261006-display-v2-fixture-mint-recovery-01.json','20261006-display-v2-fixture-native-02.json','20261006-optimized-debug-verifier-build-01.json','20261006-optimized-debug-verifier-benchmark-02.json','20261006-optimized-debug-verifier-negatives-03.json'];values=[read(l/name) for name in names];build,closure,fresh,origin,chrome,pub,mint,native,opt,bench,negative=values
 assert all(v.get('passed',v.get('built',False)) for v in values);assert build['sourceAfter']==fresh['source']==source and build['sourceUnchanged'] and build['currentDevelopmentDistUnchanged'];assert closure['moduleCount']==5277 and closure['uniqueSourceCount']==2033 and len(closure['chunks'])==7
 for f,digest in build['artifacts'].items():assert sha(Path(build['output'])/f)==digest
 assert chrome['workerSource']['workerSha256']==build['artifacts']['background.js'] and chrome['workerSource']['matchesDisk'] and chrome['uiSource']['matchesDisk']
 for row in chrome['uiSource']['loadedBundles']:assert row['loadedSha256']==build['artifacts'][row['file']]
 assert chrome['networkIdentityAccepted'] and all(row['status']==200 and row['sameGenesis'] for row in chrome['identities']) and {r['role'] for r in chrome['identities']}=={'fullnode','graphql','archive','account'}
 assert chrome['certificateChanges']==chrome['externalRequests']==chrome['forbiddenRequests']==chrome['pageErrorCount']==0 and not chrome['normalChromeHttpsAccepted'];assert origin['retainedOrigins']==7 and origin['actualOrigin']=='chrome-extension://'+fresh['extensionId']
 for value in [fresh,origin,pub,mint,native,bench,negative]:
  for f,digest in value['inputsSha256'].items():assert sha(f)==digest
 assert pub['recoveredSuccess'] and mint['recoveredSuccess'] and pub['checkpoint']=='1001373' and mint['checkpoint']==native['checkpoint']=='1002694';assert pub['dispatches']==mint['dispatches']==1 and pub['recoveryDispatches']==mint['recoveryDispatches']==native['executeRequests']==0
 assert len(native['nfts'])==2 and native['derivedDisplayIdVerified'] and native['displayKeyBcsBase64']=='AA==' and native['displayKeyLayout']['fields'][0]['name']=='dummy_field'
 assert bench['stdoutIdentical'] and bench['stateBytesIdentical'] and bench['checkpointCount']==1024 and negative['finalStateBytesIdentical'] and len(negative['checks'])==30 and not opt['installed'] and not negative['installed']
 full=(l/'20261006-ledger-package-full-01.log').read_text();assert '181 passed (181)' in full and '2562 passed (2562)' in full and not re.search(r'Test Files.*failed',full);assert (l/'20261006-ledger-package-types-01.log').read_text()==''
 section=(l/'20261006-ledger-display-contract-section.txt').read_text();assert section in (d/'04-SDK契约与功能迁移矩阵.md').read_text() and section in (w.parent.parent/'rtd-archive-service/docs/wallet/03-SDK契约与功能迁移矩阵.md').read_text()
 parents=re.findall(r'^- \[([ x])\] `([A-Z]+-[A-Z0-9]+)`',(d/'Task.md').read_text(),re.M);assert len(parents)==98 and sum(mark=='x' for mark,_ in parents)==78
 a.snapshot.mkdir();saved=[]
 for row in rows:
  f=Path(row['source']);out=a.snapshot/row['relative'];out.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(f,out);saved.append({**row,'sha256':sha(f)})
 tools=[Path(__file__),w/'scripts/test-current-production-source-only.cjs',w/'scripts/lib/current-extension-worker.cjs',w/'scripts/lib/current-extension-ui-source.cjs'];root=w.parent.parent;ld=root/'link-u-smart-contract/all-in-one-deploy/localDeploy';tools+=[ld/name for name in ['deploy_wallet_display_fixture.mjs','recover_wallet_display_fixture.ts','inspect_wallet_display_fixture.ts','prepare_wallet_display_fixture.py','rebind_wallet_current_loopback_origin.py','build_wallet_optimized_debug_verifier.py','benchmark_wallet_debug_verifier.py','verify_wallet_debug_verifier_negative.ts','wallet-fixtures/sources/display_v2_nft.move']]
 for f in tools:
  relative=str(f.relative_to(root));out=a.snapshot/relative;out.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(f,out);saved.append({'source':str(f),'relative':relative,'sha256':sha(f)})
 (a.snapshot/'manifest.json').write_text(json.dumps({'source':source,'completeProductFiles':1110,'exactChangedProductFiles':changed,'beforeC25Manifest':str(original),'files':saved},indent=2)+'\n')
 report={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'source':source,'currentRevision':'C26','parentsComplete':78,'parentsTotal':98,'trialReady':False,'normalChromeHttpsAccepted':False,'fullUnitFiles':181,'fullUnitTests':2562,'exactChangedProductFiles':changed,'snapshotManifest':str(a.snapshot/'manifest.json'),'snapshotManifestSha256':sha(a.snapshot/'manifest.json'),'proofs':[{'file':str(l/name),'sha256':sha(l/name)} for name in names],'sameContractSectionSha256':sha(l/'20261006-ledger-display-contract-section.txt'),'scope':'Current exact two-file product delta and production/UI/worker/four loopback roles plus original fixture deployment/mint recovery and native Display proof. Historical C25 QA parent proofs remain historical; no GraphQL mint coverage, Chrome NFT display/hiding, original HTTPS or full trial claim.'};a.output.open('x').write(json.dumps(report,indent=2)+'\n');print(json.dumps({k:report[k] for k in ['passed','currentRevision','parentsComplete','fullUnitTests']}))
if __name__=='__main__':main()
