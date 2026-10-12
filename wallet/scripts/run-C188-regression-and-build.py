from pathlib import Path
import os,json,subprocess,concurrent.futures,datetime,hashlib
w=Path(__file__).resolve().parent.parent;l=w/'migrationToGRpcOrGraphQLDoc/workLog';before=json.loads((l/'20261009-C136-regression-process-01.json').read_text());build=json.loads((l/'20261009-default-generation-positive-C136-build-01.json').read_text());env={k:os.environ[k] for k in ['PATH','HOME','TMPDIR'] if k in os.environ};out=Path.home()/'.local/state/rtd-wallet-migration/dev-20261006-03/certified-positive-production-C188-20261010-01'
reg=before['checks'][0]['argv'];reg=[x.replace('20261009-C136-approval-signing-regression-01.json','20261010-C188-approval-signing-regression-01.json') for x in reg];reg.insert(4,str(w/'src/background/execution-recovery-wakeup.test.ts'))
profile=Path.home()/'.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C148-fixed-archive-and-tx-readmission-20261009-01/isolated-query-runtime/profile.json'
checks=[('regression',reg),('rpc',['pnpm','exec','tsc','--noEmit','-p','configs/ts/tsconfig.rpc.json']),('production',['pnpm','exec','tsc','--noEmit','-p','configs/ts/tsconfig.prod.json']),('build',['node','--max-old-space-size=12288','scripts/build-reviewed-generation-production-extension.cjs',str(out),str(profile),str(l/'20261010-default-generation-positive-C188-build-01.json'),build['reviewedRelease']['registryFile'],build['reviewedRelease']['reviewFile']])]
def run(check):
 name,argv=check;p=l/('20261010-C188-'+name+'-01.log')
 with p.open('x') as f:
  p.chmod(0o600);r=subprocess.run(argv,cwd=w,env=env,stdout=f,stderr=subprocess.STDOUT)
 row={'label':name,'argv':argv,'processExitCode':r.returncode,'log':str(p)};print(json.dumps({'label':name,'exitCode':r.returncode}),flush=True);return row
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool: rows=list(pool.map(run,checks))
proof={'passed':all(x['processExitCode']==0 for x in rows),'checks':rows,'observedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'inputsSha256':{str(Path(x['log'])):hashlib.sha256(Path(x['log']).read_bytes()).hexdigest() for x in rows}}
p=l/'20261010-C188-regression-build-process-01.json'
with p.open('x') as f:json.dump(proof,f,indent=2);f.write('\n')
raise SystemExit(0 if proof['passed'] else 1)
