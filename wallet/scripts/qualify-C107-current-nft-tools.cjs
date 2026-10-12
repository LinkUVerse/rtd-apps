// Exact old-contract inverses, current complete source lineage and real no-IO refusals.
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const crypto = require('node:crypto'), assert = require('node:assert/strict'), ts = require('typescript'), vm = require('node:vm');
const wallet = path.resolve(__dirname, '..'), root = path.resolve(wallet, '../..');
const logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
const environment = require('./lib/C107-current-nft-environment.cjs');
const lineage = require('./lib/C102-product-source-lineage-v2.cjs');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const ld = path.join(root, 'link-u-smart-contract/all-in-one-deploy/localDeploy');
const python = path.join(root, 'rtd-archive-service/localDeploy/data/publisher-venv/bin/python');
function inverse(row, candidate) {
  let source = candidate;
  for (const delta of [...row.deltas].reverse()) {
    assert.equal(source.split(delta.to).length - 1, delta.count);
    source = source.split(delta.to).join(delta.from);
  }
  assert.equal(source, fs.readFileSync(row.old, 'utf8'));
}
function nativeFetch(file) {
  const text = fs.readFileSync(file, 'utf8'), tree = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  assert.equal(tree.parseDiagnostics.length, 0);
  const found = [];
  const visit = node => {
    if (ts.isBinaryExpression(node) && node.left.getText(tree) === 'globalThis.fetch' && ts.isArrowFunction(node.right)
      && node.right.getText(tree).includes('nativeFrames.push(')) found.push(node.right.getText(tree));
    ts.forEachChild(node, visit);
  };
  visit(tree); assert.equal(found.length, 1); return found[0];
}
async function main() {
  const [output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
  const files = [__filename, ...environment.pins], checks = [];
  const test = (name, fn) => { fn(); checks.push({ name, passed: true }); };
  const deltasFile = path.join(logs, '20261008-C107-current-nft-tool-deltas-01.json'), deltas = read(deltasFile);
  files.push(deltasFile); assert(deltas.preparedOnly && deltas.rows.length === 5);
  for (const row of deltas.rows) {
    assert.equal(sha(row.old), row.originalSha256); assert.equal(sha(row.new), row.candidateSha256);
    test('exact complete inverse ' + path.basename(row.new), () => inverse(row, fs.readFileSync(row.new, 'utf8')));
    test('extra contract weakening rejected ' + path.basename(row.new), () => {
      const current = fs.readFileSync(row.new, 'utf8');
      const mutant = current.includes('696489') ? current.replace('696489', '687127') : current + '\n// unapproved change\n';
      assert.throws(() => inverse(row, mutant));
    });
    files.push(row.old, row.new);
  }
  const originalBuild = read(path.join(logs, '20261007-default-generation-positive-C46-build-03.json'));
  test('complete current source and build03', () => {
    const current = lineage.validate(originalBuild.sourceAfter, environment.buildFile);
    assert.equal(current.files, 1121); assert.equal(current.sha256, '763d90821ce4c8cebb76c600c35d6b77106acae1d5a23050a05cabc20510436d');
  });
  const profileBytes = fs.readFileSync('/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C102-isolated-parallel-gateway-20261008-01/profile.json');
  test('retained exact build profile; no new profile file', () => environment.validateProfile(environment.profileFile, profileBytes));
  test('old gateway profile rejected', () => assert.throws(() => environment.validateProfile(environment.profileFile.replace('C107-current-four-nft-', 'C102-isolated-parallel-'), profileBytes)));
  test('changed target profile rejected', () => assert.throws(() => environment.validateProfile(environment.profileFile, Buffer.from(profileBytes.toString().replace('42012', '41958')))));
  test('old product source declaration rejected', () => assert.throws(() => lineage.validate({ ...originalBuild.sourceAfter, files: 1119 }, environment.buildFile)));
  test('wrong build path rejected', () => assert.throws(() => environment.validateBuild(path.join(logs, '20261007-default-generation-positive-C46-build-03.json'), environment.profileFile)));
  const originalFn = nativeFetch(path.join(__dirname, 'test-C99-current-four-nft-M3.cjs'));
  const currentFn = nativeFetch(path.join(__dirname, 'test-C107-current-four-nft-M3.cjs'));
  const context = () => ({ URL, Request, Buffer, assert, network: { endpoints: { fullnodeGrpcWeb: 'http://127.0.0.1:41750' } },
    nativeFrames: [], fetch0: async () => new Response('qualified mock only', { status: 200, headers: { 'x-fixture': 'qualification' } }) });
  const oldContext = context(), freshContext = context();
  await assert.rejects(vm.runInNewContext('(' + originalFn + ')', oldContext)('http://127.0.0.1:41750/rtd.rpc.v2.LedgerService/GetServiceInfo', { body: Buffer.from([0, 0, 0, 0, 0]) }), /status is not a function/);
  await vm.runInNewContext('(' + currentFn + ')', freshContext)('http://127.0.0.1:41750/rtd.rpc.v2.LedgerService/GetServiceInfo', { body: Buffer.from([0, 0, 0, 0, 0]) });
  assert.equal(oldContext.nativeFrames.length, 0); assert.equal(freshContext.nativeFrames.length, 1);
  assert.equal(freshContext.nativeFrames[0].status, 200);
  assert.equal(Buffer.from(freshContext.nativeFrames[0].responseBase64, 'base64').toString(), 'qualified mock only');
  checks.push({ name: 'actual native fetch closure: old fails, current standard Response property retains bytes', passed: true, mockedOnly: true });
  const readinessFile = path.join(logs, '20261008-C99-nft-inventory-readiness-07.json');
  const code = `import sys,json,copy,ast\nfrom datetime import datetime,timedelta\nsys.path.insert(0,sys.argv[1])\nfrom wallet_C107_nft_runtime import readiness,GATES\np=json.load(open(sys.argv[2]));now=datetime.fromisoformat(p['observedAt']);count=0\ndef reject(v):\n global count\n try: readiness(v,now)\n except AssertionError: count+=1\n else: raise AssertionError('Incomplete gate accepted')\nreject(p)\nv=copy.deepcopy(p);v['publishedHi']=696489\nfor k in ['hbase','sql','rocks']:\n for n in v['durable'][k]:v['durable'][k][n]=696489\nv['durable']['display']['checkpointHi']=696489;v['effectiveAssetWindow']['commonHi']=696489;v['accountCoverage']['checkpointHi']=696489\nv['coverageGates']={k:True for k in GATES};v['missingGates']=[];v['infrastructureReadyForProductionProbe']=True\nassert readiness(v,now)\nfor k in GATES:\n q=copy.deepcopy(v)\n if k=='committedPublication':q['publishedHi']-=1\n elif k=='display':q['durable']['display']['checkpointHi']-=1\n elif k=='declaredAndNativeAssetWindow':q['effectiveAssetWindow']['commonHi']-=1\n elif k=='accountHistoryWindow':q['accountCoverage']['checkpointHi']-=1\n else:\n  group={'hbase14':'hbase','sql23':'sql','rocks4':'rocks'}[k];q['durable'][group][next(iter(q['durable'][group]))]-=1\n q['coverageGates'][k]=False;q['missingGates']=[k];q['infrastructureReadyForProductionProbe']=False;reject(q)\nfor key,value in [('targetCheckpoint',687127),('extraSerial95IncludedInTarget',False),('observedAt',(now-timedelta(seconds=300)).isoformat())]:\n q=copy.deepcopy(v);q[key]=value;reject(q)\nq=copy.deepcopy(v);q['durable']['hbase'].pop(next(iter(q['durable']['hbase'])));reject(q)\nq=copy.deepcopy(v);q['durable']['rocks'][next(iter(q['durable']['rocks']))]=True;reject(q)\nfor file in sys.argv[3:]:ast.parse(open(file).read(),filename=file)\nprint(json.dumps({'passed':True,'negativeChecks':count,'onlyPositiveReadinessMocked':True,'signals':0,'containersCreated':0}))`;
  const guard = JSON.parse(cp.execFileSync(python, ['-c', code, ld, readinessFile,
    path.join(ld, 'wallet_C107_nft_runtime.py'), path.join(ld, 'manage_wallet_C107_four_nft_gateway.py')], { encoding: 'utf8', timeout: 30000 }));
  assert(guard.passed && guard.negativeChecks === 13 && guard.onlyPositiveReadinessMocked);
  files.push(readinessFile, path.join(ld, 'manage_wallet_C107_four_nft_gateway.py'));
  const actualNames = ['nft-inventory-preflight-01', 'nft-inventory-preflight-independent-01',
    'four-nft-live-preflight-01', 'four-nft-live-preflight-independent-01',
    'four-nft-durable-preflight-01', 'four-nft-durable-preflight-independent-01'];
  for (const name of actualNames) {
    const file = path.join(logs, '20261008-C107-' + name + '.json'), proof = read(file);
    assert(proof.passed && proof.parentCompletion === false);
    for (const [f, h] of Object.entries(proof.inputsSha256)) assert.equal(sha(f), h);
    if (name === 'nft-inventory-preflight-01') assert(proof.requests === 0 && proof.sessionsCreated === 0 && proof.indexedFixtureAccepted === false);
    if (proof.actualFourFormTestExecuted !== undefined) assert.equal(proof.actualFourFormTestExecuted, false);
    for (const key of ['profilesOpened', 'signatures', 'executeRequests', 'newContainers']) if (key in proof) assert.equal(proof[key], 0);
    files.push(file);
  }
  for (const file of deltas.rows.map(r => r.new).concat(require.resolve('./lib/C107-current-nft-environment.cjs'), __filename).filter(f => f.endsWith('.cjs'))) {
    assert.equal(cp.spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' }).status, 0);
  }
  assert(!fs.existsSync(environment.operation));
  assert(!fs.existsSync('/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/current-C107-four-nft-live-20261008-01'));
  assert(!fs.existsSync('/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/current-C107-four-nft-durable-20261008-01'));
  const result = { passed: true, observedAt: new Date().toISOString(), preparedOnly: true,
    completeOriginalContractsInverseHeld: true, originalToolsPreserved: 5, sourceAndBuild03Qualified: true,
    checks, checkCount: checks.length, runtimeReadinessGuard: guard,
    actualZeroIoInventoryAndBothNoProfileBrowserRefusalsIndependentlyAudited: true,
    nativeFetchStandardResponseRegressionQualified: true, positiveGuardAndNativeResponseMocksOnly: true,
    actualCoveredInventoryAccepted: false, actualLiveFormsAccepted: false, actualDurableFormsAccepted: false,
    profilesOpened: 0, newContainers: 0, simulations: 0, signatures: 0, executeRequests: 0,
    sourceChanged: false, ordinaryChromeAccepted: false, parentCompletion: false,
    inputsSha256: Object.fromEntries([...new Set(files)].map(f => [path.resolve(f), sha(f)])) };
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ passed: true, exactCompleteInverse: true, checks: checks.length, runtimeNegativeChecks: guard.negativeChecks, actualCoveredInventoryAccepted: false }));
}
main().catch(error => { console.error(JSON.stringify({ passed: false, errorType: error.name, message: String(error.message).slice(0, 700) })); process.exitCode = 1; });
