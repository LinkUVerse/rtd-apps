// Compiled producer-source comparison only; never substitutes for current UI acceptance.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const wallet = path.resolve(__dirname, '..'), logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
const read = f => JSON.parse(fs.readFileSync(f)), sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const modules = [
  'background/accounts/ImportedAccount.ts', 'background/accounts/MnemonicAccount.ts',
  'background/dapp-preparation.ts', 'background/dapp-signing.ts', 'background/dapp-execution.ts', 'background/execution.ts',
  'shared/rpc/dapp-prepared-registry.ts', 'shared/rpc/dapp-request-binding.ts', 'shared/rpc/transaction-sponsorship.ts',
  'shared/rpc/transaction-reader.ts', 'shared/rpc/execution-reader.ts', 'shared/rpc/execution-coordinator.ts',
  'shared/rpc/execution-journal.ts', 'shared/rpc/coin-transfer-preparation.ts', 'shared/rpc/staking-preparation.ts',
  'ui/app/pages/approval-request/transaction-request/index.tsx',
  'ui/app/pages/approval-request/transaction-request/TransactionValidity.tsx',
  'ui/app/pages/home/transfer-coin/index.tsx', 'ui/app/staking/stake/StakingCard.tsx',
];

function inspect(build, inputs) {
  const found = new Map();
  for (const [file, value] of Object.entries(build.artifacts)) {
    const absolute = path.join(build.output, file);
    assert.equal(sha(absolute), value);
    inputs[absolute] = value;
    if (!file.endsWith('.js.map')) continue;
    const map = read(absolute);
    assert.equal(map.sources.length, map.sourcesContent.length);
    for (let i = 0; i < map.sources.length; i++) {
      const module = modules.find(name => map.sources[i] === 'webpack:///./' + name);
      if (!module) continue;
      assert.equal(typeof map.sourcesContent[i], 'string');
      const sourceFile = path.join(wallet, 'src', module), text = fs.readFileSync(sourceFile, 'utf8');
      assert.equal(map.sourcesContent[i], text);
      inputs[sourceFile] = sha(sourceFile);
      const row = { module, file: sourceFile, sourceSha256: sha(sourceFile), maps: [] };
      const previous = found.get(module) ?? row;
      assert.equal(previous.sourceSha256, row.sourceSha256);
      previous.maps.push({ map: absolute, mapSha256: value, sourceIndex: i, sourceName: map.sources[i] });
      found.set(module, previous);
    }
  }
  assert.equal(found.size, modules.length);
  return modules.map(module => found.get(module));
}

function main(output) {
  assert(output && !fs.existsSync(output));
  const oldFile = path.join(logs, '20261009-default-generation-positive-C124-build-01.json');
  const newFile = path.join(logs, '20261009-default-generation-positive-C136-build-01.json');
  const proofNames = ['20261009-C124-production-source-independent-02.json', '20261009-C131-production-source-independent-01.json', '20261009-C136-production-source-independent-01.json'];
  const inputs = { [__filename]: sha(__filename), [oldFile]: sha(oldFile), [newFile]: sha(newFile) };
  for (const name of proofNames) {
    const file = path.join(logs, name), proof = read(file);
    assert(proof.passed);
    inputs[file] = sha(file);
    Object.assign(inputs, proof.inputsSha256);
  }
  const oldRows = inspect(read(oldFile), inputs), newRows = inspect(read(newFile), inputs);
  for (let i = 0; i < modules.length; i++) assert.equal(oldRows[i].sourceSha256, newRows[i].sourceSha256);
  for (const [file, value] of Object.entries(inputs)) assert.equal(sha(file), value);
  const result = { passed: true, observedAt: new Date().toISOString(), sourceComparisonOnly: true,
    allSelectedCurrentFilesAndBothCompiledProducerContentsEqual: true, unchangedProtectedModules: modules.length,
    oldBuild: oldFile, currentBuild: newFile, oldCompiledModules: oldRows, currentCompiledModules: newRows,
    historicalCryptographicFactsRetainedOnly: true, allCurrentUiRetested: false,
    currentMnemonicStakeWithdrawAcceptanceClaimed: false, currentAllSponsorExpiryModesRetested: false,
    actualColdAccepted: false, fullNonNftM5Accepted: false, parentCompletion: false,
    simulations: 0, nativeVerificationRequests: 0, signatures: 0, executeRequests: 0, inputsSha256: inputs };
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ passed: true, sourceComparisonOnly: true, unchangedProtectedModules: modules.length, currentUiAcceptance: false }));
}

if (require.main === module) main(path.resolve(process.argv[2] ?? ''));
