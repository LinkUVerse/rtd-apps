"""Audit the native DevTools HAR; UI observations are recorded separately."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import re

logs = Path(__file__).resolve().parents[1] / 'migrationToGRpcOrGraphQLDoc/workLog'
source = logs / '20261010-C206-balance-unlocked-after-01.har'
entries = json.loads(source.read_text())['log']['entries']
owner = '0x9d7652713f02b13b73744ba47e4f21ca0a0a2966cc02df86adcde2041454e5bc'
h0 = 'BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4'
complete = []
incomplete = []
for index, entry in enumerate(entries):
    response = entry['response']
    body = response['content'].get('text')
    if response['status'] != 200 or not body:
        incomplete.append({'index': index, 'status': response['status']})
        continue
    payload = json.loads(body)
    assert not payload.get('errors')
    request = json.loads(entry['request']['postData']['text'])
    complete.append((index, entry, request, payload['data']))

pages = []
for index, entry, request, data in complete:
    if 'balances(first:' not in request['query']:
        continue
    assert entry['request']['url'] == 'http://127.0.0.1:41957/graphql'
    assert request['variables'] == {'owner': owner, 'cursor': None}
    snapshot = data['walletSnapshot']
    sequence, digest = snapshot['sequenceNumber'], snapshot['digest']
    address = snapshot['query']['address']
    assert address['address'] == owner
    assert address['balances'] == {
        'pageInfo': {'hasNextPage': False, 'endCursor': None}, 'nodes': []}
    proof = []
    for other_index, other_entry, other_request, other_data in complete:
        query = other_request['query']
        operation = re.search(r'query (\w+)', query).group(1)
        if (operation not in {'WalletSnapshotPin', 'WalletSnapshotRead', 'WalletSnapshotRevalidate'}
                or 'field: "balances"' not in query):
            continue
        other_snapshot = other_data['walletSnapshot']
        if other_snapshot['sequenceNumber'] != sequence:
            continue
        assert other_snapshot['digest'] == digest
        assert other_data['walletGenesis']['digest'] == h0
        assert f'checkpoint(sequenceNumber: {sequence})' in query
        assert 'field: "checkpoints"' in query
        for coverage in other_data['serviceConfig'].values():
            assert coverage['first']['sequenceNumber'] <= sequence <= coverage['last']['sequenceNumber']
        proof.append({'index': other_index, 'operation': operation,
                      'startedDateTime': other_entry['startedDateTime']})
    assert any(p['operation'] == 'WalletSnapshotPin' and p['index'] < index for p in proof)
    assert any(p['operation'] == 'WalletSnapshotRevalidate' and p['index'] > index for p in proof)
    pages.append({'sequenceNumber': sequence, 'digest': digest, 'proof': proof})
assert pages
report = {
    'passed': True,
    'scope': 'Captured balance pin/read/revalidate protocol only; not all browser or network acceptance',
    'auditedAt': datetime.now(timezone.utc).isoformat(),
    'source': str(source), 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'owner': owner, 'h0': h0, 'entries': len(entries),
    'completeJsonResponses': len(complete), 'incompleteNotAccepted': incomplete,
    'completeEmptyBalancePages': pages, 'nonzeroBalanceAcceptance': False,
    'performanceAcceptance': False,
}
output = logs / '20261010-C206-unlocked-balance-protocol-01.json'
with output.open('x') as stream:
    json.dump(report, stream, ensure_ascii=False, indent=2)
    stream.write('\n')
print(json.dumps({'passed': True, 'pages': len(pages), 'complete': len(complete),
                  'incomplete': len(incomplete)}, ensure_ascii=False))
