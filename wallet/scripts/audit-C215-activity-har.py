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
    assert 6<=len(all_entries)<12
    entries=all_entries[:6]
    # Recording may include the start of the normal next polling cycle. Preserve
    # it in the report; never call that cycle accepted without its final fence.
    tail=[]
    expected=['WalletHistoryCoverage','WalletSnapshotAdmission','WalletSnapshotPin','WalletAccountHistory','WalletHistoryCoverage','WalletSnapshotRevalidate']
    for i,e in enumerate(all_entries[6:]):
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
    assert names==['WalletHistoryCoverage','WalletSnapshotAdmission','WalletSnapshotPin','WalletAccountHistory','WalletHistoryCoverage','WalletSnapshotRevalidate']
    first=data[0]['accountHistoryCoverage'];last=data[4]['accountHistoryCoverage'];page=data[3]['accountHistory']
    assert first['chainId']==last['chainId']==page['chainId']==H0
    assert queries[0]['variables']['chain']==queries[4]['variables']['chain']==H0
    assert first['checkpointLo']==last['checkpointLo']==page['checkpointLo']==0
    checkpoint=first['checkpointHi'];digest=first['checkpointDigest']
    assert last['checkpointHi']>=checkpoint and page['checkpointHi']==checkpoint
    assert page['address']==OWNER and page['transactions']==[] and page['totalTransactions']==0
    assert page['hasNextPage'] is False and page['nextCursor'] is None
    assert first['allAccountActivityCertified'] is last['allAccountActivityCertified'] is page['allAccountActivityCertified'] is False
    v=queries[3]['variables'];assert v=={'chain':H0,'address':OWNER,'lo':0,'hi':checkpoint,'limit':20,'cursor':None}
    for i in [1,2,5]:
        d=data[i];assert d['walletGenesis']['digest']==H0
        assert set(d['serviceConfig'])=={'range'+str(n) for n in range(5)}
        for coverage in d['serviceConfig'].values():
            assert coverage['first']['sequenceNumber']<=0<=checkpoint<=coverage['last']['sequenceNumber']
        if i!=1:
            assert d['walletSnapshot']=={'sequenceNumber':checkpoint,'digest':digest}
            assert f'checkpoint(sequenceNumber: {checkpoint})' in queries[i]['query']
    starts=[datetime.fromisoformat(e['startedDateTime'].replace('Z','+00:00')).timestamp()*1000 for e in entries]
    duration=max(t+e['time'] for t,e in zip(starts,entries))-min(starts)
    assert entries[3]['time']>0 and duration>0
    return {'capturedRequests':len(all_entries),'acceptedFirstCycleRequests':6,
        'followingPartialCycle':tail,'accountGraphql':3,'snapshotGraphql':3,'milliseconds':round(duration,3),
        'perRequestMs':[round(e['time'],3) for e in entries],'checkpoint':checkpoint,
        'h0OwnerPinReadRevalidateAccepted':True,'emptyWindowAccepted':True,'fullAccountHistoryAccepted':False}

files=[L/'20261010-C214-activity-after-01.har',L/'20261010-C215-activity-after-01.har']
before,after=map(audit,files)
applied=L/'20261010-C215-account-reader-applied-01.json'
proof=json.loads(applied.read_text())
assert proof['passed'] and proof['installed'] and proof['onlyAdmissionEndpointAndBindingDigestChanged']
assert proof['untrustedOriginRefused'] and proof['wrongChainRefused'] and proof['readBeforeAndAfterAdmissionPreserved']
out=L/'20261010-C215-activity-har-audit-01.json'
result={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'before':before,'after':after,
    'scope':'C210 ordinary C51 Chrome, empty-account activity via C214 ingress plus C215 internal reader; not C213 extension acceptance',
    'percentageChange':round((after['milliseconds']/before['milliseconds']-1)*100,2),
    'fixedLatencyGuarantee':False,'parentCompletion':False,
    'inputsSha256':{str(p):sha(p) for p in [Path(__file__),*files,applied]}}
with out.open('x') as stream:json.dump(result,stream,indent=2);stream.write('\n')
print(json.dumps(result))
