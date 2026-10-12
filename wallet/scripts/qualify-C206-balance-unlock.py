"""Audit the limited UI change against the previously installed source identity."""
from pathlib import Path
import json, hashlib, datetime

W = Path(__file__).resolve().parent.parent
R = W.parent.parent
L = W / 'migrationToGRpcOrGraphQLDoc/workLog'
read = lambda p: json.loads(p.read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
old_file = L / '20261010-default-generation-positive-C201-build-01.json'
build_file = L / '20261010-default-generation-positive-C206-build-01.json'
closure_file = L / '20261010-default-generation-positive-C206-closure-01.json'
old, build, closure = map(read, [old_file, build_file, closure_file])
rows = {}
for root in [W/'src', W/'configs', R/'rtd-apps/core/src', R/'rtd-ts-sdk/packages/typescript/src']:
    for p in root.rglob('*'):
        if p.is_file(): rows[str(p.relative_to(R))] = sha(p)
for p in [W/'package.json', W/'webpack.config.ts', R/'rtd-apps/pnpm-lock.yaml']:
    rows[str(p.relative_to(R))] = sha(p)
identity = lambda data: {'sha256': hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest(), 'files': len(data)}
current = identity(rows)
original = dict(rows)
ui = 'rtd-apps/wallet/src/ui/app/pages/home/tokens/TokensDetails.tsx'
test = 'rtd-apps/wallet/src/ui/app/pages/home/tokens/TokensDetails.test.ts'
original[ui] = sha(L/'20261010-C206-TokensDetails-before.txt')
del original[test]
assert identity(original) == old['sourceAfter']
before = (L/'20261010-C206-TokensDetails-before.txt').read_text()
after = (R/ui).read_text()
start = after.index('  // Unlocking is local.')
end = after.index('  if (balancesReadBlocked)', start)
assert after[:start] + after[end:] == before
assert old['passed'] and build['passed'] and closure['passed']
assert build['sourceBefore'] == build['sourceAfter'] == closure['source'] == current
for f, digest in closure['inputsSha256'].items(): assert sha(Path(f)) == digest
oldmap = read(Path(old['output'])/'background.js.map')
newmap = read(Path(build['output'])/'background.js.map')
assert dict(zip(oldmap['sources'], oldmap['sourcesContent'])) == dict(zip(newmap['sources'], newmap['sourcesContent']))
assert read(Path(old['output'])/'manifest.json') == read(Path(build['output'])/'manifest.json')
assert old['profileSha256'] == build['profileSha256']
assert old['reviewedRelease']['registrySha256'] == build['reviewedRelease']['registrySha256']
checks = [L/f'20261010-C206-{name}-01.log' for name in ['production-typecheck','rpc-typecheck','balance-regression']]
assert checks[0].read_text() == checks[1].read_text() == ''
assert 'Tests  48 passed (48)' in checks[2].read_text()
inputs = [Path(__file__), old_file, build_file, closure_file, L/'20261010-C206-TokensDetails-before.txt', R/ui, R/test, *checks]
result = {'passed': True, 'observedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'currentSource': current, 'originalSource': identity(original),
    'productionFilesChanged': [ui], 'addedTests': [test],
    'exactLockedUiInsertionInverseAccepted': True,
    'backgroundSourceMapModuleSetAndContentsUnchanged': True,
    'profileRegistryAndManifestUnchanged': True,
    'regressionTestsPassed': 48, 'ordinaryBrowserFixAccepted': False,
    'inputsSha256': {str(p): sha(p) for p in inputs}}
out = L/'20261010-C206-source-and-checks-01.json'
with out.open('x') as stream:
    json.dump(result, stream, indent=2); stream.write('\n')
print(json.dumps({'passed': True, 'currentSource': current, 'productionFilesChanged': [ui]}))
