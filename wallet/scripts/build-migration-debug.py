#!/usr/bin/env python3
# Copyright (c) LinkU Labs, Inc.
# SPDX-License-Identifier: Apache-2.0

"""Build the user's current RTD source in dev profile and preserve provenance."""
import hashlib
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

wallet = Path(__file__).resolve().parents[1]
source = wallet.parents[1] / 'rtd'
docs = wallet / 'migrationToGRpcOrGraphQLDoc'
evidence = docs / 'evidence' / '20261003-rtd-debug-build.json'
log_path = docs / 'workLog' / '20261003-rtd-debug-build.log'


def git(*args):
    return subprocess.check_output(['git', *args], cwd=source)


def sha(path):
    digest = hashlib.sha256()
    with path.open('rb') as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def source_state():
    paths = set(git('diff', '--name-only', '-z', 'HEAD').decode().split('\0'))
    paths.update(git('ls-files', '--others', '--exclude-standard', '-z').decode().split('\0'))
    return {
        'head': git('rev-parse', 'HEAD').decode().strip(),
        'diffSha256': hashlib.sha256(git('diff', '--binary', 'HEAD')).hexdigest(),
        'changedFiles': {path: sha(source / path) if (source / path).is_file() else None for path in sorted(paths) if path},
    }


before = source_state()
command = ['cargo', 'build', '--locked', '-j', '4', '-p', 'rtd', '--bin', 'rtd', '-p', 'rtd-node', '--bin', 'rtd-node']
record = {
    'source': str(source), 'sourceBefore': before,
    'command': command, 'profile': 'dev',
    'startedAt': datetime.now(timezone.utc).isoformat(),
    'status': 'running', 'log': str(log_path),
    'runtimeStarted': False, 'contractsDeployed': False,
}
evidence.write_text(json.dumps(record, indent=2) + '\n')
print('Building current RTD source with dev profile; provenance and log saved.', flush=True)
with log_path.open('w') as output:
    result = subprocess.run(command, cwd=source, stdout=output, stderr=subprocess.STDOUT)
record.update({
    'finishedAt': datetime.now(timezone.utc).isoformat(),
    'exitCode': result.returncode, 'sourceAfter': source_state(),
})
record['sourceUnchangedDuringBuild'] = before == record['sourceAfter']
record['status'] = 'passed' if result.returncode == 0 and record['sourceUnchangedDuringBuild'] else 'failed'
record['binaries'] = {
    name: {'path': str(path), 'sha256': sha(path), 'size': path.stat().st_size}
    for name in ['rtd', 'rtd-node']
    if result.returncode == 0 and (path := source / 'target' / 'debug' / name).is_file()
}
if len(record['binaries']) != 2 and record['status'] == 'passed':
    record['status'] = 'failed'
evidence.write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps({'status': record['status'], 'exitCode': result.returncode, 'sourceUnchangedDuringBuild': record['sourceUnchangedDuringBuild']}), flush=True)
raise SystemExit(0 if record['status'] == 'passed' else 1)
