#!/usr/bin/env python3
"""Check source preservation, merged chapter coverage, links and task traceability."""
from pathlib import Path
import argparse, hashlib, json, re
from datetime import datetime, timezone

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, required=True,
                    help='Fresh verification report; historical evidence is never overwritten')
args = parser.parse_args()
if args.output.exists():
    raise SystemExit('Fresh verification output required')

docs = Path(__file__).resolve().parents[1]/'migrationToGRpcOrGraphQLDoc'
manifest = json.loads((docs/'evidence/20261003-document-merge-manifest.json').read_text())
errors = []
chapters = sorted(docs.glob('[0-9][0-9]-*.md'))
if [int(p.name[:2]) for p in chapters] != list(range(1,15)):
    errors.append('Chapter numbering must be exactly 01-14')
guide = docs/'14-开发验收包安装与回归说明.md'
guide_proof = json.loads((docs/'workLog/20261006-TRY-07-completion-audit-01.json').read_text())
if (not guide_proof['passed'] or guide_proof['guide'] != guide.name
        or not guide.exists()):
    errors.append('Chapter 14 must be the explicit TRY-07 installation guide')
for entry in manifest['sources']:
    original = docs/entry['preserved']
    if hashlib.sha256(original.read_bytes()).hexdigest() != entry['sha256']:
        errors.append('Preserved source changed: '+str(original))
    if not Path(entry['source']).exists() and '/rtd-archive-service/' in entry['source']:
        errors.append('Original archive directory/file missing: '+entry['source'])
    if entry['merged'] != 'README.md':
        original_sections = re.findall(r'^## .+$',original.read_text(),re.M)
        merged = docs/entry['merged']
        for section in original_sections:
            if section not in merged.read_text(): errors.append('Missing section: '+entry['merged']+' '+section)
for chapter in chapters + [docs/'README.md', docs/'Task.md']:
    for target in re.findall(r'\]\(([^)]+)\)',chapter.read_text()):
        if target.startswith('./') and not (chapter.parent/target.split('#')[0]).exists():
            errors.append('Broken relative link: '+chapter.name+' '+target)
task = (docs/'Task.md').read_text()
if not re.search(r'^- \[x\] `TRY-07` ', task, re.M):
    errors.append('Chapter 14 introduction must have an accepted TRY-07 task')
qa_ids = set(re.findall(r'^\| (A\d\d) \|', (docs/'07-落地批次与验收清单.md').read_text(),re.M))
for item in qa_ids:
    if f'`QA-{item}`' not in task: errors.append('Missing QA task '+item)
rpc_ids = set(re.findall(r'^\| (RPC-\d\d) \|', (docs/'08-JSON-RPC全量迁移对照表.md').read_text(),re.M))
trace_ids = set(re.findall(r'^\| (RPC-\d\d) \|',task,re.M))
if rpc_ids != trace_ids: errors.append('RPC trace table differs from 08 source matrix')
report = {'passed':not errors,'observedAt':datetime.now(timezone.utc).isoformat(),'chapters':len(chapters),'preservedSources':len(manifest['sources']),'qaCoverage':len(qa_ids),'rpcCoverage':len(rpc_ids),'guideSha256':hashlib.sha256(guide.read_bytes()).hexdigest(),'historicalGuideBytesUnchanged':hashlib.sha256(guide.read_bytes()).hexdigest()==guide_proof['guideSha256'],'errors':errors,'scope':'document integrity and task coverage; supplemental14 explicit introduction/links and current hash only, not current guide installation or code/runtime acceptance'}
with args.output.open('x',encoding='utf-8') as stream:
    stream.write(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
if errors: raise SystemExit(1)
