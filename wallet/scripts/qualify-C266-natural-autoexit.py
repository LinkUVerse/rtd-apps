#!/usr/bin/env python3
"""Qualify the actual bounded natural exit of the isolated C266 proxy."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import socket
import subprocess
import sys

W = Path(__file__).resolve().parents[1]
L = W / 'migrationToGRpcOrGraphQLDoc/workLog'
LD = W.parents[1] / 'link-u-smart-contract/all-in-one-deploy/localDeploy'
OP = Path.home() / '.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C266-natural-autoexit-20261011-01'
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def date(s): return datetime.fromisoformat(s.replace('Z', '+00:00'))
output = Path(sys.argv[1]).resolve()
assert output.parent == L and not output.exists()
plan = json.loads((OP / 'qualification-plan.json').read_text())
proc = json.loads((OP / 'process.json').read_text())
source = LD / 'serve_wallet_C266_graphql_autoexit.cjs'
original = LD / 'serve_wallet_C266_graphql_delay.cjs'
assert sha(source) == proc['sourceSha256'] == plan['candidateSourceSha256']
assert sha(original) == plan['originalSourceSha256']
assert source.read_text() == original.read_text().replace('C266-network-late-read-20261011-01', 'C266-natural-autoexit-20261011-01')
assert proc['pid'] == 18752 and proc['maximumSeconds'] == 1800
events = [json.loads(x) for x in (OP / 'events.jsonl').read_text().splitlines()]
assert [e['event'] for e in events] == ['listening', 'preflight', 'stopping', 'stopped']
assert events[2]['reason'] == events[3]['reason'] == '1800-second-budget'
elapsed = (date(events[3]['at']) - date(proc['startedAt'])).total_seconds()
assert 1800 <= elapsed < 1802
assert events[2]['requests'] == 1 and events[2]['held'] == 0
process = subprocess.run(['ps', '-p', str(proc['pid']), '-o', 'pid=,lstart=,command='], text=True, capture_output=True)
assert process.returncode == 1 and not process.stdout.strip()
with socket.socket() as sock:
    sock.settimeout(2)
    assert sock.connect_ex(('127.0.0.1', 42970)) != 0
paths = [Path(__file__), source, original, OP / 'qualification-plan.json', OP / 'process.json', OP / 'events.jsonl']
proof = dict(passed=True, observedAt=datetime.now(timezone.utc).isoformat(),
    actualNatural1800SecondExitObserved=True, elapsedSeconds=elapsed, actualTerminationSignals=0,
    processAbsent=True, port42970Closed=True, shutdownLogicIdentical=True,
    scope='Isolated listener naturally exited at budget; original C266 real-UI proxy was cleaned early. No in-flight request at this natural exit.',
    activeRequestNaturalExitTested=False, productionRoutesChanged=False, parentCompletion=False,
    inputsSha256={str(p): sha(p) for p in paths})
with output.open('x') as f:
    json.dump(proof, f, ensure_ascii=False, indent=2); f.write('\n')
print(json.dumps({k: v for k, v in proof.items() if k != 'inputsSha256'}, ensure_ascii=False))
