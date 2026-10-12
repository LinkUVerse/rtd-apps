#!/usr/bin/env python3
"""Original RPC-04 contract, current actual coin UI, native once execution and historical scopes."""
from pathlib import Path
from datetime import datetime, timezone
import argparse, json, hashlib, importlib.util, re
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);a=p.parse_args();assert not a.output.exists()
w=Path(__file__).resolve().parents[1];d=w/'migrationToGRpcOrGraphQLDoc';l=d/'workLog';sha=lambda f:hashlib.sha256(Path(f).read_bytes()).hexdigest();tracked=set()
def get(name):
 f=l/name;tracked.add(f);return json.loads(f.read_text())
def inputs(proof):
 for f,h in proof.get('inputsSha256',{}).items():assert sha(f)==h;tracked.add(Path(f))
build=get('20261006-loopback-production-build-01.json');artifact=get('20261006-loopback-production-audit-01.json');assert build['passed'] and artifact['passed'] and build['sourceAfter']==artifact['source'];inputs(artifact)
spec=importlib.util.spec_from_file_location('builder',w/'scripts/build-reviewed-local-extension.py');b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b);source,files=b.source_hash(w);assert build['sourceAfter']=={'sha256':source,'files':files}
for f,h in build['artifacts'].items():assert sha(Path(build['output'])/f)==h;tracked.add(Path(build['output'])/f)
ui=get('20261006-RPC-04-current-ui-04.json');native=get('20261006-RPC-04-current-funds-01.json');simulation=get('20261006-RPC-04-current-ui-audit-05.json');execution=get('20261006-RPC-04-current-execution-01.json');audit=get('20261006-RPC-04-current-execution-audit-02.json')
for proof in [ui,native,simulation,execution,audit]:assert proof['passed'];inputs(proof)
assert ui['source']==execution['source']==audit['source']==build['sourceAfter'];assert len(ui['checks'])==18 and all(c['passed'] for c in ui['checks']) and len(ui['previews'])==3 and ui['executeRequests']==ui['signatures']==0
assert ui['actualSimulationRequests']==7 and len(ui['simulations'])==6 and simulation['binarySimulationFramesVerified']==6 and len(simulation['rows'])==3
assert ui['previews'][0]['amount']=='0.1' and ui['previews'][1]['amount']=='0.5' and not ui['previews'][0]['maximum'] and ui['previews'][1]['maximum'] and ui['previews'][2]['maximum']
assert simulation['rows'][0]['received']=='100000' and simulation['rows'][1]['received']=='500000';r=simulation['rows'][2];assert int(r['received'])+int(r['netGas'])==496500976 and r['senderChange']=='-496500976' and r['commands']==['TransferObjects']
assert native['rows'][0]['balance']['balance']=='500000' and native['rows'][0]['balance']['coinBalance']=='500000' and native['rows'][1]['balance']['addressBalance']=='496500976' and native['rows'][1]['balance']['coinBalance']=='0'
metadata=get('20261006-RPC-04-loopback-token-read-01.json');assert metadata['metadata']['decimals']==6 and metadata['metadata']['symbol']=='WMIG' and metadata['metadata']['name']=='Wallet migration fixture' and metadata['dispatches']==metadata['simulations']==0 and int(metadata['proof']['checkpoint'])>0
assert len(execution['checks'])==9 and all(c['passed'] for c in execution['checks']);assert execution['executeRequests']==execution['signatures']==1 and execution['actualSimulationRequests']==len(execution['simulations'])==4
assert len(execution['admission']['old'])==14 and all(r['success'] for r in execution['admission']['old']);assert execution['execution']['approvalClicks']==1 and audit['recipientAtomicAmount']=='1' and audit['originalApprovedBcsUnchanged'] and audit['signatureVerified'] and audit['nativeEffectsMatch'] and audit['actualBrowserExecuteRequests']==1
assert audit['auditExecuteRequests']==audit['auditSimulations']==audit['auditSignatures']==0
for proof in [ui,execution]:
 assert proof['certificateChanges']==proof['originalProfilesOpened']==0 and not proof['normalChromeHttpsAccepted'] and not proof['errors'] and not proof['forbidden'];assert proof['workerSource']['workerSha256']==build['artifacts']['background.js']
 for row in proof['uiSource']['loadedBundles']:assert row['loadedSha256']==build['artifacts'][row['file']]
 assert all(new['request']['checks']=='ENABLED' for new in proof['simulations'])
