# coding: utf-8
"""Independent recorded raw HTTP, fixed-checkpoint payload, and current UI audit."""
import json,hashlib,base64,copy,sys
from pathlib import Path
w=Path(__file__).resolve().parent.parent;l=w/'migrationToGRpcOrGraphQLDoc/workLog'
def read(p):return json.loads(Path(p).read_text())
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
out=Path(sys.argv[1]);assert not out.exists()
files=[l/n for n in ['20261007-C40-owned-complete-production-04.json','20261007-C40-hidden-cold-chrome-01.json','20261007-C40-sender-owned-personal-chrome-02.json','20261007-default-generation-positive-C40-build-01.json']]
a,h,s,b=map(read,files);assert all(x['passed']for x in [a,h,s,b]);inputs={str(p):sha(p)for p in files};checks=[]
for doc in [a,h,s]:
 assert doc['simulations']==doc['signatures']==doc['executeRequests']==0
 for f,digest in doc['inputsSha256'].items():assert sha(f)==digest,(f,'input changed');inputs[f]=digest
for f,digest in b['artifacts'].items():assert sha(Path(b['output'])/f)==digest
for ui in [h,s]:
 assert ui['source']==b['sourceAfter'];assert ui['encryptedBefore']==ui['encryptedAfter'];assert ui['initialJournal']==ui['finalJournal'];assert not ui['blocked'] and not ui['errors'] and not ui['captureErrors']
 assert ui['initialSources']['workerSource']['workerSha256']==b['artifacts']['background.js']
assert h['restartSources']['workerSource']['workerSha256']==b['artifacts']['background.js']
assert len(h['checks'])==9 and len(s['checks'])==7
checks.append('current artifact bytes actual initial and cold workers, source, original ciphers journals normal relock')
for r in a['raw']:
 assert sha(r['file'])==r['sha256'];inputs[r['file']]=r['sha256']
 if r['status']==200:
  body=read(r['file']);assert body.get('data')==r['data'];assert body.get('errors')==r.get('errors');assert not body.get('errors')
 else:
  assert r['status']in [408,429,502,503,504];i=a['raw'].index(r);assert any(n['status']==200 and n['query']==r['query']and n['variables']==r['variables']for n in a['raw'][i+1:]),'retry must preserve actual query variables'
checks.append('all exact original HTTP body hashes and actual same request successful bounded retries')
def stable(nodes):
 result=copy.deepcopy(nodes)
 for n in result:
  d=n['contents']['display']
  if d:
   c=d['basis']['historyCoverage'];assert c['genesisDigest']==a['h0']and c['generation']==a['generation']and c['sourceId']==a['snapshot']['displayHistory']['coverage']['sourceId'];assert str(c['firstCheckpoint'])=='0';assert str(c['snapshotCheckpoint'])==a['snapshot']['checkpoint'];assert c['snapshotCheckpointDigest']==a['snapshot']['digest'];assert int(c['lastCheckpoint'])>=int(c['snapshotCheckpoint']);del c['lastCheckpoint'];del c['lastCheckpointDigest']
 return result
