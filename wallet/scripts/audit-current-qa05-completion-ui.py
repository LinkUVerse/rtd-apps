#!/usr/bin/env python3
"""Finite current balances/metadata QA with exact retained UI source lineage."""
import argparse,hashlib,json,re,shutil
from pathlib import Path
from datetime import datetime,timezone
def main():
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--expected-parents',type=int,required=True);a=p.parse_args();assert not a.output.exists()
 w=Path(__file__).resolve().parents[1];root=w.parent.parent;d=w/'migrationToGRpcOrGraphQLDoc';l=d/'workLog';sha=lambda f:hashlib.sha256(Path(f).read_bytes()).hexdigest();read=lambda f:json.loads(Path(f).read_text())
 names=['20261006-QA-A05-current-domain-01.json','20261006-personal-production-build-04.json','20261006-personal-production-audit-04.json','20261006-loopback-production-build-01.json','20261006-RPC-04-current-ui-audit-05.json','20261006-RPC-04-current-execution-audit-02.json','20261006-RPC-04-current-token-execution-audit-01.json','20261006-staking-chrome-identity-03.json','20261006-RPC-13-completion-audit-03.json'];proofs=[read(l/n) for n in names];assert all(p['passed'] for p in proofs)
 domain,build,closure,old=proofs[:4];source=build['sourceAfter'];assert source['sha256']=='839da1f5f5b326bb06ccb0309703c37e1fe15699e391c9f93be3f2c34255f425' and source['files']==1110;assert domain['source']==source
 assert domain['signatures']==domain['simulations']==domain['executeRequests']==0;assert len(domain['balances']['value'])==2 and len(domain['requests'])==16
 assert domain['native']['value']['decimals']==9 and domain['nonnative']['value']['decimals']==6 and domain['absence']['result']['value'] is None
 for row in domain['balances']['value']:assert int(row['balance'])==int(row['coinBalance'])+int(row['addressBalance'])
 for p in [build,old]:
  for f,h in p['artifacts'].items():assert sha(Path(p['output'])/f)==h
 def contents(b):
  result={}
  for f in [Path(b['output'])/'667.js.map']:
   m=read(f)
   for name,text in zip(m['sources'],m['sourcesContent']):
    if name in result:assert result[name]==text
    result[name]=text
  return result
 before,after=contents(old),contents(build)
 wanted=['webpack:///../../core/src/rpc/coin.ts']+['webpack:///./shared/rpc/'+n for n in ['balance-reader.ts','coin-metadata-reader.ts','fullnode-reader.ts','address-funded-transfer.ts','coin-transfer-preparation.ts']]+['webpack:///./ui/app/pages/home/transfer-coin/'+n for n in ['CoinSelector.tsx','PreviewTransfer.tsx','SendTokenForm.tsx','index.tsx','utils/transaction.ts','validation.ts']]
 unchanged={}
 for name in wanted:assert before[name]==after[name] and after[name];unchanged[name]=hashlib.sha256(after[name].encode()).hexdigest()
 assert proofs[5]['recipientAtomicAmount']=='1' and proofs[6]['recipientAtomicAmount']=='100000';assert proofs[5]['signatureVerified'] and proofs[6]['signatureVerified']
 chrome=proofs[7];assert chrome['networkIdentityAccepted'] and len(chrome['identities'])==4 and all(r['status']==200 and r['sameGenesis'] for r in chrome['identities']) and not chrome['pageErrorCount']
 scoped=(l/'20261006-QA-A05-targeted-01.log').read_text();assert re.search(r'Test Files\s+8 passed',scoped) and re.search(r'Tests\s+86 passed',scoped)
 full=(l/'20261006-staking-lifetime-full-01.log').read_text();assert re.search(r'Tests\s+2551 passed',full);assert not (l/'20261006-staking-lifetime-types-02.log').stat().st_size
 snapshot=read(l/'20261006-staking-current-inputs/manifest.json');assert snapshot['source']==source
 for row in snapshot['files']:assert sha(row['source'])==row['sha256'] and sha(l/'20261006-staking-current-inputs'/row['relative'])==row['sha256']
 parents=re.findall(r'^- \[([ x])\] `([A-Z]+-[A-Z0-9]+)`',(d/'Task.md').read_text(),re.M);assert len(parents)==98;done=sum(mark=='x' for mark,_ in parents);assert done==a.expected_parents;marked=any(mark=='x' and id=='QA-A05' for mark,id in parents);assert marked==(done==75)
 testnames=['balance-reader','coin-format','balance-ui','fresh-coins-hooks','balance-provider','fresh-balance','coin-metadata-provider','coin-metadata-reader'];files=[w/'src/shared/rpc'/f'{n}.test.ts' for n in testnames]+[w/'scripts/probe-current-qa05-balances.ts',Path(__file__).resolve()];batch=l/'20261006-QA-A05-current-inputs';rows=[{'source':str(f),'relative':str(f.relative_to(root)),'sha256':sha(f)} for f in files]
 if batch.exists():assert read(batch/'manifest.json')['files']==rows
 else:
  batch.mkdir()
  for row in rows:target=batch/row['relative'];target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(row['source'],target)
  (batch/'manifest.json').write_text(json.dumps({'files':rows,'completeProductSourceManifest':str(l/'20261006-staking-current-inputs/manifest.json'),'completeProductSourceManifestSha256':sha(l/'20261006-staking-current-inputs/manifest.json')},indent=2)+'\n')
 result={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'source':source,'parentsComplete':done,'parentsTotal':98,'qa05MarkedComplete':marked,'qa05ContractComplete':True,'currentReadCheckpoint':domain['balances']['snapshot']['checkpoint'],'actualReadRequests':16,'actualReadCoins':2,'targetedTests':86,'fullUnitTests':2551,'exactUnchangedSourceMapContents':unchanged,'sourceInputsManifest':str(batch/'manifest.json'),'completeProductSourceManifest':str(l/'20261006-staking-current-inputs/manifest.json'),'historicCoinExecutionReLabelledCurrent':False,'trialReady':False,'normalChromeHttpsAccepted':False,'proofs':[{'file':str(l/n),'sha256':sha(l/n)} for n in names],'scope':'QA05 current C24 complete real two-coin balance/metadata/null, 86 multi-page/precision/failure fixtures and exact 12 retained source-map contents from original C21 coin UI/native execution proofs. Historical browser executions retained as historical; no new current coin execution, index catch-up or HTTPS/trial claim.'};a.output.open('x').write(json.dumps(result,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['passed','parentsComplete','actualReadCoins','targetedTests']}))
if __name__=='__main__':main()
