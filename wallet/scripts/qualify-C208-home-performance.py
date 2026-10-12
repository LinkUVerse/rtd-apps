"""Audit C208 compiled source changes and verification; no UI acceptance claim."""
from pathlib import Path
import datetime
import hashlib
import json
import subprocess

W = Path(__file__).resolve().parent.parent
L = W / 'migrationToGRpcOrGraphQLDoc/workLog'
read = lambda p: json.loads(p.read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
old_file = L / '20261010-default-generation-positive-C207-build-02.json'
new_file = L / '20261010-default-generation-positive-C208-build-01.json'
closure_file = L / '20261010-default-generation-positive-C208-closure-01.json'
old, new, closure = map(read, [old_file, new_file, closure_file])
assert old['passed'] and new['passed'] and closure['passed']
source = json.loads(subprocess.check_output([
    'node', '-e', 'console.log(JSON.stringify(require("./scripts/build-reviewed-generation-production-extension.cjs").productSource()))'
], cwd=W, text=True))
assert source == new['sourceBefore'] == new['sourceAfter'] == closure['source']
for f, digest in closure['inputsSha256'].items():
    assert sha(Path(f)) == digest

def modules(directory):
    result = {}
    for path in directory.glob('*.js.map'):
        data = read(path)
        for name, content in zip(data['sources'], data['sourcesContent']):
            # Runtime bootstrap is compiler-generated; all application and dependency sources stay in scope.
            if name.startswith('webpack:///webpack/'):
                continue
            if name in result:
                assert result[name] == content, name
            result[name] = content
    return result

before, after = modules(Path(old['output'])), modules(Path(new['output']))
removed = sorted(before.keys() - after.keys())
assert removed == ["webpack:///./ui/app/pages/home/tokens/TokenIconLink.tsx"]
assert not after.keys() - before.keys()
changed = sorted(k for k in before.keys() & after.keys() if before[k] != after[k])
expected = {
    *('webpack:///./' + p for p in [
        'shared/rpc/read-capability-surface.ts',
        'shared/rpc/WalletRpcProvider.ts', 'ui/index.tsx',
        'ui/app/pages/home/tokens/TokensDetails.tsx',
        'ui/app/i18n/messages/en.ts', 'ui/app/i18n/messages/zh-CN.ts',
    ]),
}
assert set(changed) == expected, changed
old_background = read(Path(old['output']) / 'background.js.map')
new_background = read(Path(new['output']) / 'background.js.map')
assert dict(zip(old_background['sources'], old_background['sourcesContent'])) == dict(zip(new_background['sources'], new_background['sourcesContent']))
assert read(Path(old['output']) / 'manifest.json') == read(Path(new['output']) / 'manifest.json')
assert old['profileSha256'] == new['profileSha256']
assert old['reviewedRelease']['registrySha256'] == new['reviewedRelease']['registrySha256']
checks = [L / f'20261010-C208-{name}.log' for name in [
    'production-typecheck-02', 'rpc-typecheck-02', 'regression-03']]
assert checks[0].read_text() == checks[1].read_text() == ''
assert 'Tests  97 passed (97)' in checks[2].read_text()
inputs = [Path(__file__), old_file, new_file, closure_file, *checks]
result = {
    'passed': True, 'observedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'currentSource': source, 'productionModuleChanges': changed,
    'productionModuleChangesExpected': True, 'removedUnusedModule': removed,
    'backgroundSourceMapModuleSetAndContentsUnchanged': True,
    'profileRegistryAndManifestUnchanged': True, 'regressionTestsPassed': 97,
    'ordinaryBrowserFixAccepted': False,
    'inputsSha256': {str(p): sha(p) for p in inputs},
}
output = L / '20261010-C208-source-and-checks-01.json'
with output.open('x') as stream:
    json.dump(result, stream, indent=2)
    stream.write('\n')
print(json.dumps({'passed': True, 'productionModuleChanges': changed, 'source': source}))
