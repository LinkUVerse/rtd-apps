#!/usr/bin/env python3
"""Audit the permission/TLS subset of QA-A19; web demo CORS remains separate."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json

LOGS = Path(__file__).resolve().parents[1] / 'migrationToGRpcOrGraphQLDoc/workLog'
inputs = {}

def proof(name, required):
    file = LOGS / name
    data = json.loads(file.read_bytes())
    assert data.get('passed') is True, name
    for key, value in required.items():
        assert data.get(key) == value, (name, key)
    for source, digest in data.get('inputsSha256', {}).items():
        assert hashlib.sha256(Path(source).read_bytes()).hexdigest() == digest, source
    inputs[str(file)] = hashlib.sha256(file.read_bytes()).hexdigest()
    return data

proof('20261010-C198-ordinary-initialization-observation-01.json', {'actualAccountUiVisible': True, 'credentialsReadOrEnteredByAgent': False, 'termsAcceptedByAgent': False})
proof('20261010-C201-ordinary-upgrade-installed-01.json', {})
proof('20261010-C201-ordinary-upgrade-native-ui-01.json', {'accountRetained': True, 'normalReloadObserved': True})
proof('20261010-C198-ordinary-tls-rejection-observation-01.json', {'browserError': 'NET::ERR_CERT_AUTHORITY_INVALID', 'warningBypassed': False})
proof('20261010-C202-profile-ca-imported-01.json', {})
proof('20261010-C205-env-completion-01.json', {'parentId': 'ENV-07', 'parentCompletion': True, 'permissionRestored': True})
inputs[str(Path(__file__).resolve())] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
result = {'passed': True, 'observedAt': datetime.now(timezone.utc).isoformat(),
    'ordinaryPermissionTlsMatrixAccepted': True, 'permissionPositiveEvidence': 'C205 user-approved native site-access restoration and actual UI/worker traffic',
    'c203AmbiguousAllowClickCounted': False, 'demoCorsAccepted': False, 'parentCompletion': False,
    'trialReady': False, 'inputsSha256': inputs}
out = LOGS / '20261010-C205-permission-tls-matrix-01.json'
with out.open('x') as stream:
    json.dump(result, stream, indent=2); stream.write('\n')
out.chmod(0o600)
print(json.dumps({'passed': True, 'ordinaryPermissionTlsMatrixAccepted': True, 'parentCompletion': False}))
