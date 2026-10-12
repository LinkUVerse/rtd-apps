#!/usr/bin/env python3
"""Current mnemonic UI transfer plus exact historical account/coin/failure lineage."""
import argparse, hashlib, importlib.util, json, re, shutil
from pathlib import Path
from datetime import datetime, timezone

def main():
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--expected-parents',type=int,required=True);a=p.parse_args();assert not a.output.exists()
 w=Path(__file__).resolve().parents[1];root=w.parent.parent;d=w/'migrationToGRpcOrGraphQLDoc';l=d/'workLog';sha=lambda f:hashlib.sha256(Path(f).read_bytes()).hexdigest();read=lambda f:json.loads(Path(f).read_text())
 names=['20261006-TRY-02-current-mnemonic-execution-01.json','20261006-TRY-02-current-mnemonic-native-01.json','20261006-TRY-02-current-mnemonic-recovery-01.json','20261006-personal-production-build-04.json','20261006-loopback-production-build-01.json','20261006-C21-public-execution-01.json','20261006-C21-public-execution-audit-01.json','20261006-C21-QA-A09-audit-02.json','20261006-C21-failed-receipt-ui-01.json','20261006-QA-A05-completion-audit-03.json','20261006-QA-A08-current-simulation-01.json'];proofs=[read(l/n) for n in names];assert all(x['passed'] for x in proofs)
 ui,native,recovery,build,old=proofs[:5];source=build['sourceAfter'];spec=importlib.util.spec_from_file_location('builder',w/'scripts/build-reviewed-local-extension.py');builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder);h,n=builder.source_hash(w);assert source=={'sha256':h,'files':n};assert h=='839da1f5f5b326bb06ccb0309703c37e1fe15699e391c9f93be3f2c34255f425'
 assert ui['source']==native['source']==recovery['source']==source
 assert ui['executeRequests']==ui['signatures']==1 and ui['actualSimulationRequests']==4 and len(ui['checks'])==9 and not ui['errors'] and not ui['forbidden']
 assert ui['funding']['recipient']==ui['owner'] and ui['funding']['balanceBefore']['balance']=='0' and ui['funding']['amount']==ui['funding']['balanceAfter']['balance'] and not ui['funding']['repeatAllowed']
 assert native['digest']==recovery['digest']==ui['execution']['digest'] and native['signatureVerified'] and native['nativeEffectsMatch'] and native['originalApprovedBcsUnchanged'] and native['recipientAtomicAmount']=='1'
 assert recovery['executeRequests']==recovery['simulations']==recovery['signatures']==recovery['pendingCount']==0 and recovery['lockedOriginalAccountRetained'] and recovery['wrongPasswordRefused'] and recovery['correctPasswordKeyAddressVerified'] and recovery['encryptedLogicalSha256Before']==recovery['encryptedLogicalSha256After']
 for b in [build,old]:
  for f,h in b['artifacts'].items():assert sha(Path(b['output'])/f)==h
 def ui_contents(b):
  result={}
  for file in ['667.js.map','background.js.map']:
   m=read(Path(b['output'])/file)
   for name,content in zip(m['sources'],m['sourcesContent']):
    if not name.startswith('webpack:///./'):continue
    if name in result:assert result[name]==content,name
    result[name]=content
  return result
 before,after=ui_contents(old),ui_contents(build)
 wanted=[name for name in before if name.startswith('webpack:///./') and any(x in name for x in ['/ui/app/pages/accounts/','/ui/app/components/accounts/','/background/accounts/','/background/account-sources/','/ui/app/pages/home/transfer-coin/','/ui/app/pages/home/receipt/','/ui/app/components/receipt-card/'])]
 wanted += ['webpack:///./shared/rpc/'+name+'.ts' for name in ['transaction-reader','execution-reader','execution-coordinator','receipt-validation','stored-receipt','receipt-indexing','coin-transfer-preparation','fullnode-reader']]
 same={}
 for name in wanted:assert before[name] and before[name]==after[name],name;same[name]=hashlib.sha256(after[name].encode()).hexdigest()
 assert len(same)>60
 assert proofs[5]['executeRequests']==2 and proofs[5]['actualWalletExecutionAccepted'] and proofs[6]['passed'] and proofs[7]['qa09ContractComplete']
 assert proofs[8]['passed'] and proofs[9]['actualReadCoins']==2
 snapshot=read(l/'20261006-staking-current-inputs/manifest.json');assert snapshot['source']==source
 for row in snapshot['files']:assert sha(row['source'])==row['sha256'] and sha(l/'20261006-staking-current-inputs'/row['relative'])==row['sha256']
 for proof in [ui,native,recovery]:
  for file,h in proof['inputsSha256'].items():assert sha(file)==h
 requests=proofs[10]['requests'];assert len(proofs[10]['cases'])==8 and proofs[10]['executeRequests']==proofs[10]['signatures']==0 and proofs[10]['simulations']==7 and all(r['path'].endswith(('/GetServiceInfo','/ListOwnedObjects','/SimulateTransaction')) for r in requests)
 assert re.search(r'Tests\s+189 passed',(l/'20261006-QA-A08-targeted-01.log').read_text())
 parents=re.findall(r'^- \[([ x])\] `([A-Z]+-[A-Z0-9]+)`',(d/'Task.md').read_text(),re.M);assert len(parents)==len(set(id for _,id in parents))==98;done=sum(mark=='x' for mark,_ in parents);assert done==a.expected_parents
 files=[w/'scripts'/name for name in ['test-current-mnemonic-coin-execution.cjs','audit-current-mnemonic-coin-execution.ts','recover-retained-mnemonic-coin-execution.cjs','probe-current-qa08-simulation.ts','lib/test-new-mnemonic-backup.cjs']]+[Path(__file__).resolve()];rows=[{'source':str(f),'relative':str(f.relative_to(root)),'sha256':sha(f)} for f in files];batch=l/'20261006-TRY-02-current-inputs'
 if batch.exists():assert read(batch/'manifest.json')['files']==rows
 else:
  batch.mkdir()
  for row in rows:target=batch/row['relative'];target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(row['source'],target)
  (batch/'manifest.json').write_text(json.dumps({'source':source,'files':rows,'completeProductSourceManifest':str(l/'20261006-staking-current-inputs/manifest.json'),'completeProductSourceManifestSha256':sha(l/'20261006-staking-current-inputs/manifest.json')},indent=2)+'\n')
 result={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'source':source,'parentsComplete':done,'parentsTotal':98,'try02MarkedComplete':any(mark=='x' and id=='TRY-02' for mark,id in parents),'try02ContractComplete':True,'currentMnemonicExecutionDigest':native['digest'],'currentMnemonicExecutionCheckpoint':native['receipt']['checkpoint'],'currentUiChecks':9,'currentFormalSimulations':4,'currentSignatures':1,'currentExecuteRequests':1,'recoveryExecuteRequests':0,'exactHistoricalSourceMapContents':same,'historyReLabelledCurrent':False,'trialReady':False,'normalChromeHttpsAccepted':False,'inputsManifest':str(batch/'manifest.json'),'proofs':[{'file':str(l/name),'sha256':sha(l/name)} for name in names],'scope':'TRY02 actual current C24 mnemonic create/protect/backup, initial complete empty GraphQL assets, once funded fresh sender internal atomic transfer/strict terminal/native signature+amount and password/locked restart. Original C21 import/funded coin, mnemonic recover and real chain failure retained as historical with exact 60+ relevant sourceContents and current full-source snapshot. Newly funded GraphQL assets/index catch-up and HTTPS remain separate open gates.'};a.output.open('x').write(json.dumps(result,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['passed','parentsComplete','currentMnemonicExecutionDigest','try02ContractComplete']}))
if __name__=='__main__':main()
