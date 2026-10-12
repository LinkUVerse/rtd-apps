#!/usr/bin/env python3
"""Reconstruct exact C44 aggregate and require only coin event handling plus regression changes."""
import json,hashlib,sys
from pathlib import Path
from datetime import datetime,timezone
wallet=Path(__file__).resolve().parents[1];logs=wallet/'migrationToGRpcOrGraphQLDoc/workLog'
read=lambda p:json.loads(p.read_text());sha=lambda b:hashlib.sha256(b).hexdigest()
out=Path(sys.argv[1]);assert not out.exists();stage='current source and original actual compiled producer'
try:
 old=read(logs/'20261007-default-generation-positive-C44-build-02.json');new=read(logs/'20261007-default-generation-positive-C45-build-01.json');c46=read(logs/'20261007-default-generation-positive-C46-build-03.json');tests=read(logs/'20261007-coin-revalidation-rejection-green-02.json')
 assert old['passed'] and new['passed'] and c46['passed'] and tests['success'] and tests['numPassedTests']==44 and tests['numFailedTests']==0
 index=wallet/'src/ui/app/pages/home/transfer-coin/index.tsx';test=wallet/'src/ui/app/pages/home/transfer-coin/index.test.ts'
 matched=[]
 for name in old['artifacts']:
  if name.endswith('.js.map'):
   m=read(Path(old['output'])/name)
   matched += [text for filename,text in zip(m['sources'],m['sourcesContent']) if filename.endswith('/ui/app/pages/home/transfer-coin/index.tsx')]
 assert matched and len(set(matched))==1
 previous_index=matched[0];assert previous_index.count('onClick={() => executeTransfer.mutateAsync()}')==1
 assert index.read_text()==previous_index.replace('                onClick={() => executeTransfer.mutateAsync()}','              onClick={() => executeTransfer.mutate()}')
 stage='exact complete previous tests reconstruction and all1120-source aggregate'
 current_test=test.read_text();marker='\nit("failed final revalidation preserves visible approval, reports error once and never reaches the signer",'
 assert current_test.count(marker)==1;previous_test=current_test.split(marker)[0]
 for line in ['  execute: vi.fn(),\n','  revalidate: vi.fn(),\n','  toastError: vi.fn(),\n','  m.execute.mockReset();\n','  m.revalidate.mockReset();\n','  m.toastError.mockReset();\n']:
  assert previous_test.count(line)==1;previous_test=previous_test.replace(line,'')
 previous_test=previous_test.replace('const background = { recoverPreparedTransaction: m.recover, executePreparedTransaction: m.execute };','const background = { recoverPreparedTransaction: m.recover };')
 start=previous_test.index('vi.mock("_src/shared/rpc/coin-transfer-preparation",');end=previous_test.index('Object.assign(globalThis,',start)
 previous_test=previous_test[:start]+previous_test[end:]
 rows={}
 for root in [wallet/'src',wallet/'configs',wallet.parent/'core/src',wallet.parent.parent/'rtd-ts-sdk/packages/typescript/src']:
  for p in root.rglob('*'):
   if p.is_file():rows[str(p.relative_to(wallet.parent.parent))]=sha(p.read_bytes())
 for p in [wallet/'package.json',wallet/'webpack.config.ts',wallet.parent/'pnpm-lock.yaml']:rows[str(p.relative_to(wallet.parent.parent))]=sha(p.read_bytes())
 identity=lambda values:{'sha256':sha(json.dumps(values,sort_keys=True).encode()),'files':len(values)}
 assert identity(rows)==new['sourceBefore']==new['sourceAfter']==c46['sourceBefore']==c46['sourceAfter']
 restored=rows.copy();restored[str(index.relative_to(wallet.parent.parent))]=sha(previous_index.encode());restored[str(test.relative_to(wallet.parent.parent))]=sha(previous_test.encode());assert identity(restored)==old['sourceBefore']==old['sourceAfter']
 red=(logs/'20261007-coin-revalidation-rejection-red-03.log').read_text();green=(logs/'20261007-coin-revalidation-rejection-green-02.log').read_text();assert 'Unhandled Rejection' in red and '6 passed' in red and '1 error' in red;assert 'Unhandled Rejection' not in green
 inputs=[Path(__file__).resolve(),index,test,logs/'20261007-default-generation-positive-C44-build-02.json',logs/'20261007-default-generation-positive-C45-build-01.json',logs/'20261007-default-generation-positive-C46-build-03.json',logs/'20261007-coin-revalidation-rejection-red-03.log',logs/'20261007-coin-revalidation-rejection-green-02.json',logs/'20261007-coin-revalidation-rejection-green-02.log']
 result={'passed':True,'observedAt':datetime.now(timezone.utc).isoformat(),'source':new['sourceAfter'],'previousSourceExactlyReconstructed':old['sourceAfter'],'changedProductFiles':[str(index),str(test)],'businessDelta':'one event callback mutateAsync to mutate; mutationFn/revalidation/approved bytes/onError/background unchanged','targetedTests':44,'actualUnhandledRejectionReproduced':True,'previousAssertionsPassedButOneUnhandledErrorFailedRun':True,'scope':'Exact entire1120-source previous aggregate reconstruction from actual old compiled producer plus reversible test-only additions; one product event callback and real rejection regression only. Forty-four scoped tests; Chrome/indexed/publisher acceptance separate. C45 and isolated C46 have identical product source but independently compiled profiles.','inputsSha256':{str(p):sha(p.read_bytes())for p in inputs}}
except Exception as e:
 result={'passed':False,'observedAt':datetime.now(timezone.utc).isoformat(),'stage':stage,'errorType':type(e).__name__,'message':str(e)[:500]};sys.exitcode=1
with out.open('x')as f:json.dump(result,f,indent=2);f.write('\n')
print(json.dumps({k:result[k]for k in ['passed','stage','targetedTests']if k in result}));sys.exit(0 if result['passed'] else 1)
