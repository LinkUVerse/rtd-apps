#!/usr/bin/env python3
"""Audit wallet provider wiring and legacy Kit reachability in built source maps."""
import hashlib
import json
from pathlib import Path
import re
root = Path(__file__).resolve().parents[1]
package = json.loads((root / 'package.json').read_text())
assert 'rtd-dapp-kit' not in package.get('dependencies', {})
lock = (root.parent / 'pnpm-lock.yaml').read_text()
wallet_importer = lock.split('\n  wallet:\n', 1)[1].split('\npackages:\n', 1)[0]
assert '\n      rtd-dapp-kit:' not in wallet_importer
legacy = re.compile(r'\b(?:useRtdClient|useRtdClientQuery|RtdClientProvider|KioskClientProvider)\b|[\'\"]rtd-dapp-kit(?:/|[\'\"])')
source_hits = []
for file in (root / 'src').rglob('*'):
    if file.suffix not in ('.ts', '.tsx') or '.test.' in file.name:
        continue
    if legacy.search(file.read_text()):
        source_hits.append(str(file.relative_to(root)))
assert not source_hits, source_hits
ui = (root / 'src/ui/index.tsx').read_text()
assert '<WalletQuerySurface selection={selection}>' in ui
surface = ui.split('function WalletQuerySurface(', 1)[1].split('\nfunction AppWrapper(', 1)[0]
assert re.search(r'<WalletRpcProvider\s+selection=\{selection\}\s+observeReadContracts=\{shouldObserveReadCapabilities\(', surface)
assert 'useLocation()' in surface and 'state.app.appType === AppType.popup' in surface
assert '</WalletRpcProvider>' in surface
assert '<WalletProvider' not in ui
# All UI signing must enter an authorized transaction or PersonalMessage operation.
assert 'public signData(' not in (root / 'src/ui/app/background-client/index.ts').read_text()
assert 'signDataResponse' not in (root / 'src/shared/messaging/messages/payloads/MethodPayload.ts').read_text()
assert 'account.signData(' not in (root / 'src/background/accounts/index.ts').read_text()
entries = []
requester = re.compile(r'\b(?:new\s+(?:RtdClient|SuiClient)\s*\(|useRtdClient(?:Query|Mutation)?\s*\(|(?:executeTransactionBlock|dryRunTransactionBlock|devInspectTransactionBlock|queryTransactionBlocks)\s*\()')
legacy_module = re.compile(r'/(?:rtd-dapp-kit|@mysten/dapp-kit)(?:/|@)|/(?:jsonRpc|json-rpc-client)/')
for name in ['ui', 'background', 'content-script', 'dapp-interface']:
    file = root / 'dist' / (name + '.js.map')
    data = json.loads(file.read_text())
    assert len(data['sources']) == len(data['sourcesContent'])
    hits = [s for s in data['sources'] if legacy_module.search(s)]
    assert not hits, hits
    calls = [s for s, content in zip(data['sources'], data['sourcesContent']) if content and requester.search(content)]
    assert not calls, calls
    raw_signing = [s for s, content in zip(data['sources'], data['sourcesContent'])
                   if content and re.search(r'method\s*:\s*[\'\"]signData[\'\"]', content)]
    assert not raw_signing, raw_signing
    core = sorted(s.split('/core/src/', 1)[1] for s in data['sources'] if '/core/src/' in s)
    assert not any('ExplorerRpcContext' in source for source in core), core
    entries.append({'entry': name, 'sourceCount': len(data['sources']), 'legacyKitModules': hits,
                    'legacyRequesterCalls': calls, 'rawSigningMessages': raw_signing, 'reachableSharedCoreModules': core,
                    'javascriptSha256': hashlib.sha256((root / 'dist' / (name + '.js')).read_bytes()).hexdigest(),
                    'mapSha256': hashlib.sha256(file.read_bytes()).hexdigest()})
record = {'passed': True, 'scope': 'Wallet provider and four emitted source-map graphs: legacy Kit/requester patterns and reachable shared core inventory. Pattern scan is not a proof against dynamically constructed requests, a fresh build, dynamic traffic, clean install or other applications.',
          'sourceHits': source_hits, 'walletDependencyRemoved': True, 'walletLockImporterRemoved': True,
          'entries': entries, 'packageSha256': hashlib.sha256((root / 'package.json').read_bytes()).hexdigest()}
print(json.dumps(record, indent=2))
