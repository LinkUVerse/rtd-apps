#!/usr/bin/env python3
"""Qualify only the validator-choice fix and its transaction boundaries, then build."""
from pathlib import Path
import concurrent.futures
import datetime
import hashlib
import json
import os
import subprocess

W = Path(__file__).resolve().parents[1]
L = W / 'migrationToGRpcOrGraphQLDoc/workLog'
old = json.loads((L / '20261012-default-generation-positive-C292-build-01.json').read_text())
env = {k: os.environ[k] for k in ('PATH', 'HOME', 'TMPDIR') if k in os.environ}
out = Path.home() / '.local/state/rtd-wallet-migration/dev-20261006-03/certified-positive-production-C362-20261012-01'
profile = Path.home() / '.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C46-isolated-browser-gateway-20261007-01/profile.json'
assert hashlib.sha256(profile.read_bytes()).hexdigest() == old['profileSha256']
source = json.loads(subprocess.check_output(['node', '-e', "console.log(JSON.stringify(require('./scripts/build-reviewed-generation-production-extension.cjs').productSource()))"], cwd=W, env=env))
test_json = L / '20261012-C362-tests-01.json'
checks = [
    ('rpc-types', ['pnpm', 'exec', 'tsc', '--noEmit', '-p', 'configs/ts/tsconfig.rpc.json']),
    ('production-types', ['pnpm', 'exec', 'tsc', '--noEmit', '-p', 'configs/ts/tsconfig.prod.json']),
    ('tests', ['pnpm', 'exec', 'vitest', 'run', 'src/ui/app/staking',
        'src/shared/rpc/staking-', 'src/shared/rpc/execution-coordinator.test.ts',
        'src/shared/rpc/prepared-wire.test.ts', 'src/ui/app/hooks/usePreparedTransaction.test.ts',
        '--reporter=json', '--outputFile=' + str(test_json)])]

def run(check):
    name, argv = check
    p = L / ('20261012-C362-' + name + '-01.log')
    with p.open('x') as f:
        p.chmod(0o600)
        r = subprocess.run(argv, cwd=W, env=env, stdout=f, stderr=subprocess.STDOUT)
    row = {'label': name, 'argv': argv, 'exitCode': r.returncode, 'log': str(p)}
    print(json.dumps({'label': name, 'exitCode': r.returncode}), flush=True)
    return row

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    rows = list(pool.map(run, checks))
if all(x['exitCode'] == 0 for x in rows):
    rows.append(run(('build', ['node', '--max-old-space-size=12288', 'scripts/build-reviewed-generation-production-extension.cjs',
        str(out), str(profile), str(L / '20261012-default-generation-positive-C362-build-01.json'),
        old['reviewedRelease']['registryFile'], old['reviewedRelease']['reviewFile']])))
if all(x['exitCode'] == 0 for x in rows):
    rows.append(run(('closure', ['node', 'scripts/audit-generation-production-extension.cjs', str(out),
        str(L / '20261012-default-generation-positive-C362-build-01.json'),
        str(L / '20261012-default-generation-positive-C362-closure-01.json')])))
after = json.loads(subprocess.check_output(['node', '-e', "console.log(JSON.stringify(require('./scripts/build-reviewed-generation-production-extension.cjs').productSource()))"], cwd=W, env=env))
tests = json.loads(test_json.read_text())
proof = {'passed': all(x['exitCode'] == 0 for x in rows) and source == after,
    'source': source, 'sourceUnchanged': source == after,
    'targetedTests': tests['numPassedTests'], 'testFailures': tests['numFailedTests'],
    'typechecks': 2, 'checks': rows, 'observedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'inputsSha256': {str(p): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in [Path(__file__), test_json, *(Path(x['log']) for x in rows)]}}
with (L / '20261012-C362-checks-01.json').open('x') as f:
    json.dump(proof, f, indent=2); f.write('\n')
print(json.dumps({'passed': proof['passed'], 'tests': proof['targetedTests'], 'source': source}), flush=True)
raise SystemExit(0 if proof['passed'] else 1)