prior=get('20261006-sponsored-execute-verification-01.json');assert prior['passed'] and prior['full']=={'files':179,'tests':2525,'exitCode':0} and prior['prodTypesExitCode']==0
for f,h in prior['logs'].items():assert sha(f)==h;tracked.add(Path(f))
# These genuinely completed original mixed/native executions remain historical, not relabelled C21.
old=get('20261004-mixed-token-execution-evidence.json');assert old['passed'] and old['recoveryOnly'] and old['approvedBytesUnchanged'] and old['signatureVerified'] and old['effectsDigestMatches'] and old['lockedRestartJournalPreserved'] and old['digest']=='6mTumr6izYKqyxrRyTzEwuzgqjj5SbTEL84kLfkmqhnK'
assert old['dispatches']==old['simulations']==0 and old['priorExecutionTraffic']=={'dispatches':1,'simulations':3};assert sha(old['evidenceLog'])==old['evidenceLogSha256'];tracked.add(Path(old['evidenceLog']))
for name in ['20261003-RPC-04-fresh-coins.md','20261004-address-funding.md','20261004-pay-all-coverage.md','20261004-address-gas-simulation.md','20261004-mixed-native-execution.md','20261004-mixed-token-execution.md','20261005-balance-domain.md']:assert (l/name).exists();tracked.add(l/name)
for run in ['01','02','03']:
 failed=get('20261006-RPC-04-current-ui-'+run+'.json');assert not failed['passed'] and Path(failed['fixture']).exists() and failed['executeRequests']==failed['signatures']==0;tracked.add(l/('20261006-RPC-04-current-ui-'+run+'.log'))
for run in ['01','02','04']:f=l/('20261006-RPC-04-current-ui-audit-'+run+'.log');assert f.exists() and 'Error' in f.read_text();tracked.add(f)
snap=get('20261006-RPC-04-current-inputs/manifest.json');assert len(snap['entries'])>=29
for row in snap['entries']:assert sha(row['source'])==sha(row['snapshot'])==row['sha256'];tracked.add(Path(row['snapshot']))
parents=re.findall(r'^- \[([ x])\] `([A-Z]+-[A-Z0-9]+)`',(d/'Task.md').read_text(),re.M);assert len(parents)==len({i for _,i in parents})==98;status={i:m=='x' for m,i in parents};count=sum(status.values());assert count==(71 if status['RPC-04'] else 70) and status['QA-A02'] and status['QA-A10'];assert not any(status[i] for i in ['RPC-03','QA-A05','QA-A06','QA-A08','TX-01','TX-04','ENV-07','REL-05'])
report={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'currentRevision':'C21-loopback-dev-profile3','source':build['sourceAfter'],'rpc04ContractComplete':True,'rpc04MarkedComplete':status['RPC-04'],'parentsComplete':count,'parentsTotal':98,'trialReady':False,'normalChromeHttpsAccepted':False,'currentChromeCoinPreviewChecks':18,'currentChromeCoinExecutionChecks':9,'currentCompletePreviewSimulationFrames':6,'currentPreviewSimulationWireRequests':7,'uncollectedPreviewResponses':1,'currentExecutionSimulations':4,'currentExecutionSignatures':1,'currentExecuteRequests':1,'currentReceiptDigest':audit['digest'],'independentOriginalNativeBcsSignatureEffectsVerified':True,'currentOriginalPendingChecks':14,'currentSnapshotMetadataVerified':True,'freshCoinAndAddressComponentsVerified':True,'historicalMixedExecutionEvidenceRetained':True,'historicalExecutionRelabelledCurrent':False,'currentFullTests':2525,'currentTypeDiagnostics':0,'auditExecuteRequests':0,'proofs':[{'file':str(f),'sha256':sha(f)} for f in sorted(tracked)],'inputsSha256':{str(Path(__file__).resolve()):sha(__file__)},'scope':'Original RPC04 code/Fullnode full scan/type-owner-gas contract, fixed-snapshot details, current real nonnative decimal/Max and native Max UI, native reservation binding and current actual once coin UI execution. Historical mixed/native executions retain original dates; current changed transaction path has independent original native bytes/signature/effects proof. No all TX/QA05/QA08/NFT/normal HTTPS/trial acceptance. Seven preview requests only six original full frames; unknown response not promoted.'}
a.output.open('x').write(json.dumps(report,indent=2)+'\n');print(json.dumps({'passed':True,'rpc04ContractComplete':True,'parentsComplete':count,'currentExecuteRequests':1}))
