#!/usr/bin/env python3
"""Independently reconstruct C41 source and verify the complete C42 emitted delta."""
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

w = Path(__file__).resolve().parents[1]
l = w / 'migrationToGRpcOrGraphQLDoc/workLog'
out = Path(sys.argv[1])
assert not out.exists()
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
read = lambda p: json.loads(Path(p).read_text())
proofs = [l / n for n in ['20261007-default-generation-positive-C41-build-01.json',
    '20261007-default-generation-positive-C42-build-01.json',
    '20261007-default-generation-positive-C42-audit-01.json',
    '20261007-NFT-draft-retention-tests-after-01.json',
    '20261007-NFT-draft-session-tests-after-02.json',
    '20261007-C41-nft-draft-reset-independent-01.json']]
a, b, audit, draft, sessions, diagnosis = map(read, proofs)
assert all(p['passed'] for p in [a, b, audit, diagnosis])
assert draft['success'] and sessions['success']
assert draft['numFailedTests'] == sessions['numFailedTests'] == 0
assert (draft['numPassedTests'], sessions['numPassedTests']) == (8, 41)
rows = {}
for base in [w/'src', w/'configs', w.parent/'core/src', w.parent.parent/'rtd-ts-sdk/packages/typescript/src']:
    for p in base.rglob('*'):
        if p.is_file(): rows[str(p.relative_to(w.parent.parent))] = sha(p)
for p in [w/'package.json', w/'webpack.config.ts', w.parent/'pnpm-lock.yaml']:
    rows[str(p.relative_to(w.parent.parent))] = sha(p)
identity = lambda x: {'sha256': hashlib.sha256(json.dumps(x, sort_keys=True).encode()).hexdigest(), 'files': len(x)}
assert identity(rows) == b['sourceAfter']
pins = {str(p): sha(p) for p in [Path(__file__).resolve(), *proofs]}
op = Path.home()/'.local/state/rtd-wallet-migration/dev-20261006-03/C41-nft-draft-repair-20261007-01'
prior = dict(rows)
delta = ['src/ui/app/pages/home/nft-transfer/'+name for name in
         ['index.tsx', 'TransferNFTForm.tsx', 'TransferNFTForm.test.ts', 'index.test.ts']]
for name in delta:
    p = w/name
    old = op/'before'/name if not name.endswith('/index.test.ts') else op/'before-reconstructed/index.test.ts'
    assert p.read_bytes() != old.read_bytes()
    if not name.endswith('/index.test.ts'):
        assert diagnosis['productBeforeHashes'][str(p)] == sha(old)
    prior[str(p.relative_to(w.parent.parent))] = sha(old)
    pins[str(old)] = sha(old); pins[str(p)] = sha(p)
assert identity(prior) == a['sourceAfter']
sources = []
for build in [a, b]:
    s = {}
    for name, digest in build['artifacts'].items():
        p = Path(build['output'])/name
        assert sha(p) == digest
        if name.endswith('.js.map'):
            m = read(p)
            assert len(m['sources']) == len(m['sourcesContent'])
            s.update(zip(((name, k) for k in m['sources']), m['sourcesContent']))
    sources.append(s)
assert sources[0].keys() == sources[1].keys()
changed = [k for k in sources[0] if sources[0][k] != sources[1][k]]
assert {k[1] for k in changed} == {'webpack:///./ui/app/pages/home/nft-transfer/'+name
                                 for name in ['index.tsx', 'TransferNFTForm.tsx']}
result = {'passed': True, 'observedAt': datetime.now(timezone.utc).isoformat(),
          'source': b['sourceAfter'], 'historicalC41SourceReconstructed': True,
          'onlyProductChanges': delta, 'onlyEmittedSourceChanges': changed,
          'emittedSourceKeysCompared': len(sources[0]), 'targetedTests': 49,
          'beforeCaptureDistinction': 'Three changed files captured before repair. index.test.ts separately reconstructed by reversing the exact edit; full1119 aggregate equals original C41 hash.',
          'allOldAndNewArtifactHashesVerified': True, 'inputsSha256': pins,
          'newOriginInstalled': False, 'browserRecipientMatrixAccepted': False,
          'scope': 'Complete source reconstruction, current C42 source and all emitted map leaves, two runtime changes only. Preserves C41 artifacts and current development dist. Static49 checks/full build do not certify current Chrome, indexed framework transfer, TLS or parent acceptance.'}
out.open('x').write(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({k: result[k] for k in ['passed', 'onlyProductChanges', 'onlyEmittedSourceChanges', 'targetedTests']}))
