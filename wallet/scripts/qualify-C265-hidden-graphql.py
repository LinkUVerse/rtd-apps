#!/usr/bin/env python3
"""Bind saved browser replay to installed C257 source maps and original evidence."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import sys

W = Path(__file__).resolve().parent.parent
L = W/'migrationToGRpcOrGraphQLDoc/workLog'
output = Path(sys.argv[1]).resolve()
assert output.parent == L and not output.exists()
files = [Path(__file__)]


def read(path):
    path = Path(path).resolve()
    files.append(path)
    return json.loads(path.read_text())


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


replay = read(L/'20261011-C265-hidden-graphql-audit-03.json')
native = read(L/'20261011-C262-hidden-audit-01.json')
installed = read(L/'20261011-C257-ordinary-bytecode-01.json')
assert replay['passed'] and native['passed'] and installed['completeInstalledBytecodeAccepted']
for path, digest in replay['inputsSha256'].items():
    path = Path(path)
    if not path.is_absolute():
        path = W/path
    assert sha(path) == digest
    files.append(path)
har = read(L/'20261011-C262-hidden-assets-01.har')['log']['entries']
indices = [i for row in replay['reports'] for i in row['indices']]
expected = [i for i, entry in enumerate(har) if entry['request']['url'].endswith('/graphql')]
assert sorted(indices) == expected and len(set(indices)) == len(indices) == 96
cancelled = [i for i in indices if har[i]['response']['status'] == 0]
assert sorted(cancelled) == [60,108,111,128,131,135]
assert native['requests'] == len(har) == 149
assert len(native['native']) == 48 and len(native['images']) == 5
assert 96+48+5 == len(har)

# The local bundles match the previously observed actual UI/worker bytes.
# Compare every mapped wallet RPC module, not just the imported reader entry.
mapped = {}
for script in installed['scripts']:
    artifact = Path(script['artifact'])
    assert sha(artifact) == script['sha256']
    files.append(artifact)
    path = artifact.with_suffix(artifact.suffix+'.map')
    content = read(path)
    for name, source in zip(content['sources'], content['sourcesContent']):
        prefix = 'webpack:///./shared/rpc/'
        if not name.startswith(prefix):
            continue
        relative = 'src/shared/rpc/'+name[len(prefix):]
        local = W/relative
        assert local.is_file() and local.read_text() == source, relative
        files.append(local)
        mapped.setdefault(relative, []).append(artifact.name)
assert len(mapped) > 50
for path in replay['inputsSha256']:
    if path.startswith('src/shared/rpc/'):
        assert path in mapped

proof = dict(passed=True, observedAt=datetime.now(timezone.utc).isoformat(),
    scope='All C262 HAR frames accounted; 96 GraphQL production replays, original 48 native frames and 5 media responses. Current local bundles equal previous observed C257 bytes; all mapped wallet RPC sources equal source maps. No new live UI or full release acceptance.',
    requests=149, graphql=96, successfulGraphqlResponses=90, capturedCancellations=6,
    nativeFrames=48, mediaResponses=5, installedRpcModulesMatched=len(mapped), modules=mapped,
    businessReadsAccepted=replay['businessReadsAccepted'],
    nameStaleAdmissionsRejected=replay['nameStaleAdmissionsRejected'],
    snapshotOnlyGroups=replay['snapshotOnlyGroups'],
    originalWireOrderingReproduced=False, liveNetworkRequests=0,
    newBrowserStateObserved=False, publisherChanged=False, parentCompletion=False,
    inputsSha256={str(path): sha(path) for path in dict.fromkeys(files)})
with output.open('x') as stream:
    json.dump(proof, stream, indent=2)
    stream.write('\n')
output.chmod(0o600)
print(json.dumps({key: proof[key] for key in ['passed','requests','graphql','installedRpcModulesMatched',
      'businessReadsAccepted','nameStaleAdmissionsRejected','parentCompletion']}))
