#!/usr/bin/env python3
"""Verify the native Chrome HAR from the explicit site-access revocation test."""
import datetime
import hashlib
import json
from pathlib import Path

logs = Path(__file__).resolve().parent.parent / 'migrationToGRpcOrGraphQLDoc/workLog'
source = logs / '20261010-C204-revoked-ui-https-01.har'
entries = json.loads(source.read_text())['log']['entries']
url = 'https://127.0.0.1:41903/archive/rtd.rpc.v2.LedgerService/GetServiceInfo'
archive = [e for e in entries if e['request']['url'] == url]
posts = [e for e in archive if e['request']['method'] == 'POST']
options = [e for e in archive if e['request']['method'] == 'OPTIONS']
assert len(posts) == len(options) == 2
for e in posts:
    assert e['response']['status'] == 0
    assert e['response']['_error'] == 'net::ERR_FAILED'
    assert not e['response']['content'].get('text')
    assert any(f['url'].startswith('chrome-extension://kiahlcbejlgmnbmcggnhagbccojnbkaa/')
               for f in e['_initiator']['stack']['callFrames'])
for e in options:
    assert e['response']['status'] == 200
    headers = {h['name'].lower(): h['value'] for h in e['response']['headers']}
    assert 'access-control-allow-origin' not in headers
    assert 'POST' in headers['access-control-allow-methods']
for e in entries:
    assert not any(m in e['request']['url'] for m in ['ExecuteTransaction', 'SimulateTransaction'])
out = logs / '20261010-C204-site-revocation-audit-01.json'
result = dict(passed=True, observedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),
              actualSiteAccessWithheld=True, actualUiHttpsRejected=True,
              rejectionMechanism='Chrome CORS preflight rejected after host access withholding',
              blockedPostRequests=len(posts), preflightWithoutAllowOrigin=len(options),
              workerRevocationNetworkAccepted=False, permissionRestored=False,
              parentCompletion=False,
              inputsSha256={str(p): hashlib.sha256(p.read_bytes()).hexdigest()
                            for p in [Path(__file__).resolve(), source]})
with out.open('x') as f:
    json.dump(result, f, indent=2)
    f.write('\n')
out.chmod(0o600)
print(json.dumps(dict(passed=True, actualUiHttpsRejected=True, blockedPostRequests=len(posts))))
