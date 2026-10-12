#!/usr/bin/env python3
"""Check local Markdown destinations; not semantic, anchor or live acceptance."""
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import unquote, urlsplit
import hashlib
import json
import re

W = Path(__file__).resolve().parents[1]
D = W / 'migrationToGRpcOrGraphQLDoc'
documents = sorted(p for p in D.glob('*.md') if re.match(r'^\d\d-', p.name))
assert len(documents) == 14
documents += [D/'Task.md', D/'totalProgress.md', D/'workLog/current-state.md', D/'workLog/20261011-C256-unconfirmed-execution-blocker.md', D/'workLog/20261011-C257-dapp-authorization-reuse.md', D/'workLog/20261011-C258-current-nft-transfer.md', D/'workLog/20261011-C259-current-dapp-execution.md', D/'workLog/20261011-C260-hidden-assets-preflight.md', D/'workLog/20261011-C261-runtime-and-remaining-blockers.md', D/'workLog/20261011-C262-hidden-assets.md', D/'workLog/20261011-C263-namespace-performance.md']
checked, skipped, errors = [], [], []
for document in documents:
    text = document.read_text()
    for match in re.finditer(r'\]\((<[^>]+>|[^)]+)\)', text):
        target = match[1].strip().strip('<>')
        if target.startswith('#') or re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:', target):
            skipped.append({'document': str(document), 'target': target})
            continue
        raw = unquote(target.split('#', 1)[0])
        line_match = re.search(r':(\d+)$', raw)
        requested_line = int(line_match[1]) if line_match else None
        if line_match:
            raw = raw[:line_match.start()]
        path = (document.parent/raw).resolve()
        record = {'document': str(document), 'sourceLine': text.count('\n', 0, match.start())+1,
                  'target': target, 'resolvedPath': str(path), 'exists': path.exists()}
        if not path.exists():
            errors.append(record)
        elif requested_line is not None:
            record['requestedLine'] = requested_line
            try:
                record['lineCount'] = len(path.read_text().splitlines())
                if not 1 <= requested_line <= record['lineCount']:
                    errors.append(record)
            except (UnicodeError, IsADirectoryError):
                errors.append(record)
        checked.append(record)
tasks = re.findall(r'^- \[([ x])\] `([A-Z]+-[A-Z0-9]+)` (.*)$', (D/'Task.md').read_text(), re.M)
open_ids = [item[1] for item in tasks if item[0] == ' ']
assert len(tasks) == 98 and open_ids == ['QA-A15','QA-A17','QA-A20','REL-02','REL-05']
mapping = D/'workLog/20261011-C255-release-evidence-map.md'
assert all('| '+task+' ' in mapping.read_text() for task in open_ids)
proof = {'passed': not errors, 'observedAt': datetime.now(timezone.utc).isoformat(),
         'scope': '14 primary plans, Task/progress/current-state and C256-C263 logs local destinations plus exact open-parent mapping; no anchor, semantic, runtime or final release acceptance',
         'documents': len(documents), 'localLinks': len(checked), 'skippedRemoteOrAnchor': len(skipped),
         'errors': errors, 'checked': checked, 'openOriginalParents': open_ids,
         'parentCompletion': False,
         'inputsSha256': {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in documents+[mapping, Path(__file__)]}}
output = D/'workLog/20261011-C263-document-links-audit-01.json'
with output.open('x') as stream:
    json.dump(proof, stream, ensure_ascii=False, indent=2)
    stream.write('\n')
print(json.dumps({k: v for k, v in proof.items() if k not in ('inputsSha256','checked')}, ensure_ascii=False))
assert proof['passed']
