#!/usr/bin/env python3
"""Close only the actual declared account-history semantic contract."""
import hashlib
import importlib.util
import json
import sys
from pathlib import Path
from datetime import datetime, timezone

w = Path(__file__).resolve().parents[1]
l = w / 'migrationToGRpcOrGraphQLDoc/workLog'
out = Path(sys.argv[1])
assert not out.exists()
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
names = ['20261007-C40-account-nonempty-production-02.json',
         '20261007-C40-account-native-independent-audit-02.json',
         '20261007-C41-account-ui-independent-audit-02.json',
         '20261007-account-kiosk-native-endpoints-audit-01.json',
         '20261007-account-kiosk-authority-sql-audit-01.json',
         '20261007-account-kiosk-authority-native-audit-01.json',
         '20261007-postboot2-all-account-audit-06.json',
         '20261007-interval-live-independent-audit-restored-C41-02.json',
         '20261007-default-generation-positive-C41-build-01.json',
         '20261007-default-generation-positive-C41-audit-01.json',
         '20261007-C41-budget-delta-audit-02.json']
files = [l / n for n in names]
proofs = [json.loads(p.read_text()) for p in files]
assert all(p['passed'] for p in proofs)
pins = {str(p): sha(p) for p in [Path(__file__).resolve(), *files]}
for proof in proofs:
    for f, h in proof.get('inputsSha256', {}).items():
        assert sha(f) == h
        pins[f] = h
production, native, ui, endpoints, sql, authority, account, environment, build, closure, delta = proofs
assert len(native['nativeRows']) == 22 and len(endpoints['rows']) == 7
assert len(sql['rows']) == authority['authorityBoundaries'] == 8
assert len(authority['authorityObjects']) == 5 and len(authority['checkpoints']) == 12
assert authority['originalTransactionRelativeAuthoritiesVerified']
assert ui['actualUiChecks'] == 18 and len(ui['windows']) == 2
assert environment['containers'] == 28 and environment['healthyHealthchecks'] == 14
assert environment['originalTwentySevenContainersPreserved'] and environment['explicitC41StatelessEdgeSuccessor']
assert account['allThreeApisAndSixLoopsAccepted']
assert delta['historicalC40SourceReconstructed']
assert ui['source'] == delta['source'] == build['sourceAfter']
spec = importlib.util.spec_from_file_location('builder', w / 'scripts/build-reviewed-local-extension.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
current_sha, count = module.source_hash(w)
assert {'sha256': current_sha, 'files': count} == build['sourceAfter']
for name, h in build['artifacts'].items():
    assert sha(Path(build['output']) / name) == h
origins = {}
for collection in production['collections']:
    history = collection['history']
    assert history['totalTransactions'] == len(history['transactions'])
    assert history['checkpointLo'] == 0
    assert history['coverage'] == {
        'registrationComplete': False, 'completeForRegisteredKiosks': True,
        'allAccountActivityCertified': False, 'completeForDiscoveredOwnerTokens': True,
        'completeForDiscoveredCapabilities': True, 'allAccountTransfersCertified': False,
    }
    origins[collection['role']] = sorted({o.split(':')[0] for t in history['transactions'] for o in t['origins']})
    window = next(r for r in ui['windows'] if r['owner'] == collection['owner'])
    assert window['transactions'] == history['totalTransactions'] and window['hi'] >= history['checkpointHi']
assert {'affectedAddress', 'capability', 'kiosk'} <= set(origins['sender'])
assert origins['recipient'] == ['affectedAddress']
for p in [native, ui, authority]:
    assert p['simulations'] == p['signatures'] == p['executeRequests'] == 0
result = {'passed': True, 'observedAt': datetime.now(timezone.utc).isoformat(),
          'completedParentContract': 'QA-A13', 'source': build['sourceAfter'],
          'actualTransactionsByOwner': {c['role']: c['history']['totalTransactions'] for c in production['collections']},
          'actualOriginKinds': origins, 'freshCanonicalUniqueTransactions': 22,
          'actualUiChecks': 18, 'canonicalNativeMovements': 7,
          'immutableAuthorityBoundaries': 8, 'canonicalAuthorityObjects': 5,
          'freshCanonicalCheckpoints': 12, 'fullAccountHistoryCertified': False,
          'registrationComplete': False, 'allAccountTransfersCertified': False,
          'noCoverageInflation': True, 'simulations': 0, 'signatures': 0, 'executeRequests': 0,
          'inputsSha256': pins,
          'scope': 'Only QA-A13 actual declared extension semantics: complete bounded sender/incoming windows, native canonical changes/events and seven Kiosk movements, exact positive deployment token/cap roots and sealed lineage, actual pre/post transaction authority with native ordinals and BCS owners, two actual C41 UI limited-history warnings/cards/receipts/cipher/full journal/cold source. Missing registration and global activity/transfer certificates remain false; no full-history, current native ownership, names, TX pending competition, every execution entry or migration-wide release acceptance.'}
out.open('x').write(json.dumps(result, indent=2)+'\n')
print(json.dumps({k: result[k] for k in ['passed', 'completedParentContract', 'actualTransactionsByOwner', 'canonicalNativeMovements', 'noCoverageInflation']}))
