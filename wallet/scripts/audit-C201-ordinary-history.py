#!/usr/bin/env python3
# coding: utf-8
"""Audit native-UI-exported sanitized HAR, without invoking the browser or RPC."""
import datetime
import hashlib
import json
from pathlib import Path

logs = Path(__file__).resolve().parent.parent / 'migrationToGRpcOrGraphQLDoc/workLog'
source = logs / '20261010-C201-ordinary-activity-network-01.har'
output = logs / '20261010-C201-ordinary-history-audit-01.json'
entries = json.loads(source.read_text())['log']['entries']
origin = 'chrome-extension://kiahlcbejlgmnbmcggnhagbccojnbkaa'
chain = 'BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4'
owner = '0x9d7652713f02b13b73744ba47e4f21ca0a0a2966cc02df86adcde2041454e5bc'
parsed, incomplete = [], []
for index, entry in enumerate(entries):
    req, res = entry['request'], entry['response']
    assert req['method'] == 'POST'
    assert req['url'] in [
        'http://127.0.0.1:41957/graphql',
        'http://127.0.0.1:41959/account/graphql',
        'http://127.0.0.1:41750/rtd.rpc.v2.LedgerService/GetServiceInfo',
    ]
    headers = {h['name'].lower(): h['value'] for h in req['headers']}
    assert headers.get('origin') == origin
    assert not {'authorization', 'cookie'} & headers.keys()
    assert not req.get('cookies')
    if not req['url'].endswith('/graphql'):
        continue  # gRPC success is deliberately outside this history audit.
    body = json.loads(req['postData']['text'])
    assert body['query'].startswith('query ') and 'jsonrpc' not in body
    assert 'mutation' not in body['query']
    if res['status'] != 200 or not res.get('content', {}).get('text'):
        incomplete.append(index)
        continue
    response = json.loads(res['content']['text'])
    assert not response.get('errors') and isinstance(response['data'], dict)
    parsed.append((index, body, response['data']))

histories = [(i, b, d['accountHistory']) for i, b, d in parsed if 'accountHistory' in d]
assert len(histories) == 1
i, request, history = histories[0]
v = request['variables']
assert v == dict(chain=chain, address=owner, lo=0, hi=779920, limit=20, cursor=None)
for key, value in dict(chainId=chain, address=owner, checkpointLo=0,
                       checkpointHi=v['hi'], limit=20, totalTransactions=0,
                       hasNextPage=False, nextCursor=None, transactions=[],
                       registrationComplete=False, allAccountActivityCertified=False,
                       allAccountTransfersCertified=False,
                       completeForRegisteredKiosks=True,
                       completeForDiscoveredOwnerTokens=True,
                       completeForDiscoveredCapabilities=True).items():
    assert history[key] == value, key
assert len(history['snapshot']) == 64 and all(c in '0123456789abcdef' for c in history['snapshot'])

pins = [(j, b, d) for j, b, d in parsed if d.get('walletSnapshot', {}).get('sequenceNumber') == v['hi']]
assert len(pins) == 2
assert pins[0][0] < i < pins[1][0]
assert 'query WalletSnapshotPin' in pins[0][1]['query']
assert 'query WalletSnapshotRevalidate' in pins[1][1]['query']
assert pins[0][2]['walletSnapshot'] == pins[1][2]['walletSnapshot']
for _, _, data in pins:
    assert data['walletGenesis']['digest'] == chain
    assert len(data['serviceConfig']) == 5
    for bounds in data['serviceConfig'].values():
        assert bounds['first']['sequenceNumber'] <= v['hi'] <= bounds['last']['sequenceNumber']
coverage = [(j, d['accountHistoryCoverage']) for j, _, d in parsed if 'accountHistoryCoverage' in d]
assert len(coverage) == 2 and coverage[0][0] < i < coverage[1][0]
for _, c in coverage:
    assert c['chainId'] == chain and c['checkpointLo'] == 0
    assert c['checkpointHi'] >= v['hi'] and c['allAccountActivityCertified'] is False

result = dict(passed=True, observedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),
              capturedRequests=len(entries), parsedGraphqlResponses=len(parsed),
              incompleteRequests=incomplete, allCapturedRequestsAccepted=False,
              accountHistoryWindowAccepted=True, accountHistoryEntireLifetimeAccepted=False,
              historyEntry=i, requestVariables=v, history=history,
              pinnedCheckpoint=pins[0][2]['walletSnapshot'],
              matchingRevalidationEntry=pins[1][0], coverageEntries=[j for j, _ in coverage],
              workerNetworkAccepted=False, parentCompletion=False,
              inputsSha256={str(p): hashlib.sha256(p.read_bytes()).hexdigest()
                            for p in [Path(__file__).resolve(), source]})
with output.open('x') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
    f.write('\n')
output.chmod(0o600)
print(json.dumps({k: result[k] for k in ['passed', 'capturedRequests', 'parsedGraphqlResponses',
                                       'incompleteRequests', 'accountHistoryWindowAccepted']}))
