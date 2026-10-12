#!/usr/bin/env python3
"""Audit finite RPC-13 and QA-A16 evidence before/after marking original parents."""
import argparse,hashlib,json,re,shutil,importlib.util
from pathlib import Path
from datetime import datetime,timezone

def main():
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--expected-parents',type=int,required=True);a=p.parse_args();assert not a.output.exists()
 wallet=Path(__file__).resolve().parents[1];root=wallet.parent.parent;docs=wallet/'migrationToGRpcOrGraphQLDoc';logs=docs/'workLog'
 sha=lambda f:hashlib.sha256(Path(f).read_bytes()).hexdigest();read=lambda f:json.loads(Path(f).read_text())
 module_file=wallet/'scripts/build-reviewed-local-extension.py';spec=importlib.util.spec_from_file_location('builder',module_file);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);source_hash,source_files=m.source_hash(wallet)
 source={'sha256':source_hash,'files':source_files};assert source=={'sha256':'839da1f5f5b326bb06ccb0309703c37e1fe15699e391c9f93be3f2c34255f425','files':1110}
 names=['20261006-personal-production-build-04.json','20261006-personal-production-audit-04.json','20261006-RPC-13-current-domain-01.json','20261006-RPC-13-current-domain-audit-01.json','20261006-RPC-13-current-ui-04.json','20261006-RPC-13-current-ui-audit-02.json','20261006-RPC-13-current-native-01.json','20261006-RPC-13-current-recovery-01.json','20261006-RPC-13-current-add-execution-01.json','20261006-RPC-13-current-add-native-02.json','20261006-RPC-13-current-add-recovery-01.json','20261006-RPC-13-current-receipt-03.json','20261006-RPC-11-scale-fixture-02.json']
 proofs={name:read(logs/name) for name in names};assert all(p['passed'] for p in proofs.values())
 build=proofs[names[0]];assert build['sourceAfter']==source and build['compilationErrors']==0 and build['currentDevelopmentDistUnchanged']
 for name,h in build['artifacts'].items():assert sha(Path(build['output'])/name)==h
 domain=proofs[names[2]];assert domain['proof']['checkpoint']=='656532' and domain['value']['positions'][0]['status']=='active' and domain['value']['positions'][0]['principal']=='1000000000'
 ui=proofs[names[4]];assert len(ui['checks'])==12 and ui['actualSimulationRequests']==2 and ui['executeRequests']==ui['signatures']==0
 withdrawal=proofs[names[6]];assert withdrawal['digest']=='ERpYV3jhDNdN2mPpcYVykgdqmHQB6djC7M9JCfFPBh5m' and withdrawal['stakeDeleted'] and withdrawal['principalReturned']=='1000000000' and withdrawal['actualReward']=='46666663' and withdrawal['netBalanceChange']=='1046798759'
 assert not withdrawal['initialWholeRunPassed'] and withdrawal['signatureVerified'] and withdrawal['nativeEffectsMatch'] and withdrawal['originalExecuteGrpcStatusVerified']
 failed=read(logs/'20261006-RPC-13-current-execution-01.json');assert not failed['passed'] and failed['executeRequests']==1 and failed['originalExecuteResponseCaptured']
 add=proofs[names[8]];assert add['source']==source and add['execution']['actualReceiptRoute'].endswith('&from=tokens') and len(add['checks'])==9 and add['executeRequests']==add['signatures']==1
 native=proofs[names[9]];assert native['source']==source and native['stakeId']==native['newStake']['objectId'] and native['newStakeCreated'] and native['atomicStakeAmount']=='1000000000' and native['signatureVerified'] and native['originalExecuteGrpcStatusVerified']
 assert native['newStake']['decoded']['stake_activation_epoch']==str(int(native['event']['epoch'])+1)
 for name in [names[7],names[10]]:
  recovery=proofs[name];assert recovery['lockedOriginalAccountRetained'] and recovery['strictJournalVerified'] and recovery['pendingCount']==0 and recovery['executeRequests']==recovery['simulations']==recovery['signatures']==0
 receipt=proofs[names[11]];assert receipt['source']==source and receipt['digest']==withdrawal['digest'] and receipt['executions']==receipt['simulations']==receipt['signatures']==0 and receipt['originalSourceUnchanged']
 assert receipt['before']==receipt['after'] and not receipt['before']['rows'] and not receipt['pageErrors'] and not receipt['responseErrors'] and not receipt['blocked']
 scale=proofs[names[12]]
 for f,h in scale['inputsSha256'].items():assert sha(f)==h
 assert len(scale['cases'])==4 and all(c['passed'] for c in scale['cases']);large=scale['cases'][0];assert large['fixture'] and large['totalRates']==10000 and large['ratePages']==200
 assert {p['poolState'] for p in large['positions']}=={'active','inactive'} and {p['status'] for p in large['positions']}=={'active','pending'}
 old=read(logs/'20261004-live-stake-withdraw.json');assert old['receipt']['success'] and old['receipt']['epoch']=='2' and old['withdrawal']['activationEpoch']=='3' and old['withdrawnObject'] is None
 full=(logs/'20261006-staking-lifetime-full-01.log').read_text();assert re.search(r'Test Files\s+181 passed',full) and re.search(r'Tests\s+2551 passed',full)
 targeted=(logs/'20261006-RPC-13-targeted-02.log').read_text();assert re.search(r'Test Files\s+12 passed',targeted) and re.search(r'Tests\s+151 passed',targeted)
 assert (logs/'20261006-staking-lifetime-types-02.log').stat().st_size==0
 task=(docs/'Task.md').read_text();parents=re.findall(r'^- \[([ x])\] `([A-Z]+-[A-Z0-9]+)`',task,re.M);assert len(parents)==len({x[1] for x in parents})==98;done=sum(x[0]=='x' for x in parents);assert done==a.expected_parents
 marked={name:any(mark=='x' and id==name for mark,id in parents) for name in ['RPC-13','QA-A16']};assert all(marked.values()) if done==74 else not any(marked.values())
 chapters=sorted(docs.glob('[0-9][0-9]-*.md'));assert [int(f.name[:2]) for f in chapters]==list(range(1,15))
 links=0
 for f in chapters+[docs/'Task.md',docs/'totalProgress.md',logs/'current-state.md']:
  for target in re.findall(r'\]\(([^)]+)\)',f.read_text()):
   target=target.strip('<>').split('#')[0]
   if target.startswith(('./','../')):assert (f.parent/target).exists(),str(f)+' -> '+target;links+=1
 batch=logs/'20261006-staking-current-inputs'
 inputs=[]
 for folder in [wallet/'src',wallet/'configs',wallet.parent/'core/src',root/'rtd-ts-sdk/packages/typescript/src']:
  inputs.extend(f for f in folder.rglob('*') if f.is_file())
 inputs.extend([wallet/'package.json',wallet/'webpack.config.ts',wallet.parent/'pnpm-lock.yaml',module_file,Path(__file__).resolve()])
 inputs.extend(f for f in (wallet/'scripts').glob('*') if f.is_file() and ('staking' in f.name or f.name in ['audit-personal-production-extension.cjs','build-reviewed-personal-production-extension.cjs']))
 inputs.extend([root/'link-u-smart-contract/all-in-one-deploy/localDeploy/rebind_wallet_staking_lifetime_loopback_origin.py',wallet/'scripts/lib/current-extension-worker.cjs',wallet/'scripts/lib/current-extension-ui-source.cjs',wallet/'scripts/lib/lifecycle-journal-snapshot.cjs'])
 entries=[{'source':str(f),'relative':str(f.relative_to(root)),'sha256':sha(f)} for f in sorted(set(inputs))]
 if batch.exists():assert read(batch/'manifest.json')['files']==entries
 else:
  batch.mkdir()
  for row in entries:
   target=batch/row['relative'];target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(row['source'],target);assert sha(target)==row['sha256']
  (batch/'manifest.json').write_text(json.dumps({'source':source,'files':entries},indent=2)+'\n')
 proof_files=[logs/name for name in names]+[logs/'20261006-RPC-13-current-execution-01.json',logs/'20261004-live-stake-withdraw.json',logs/'20261006-staking-lifetime-full-01.log',logs/'20261006-RPC-13-targeted-02.log',logs/'20261006-staking-lifetime-types-02.log']
 result={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'source':source,'parentsComplete':done,'parentsTotal':98,'markedComplete':marked,'rpc13CodingAndActualCoreContractComplete':True,'qa16GovernanceMatrixComplete':True,'actualActiveWithdrawalReward':'46666663','actualWithdrawalDigest':withdrawal['digest'],'actualCurrentStakeDigest':native['digest'],'currentStakeAutomaticReceiptVerified':True,'originalWithdrawalAutomaticReceiptVerified':False,'currentReadonlyWithdrawalReceiptVerified':True,'fullUnitTests':2551,'targetedGovernanceTests':151,'fixedS':'656532','fixtureScaleRateRows':10000,'fixtureCases':4,'sourceInputFiles':len(entries),'sourceInputsManifest':str(batch/'manifest.json'),'chapters':14,'relativeLinksChecked':links,'trialReady':False,'normalChromeHttpsAccepted':False,'proofs':[{'file':str(f),'sha256':sha(f)} for f in proof_files],'scope':'RPC13 actual current C24 stake/UI/strict recovery plus original active withdrawal/native positive reward and current readonly receipt; QA16 real Pending withdrawal/Active payout and explicit source-pinned multipoool/inactive/missing-rate/safe-mode/APY/rounding/large fixtures. No production governance-state creation, full transaction QA, index catch-up, original HTTPS or trial acceptance.'}
 a.output.open('x').write(json.dumps(result,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['passed','parentsComplete','sourceInputFiles','relativeLinksChecked']}))
if __name__=='__main__':main()