for col in a['collections']:
 rows=[r for r in a['raw']if r['status']==200 and r['stage']==col['role']+' full and small pages'and 'objects(first:'in r['query']]
 full=[r for r in rows if r['variables']['pageSize']==50];small=[r for r in rows if r['variables']['pageSize']==3];assert len(full)==1;connection=full[0]['data']['walletSnapshot']['query']['address']['objects'];assert not connection['pageInfo']['hasNextPage'];nodes=[]
 for i,r in enumerate(small):
  c=r['data']['walletSnapshot']['query']['address']['objects'];assert r['variables']['owner']==col['owner'];assert r['variables']['filter']is None;assert r['variables']['cursor']==(None if i==0 else small[i-1]['data']['walletSnapshot']['query']['address']['objects']['pageInfo']['endCursor']);assert c['pageInfo']['hasNextPage']==(i<len(small)-1);assert 0<len(c['nodes'])<=3;nodes+=c['nodes']
 assert stable(nodes)==stable(connection['nodes']);assert len(nodes)==len(col['objects']);assert len({n['address']for n in nodes})==len(nodes)
 for n,o in zip(connection['nodes'],col['objects']):
  assert n['address']==o['objectId']and str(n['version'])==o['version']and n['digest']==o['digest'];assert n['hasPublicTransfer']==o['hasPublicTransfer'];assert n['owner']['__typename']=='AddressOwner'and n['owner']['address']['address']==col['owner']==o['owner']['AddressOwner'];assert n['contents']['type']['repr']==o['type'];assert bytes(o['content'][str(i)]for i in range(len(o['content'])))==base64.b64decode(n['contents']['bcs'],validate=True);assert n['contents']['json']==o['json'];assert (n['contents']['display']or {}).get('output')==(o['display']or {}).get('output');assert n['previousTransaction']['digest']==o['previousTransaction']
 filtered=[r for r in a['raw']if r['status']==200 and r['stage']==col['role']+' type filters'and 'objects(first:'in r['query']];assert len(filtered)==2
 for r in filtered:
  filt=r['variables']['filter'];assert filt['type']in [col['chosenType'],col['missingType']];got=r['data']['walletSnapshot']['query']['address']['objects'];assert not got['pageInfo']['hasNextPage'];assert [n['address']for n in got['nodes']]==(col['exactIds']if filt['type']==col['chosenType']else [])
 for case in col['complexFilters']:
  inc=case['filter'].get('includeTypes');exc=case['filter'].get('excludeTypes',[])
  matches=lambda t,p:t==p if '<'in p else t.split('<')[0]==p
  ids=[o['objectId']for o in col['objects']if (inc is None or any(matches(o['type'],p)for p in inc))and not any(matches(o['type'],p)for p in exc)];assert ids==case['expectedIds']
checks.append('both owners all genuine cursors full small immutable raw payload, exact BCS JSON Display owner and type/complex subsets')
key=h['preferenceHidden'][0]['key'];assert json.loads(key)==['wallet-hidden-assets',2,json.dumps([h['h0'],h['generation']],separators=(',',':')),h['owner']];assert h['preferenceHidden'][0]['value']=={'version':2,'ids':[h['nftId']]};assert next(r for r in h['preferenceRestored']if r['key']==key)['value']=={'version':2,'ids':[]}
col=a['collections'][0];assert s['nonvisualTypes']==sorted(o['type']for o in col['classification']['other']);assert all(any(o['id']in u for u in s['nonvisualLinks'])for o in col['classification']['other']);assert s['personal']['kioskId']==a['personal']['kioskId'];assert s['personal']['ownerCap']['objectId']==a['personal']['capId'];assert s['personal']['ownerCap']['isPersonal']and not s['personal']['items'];assert 'Kiosk 中暂无资产'in s['emptyPageText']or 'Kiosk is empty'in s['emptyPageText'];assert int(s['kioskSnapshot']['checkpoint'])>=int(a['snapshot']['checkpoint'])
for k in ['ownedSnapshot','kioskSnapshot']:
 p=s[k];assert len(p['dependencies'])==10;assert sorted(p['dependencies'],key=lambda x:str(x))==sorted(a['snapshot']['dependencies'],key=lambda x:str(x));assert p['displayHistory']['coverage']['snapshotCheckpoint']==p['checkpoint'];assert p['displayHistory']['coverage']['snapshotCheckpointDigest']==p['digest']
assert any(r['data']and r['data'].get('walletSnapshot')for r in s['graphql']);assert all(r['status']in [408,429,502,503,504]for r in s['transportFailures']);assert all(r['requestFailure']=={'errorText':'net::ERR_ABORTED'}for r in s['cancelledCaptures'])
checks.append('real scoped hide restore and cold restart; all nineteen UI object links; Personal exact cap and empty contents; classified transient and actual cancelled captures only')
report={'passed':True,'checks':checks,'snapshot':a['snapshot']['checkpoint'],'counts':[{'role':c['role'],'objects':len(c['objects']),'pages':len(c['smallPages'])}for c in a['collections']],'senderUiCheckpoint':s['kioskSnapshot']['checkpoint'],'uiTransportFailures':len(s['transportFailures']),'uiCancelledCaptures':len(s['cancelledCaptures']),'inputsSha256':inputs,'scope':'Independent original body and actual UI/artifact verification. Native checkpoint proofs separately required. No native freshness claim for historical framework ownership, all-entry contention, names, account-history coverage or ordinary HTTPS.'}
out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'passed':True,'checks':len(checks)}))
