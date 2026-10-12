#!/usr/bin/env python3
"""Close only ENV-07 using native observations and decoded browser traffic."""
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

proof('20261010-C204-ordinary-init-tls-completion-01.json', {'ordinaryInitTlsAccepted': True})
proof('20261010-C202-ordinary-tls-observation-01.json', {
    'correctTlsAccepted': True, 'wrongSanRejected': True,
    'warningBypassed': False, 'systemTrustModified': False})
proof('20261010-C203-custom-profile-permission-observation-01.json', {
    'permissionDeniedAccepted': True, 'originalSavedProfileReopenedAndHeld': True})
proof('20261010-C204-site-revocation-audit-01.json', {
    'actualSiteAccessWithheld': True, 'actualUiHttpsRejected': True})
proof('20261010-C205-site-restoration-observation-01.json', {
    'permissionRestored': True, 'nativeDropdownVerified': True,
    'newOriginsAdded': False, 'newRevisionSaved': False})
ui = proof('20261010-C205-restored-ui-audit-01.json', {
    'actualOrdinaryUiThreeEntryTrafficAccepted': True,
    'actualUiHttpsArchiveAccepted': True, 'allCapturedRequestsAccepted': True,
    'fullGenesisChecked': True})
worker = proof('20261010-C205-restored-worker-audit-01.json', {
    'actualWorkerNetworkAccepted': True, 'workerHttpsArchiveAccepted': True,
    'allCapturedRequestsAccepted': True, 'fullGenesisChecked': True,
    'networkRequests': 3, 'executeRequests': 0, 'signatures': 0})
inputs[str(Path(__file__).resolve())] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
result = {
    'passed': True, 'observedAt': datetime.now(timezone.utc).isoformat(),
    'parentId': 'ENV-07', 'parentCompletion': True,
    'ordinaryThreeEntriesCompletion': True, 'permissionRestored': True,
    'uiSuccessfulBodies': ui['successfulBodies'], 'workerSuccessfulBodies': worker['networkRequests'],
    'fullGenesisChecked': True, 'demoCorsAccepted': False,
    'balanceBusinessAccepted': False, 'otherParentsCompleted': False,
    'trialReady': False, 'inputsSha256': inputs,
}
out = LOGS / '20261010-C205-env-completion-01.json'
with out.open('x') as stream:
    json.dump(result, stream, indent=2)
    stream.write('\n')
out.chmod(0o600)
print(json.dumps({k: result[k] for k in ['passed', 'parentId', 'parentCompletion', 'uiSuccessfulBodies', 'workerSuccessfulBodies']}))
