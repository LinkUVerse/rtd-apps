// Current production build plus a new, separately owned gateway; no old-runtime fallback.
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const wallet = path.resolve(__dirname, '../..'), root = path.resolve(wallet, '../..');
const logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
const foundation = '/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation';
const operation = path.join(foundation, 'C113-current-four-nft-gateway-20261008-01');
const buildFile = path.join(logs, '20261008-default-generation-positive-C109-build-01.json');
const profileFile = path.join(operation, 'profile.json');
const lineage = require('./C109-product-source-lineage.cjs');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const originalBuildFile = path.join(logs, '20261007-default-generation-positive-C46-build-03.json');
const cleanupFile = path.join(logs, '20261008-C110-current-cleanup-independent-01.json');
const pythonFile = path.join(root, 'link-u-smart-contract/all-in-one-deploy/localDeploy/wallet_C113_nft_runtime.py');
const originFile = path.join(logs, '20261008-C109-current-origin-probe-01.json');
const actualOrigin = read(originFile).origin;
assert(/^chrome-extension:\/\/[a-p]{32}$/.test(actualOrigin));
const pins = [originFile, __filename, require.resolve('./C109-product-source-lineage.cjs'), lineage.qualificationFile,
  originalBuildFile, buildFile, cleanupFile, pythonFile];

function validateOrigin(proof = read(originFile)) {
  const build = read(buildFile);
  assert(proof.passed && proof.profileClosed && proof.networkRequests === 0 && proof.forwardedHttpRequests === 0);
  assert(proof.allObservedHttpAttemptsAborted && proof.permissions.all && !proof.permissions.unknownPort);
  assert.equal(proof.origin, actualOrigin);
  assert.deepEqual(proof.source, build.sourceAfter);
  assert.equal(proof.workerSource.workerSha256, build.artifacts['background.js']);
  assert(proof.workerSource.matchesDisk && proof.uiSource.matchesDisk);
  for (const row of proof.uiSource.loadedBundles) assert.equal(row.loadedSha256, build.artifacts[row.file]);
  for (const [file, pin] of Object.entries(proof.inputsSha256)) assert.equal(sha(file), pin);
  return actualOrigin;
}

function validateProfile(actualProfileFile, profileBytes) {
  assert.equal(path.resolve(actualProfileFile), profileFile);
  const build = read(buildFile);
  assert.equal(crypto.createHash('sha256').update(profileBytes).digest('hex'), build.compiledProfile.profileSha256);
  const profile = JSON.parse(profileBytes.toString('utf8'));
  assert.deepEqual(profile, read(path.join(foundation, 'C102-isolated-parallel-gateway-20261008-01/profile.json')));
  assert.deepEqual([profile.endpoints.fullnodeGrpcWeb, profile.endpoints.graphqlUrl,
    profile.endpoints.archiveGrpcWeb, profile.endpoints.accountHistoryUrl].map(v => new URL(v).origin),
    ['http://127.0.0.1:41750', 'http://127.0.0.1:42011', 'http://127.0.0.1:42012', 'http://127.0.0.1:42013']);
  return profile;
}

function validateBuild(actualBuildFile, actualProfileFile) {
  assert.equal(path.resolve(actualBuildFile), buildFile);
  const build = read(buildFile);
  assert.deepEqual(build.sourceAfter, lineage.validate(read(lineage.qualificationFile).originalSource, buildFile));
  validateProfile(actualProfileFile, fs.readFileSync(actualProfileFile));
  validateOrigin();
  const cleanup = read(cleanupFile);
  assert(cleanup.passed && cleanup.normalStopExitCode === 0 && cleanup.original29And14Held);
  assert(cleanup.original25ActorsAndCurrentPublisherHeld && cleanup.originalServicesSignalled === 0);
  for (const [file, pin] of Object.entries(cleanup.inputsSha256)) assert.equal(sha(file), pin);
  return build;
}

function held(intentFile) {
  validateBuild(buildFile, profileFile);
  cp.execFileSync(path.join(root, 'rtd-archive-service/localDeploy/data/publisher-venv/bin/python'), ['-c',
    'import sys,json;sys.path.insert(0,sys.argv[1]);from wallet_C113_nft_runtime import held;held(json.load(open(sys.argv[2])))',
    path.dirname(pythonFile), intentFile], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 });
}

module.exports = { buildFile, profileFile, operation, pins, validateProfile, validateBuild, validateOrigin, actualOrigin, held };
