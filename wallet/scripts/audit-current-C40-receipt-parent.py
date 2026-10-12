#!/usr/bin/env python3
"""Verify QA-A14 parent evidence without reinterpreting remaining entry tests."""
import hashlib
import json
from pathlib import Path
from datetime import datetime, timezone

wallet = Path(__file__).resolve().parents[1]
logs = wallet / 'migrationToGRpcOrGraphQLDoc/workLog'
output = logs / '20261007-QA-A14-current-completion-audit-01.json'
assert not output.exists()
pins = {}

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def read(name):
    path = logs / name
    pins[str(path)] = sha(path)
    value = json.loads(path.read_text())
    assert value['passed'], name
    return value

current = read('20261007-C40-receipt-index-catchup-chrome-03.json')
native = read('20261007-C40-receipt-index-catchup-native-audit-01.json')
assert current['source'] == native['source']
assert len(current['receipts']) == len(native['receipts']) == 4
assert all(current[n] == 0 for n in ['simulations', 'signatures', 'executeRequests'])
assert current['blocked'] == current['errors'] == current['responseErrors'] == []
assert current['initialJournal'] == current['finalJournal']
assert current['encryptedBefore'] == current['encryptedAfter']
assert native['normalRelockVerified'] and native['fullJournalAndCipherHeld']
assert native['currentWorkerAndUiBytesHeld']
for f, h in current['inputsSha256'].items():
    assert sha(Path(f)) == h
    pins[f] = h
for f, h in native['inputsSha256'].items():
    assert sha(Path(f)) == h
    pins[f] = h
h0, owner = current['h0'], current['owner']
initials = [
    ('ob-create', '20261007-positive-C39-ob-create-receipt-chrome-01.json'),
    ('personal', '20261007-positive-C39-personal-execution-chrome-01.json'),
    ('direct-display', '20261007-positive-C39-direct-display-execution-chrome-04.json'),
]
pairs = []
for label, file in initials:
    before = read(file)
    after = next(r for r in current['receipts'] if r['label'] == label)
    oracle = json.loads(Path(after['file']).read_text())
    assert sha(Path(after['file'])) == after['sha256']
    assert oracle['passed'] and oracle['signatureVerified'] and oracle['nativeEffectsMatch']
    assert oracle['h0'] == h0 and oracle['owner'] == owner
    assert after['expectCovered'] and after['observer']['data'] is True
    assert int(after['snapshot']['checkpoint']) >= int(after['checkpoint'])
    assert oracle['receipt']['checkpoint'] == after['checkpoint']
    if label == 'ob-create':
        assert before['digest'] == after['digest']
        assert before['coverage']['body']['data']['chainIdentifier'] == h0
        assert before['coverage']['body']['data']['serviceConfig']['availableRange']['last']['sequenceNumber'] < int(after['checkpoint'])
        assert any(r['passed'] and r.get('name') == 'actual indexing-pending indication visible' for r in before['checks'])
        before_scope = 'historical public receipt on fresh unfunded account; current C40 uses actual sender'
        assert before['executions'] == 0 and before['signatures'] == 0
    else:
        assert before['h0'] == h0 and before['owner'] == owner
        assert before['execution']['digest'] == after['digest']
        assert before['executeRequests'] == 1
        assert before['execution']['terminal']['journal-v2'][0]['state'] == 'confirmed-success'
        assert before['execution']['terminal']['pending-scopes-v2'] == []
        assert '交易已确认，资产数据仍在同步。' in before['receiptText']
        before_scope = 'original sender one actual execution and confirmed receipt with lag hint'
    assert '交易成功' in after['receiptText']
    assert '交易已确认，资产数据仍在同步。' not in after['receiptText']
    pairs.append({'label': label, 'digest': after['digest'], 'targetCheckpoint': after['checkpoint'],
                  'currentSnapshot': after['snapshot']['checkpoint'], 'beforeScope': before_scope,
                  'actualCurrentFullSnapshotRefreshes': len(after['assetRefreshes'])})
framework = next(r for r in current['receipts'] if r['label'] == 'framework')
assert framework['observer']['data'] is False and not framework['expectCovered']
assert int(framework['snapshot']['checkpoint']) < int(framework['checkpoint'])
assert '交易已确认，资产数据仍在同步。' in framework['receiptText']
assert current['finalJournal']['journal-v2'][0]['digest'] == framework['digest']
assert current['finalJournal']['journal-v2'][0]['state'] == 'confirmed-success'

builds = [read('20261006-default-generation-positive-C39-build-01.json'),
          read('20261007-default-generation-positive-C40-build-01.json')]
assert current['source'] == builds[1]['sourceAfter']
# Check source contents embedded in the actual pinned production bundles, then current files.
files = ['shared/rpc/WalletRpcProvider.ts', 'ui/app/pages/home/receipt/index.tsx',
         'ui/app/hooks/useReceiptIndexing.ts', 'shared/rpc/receipt-indexing.ts',
         'shared/rpc/graphql-snapshot.ts', 'shared/rpc/display-history.ts',
         'shared/rpc/asset-reader.ts']
source_sets = []
for build in builds:
    sources = {}
    for file, digest in build['artifacts'].items():
        path = Path(build['output']) / file
        assert sha(path) == digest
        if file.endswith('.js.map'):
            pins[str(path)] = digest
            m = json.loads(path.read_text())
            for name, content in zip(m['sources'], m['sourcesContent']):
                sources[name] = content
    source_sets.append(sources)
held = []
for file in files:
    name = 'webpack:///./' + file
    old, new = source_sets[0].get(name), source_sets[1].get(name)
    assert old is not None and new is not None, file
    assert old == new == (wallet / 'src' / file).read_text(), file
    held.append({'file': file, 'sha256': hashlib.sha256(new.encode()).hexdigest(),
                 'C39C40AndCurrentSourceIdentical': True})
    pins[str(wallet / 'src' / file)] = sha(wallet / 'src' / file)
result = {'passed': True, 'observedAt': datetime.now(timezone.utc).isoformat(),
          'parent': 'QA-A14', 'completeOnlyThisParent': True,
          'h0': h0, 'owner': owner, 'source': current['source'], 'actualLagToCoveredPairs': pairs,
          'currentFrameworkLagPreservesSuccess': True, 'heldReceiptAndSnapshotImplementations': held,
          'currentBrowserChecks': len(current['checks']), 'currentNativeReceipts': len(native['receipts']),
          'simulations': 0, 'signatures': 0, 'executeRequests': 0,
          'allEntryTX08Completed': False, 'targetReceiverUiCompleted': False,
          'framework281963IndexCovered': False, 'trialReady': False,
          'inputsSha256': {**pins, str(Path(__file__).resolve()): sha(Path(__file__).resolve())},
          'scope': 'Exact original digests show real prior GraphQL lag and current complete ten-field snapshot coverage/refresh on affected sender. Pinned C39/C40 production source maps and current receipt/snapshot implementations identical. Current framework stays confirmed during real lag; cipher/full journal/relock and zero new transactions independently proved. Only QA-A14 read-after-write contract; all entry TX08, recipient UI, pending competition and other parents remain open.'}
output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'passed': True, 'parent': 'QA-A14', 'pairs': len(pairs), 'heldFiles': len(held)}))
