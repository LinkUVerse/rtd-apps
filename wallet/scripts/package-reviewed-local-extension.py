#!/usr/bin/env python3
# Copyright (c) LinkU Labs, Inc.
# SPDX-License-Identifier: Apache-2.0
"""Package audited compiler output; preserves the current development extension and wallet data."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import zipfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('build-proof', 'audit-proof', 'chrome-proof', 'output-dir', 'zip', 'proof'):
        parser.add_argument('--' + name, type=Path, required=True)
    args = parser.parse_args()
    wallet = Path(__file__).resolve().parents[1]
    runtime = Path.home() / '.local/state/rtd-wallet-migration/dev-20261003-01'
    output, archive = args.output_dir.absolute(), args.zip.absolute()
    assert output.parent == runtime and output.name.startswith('trial-package-')
    assert archive.parent == runtime and archive.suffix == '.zip'
    assert not output.exists() and not archive.exists() and not args.proof.exists()
    sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
    read = lambda p: json.loads(Path(p).read_text())
    build, audit, chrome = map(read, (args.build_proof, args.audit_proof, args.chrome_proof))
    assert build['passed'] and build['sourceUnchanged'] and build['currentDevelopmentDistUnchanged']
    assert build['reviewedRelease']['inputsUnchanged'] and build['reviewedRelease']['compiled']['passed']
    assert audit['passed'] and audit['inputsUnchanged'] and audit['source'] == build['sourceAfter']
    assert audit['inputsSha256'][str(args.build_proof.resolve())] == sha(args.build_proof)
    assert chrome['passed'] and chrome['certificateMode'] == 'normal-ca'
    assert chrome['uiSource']['matchesDisk'] and chrome['workerSource']['matchesDisk']
    assert chrome['externalRequests'] == chrome['forbiddenRequests'] == chrome['pageErrorCount'] == 0
    source = Path(build['output'])
    assert source.parent == runtime and not source.is_symlink()
    spec = importlib.util.spec_from_file_location('builder', wallet / 'scripts/build-reviewed-local-extension.py')
    builder = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(builder)
    source_sha, source_count = builder.source_hash(wallet)
    assert {'sha256': source_sha, 'files': source_count} == build['sourceAfter']
    for name, digest in build['artifacts'].items():
        assert not (source / name).is_symlink() and sha(source / name) == digest
    assert chrome['workerSource']['workerSha256'] == build['artifacts']['background.js']
    for row in chrome['uiSource']['loadedBundles']:
        assert row['matchesDisk'] and row['loadedSha256'] == build['artifacts'][row['file']]
    members = {name: digest for name, digest in build['artifacts'].items() if name != 'compilation-graph.json' and not name.endswith('.map')}
    for name in members:
        assert not Path(name).is_absolute() and '..' not in Path(name).parts
    assert {'manifest.json', 'ui.html', 'ui.js', 'background.js'} <= set(members)
    manifest = read(source / 'manifest.json')
    assert manifest['manifest_version'] == 3 and manifest['background']['service_worker'] == 'background.js'
    output.mkdir(mode=0o700)
    for name, digest in sorted(members.items()):
        target = output / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source / name, target)
        assert sha(target) == digest
    with zipfile.ZipFile(archive, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=8) as stream:
        for name in sorted(members):
            info = zipfile.ZipInfo(name, date_time=(2026, 10, 6, 0, 0, 0))
            info.create_system = 3
            info.external_attr = (0o100644 << 16)
            info.compress_type = zipfile.ZIP_DEFLATED
            stream.writestr(info, (output / name).read_bytes(), compresslevel=8)
    with zipfile.ZipFile(archive) as stream:
        assert stream.testzip() is None and stream.namelist() == sorted(members)
        for name, digest in members.items():
            assert hashlib.sha256(stream.read(name)).hexdigest() == digest
    for name, digest in build['artifacts'].items():
        assert sha(source / name) == digest
    assert builder.source_hash(wallet) == (source_sha, source_count)
    proof = {'passed': True, 'scope': 'Audited loadable candidate packaging only; final unpacked Chrome verification remains required',
             'output': str(output), 'zip': str(archive), 'zipSha256': sha(archive), 'zipBytes': archive.stat().st_size,
             'source': build['sourceAfter'], 'buildProofSha256': sha(args.build_proof), 'auditProofSha256': sha(args.audit_proof),
             'chromeProofSha256': sha(args.chrome_proof), 'members': members, 'memberCount': len(members),
             'excludedAuditFiles': sorted(set(build['artifacts']) - set(members)),
             'sourceArtifactsUnchanged': True, 'currentDevelopmentDistChanged': False,
             'normalChromeHttpsAccepted': chrome['networkIdentityAccepted'], 'trialReady': False,
             'simulations': 0, 'signatures': 0, 'executions': 0}
    args.proof.open('x').write(json.dumps(proof, indent=2) + '\n')
    print(json.dumps({k: proof[k] for k in ('passed', 'memberCount', 'zipBytes', 'zipSha256', 'trialReady')}))


if __name__ == '__main__':
    main()
