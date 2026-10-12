"""Audit native-exported C207 HAR; no requests, wallet storage or UI execution."""
import collections
import datetime
import hashlib
import json
import re
from pathlib import Path

logs = Path(__file__).resolve().parents[1] / 'migrationToGRpcOrGraphQLDoc/workLog'
source = logs / '20261010-C207-continuous-refresh-after-01.har'
har = json.loads(source.read_text())['log']
entries = har['entries']
genesis = 'BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4'
owner = '0x9d7652713f02b13b73744ba47e4f21ca0a0a2966cc02df86adcde2041454e5bc'
stamp = lambda s: datetime.datetime.fromisoformat(s.replace('Z', '+00:00')).timestamp()
pages = {p['id']: stamp(p['startedDateTime']) for p in har['pages']}
assert len(pages) == 3
operations = collections.Counter()
balances = []
incomplete = []
for index, entry in enumerate(entries):
    req, res = entry['request'], entry['response']
    assert req['url'] in ('http://127.0.0.1:41957/graphql',
                          'http://127.0.0.1:41750/rtd.rpc.v2.LedgerService/GetServiceInfo')
    if req['url'].endswith('GetServiceInfo'):
        operations['GetServiceInfo'] += 1
        assert res['status'] == 200
        continue  # gRPC payload not accepted as business proof by this audit.
    payload = json.loads(req['postData']['text'])
    query = payload['query']
    operation = re.search(r'query (\w+)', query)[1]
    operations[operation] += 1
    assert operation in ('WalletSnapshotAdmission', 'WalletSnapshotPin',
                         'WalletSnapshotRead', 'WalletSnapshotRevalidate')
    is_balance = 'availableRange(type: "Address", field: "balances")' in query and query.count('availableRange(') == 2
    if res['status'] != 200 or not res['content'].get('text'):
        assert not is_balance
        incomplete.append({'entryIndex': index, 'status': res['status'], 'operation': operation,
                           'startedDateTime': entry['startedDateTime'], 'accepted': False})
        continue
    body = json.loads(res['content']['text'])
    assert not body.get('errors') and body.get('data')
    data = body['data']
    assert data['walletGenesis']['digest'] == genesis
    if not is_balance:
        continue
    snapshot = data.get('walletSnapshot', data.get('walletHead'))
    number = snapshot['sequenceNumber']
    assert len(data['serviceConfig']) == 2
    for coverage in data['serviceConfig'].values():
        assert coverage['first']['sequenceNumber'] <= number <= coverage['last']['sequenceNumber']
    if operation != 'WalletSnapshotAdmission':
        assert int(re.search(r'walletSnapshot: checkpoint\(sequenceNumber: (\d+)\)', query)[1]) == number
    if operation == 'WalletSnapshotRead':
        assert 'balances(first: 50, after: $cursor)' in query
        assert payload['variables'] == {'owner': owner, 'cursor': None}
        address = snapshot['query']['address']
        assert address['address'] == owner
        assert address['balances'] == {'pageInfo': {'hasNextPage': False, 'endCursor': None}, 'nodes': []}
    balances.append({'entryIndex': index, 'page': entry['pageref'], 'operation': operation,
                     'snapshot': number, 'digest': snapshot['digest'],
                     'start': stamp(entry['startedDateTime']), 'end': stamp(entry['startedDateTime']) + entry['time'] / 1000})

assert len(balances) == 24
cycles = []
for i in range(0, len(balances), 4):
    batch = balances[i:i+4]
    assert [r['operation'] for r in batch] == ['WalletSnapshotAdmission', 'WalletSnapshotPin', 'WalletSnapshotRead', 'WalletSnapshotRevalidate']
    assert len({(r['page'], r['snapshot'], r['digest']) for r in batch}) == 1
    assert all(a['end'] <= b['start'] + 0.002 for a, b in zip(batch, batch[1:]))
    cycle = {'page': batch[0]['page'], 'snapshot': batch[0]['snapshot'],
             'entryIndices': [r['entryIndex'] for r in batch], 'emptyCollectionComplete': True,
             'elapsedSeconds': round(batch[-1]['end'] - batch[0]['start'], 3)}
    if len(cycles) < 3:
        cycle['pageToBalanceReadSeconds'] = round(batch[2]['start'] - pages[batch[0]['page']], 3)
        cycle['pageToRevalidationSeconds'] = round(batch[-1]['end'] - pages[batch[0]['page']], 3)
    cycles.append(cycle)
assert [r['page'] for r in cycles] == ['page_1', 'page_2', 'page_3', 'page_3', 'page_3', 'page_3']
# Last two cycles begin after the preceding completion plus the configured 20 s interval.
for i in (4, 5):
    assert 19.9 <= balances[4*i]['start'] - balances[4*i-1]['end'] <= 22

proof = {'passed': True, 'scope': 'Six complete zero-balance cycles on ordinary C51 Chrome; three reloads, focus and two automatic cycles. Native UI evidence separate.',
         'harSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
         'requestCount': len(entries), 'statusCounts': dict(collections.Counter(e['response']['status'] for e in entries)),
         'operations': dict(operations), 'balanceCycles': cycles, 'incompleteNonBalanceEntries': incomplete,
         'fullCapabilityScanAbsent': True, 'graphqlErrorsInCompleteResponses': 0,
         'exactUiDisplayTimeMeasured': False, 'nonzeroBalanceChangesAccepted': False, 'parentCompletion': False}
target = logs / '20261010-C207-ordinary-balance-har-audit-01.json'
with target.open('x') as stream:
    json.dump(proof, stream, ensure_ascii=False, indent=2)
    stream.write('\n')
print(json.dumps(proof, ensure_ascii=False))
