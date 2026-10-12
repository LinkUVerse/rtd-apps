#!/usr/bin/env python3
"""Readonly full QA-A02 evidence audit; retain failed wrappers and honest partial capabilities."""
from pathlib import Path
from datetime import datetime,timezone
import argparse,hashlib,json,re,importlib.util
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);a=p.parse_args();assert not a.output.exists()
w=Path(__file__).resolve().parents[1];d=w/'migrationToGRpcOrGraphQLDoc';l=d/'workLog';sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();read=lambda p:json.loads(Path(p).read_text());tracked=set()
def get(name):f=l/name;tracked.add(f);return read(f)
def inputs(r):
 for f,h in r.get('inputsSha256',{}).items():assert sha(f)==h
build=get('20261006-loopback-production-build-01.json');compiler=get('20261006-loopback-production-audit-01.json');assert build['passed'] and compiler['passed'];inputs(compiler)
spec=importlib.util.spec_from_file_location('builder',w/'scripts/build-reviewed-local-extension.py');b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b);h,n=b.source_hash(w);assert build['sourceAfter']=={'sha256':h,'files':n} and n==1108
for f,digest in build['artifacts'].items():assert sha(Path(build['output'])/f)==digest
transport=get('20261006-loopback-transport-audit-01.json');assert transport['passed'] and transport['actualChromeH0Roles']==4 and not transport['normalChromeHttpsAccepted']
for row in transport['proofs']:assert sha(row['file'])==row['sha256']
r=get('20261006-QA-A02-browser-capabilities-03.json');assert r['passed'] and r['actualChromeNetworkCases']==5 and r['actualConfiguredPackages']==4 and r['source']==build['sourceAfter'];inputs(r);assert r['workerSource']['matchesDisk'] and r['workerSource']['workerSha256']==build['artifacts']['background.js'] and r['uiSource']['matchesDisk']
for row in r['uiSource']['loadedBundles']:assert row['loadedSha256']==build['artifacts'][row['file']]
assert r['certificateChanges']==r['originalProfilesOpened']==r['simulations']==r['signatures']==r['executeRequests']==0 and not r['normalChromeHttpsAccepted'] and not r['trialReady']
cases=r['cases'];assert [c['mode'] for c in cases]==['capabilities','deployment-positive','wrong-h0','wrong-pin','wrong-revision'];assert [len(c['requests']) for c in cases]==[51,14,2,14,0]
for c in cases:assert read(Path(r['fixture'])/(c['mode']+'.json'))==c;tracked.add(Path(r['fixture'])/(c['mode']+'.json'))
positive,dep,wrong,pin,rev=cases;report=positive['result']['report'];schema=positive['result']['schema'];view=positive['result']['view'];assert positive['passed'] and report['state']=='capabilities-assessed' and report['readiness']=='not-assessed' and report['execution']=='not-probed' and report['serviceDeployment']=='not-verified' and report['crossDomainSnapshot']=='not-verified' and view['phase']=='read-contracts-assessed'
for side in ['before','after']:
 identity=report['identity'][side];assert identity['state']=='identity-verified' and len(identity['endpoints'])==3 and all(e['state']=='verified' and e['genesisDigest']=='3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj' for e in identity['endpoints'])
assert report['graphql']['state']=='observed';domains=report['graphql']['value']['domains'];assert len(domains)==8 and domains['names']['state']=='unconfigured' and all(v['state']=='snapshot-verified' for k,v in domains.items() if k!='names')
for k,v in domains.items():
 if k!='names':assert v['proof']['bindingKey']==report['bindingKey'] and int(v['proof']['checkpoint'])>0
