#!/usr/bin/env python3
"""Freeze current C25 complete product lineage and finite QA08 runtime/fixture evidence."""
import argparse,hashlib,json,re,shutil
from pathlib import Path
from datetime import datetime,timezone

def main():
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--expected-parents',type=int,required=True);a=p.parse_args();assert not a.output.exists()
 w=Path(__file__).resolve().parents[1];root=w.parent.parent;d=w/'migrationToGRpcOrGraphQLDoc';l=d/'workLog';read=lambda f:json.loads(Path(f).read_text());sha=lambda f:hashlib.sha256(Path(f).read_bytes()).hexdigest()
 names=['20261006-personal-production-build-05.json','20261006-personal-production-audit-05.json','20261006-dapp-preflight-chrome-identity-01.json','20261006-QA-A08-current-gas-authorization-06.json','20261006-QA-A08-current-gas-audit-02.json','20261006-QA-A08-current-simulation-01.json','20261006-TRY-02-completion-audit-03.json','20261006-QA-A05-completion-audit-03.json'];proofs=[read(l/n) for n in names];assert all(p['passed'] for p in proofs)
 build,closure,chrome,ui,gas,negative=proofs[:6];source=build['sourceAfter'];assert source=={'sha256':'7b97be4b6a6f3209a4fecf1edae965c8d0d50efd9221dd149b1ef37378422076','files':1110}
 for name,h in build['artifacts'].items():assert sha(Path(build['output'])/name)==h
 assert closure['moduleCount']==5277 and closure['uniqueSourceCount']==2033 and len(closure['chunks'])==7
 assert chrome['networkIdentityAccepted'] and len(chrome['identities'])==4 and all(r['status']==200 and r['sameGenesis'] for r in chrome['identities']) and chrome['pageErrorCount']==0
 assert ui['source']==gas['source']==source and ui['signatureCount']==2 and len(ui['checks'])==15 and len(ui['simulations'])==4 and ui['executeRequests']==0 and not ui['blocked'] and ui['journalUnchanged']
 assert gas['oldSignatureRefusedForChangedBytes'] and gas['distinctApprovalRequestIds'] and gas['actualFormalSimulations']==4 and gas['auditFetches']==gas['auditSignatures']==gas['auditSimulations']==gas['auditExecuteRequests']==0
 assert len(negative['cases'])==8 and all(r['passed'] for r in negative['cases']) and len(negative['requests'])==18 and negative['simulations']==7 and negative['signatures']==negative['executeRequests']==0
 for proof in [ui,gas,negative]:
  for f,h in proof['inputsSha256'].items():assert sha(f)==h
 assert re.search(r'Test Files\s+7 passed',(l/'20261006-QA-A08-targeted-01.log').read_text());assert re.search(r'Tests\s+189 passed',(l/'20261006-QA-A08-targeted-01.log').read_text())
 assert re.search(r'Test Files\s+181 passed',(l/'20261006-dapp-preflight-full-01.log').read_text()) and re.search(r'Tests\s+2556 passed',(l/'20261006-dapp-preflight-full-01.log').read_text());assert not (l/'20261006-dapp-preflight-types-01.log').stat().st_size
 product={}
 for directory in [w/'src',w/'configs',w.parent/'core/src',root/'rtd-ts-sdk/packages/typescript/src']:
  for f in directory.rglob('*'):
   if f.is_file():product[str(f.relative_to(root))]={'source':str(f),'relative':str(f.relative_to(root)),'sha256':sha(f)}
 for f in [w/'package.json',w/'webpack.config.ts',w.parent/'pnpm-lock.yaml']:product[str(f.relative_to(root))]={'source':str(f),'relative':str(f.relative_to(root)),'sha256':sha(f)}
 rows={relative:r['sha256'] for relative,r in product.items()};assert len(rows)==1110 and hashlib.sha256(json.dumps(rows,sort_keys=True).encode()).hexdigest()==source['sha256']
 before=read(l/'20261006-dapp-preflight-before/manifest.json');old=dict(rows)
 for row in before['files']:assert sha(l/'20261006-dapp-preflight-before'/row['relative'])==row['sha256'];old[row['relative']]=row['sha256']
 assert len(before['files'])==2 and hashlib.sha256(json.dumps(old,sort_keys=True).encode()).hexdigest()=='839da1f5f5b326bb06ccb0309703c37e1fe15699e391c9f93be3f2c34255f425'
 c24=read(l/'20261006-staking-current-inputs/manifest.json');original={r['relative']:r for r in c24['files']};changed=[]
 for relative,row in product.items():
  assert sha(l/'20261006-staking-current-inputs'/relative)==original[relative]['sha256']
  if row['sha256']!=original[relative]['sha256']:changed.append(relative)
 assert set(changed)==set(r['relative'] for r in before['files'])
 parents=re.findall(r'^- \[([ x])\] `([A-Z]+-[A-Z0-9]+)`',(d/'Task.md').read_text(),re.M);assert len(parents)==len(set(i for _,i in parents))==98;done=sum(mark=='x' for mark,_ in parents);assert done==a.expected_parents
 tools=[w/'scripts'/n for n in ['test-current-gas-reauthorization-c25.cjs','audit-current-gas-reauthorization-trailers.cjs','probe-current-qa08-simulation.ts','test-loopback-extension-readonly-verified.cjs','lib/current-extension-worker.cjs','lib/current-extension-ui-source.cjs']]+[Path(__file__).resolve()];saved=list(product.values())+[{'source':str(f),'relative':str(f.relative_to(root)),'sha256':sha(f)} for f in tools];batch=l/'20261006-QA-A08-current-inputs'
 if batch.exists():assert read(batch/'manifest.json')['files']==saved
 else:
  batch.mkdir()
  for row in saved:out=batch/row['relative'];out.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(row['source'],out)
  (batch/'manifest.json').write_text(json.dumps({'source':source,'files':saved,'completeProductFiles':1110,'beforeC24Manifest':str(l/'20261006-staking-current-inputs/manifest.json'),'exactChangedProductFiles':changed},indent=2)+'\n')
 result={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'source':source,'parentsComplete':done,'parentsTotal':98,'qa08MarkedComplete':any(mark=='x' and id=='QA-A08' for mark,id in parents),'qa08ContractComplete':True,'exactChangedProductFiles':changed,'c24SourceReconstructed':True,'sourceInputsManifest':str(batch/'manifest.json'),'currentChromeGasChecks':15,'currentGasSignatures':2,'currentGasFormalSimulations':4,'currentGasExecuteRequests':0,'retainedC24NegativeSimulationCases':8,'retainedC24NegativeSimulations':7,'retainedRelevantTests':189,'currentFullUnitTests':2556,'currentAllFourLoopbackH0Accepted':True,'historyReLabelledCurrent':False,'trialReady':False,'normalChromeHttpsAccepted':False,'proofs':[{'file':str(l/name),'sha256':sha(l/name)} for name in names],'scope':'QA08 complete supported coin amount/precision/funding/error/version/command/simulation matrix, retained C24 native eight cases and 189 unchanged-domain tests, C25 real new gas-budget approvals/old signature refusal/complete independent native frames and no public preflight request. Exactly two preflight source files changed; full 1110 product sources saved. TX01 all internal routes, index catch-up, arbitrary production throughput and HTTPS remain separately open.'};a.output.open('x').write(json.dumps(result,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['passed','parentsComplete','qa08ContractComplete','currentChromeGasChecks']}))
if __name__=='__main__':main()
