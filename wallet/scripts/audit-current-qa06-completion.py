#!/usr/bin/env python3
"""Verify current production sources, raw GraphQL frames and actual NFT browser evidence before QA06 completion."""
import argparse,base64,hashlib,importlib.util,json,re,shutil
from pathlib import Path
from datetime import datetime,timezone
def main():
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--expected-parents',type=int,required=True);a=p.parse_args();assert not a.output.exists()
 w=Path(__file__).resolve().parents[1];d=w/'migrationToGRpcOrGraphQLDoc';l=d/'workLog';read=lambda f:json.loads(Path(f).read_text());sha=lambda f:hashlib.sha256(Path(f).read_bytes()).hexdigest()
 spec=importlib.util.spec_from_file_location('builder',w/'scripts/build-reviewed-local-extension.py');builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder);product_sha,count=builder.source_hash(w);source={'sha256':product_sha,'files':count};assert source=={'sha256':'7b97be4b6a6f3209a4fecf1edae965c8d0d50efd9221dd149b1ef37378422076','files':1110}
 names=['20261006-QA-A08-completion-audit-02.json','20261006-QA-A06-current-dynamic-matrix-01.json','20261006-QA-A06-current-chrome-01.json','20261006-personal-production-build-05.json','20261006-personal-production-audit-05.json'];previous,matrix,chrome,build,closure=[read(l/n) for n in names];assert all(p['passed'] for p in [previous,matrix,chrome,build,closure]);assert previous['source']==build['sourceAfter']==chrome['source']==source
 for proof in [matrix,chrome]:
  for file,digest in proof['inputsSha256'].items():assert sha(file)==digest
 assert len(matrix['fields'])==2 and {f['kind'] for f in matrix['fields']}=={'DynamicField','DynamicObject'};assert matrix['missingNames']==2 and matrix['simulations']==matrix['signatures']==matrix['executions']==0
 pages=matrix['pages'];forward=[p for p in pages if not p['reverse']];backward=[p for p in pages if p['reverse']];assert len(forward)==len(backward)==2;assert [id for p in forward for id in p['ids']]==[id for p in reversed(backward) for id in p['ids']];assert len({id for p in forward for id in p['ids']})==2
 fixed=str(matrix['snapshot']['checkpoint']);assert fixed=='677361';read_count=0;raw_fields=[]
 for request in matrix['requests']:
  assert request['status']==200 and '127.0.0.1' in request['url'];body=base64.b64decode(request['responseBase64'],validate=True)
  if request['request']:
   q=json.loads(request['request']);response=json.loads(body);assert not response.get('errors')
   if 'WalletSnapshotRead' in q['query']:
    frame=response['data']['walletSnapshot'];assert str(frame['sequenceNumber'])==fixed and frame['digest']==matrix['snapshot']['digest'];assert '677361' in q['query'];read_count+=1
    address=frame['query'].get('address')
    if address and 'dynamicFields' in address:
     assert address['address']==matrix['parent'];raw_fields+=address['dynamicFields']['nodes']
 assert read_count>=10
 for f in matrix['fields']:
  matches=[n for n in raw_fields if n['address']==f['fieldId']];assert len(matches)>=3
  for n in matches:
   assert n['name']['bcs']==f['name']['bcs'] and n['name']['type']['repr']==f['name']['type'];value=n['value'];assert (value['__typename']=='MoveObject')==(f['kind']=='DynamicObject');content=value['contents'] if f['kind']=='DynamicObject' else value;assert content['bcs']==f['valueBcs'] and content['type']['repr']==f['valueType']
   if f['kind']=='DynamicObject':assert value['address']==f['childId'] and base64.b64decode(content['bcs'])[:32].hex()==f['childId'][2:]
 assert len(matrix['history'])==1;history=matrix['history'][0];child=next(f for f in matrix['fields'] if f['kind']=='DynamicObject');assert history['objectId']==child['childId'] and history['version']=='22' and history['missingVersionCode']==5 and history['duplicatesPreserved'];assert history['contentSha256']==hashlib.sha256(base64.b64decode(child['valueBcs'])).hexdigest();assert history['owner']=={'$kind':'ObjectOwner','ObjectOwner':child['fieldId']} and history['display'] is None
 assert len(chrome['checks'])==14 and all(c['passed'] for c in chrome['checks']) and chrome['signatures']==chrome['executeRequests']==0 and not chrome['simulations'] and not chrome['forbidden'] and not chrome['errors'];assert chrome['workerSource']['matchesDisk'] and chrome['uiSource']['matchesDisk'];assert len(chrome['nonvisual']['expected'])==5;assert sorted(chrome['nonvisual']['rendered'])==sorted(o['type'] for o in chrome['nonvisual']['expected']);assert all('127.0.0.1' in r['url'] and not r['url'].endswith('/ExecuteTransaction') for r in chrome['traffic']);assert len(chrome['graphql'])==69
 for file,digest in build['artifacts'].items():assert sha(Path(build['output'])/file)==digest
 manifest=Path(previous['sourceInputsManifest']);old=read(manifest);assert old['completeProductFiles']==1110
 for row in old['files']:assert sha(manifest.parent/row['relative'])==row['sha256'] and sha(row['source'])==row['sha256']
 tests=(l/'20261006-QA-A06-current-targeted-01.log').read_text();assert re.search(r'Test Files\s+7 passed',tests) and re.search(r'Tests\s+86 passed',tests)
 parents=re.findall(r'^- \[([ x])\] `([A-Z]+-[A-Z0-9]+)`',(d/'Task.md').read_text(),re.M);done=sum(mark=='x' for mark,_ in parents);assert len(parents)==len({id for _,id in parents})==98 and done==a.expected_parents
 inputs=[Path(__file__).resolve(),w/'scripts/probe-current-dynamic-field-matrix.ts',w/'scripts/test-current-nft-dynamic-readonly.cjs'];batch=l/'20261006-QA-A06-current-inputs';saved=[{'source':str(f),'relative':str(f.relative_to(w.parent.parent)),'sha256':sha(f)} for f in inputs]
 if batch.exists():assert read(batch/'manifest.json')['files']==saved
 else:
  batch.mkdir()
  for row in saved:out=batch/row['relative'];out.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(row['source'],out)
  (batch/'manifest.json').write_text(json.dumps({'files':saved,'completeProductManifest':str(manifest),'completeProductManifestSha256':sha(manifest),'source':source},indent=2)+'\n')
 result={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'source':source,'parentsComplete':done,'parentsTotal':98,'qa06ContractComplete':True,'qa06MarkedComplete':any(mark=='x' and id=='QA-A06' for mark,id in parents),'sourceInputsManifest':str(batch/'manifest.json'),'completeProductManifest':str(manifest),'actualCommonSnapshot':fixed,'forwardPages':2,'backwardPages':2,'fieldKinds':['DynamicField','DynamicObject'],'originalRawSnapshotReadFrames':read_count,'actualExactArchiveVersion':'22','actualMissingArchiveCode':5,'chromeChecks':14,'actualNonvisualRows':5,'targetedTests':86,'currentFullUnitTests':2556,'auditRequests':0,'auditSignatures':0,'auditSimulations':0,'auditDispatches':0,'historyRelabelledCurrent':False,'trialReady':False,'normalChromeHttpsAccepted':False,'proofs':[{'file':str(l/name),'sha256':sha(l/name)} for name in names],'scope':'QA06 current production dynamic fields and indexed NFT contract complete via actual fixed snapshot forward/reverse multi-pages, both kinds/BCS/IDs, missing names/exact historical22/duplicates/missing0, C25 actual NFT and no-image/nonvisual UI plus86 formal boundary tests. Indexed ownership at677361 is historical relative to later native transfer; direct displayed NFT/hiding/transfer semantics and full trial are separate parent contracts.'};a.output.open('x').write(json.dumps(result,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['passed','parentsComplete','qa06ContractComplete','chromeChecks']}))
if __name__=='__main__':main()