assert report['native']['state']=='observed' and report['native']['value']['state']=='native-probes-verified' and report['accountHistory']['state']=='observed' and report['accountHistory']['value']['state']=='coverage-window-verified' and not report['accountHistory']['value']['allAccountHistoryVerified']
assert report['deployment']['state'] in ['observed','incomplete']
if report['deployment']['state']=='incomplete':assert report['deployment']['reason']=='partial'
assert dep['passed'] and dep['result']['state']=='reviewed-deployment-matched' and len(dep['result']['packages'])==4 and all(p['state']=='pin-matched' for p in dep['result']['packages']) and dep['result']['serviceDeployment']=='not-verified'
assert not wrong['passed'] and wrong['errorType']=='NetworkIdentityError' and wrong['reason']=='chain-mismatch';assert pin['passed'] and pin['result']['state']=='reviewed-deployment-degraded' and sum(p['state']=='pin-mismatch' for p in pin['result']['packages'])==1 and sum(p['state']=='pin-matched' for p in pin['result']['packages'])==3
assert rev['passed'] and rev['result']['state']=='declaration-rejected' and rev['result']['declaration']['reason']=='binding' and not rev['requests']
node=get('20261006-QA-A02-native-schema-01.json');assert node['passed'] and node['report']['schemaSha256']==schema['schemaSha256'] and node['report']['contracts']==schema['contracts'] and schema['state']=='schema-compatible' and len(schema['contracts'])==11 and set(schema['contracts'].values())=={'compatible'}
nodeDep=get('20261006-loopback-deployment-positive-01.json');assert nodeDep['probeCompleted'] and nodeDep['reviewedDeploymentMatched'] and nodeDep['report']['packages']==dep['result']['packages'] and nodeDep['simulationRequests']==nodeDep['signingRequests']==nodeDep['executionRequests']==0
bundle=get('20261006-QA-A02-browser-bundle-02.json');assert bundle['passed'];inputs(bundle);assert sha(bundle['output'])==bundle['outputSha256'];tracked.add(Path(bundle['output']));assert sum('/wallet/src/shared/rpc/' in f for f in bundle['inputsSha256'])==51
snapshot=get('20261006-QA-A02-current-inputs/manifest.json');assert snapshot['completeRelativePathNames'] and len(snapshot['files'])==469
for row in snapshot['files']:assert sha(row['source'])==sha(row['snapshot'])==row['sha256'];tracked.add(Path(row['snapshot']))
for run in ['01','02']:
 failed=get('20261006-QA-A02-browser-capabilities-'+run+'.json');assert not failed['passed'] and Path(failed['fixture']).exists() and failed['executeRequests']==failed['simulations']==failed['signatures']==0
 for f in Path(failed['fixture']).glob('*.json'):tracked.add(f)
previous=get('20261006-QA-A10-completion-audit-02.json');assert previous['passed'] and previous['qa10ContractComplete'] and previous['parentsComplete']==69 and previous['source']==build['sourceAfter'];inputs(previous)
for row in previous['proofs']:assert sha(row['file'])==row['sha256']
parents=re.findall(r'^- \[([ x])\] `([A-Z]+-[A-Z0-9]+)`',(d/'Task.md').read_text(),re.M);assert len(parents)==len({r[1] for r in parents})==98;status={i:m=='x' for m,i in parents};count=sum(status.values());assert status['QA-A10'] and count==(70 if status['QA-A02'] else 69) and not status['NET-04']
report={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'currentRevision':'C21-loopback-dev-profile3','source':build['sourceAfter'],'qa02ContractComplete':True,'qa02MarkedComplete':status['QA-A02'],'parentsComplete':count,'parentsTotal':98,'trialReady':False,'normalChromeHttpsAccepted':False,'net04MarkedComplete':False,'actualChromeNetworkCases':5,'actualChromeReadonlyDriverRequests':81,'actualSchemaContracts':11,'actualConfiguredPackagePins':4,'actualGraphQLSnapshotDomains':7,'unconfiguredNameDomain':True,'aggregateDeploymentPartialPreserved':True,'independentChromeDeploymentMatched':True,'wrongH0Rejected':True,'wrongPinDegraded':True,'wrongRevisionRejectedLocally':True,'browserDriverProductionRpcSources':51,'browserBundleInputs':461,'certificateChanges':0,'simulations':0,'signatures':0,'executions':0,'proofs':[{'file':str(f),'sha256':sha(f)} for f in sorted(tracked)],'inputsSha256':{str(Path(__file__).resolve()):sha(__file__)},'scope':'Original QA-A02 real Chrome Fetch / full H0 / SDL / native / seven configured domains / account coverage and independently certified four package pins with real negative H0/pin and local revision. Test-only current production readonly driver is distinct from actual wallet UI module invocation, no response mocks. Initial whole-run failures retained, partial aggregation remains partial; no NET04 complete, software build/execution authority, original HTTPS, new account/signing or all trial claim.'}
a.output.open('x').write(json.dumps(report,indent=2)+'\n');print(json.dumps({'passed':True,'qa02ContractComplete':True,'parentsComplete':count,'actualChromeRequests':81}))
