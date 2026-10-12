// Admit only the complete staking scheduler and its regression test against C109's full baseline.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), cp = require('node:child_process'), ts = require('typescript');
const wallet = path.resolve(__dirname, '..'), root = path.resolve(wallet, '../..');
const logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const parse = text => ts.createSourceFile('staking-reader.ts', text, ts.ScriptTarget.Latest, true);
const printer = ts.createPrinter({ removeComments: true });
function normalized(text) {
  const tree = parse(text); assert.equal(tree.parseDiagnostics.length, 0);
  return printer.printFile(tree);
}
function exactly(text, from, to) {
  assert.equal(text.split(from).length, 2, `Unique inverse segment absent: ${from.slice(0, 100)}`);
  return text.replace(from, to);
}
function currentManifest() {
  return JSON.parse(cp.execFileSync('python3', ['-c',
    'import json,hashlib,sys;from pathlib import Path;w=Path(sys.argv[1]);r=w.parent.parent;rows={};\nfor d in (w/"src",w/"configs",w.parent/"core/src",r/"rtd-ts-sdk/packages/typescript/src"):\n for p in d.rglob("*"):\n  if p.is_file(): rows[str(p.relative_to(r))]=hashlib.sha256(p.read_bytes()).hexdigest()\nfor p in (w/"package.json",w/"webpack.config.ts",w.parent/"pnpm-lock.yaml"): rows[str(p.relative_to(r))]=hashlib.sha256(p.read_bytes()).hexdigest()\nprint(json.dumps({"rows":rows,"source":{"sha256":hashlib.sha256(json.dumps(rows,sort_keys=True).encode()).hexdigest(),"files":len(rows)}}))', wallet],
    { encoding: 'utf8', timeout: 60000 }));
}
function auditDelta() {
  const baselineFile = path.join(logs, '20261008-C109-before-implementation-archive-01.json');
  const baseline = read(baselineFile); assert(baseline.passed && baseline.preparedOnly && baseline.addedTestAbsent);
  assert.equal(sha(baseline.productManifest), baseline.productManifestSha256);
  const before = read(baseline.productManifest), current = currentManifest();
  assert.equal(Object.keys(before).length, 1121);
  const changed = Object.keys(before).filter(f => current.rows[f] !== before[f]).sort();
  const added = Object.keys(current.rows).filter(f => !(f in before)).sort();
  const deleted = Object.keys(before).filter(f => !(f in current.rows)).sort();
  assert.deepEqual(changed, ['rtd-apps/wallet/src/shared/rpc/staking-reader.ts']);
  assert.deepEqual(added, ['rtd-apps/wallet/src/shared/rpc/staking-collection-parallel.test.ts']);
  assert.deepEqual(deleted, []);
  for (const row of baseline.rows) assert.equal(sha(row.snapshot), row.sha256);
  const row = baseline.rows.find(row => row.original === path.join(root, changed[0])); assert(row);
  assert.equal(row.sha256, before[changed[0]]);
  const oldText = fs.readFileSync(row.snapshot, 'utf8'), newText = fs.readFileSync(row.original, 'utf8');
  const oldTree = parse(oldText), newTree = parse(newText);
  const fn = (tree, name) => tree.statements.find(n => ts.isFunctionDeclaration(n) && n.name.text === name);
  const original = fn(oldTree, 'readStaking'), complete = fn(newTree, 'readCompleteStaking');
  const wrapper = fn(newTree, 'readStaking'), queue = fn(newTree, 'readCompleteCollections');
  assert(original && complete && wrapper && queue);
  const oldSignal = original.body.statements[0].getText(oldTree);
  assert(oldSignal.includes('AbortSignal.timeout(20_000)'));
  let inverse = complete.body.getText(newTree);
  // The original system/inactive dependency chain, every fold guard and the final
  // revalidation are compared as a whole AST after these four explicit I/O moves.
  const preflightStart = inverse.indexOf('  // Validate declared identities');
  const preflightEnd = inverse.indexOf('  let totalRateCount = 0;', preflightStart);
  assert(preflightStart > 0 && preflightEnd > preflightStart);
  inverse = inverse.slice(0, preflightStart) + inverse.slice(preflightEnd);
  inverse = exactly(inverse,
    'for (const [index, { value, active }] of validators.entries()) {',
    'for (const { value, active } of validators) {');
  inverse = exactly(inverse, 'const entries = rateTables[index];',
    'const entries = (await reader.dynamicFields(pool.exchange_rates.id, signal))\n      .value;');
  inverse = exactly(inverse, 'if (address !== undefined) {',
    'if (owner !== undefined) {\n    const address = walletAddress(owner);\n    const owned = (\n      await reader.ownedObjects(address, {\n        type: "0x3::staking_pool::StakedRtd",\n        signal,\n      })\n    ).value;');
  inverse = '{\n' + oldSignal + inverse.slice(1);
  assert.equal(normalized('function inverse() ' + inverse), normalized('function inverse() ' + original.body.getText(oldTree)));
  const oldOutside = oldTree.statements.filter(n => n !== original).map(n => n.getText(oldTree)).join('\n');
  let newOutside = newTree.statements.filter(n => ![complete, wrapper, queue].includes(n)).map(n => n.getText(newTree)).join('\n');
  const sourceImport = tree => tree.statements.find(n => ts.isImportDeclaration(n) && n.moduleSpecifier.text === './staking-source');
  const oldImport = sourceImport(oldTree), newImport = sourceImport(newTree);
  assert.deepEqual(oldImport.importClause.namedBindings.elements.map(n => n.name.text), ['WalletStakingSource']);
  assert.deepEqual(newImport.importClause.namedBindings.elements.map(n => n.name.text), ['WalletStakingObject', 'WalletStakingSource']);
  newOutside = exactly(newOutside, newImport.getText(newTree), oldImport.getText(oldTree));
  assert.equal(normalized(newOutside), normalized(oldOutside));
  for (const text of ['AbortSignal.timeout(20_000)', 'operation.signal', 'finally', 'operation.abort();', 'readCompleteStaking(reader, owner, signal, operation)']) assert(wrapper.getText(newTree).includes(text));
  for (const text of ['Math.min(4, tasks.length)', 'signal.throwIfAborted();', 'await task();', 'operation.abort(error);', 'throw error;', 'Promise.all(']) assert(queue.getText(newTree).includes(text));
  for (const text of ['declaredRates > 10000n', 'declaredPools.has(pool.id)', 'declaredActive.has(address)', 'rateTables[index]', 'await readCompleteCollections(tasks, signal, operation);']) assert(complete.getText(newTree).includes(text));
  const inputs = [__filename, baselineFile, baseline.productManifest, ...baseline.rows.map(row => row.snapshot),
    ...[...changed, ...added].map(f => path.join(root, f)),
    path.join(root, 'rtd-archive-service/docs/wallet/03-SDK契约与功能迁移矩阵.md'),
    path.join(wallet, 'migrationToGRpcOrGraphQLDoc/04-SDK契约与功能迁移矩阵.md')];
  return { passed: true, preparedOnly: true, exactProductDeltaAccepted: true, changed, added, deleted,
    unchangedOriginalProductFiles: 1120, originalSource: baseline.source, currentSource: current.source,
    originalBodyInverseAccepted: true, originalOutsideInverseAccepted: true,
    originalGuardsFinalRevalidationAndOrderHeld: true, unchanged20SecondBudget: true,
    inputsSha256: Object.fromEntries([...new Set(inputs)].map(f => [f, sha(f)])),
    actualBrowserTimeoutFixed: false, parentAcceptance: false };
}
module.exports = { auditDelta, currentManifest };
if (require.main === module) {
  const [output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
  let result;
  try { result = { ...auditDelta(), observedAt: new Date().toISOString() }; }
  catch (error) { result = { passed: false, errorType: error.name, message: String(error.message).slice(0, 1600) }; process.exitCode = 1; }
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ passed: result.passed, source: result.currentSource, errorType: result.errorType, message: result.message }));
}
