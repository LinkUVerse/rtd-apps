#!/usr/bin/env python3
"""Read-only, allowlisted operational projection; never publish raw commands or logs."""
import argparse
from datetime import datetime, timezone
import hashlib
import importlib
import json
from pathlib import Path
import re
import sys


PUBLIC_ENDPOINTS = {
    'fullnodeGrpcWeb': 'http://127.0.0.1:39400',
    'graphqlUrl': 'https://127.0.0.1:39600/graphql',
    'archiveGrpcWeb': 'https://127.0.0.1:39603/archive',
    'accountHistoryUrl': 'https://127.0.0.1:39606/account/graphql',
}
LIMIT_FIELDS = ('maxQueryDepth', 'maxQueryNodes', 'maxOutputNodes', 'maxQueryPayloadSize')


def safe_endpoints(value):
    if not isinstance(value, dict) or value != PUBLIC_ENDPOINTS:
        raise ValueError('Exact reviewed public endpoints required')
    return dict(PUBLIC_ENDPOINTS)


def safe_service_limits(value):
    if not isinstance(value, dict) or any(type(value.get(k)) is not int or not 0 <= value[k] <= 2147483647 for k in LIMIT_FIELDS):
        raise ValueError('Four typed public service limits required')
    # Ignore every unrequested field; never copy the whole remote dictionary.
    return {k: value[k] for k in LIMIT_FIELDS}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    assert not args.output.exists(), 'Fresh manifest required'
    wallet = Path(__file__).resolve().parents[1]
    root = wallet.parents[1]
    runtime = Path('/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261003-01')
    foundation = runtime / 'publication-foundation'
    sys.path[:0] = [str(root / 'link-u-smart-contract/all-in-one-deploy/localDeploy'), str(root / 'rtd-archive-service/localDeploy'), str(root / 'rtd-archive-service/modules/publication-fence')]
    from resume_wallet_reallocated_indexer import inspect
    _, _, _, _, sql_state, live = inspect(argparse.Namespace(source=root / 'rtd', archive=root / 'rtd-archive-service', runtime=runtime))
    assert sql_state == 'owned-running'
    sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
    read = lambda p: json.loads(Path(p).read_text())
    profile_file = runtime / 'wallet-profile-20261004-03/profile.json'
    profile = read(profile_file)
    assert profile['expectedGenesisDigest'] == '3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj' and profile['generation'] == runtime.name
    assert profile['revision'] == 2 and sha(profile_file) == read(wallet / 'migrationToGRpcOrGraphQLDoc/workLog/20261006-message-budget-build-01.json')['profileSha256']
    endpoints = safe_endpoints(profile['endpoints'])
    installed = read(foundation / 'message-budget-debug-install-20261006-01/installed-provenance.json')
    from build_wallet_query_revision import TARGETS
    assert set(installed['binaries']) == {binary for _, binary in TARGETS}
    assert re.fullmatch(r'[a-f0-9]{40}', installed['sourceHead']) and re.fullmatch(r'[a-f0-9]{64}', installed['sourceDiffSha256'])
    assert all(re.fullmatch(r'[a-f0-9]{64}', digest) for digest in installed['binaries'].values())
    config_file = wallet / 'migrationToGRpcOrGraphQLDoc/workLog/20261006-REL-04-public-service-config-01.json'
    config = read(config_file)
    assert config['status'] == 200 and config['data']['chainIdentifier'] == profile['expectedGenesisDigest'] and not config.get('errors')
    components = ['native-live-source', 'native-checkpoint-adapter', 'native-kv-stack/writer', 'native-kv-stack/ledger',
                  'native-query-stack/indexer', 'native-query-stack/consistent', 'native-query-stack/graphql',
                  'native-query-admission/listener', 'native-account-workers/token', 'native-account-workers/capability', 'native-account-api']
    processes = []
    for component in components:
        directory = foundation / component
        assert not directory.is_symlink()
        record, intent = read(directory / 'process.json'), read(directory / 'launch-intent.json')
        assert record['command'] == intent['command'] and live.process_identity(record['pid']) == record['processIdentity']
        processes.append({'role': component, 'pid': record['pid'], 'ownedCommandMatched': True, 'processRecordSha256': sha(directory / 'process.json')})
    schemas = {
        'graphql': root / 'rtd/crates/rtd-indexer-alt-graphql/schema.graphql',
        'accountHistory': root / 'rtd-archive-service/modules/account-activity/schema.graphql',
    }
    proof = {
        'passed': True, 'observedAt': datetime.now(timezone.utc).isoformat(),
        'expectedGenesisDigest': profile['expectedGenesisDigest'], 'generation': profile['generation'], 'profileRevision': profile['revision'],
        'captureLauncherSha256': sha(Path(__file__)), 'profileSha256': sha(profile_file), 'endpoints': endpoints,
        'sourceHead': installed['sourceHead'], 'sourceDiffSha256': installed['sourceDiffSha256'],
        'installedDebugBinariesSha256': installed['binaries'],
        'schemaSourcesSha256': {k: sha(p) for k, p in schemas.items()},
        'publicServiceConfig': safe_service_limits(config['data']['serviceConfig']), 'publicServiceConfigEvidenceSha256': sha(config_file),
        'nativeProcesses': processes,
        'adapterGlobalPermits': 6, 'consumerAllocation': {'indexer': 4, 'consistent': 1, 'writer': 1},
        'normalChromeCaVerified': False, 'reviewedReleaseAuthorityVerified': False, 'trialReady': False,
        'signals': 0, 'configChanges': 0, 'watermarkChanges': 0, 'simulations': 0, 'executions': 0,
        'scope': 'Current debug/SDL source hashes, public observed GraphQL configuration and owned processes only. No schema-source hash as deployment attestation, readiness inferred from PID, final release, common business snapshot or normal Chrome trust claim.',
    }
    with args.output.open('x') as stream: json.dump(proof, stream, indent=2); stream.write('\n')
    args.output.chmod(0o600)
    print(json.dumps({'passed': True, 'ownedProcesses': len(processes), 'sourceHead': installed['sourceHead'], 'signals': 0, 'trialReady': False}))


if __name__ == '__main__':
    try: main()
    except Exception as error:
        print(json.dumps({'passed': False, 'errorType': type(error).__name__}))
        raise SystemExit(1)
