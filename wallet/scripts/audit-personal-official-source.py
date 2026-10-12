#!/usr/bin/env python3
"""Read-only token comparison of retained fixed official source against original RTD fixtures."""
import argparse,json,hashlib,re
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('official',type=Path);p.add_argument('provenance',type=Path);p.add_argument('output',type=Path);a=p.parse_args();assert not a.output.exists()
sha=lambda b:hashlib.sha256(b).hexdigest();prov=json.loads(a.provenance.read_text());first=json.loads((a.official/'audit.json').read_text());assert first['commit']=='44c0918fd94dfb6bc97ca3c199ece42383516fb7'
def tokens(data):
 s=data.decode();s=re.sub(r'/\*.*?\*/','',s,flags=re.S);s=re.sub(r'//[^\n]*','',s)
 return re.findall(r'"(?:\\.|[^"\\])*"|[A-Za-z_][A-Za-z_0-9]*|[0-9]+|[^\s]',s)
rows=[];inputs={str(a.provenance.resolve()):sha(a.provenance.read_bytes()),str((a.official/'audit.json').resolve()):sha((a.official/'audit.json').read_bytes()),str(Path(__file__).resolve()):sha(Path(__file__).read_bytes())}
for f,h in prov['sources'].items():
 official=a.official/f;local=Path(prov['source'])/f;original=official.read_bytes();rtd=local.read_bytes();assert sha(rtd)==h;row=next(x for x in first['rows'] if x['source']==f);assert sha(original)==row['officialSha256'];up=tokens(original);ours=tokens(rtd);assert len(up)==len(ours);changes=[{'index':i,'official':x,'rtd':y} for i,(x,y) in enumerate(zip(up,ours)) if x!=y];assert all((x['official'],x['rtd']) in [('sui','rtd'),('SUI','RTD')] for x in changes);assert all(x['official']!='SUI' or f.endswith('/royalty_rule.move') for x in changes);inputs[str(official.resolve())]=sha(original);inputs[str(local.resolve())]=h;rows.append({'source':f,'fixedOfficialUrl':row['url'],'tokenCount':len(up),'differences':changes,'identicalExceptNamespaceAndNativeCoinType':True})
report={'passed':True,'observedScope':'Six fixed official MystenLabs apps source files; complete lexical comparison permits comments/whitespace, sui/rtd namespace and explicit royalty native SUI/RTD type only. No source edit, compile, publication, authority or UI claim. Published module certificate remains independent.','officialCommit':first['commit'],'sourceFiles':6,'rows':rows,'inputsSha256':inputs};a.output.open('x').write(json.dumps(report,indent=2)+'\n');print(json.dumps({'passed':True,'sourceFiles':6,'officialCommit':first['commit']}))
