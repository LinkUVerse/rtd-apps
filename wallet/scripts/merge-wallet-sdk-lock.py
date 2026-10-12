#!/usr/bin/env python3
"""Merge freshly resolved SDK closure without replacing unrelated importers or deleting legacy records."""
import argparse
import re
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--base',type=Path,required=True);p.add_argument('--generated',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
p.add_argument('--modern-kit',action='store_true');a=p.parse_args()
base=a.base.read_text();generated=a.generated.read_text()
def split(text):
 head,packages=text.split('\npackages:\n',1);packages,snapshots=packages.split('\nsnapshots:\n',1)
 return head,packages,snapshots
def entries(text):
 matches=list(re.finditer(r'^  (\S[^\n]*?):(?= |\n)[^\n]*\n(?:(?!^  \S)[\s\S])*',text,re.M))
 result={match.group(1):match.group(0) for match in matches}
 assert len(result)==len(matches), 'Duplicate lock entries'
 assert ''.join(result.values()).strip()==text.strip(), 'Unparsed lock content (including inline empty entries)'
 return result
bh,bp,bs=split(base);gh,gp,gs=split(generated)
# Only wallet Kiosk/Wallet Standard peer-resolution keys change; TypeScript's key is stable.
wallet=bh.split('\n  wallet:\n',1)[1];fresh=gh.split('\n  wallet:\n',1)[1]
names=['rtd-typescript','rtd-kiosk','rtd-wallet-standard']
if a.modern_kit:
 names+=['rtd-dapp-kit-core','rtd-dapp-kit-react']
 for name in names[-2:]:
  line=re.search(r'^  '+name+r':[^\n]+\n',gh,re.M);assert line
  if line.group() not in bh:
   bh=bh.replace('\noverrides:\n','\noverrides:\n'+line.group(),1)
for name in names:
 pattern=r'      '+re.escape(name)+r':\n(?:        [^\n]*\n)+'
 before=re.search(pattern,wallet);after=re.search(pattern,fresh);assert after
 if before:wallet=wallet.replace(before.group(),after.group())
 else:
  assert a.modern_kit and name in names[-2:]
  wallet=wallet.replace('    devDependencies:\n','    devDependencies:\n'+after.group(),1)
bh=bh.split('\n  wallet:\n',1)[0]+'\n  wallet:\n'+wallet
parts=[]
for old,new in [(bp,gp),(bs,gs)]:
 prior=entries(old);resolved=entries(new)
 for key,block in resolved.items():
  bare=key.strip("'")
  if bare.startswith('dapp-kit@'):continue
  sdk_names=['rtd-typescript','rtd-kiosk','rtd-wallet-standard','rtd-bcs','rtd-utils']
  if a.modern_kit:sdk_names+=['rtd-dapp-kit-core','rtd-dapp-kit-react','rtd-slush-wallet','rtd-window-wallet-core']
  sdk=any(bare.startswith(name+'@file:') for name in sdk_names)
  if key not in prior or sdk:
   # pnpm file peers in a scratch directory must not retain a machine-specific absolute path.
   block=re.sub(r'file:/[^\n]*?/rtd-ts-sdk/packages/typescript', 'file:../rtd-ts-sdk/packages/typescript',block)
   prior[key]=block
 assert entries(old).keys() <= prior.keys(), 'Existing lock entries must not be deleted'
 parts.append('\n'+''.join(prior.values()).rstrip()+'\n')
result=bh+'\npackages:\n'+parts[0]+'\nsnapshots:\n'+parts[1]
assert '/var/folders/' not in result and '/Users/' not in result
with a.output.open('x') as stream:stream.write(result)
