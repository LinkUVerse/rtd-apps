#!/usr/bin/env python3
# coding: utf-8
# Copyright (c) LinkU Labs, Inc.
# SPDX-License-Identifier: Apache-2.0
"""Read the original contract-managed bounded replay; never launch, resume or reset."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    output = parser.parse_args().output.resolve()
    wallet = Path(__file__).resolve().parents[1]
    if output.parent != wallet / 'migrationToGRpcOrGraphQLDoc/workLog' or output.exists():
        raise ValueError('Fresh owned evidence file required')
    base = wallet.parent.parent
    runtime = Path.home() / '.local/state/rtd-wallet-migration/dev-20261003-01'
    foundation = runtime / 'publication-foundation'
    sys.path.insert(0, str(base / 'link-u-smart-contract/all-in-one-deploy/localDeploy'))
    import run_wallet_display_history_replay as replay
    args = argparse.Namespace(source=base / 'rtd', archive=base / 'rtd-archive-service', runtime=runtime,
        revision=foundation / 'display-history-replay-20261005-01',
        provenance=foundation / 'display-debug-install-20261005-01/installed-provenance.json',
        tests=wallet / 'migrationToGRpcOrGraphQLDoc/workLog/20261005-display-indexer-current-test-01.json',
        expected_h0='3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj', action='status')
    try:
        workspace, revision, plan, _ = replay.inspect(args)
        state = replay.run(args)
        snapshot = replay.snapshot(workspace, plan)
        before = json.loads((revision / 'before-replay.json').read_text())
        if snapshot['originalWatermarks'] != before['originalWatermarks']:
            raise ValueError('Original watermarks changed')
        result = {'passed': True, 'observedAt': snapshot['observedAt'],
            'latestDebugProvenanceVerified': True, 'originalWatermarksCount': len(snapshot['originalWatermarks']),
            'originalWatermarksUnchanged': True, 'readOnlyTls': snapshot['readOnlyTls'],
            'pid': state['pid'], 'running': state['running'], 'through': state['through'],
            'boundedExitCode': state['boundedExitCode'], 'coverage': snapshot['coverage'],
            'scope': 'Contract inspect/status and strict marker prefix; latest source/eight debug binaries and original watermarks checked. No restart/resume/reset.'}
    except Exception as error:
        result = {'passed': False, 'observedAt': datetime.now(timezone.utc).isoformat(),
            'errorType': type(error).__name__, 'scope': 'Strict contract readonly audit; no mutations'}
    with output.open('x') as stream:
        stream.write(json.dumps(result, indent=2) + '\n')
    output.chmod(0o600)
    print(json.dumps({k: v for k, v in result.items() if k != 'coverage'}))
    if not result['passed']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
