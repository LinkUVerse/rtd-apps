#!/usr/bin/env python3
"""Audit saved ordinary Chrome read traffic; never controls Chrome or dispatches."""
import collections
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

logs = Path(__file__).resolve().parents[1] / 'migrationToGRpcOrGraphQLDoc/workLog'
files = [Path(__file__), logs/'20261011-C275-nft-post-write-01.har',
         logs/'20261011-C275-nft-indexed-01.json', logs/'20261011-C275-nft-intent-01.json']
har, proof, intent = [json.loads(p.read_text()) for p in files[1:]]
assert proof['passed'] and proof['digest'] == intent['previewDigest']
counts = collections.Counter()
exceptions, rows = [], []
for index, entry in enumerate(har['log']['entries']):
    req, res = entry['request'], entry['response']
    url = urlsplit(req['url'])
    assert url.hostname == '127.0.0.1'
    method = url.path.rsplit('/',1)[-1]
    assert method in {'graphql','GetServiceInfo','ListBalances','GetTransaction','display-v2.png'}
    assert url.port in {43150,43210,43211,43203,41718}
    assert '"jsonrpc"' not in req.get('postData',{}).get('text','')
    counts[method] += 1
    if res['status'] == 0:
        exceptions.append({'index': index, 'method': method,'error':res.get('_error'),'acceptedAsSuccess':False})
        continue
    assert res['status'] == 200
    if method != 'graphql':
        continue
    value = json.loads(res['content']['text'])
    assert not value.get('errors')
    data=value['data'];snapshot=data.get('walletSnapshot') or {}
    address=(snapshot.get('query') or {}).get('address') or {}
    objects=address.get('objects')
    if objects is None or snapshot['sequenceNumber'] < int(proof['checkpoint']):
        continue
    assert data['walletGenesis']['digest'] == intent['expectedH0']
    assert not objects['pageInfo']['hasNextPage']
    owner=address['address']
    assert owner in {intent['sender'],intent['recipient']}
    matches=[o for o in objects['nodes'] if o['address']==intent['objectId']]
    if owner==intent['sender']:
        assert not matches
    else:
        assert len(matches)==1
        obj=matches[0]
        assert str(obj['version'])==proof['object']['version']
        assert obj['digest']==proof['object']['digest']
        assert obj['owner']['address']['address']==intent['recipient']
        assert obj['previousTransaction']['digest']==intent['previewDigest']
    rows.append({'at':entry['startedDateTime'],'owner':owner,'checkpoint':snapshot['sequenceNumber'],
                 'objects':len(objects['nodes']),'targetPresent':bool(matches)})
assert {row['owner'] for row in rows}=={intent['sender'],intent['recipient']}
assert sum(row['owner']==intent['recipient'] for row in rows)>=2
assert sum(row['owner']==intent['sender'] for row in rows)>=2
result={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(), 'counts':dict(counts),
        'requests':len(har['log']['entries']),'postWriteCompleteOwnerLists':rows,'exceptions':exceptions,
        'noJsonRpc':True,'onlyExpectedLoopbackEndpoints':True,'executionCaptured':False,
        'scope':'Both post-write owner lists across actual ordinary Chrome page reloads; each object matches independent current native evidence. Does not claim full execution HAR or all service business coverage.',
        'inputsSha256':{str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}}
with (logs/'20261011-C275-nft-browser-audit-01.json').open('x') as stream:
    json.dump(result,stream,indent=2);stream.write('\n')
print(json.dumps({'passed':True,'requests':result['requests'],'postWriteOwnerLists':len(rows),'exceptions':len(exceptions)}))
