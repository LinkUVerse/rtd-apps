"""Audit native DevTools HARs; preserve the difference between empty-window and full-history acceptance."""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

L=Path(__file__).resolve().parent.parent/'migrationToGRpcOrGraphQLDoc/workLog'
H0='BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4'
OWNER='0x9d7652713f02b13b73744ba47e4f21ca0a0a2966cc02df86adcde2041454e5bc'
ORIGIN='chrome-extension://kiahlcbejlgmnbmcggnhagbccojnbkaa'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()

def audit(path):
    all_entries=json.loads(path.read_text())['log']['entries']
    assert len(all_entries)==5
    entries=all_entries[:5]
    # Recording may include the start of the normal next polling cycle. Preserve
    # it in the report; never call that cycle accepted without its final fence.
    tail=[]
    expected=['WalletHistoryCoverage','WalletSnapshotAdmissionAndPin','WalletAccountHistory','WalletHistoryCoverage','WalletSnapshotRevalidate']
    for i,e in enumerate(all_entries[5:]):
        q=json.loads(e['request']['postData']['text'])
        name=q['query'].split()[1].split('(')[0]
        assert name==expected[i]
        tail.append({'operation':name,'status':e['response']['status'],'milliseconds':round(e['time'],3),
            'completeBusinessCycleAccepted':False})
    queries=[];data=[]
    for e in entries:
        req=e['request'];res=e['response'];headers={h['name'].lower():h['value'] for h in req['headers']}
        assert req['method']=='POST' and res['status']==200 and not e.get('_error')
        assert headers['origin']==ORIGIN
        assert not any(k in headers for k in ['authorization','cookie'])
        assert req['url'] in ['http://127.0.0.1:41959/account/graphql','http://127.0.0.1:41957/graphql']
        q=json.loads(req['postData']['text']);r=json.loads(res['content']['text'])
        assert not r.get('errors') and r.get('data')
        queries.append(q);data.append(r['data'])
    names=[q['query'].split()[1].split('(')[0] for q in queries]
    assert names==['WalletHistoryCoverage','WalletSnapshotAdmissionAndPin','WalletAccountHistory','WalletHistoryCoverage','WalletSnapshotRevalidate']
    first=data[0]['accountHistoryCoverage'];last=data[3]['accountHistoryCoverage'];page=data[2]['accountHistory']
    assert first['chainId']==last['chainId']==page['chainId']==H0
    assert queries[0]['variables']['chain']==queries[3]['variables']['chain']==H0
    assert first['checkpointLo']==last['checkpointLo']==page['checkpointLo']==0
    checkpoint=first['checkpointHi'];digest=first['checkpointDigest']
    assert last['checkpointHi']>=checkpoint and page['checkpointHi']==checkpoint
    assert page['address']==OWNER and page['transactions']==[] and page['totalTransactions']==0
    assert page['hasNextPage'] is False and page['nextCursor'] is None
    assert first['allAccountActivityCertified'] is last['allAccountActivityCertified'] is page['allAccountActivityCertified'] is False
    v=queries[2]['variables'];assert v=={'chain':H0,'address':OWNER,'lo':0,'hi':checkpoint,'limit':20,'cursor':None}
    for i in [1,4]:
        d=data[i];assert d['walletGenesis']['digest']==H0
        assert set(d['serviceConfig'])=={'range'+str(n) for n in range(5)}
        for coverage in d['serviceConfig'].values():
            assert coverage['first']['sequenceNumber']<=0<=checkpoint<=coverage['last']['sequenceNumber']
        if i==1:
            assert d['walletHead']['sequenceNumber']>=checkpoint
        if i in [1,4]:
            assert d['walletSnapshot']=={'sequenceNumber':checkpoint,'digest':digest}
            assert f'checkpoint(sequenceNumber: {checkpoint})' in queries[i]['query']
    starts=[datetime.fromisoformat(e['startedDateTime'].replace('Z','+00:00')).timestamp()*1000 for e in entries]
    duration=max(t+e['time'] for t,e in zip(starts,entries))-min(starts)
    assert entries[2]['time']>0 and duration>0
    return {'capturedRequests':len(all_entries),'acceptedFirstCycleRequests':5,
        'followingPartialCycle':tail,'accountGraphql':3,'snapshotGraphql':2,'milliseconds':round(duration,3),
        'perRequestMs':[round(e['time'],3) for e in entries],'checkpoint':checkpoint,
        'h0OwnerPinReadRevalidateAccepted':True,'emptyWindowAccepted':True,'fullAccountHistoryAccepted':False}

path=L/'20261011-C216-activity-01.har'
path.chmod(0o600)
result={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'after':audit(path),
'scope':'C216 actual ordinary Chrome complete empty-account activity cycle; combined head/admission/pin and final fence verified',
'parentCompletion':False,'inputsSha256':{str(p):sha(p) for p in [Path(__file__),path]}}
with (L/'20261011-C216-activity-har-audit-01.json').open('x') as stream:json.dump(result,stream,indent=2);stream.write('\n')
print(json.dumps(result))
