#!/usr/bin/env python3
# Copyright (c) LinkU Labs, Inc.
# SPDX-License-Identifier: Apache-2.0
"""Preserve prior artifacts and build with an explicitly reviewed Local registry."""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess


def source_hash(wallet):
    rows = {}
    for root in (wallet / 'src', wallet / 'configs', wallet.parent / 'core/src',
                 wallet.parent.parent / 'rtd-ts-sdk/packages/typescript/src'):
        for path in root.rglob('*'):
            if path.is_file():
                rows[str(path.relative_to(wallet.parent.parent))] = hashlib.sha256(path.read_bytes()).hexdigest()
    for path in (wallet / 'package.json', wallet / 'webpack.config.ts', wallet.parent / 'pnpm-lock.yaml'):
        rows[str(path.relative_to(wallet.parent.parent))] = hashlib.sha256(path.read_bytes()).hexdigest()
    return hashlib.sha256(json.dumps(rows, sort_keys=True).encode()).hexdigest(), len(rows)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--profile', type=Path, required=True)
    parser.add_argument('--previous-artifacts', type=Path, required=True)
    parser.add_argument('--output-prefix', type=Path, required=True)
    args = parser.parse_args()
    wallet = Path(__file__).resolve().parents[1]
    profile_raw = args.profile.read_bytes()
    profile = json.loads(profile_raw)
    if profile.get('id') != 'certified-wallet-dev' or profile.get('expectedGenesisDigest') != '3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj':
        raise ValueError('Reviewed original development chain required')
    log = args.output_prefix.with_suffix('.log')
    proof_file = args.output_prefix.with_suffix('.json')
    if args.previous_artifacts.exists() or log.exists() or proof_file.exists():
        raise ValueError('Fresh artifact backup and evidence required')
    env = {key: os.environ[key] for key in ('PATH', 'HOME', 'TMPDIR') if key in os.environ}
    env.update(NODE_ENV='development', API_ENV='local',
               TS_NODE_PROJECT='./configs/ts/tsconfig.webpack.json',
               WALLET_NETWORK_PROFILES=json.dumps({'local': profile}, separators=(',', ':')))
    validation = subprocess.run(['pnpm', 'exec', 'tsx', '-e',
        "import { validateNetworkProfile } from './src/shared/rpc/profile'; validateNetworkProfile(JSON.parse(process.env.WALLET_NETWORK_PROFILES!).local, {requireComplete:true});"],
        env=env, cwd=wallet, capture_output=True, text=True, timeout=60)
    if validation.returncode:
        raise ValueError('Current complete profile validation failed')
    before, count = source_hash(wallet)
    shutil.copytree(wallet / 'dist', args.previous_artifacts)
    with log.open('x') as stream:
        log.chmod(0o600)
        result = subprocess.run(['pnpm', 'exec', 'webpack', '--mode', 'development'],
            cwd=wallet, env=env, stdout=stream, stderr=subprocess.STDOUT, timeout=1200)
    after, _ = source_hash(wallet)
    proof = {'observedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'mode': 'development', 'buildExitCode': result.returncode,
        'sourceUnchanged': before == after, 'sourceSha256': before, 'sourceFiles': count,
        'profileSha256': hashlib.sha256(profile_raw).hexdigest(),
        'previousArtifactsPreserved': str(args.previous_artifacts),
        'scope': 'Explicit Local artifact build and AST profile equality; no native restart or transaction'}
    if result.returncode == 0 and before == after and args.profile.read_bytes() == profile_raw:
        verified = subprocess.run(['node', 'scripts/lib/verify-extension-local-profile.cjs', 'dist', str(args.profile)],
            cwd=wallet, capture_output=True, text=True, timeout=60)
        proof['compiledProfileExitCode'] = verified.returncode
        if verified.returncode == 0:
            proof['compiledProfile'] = json.loads(verified.stdout)
    proof['passed'] = result.returncode == 0 and before == after and proof.get('compiledProfileExitCode') == 0
    with proof_file.open('x') as stream:
        stream.write(json.dumps(proof, indent=2) + '\n')
    proof_file.chmod(0o600)
    print(json.dumps(proof))
    if not proof['passed']:
        raise SystemExit(1)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(json.dumps({'passed': False, 'errorType': type(error).__name__}))
        raise SystemExit(1)
