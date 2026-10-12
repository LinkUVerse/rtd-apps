// Current production build plus a new, separately owned gateway; no old-runtime fallback.
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const wallet = path.resolve(__dirname, '../..'), root = path.resolve(wallet, '../..');
const logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
const foundation = '/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation';
const operation = path.join(foundation, 'C107-current-four-nft-gateway-20261008-01');
const buildFile = path.join(logs, '20261008-default-generation-positive-C102-build-03.json');
const profileFile = path.join(operation, 'profile.json');
const lineage = require('./C102-product-source-lineage-v2.cjs');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const originalBuildFile = path.join(logs, '20261007-default-generation-positive-C46-build-03.json');
const cleanupFile = path.join(logs, '20261008-C102-current-gateway-cleanup-independent-01.json');
const pythonFile = path.join(root, 'link-u-smart-contract/all-in-one-deploy/localDeploy/wallet_C107_nft_runtime.py');
const pins = [__filename, require.resolve('./C102-product-source-lineage-v2.cjs'), lineage.qualificationFile,
  originalBuildFile, buildFile, cleanupFile, pythonFile];

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
  assert.deepEqual(build.sourceAfter, lineage.validate(read(originalBuildFile).sourceAfter, buildFile));
  validateProfile(actualProfileFile, fs.readFileSync(actualProfileFile));
  const cleanup = read(cleanupFile);
  assert(cleanup.passed && cleanup.normalStopExitCode === 0 && cleanup.original29And14Held);
  assert(cleanup.original25ActorsAndCurrentPublisherHeld && cleanup.originalServicesSignalled === 0);
  for (const [file, pin] of Object.entries(cleanup.inputsSha256)) assert.equal(sha(file), pin);
  return build;
}

function held(intentFile) {
  validateBuild(buildFile, profileFile);
  cp.execFileSync(path.join(root, 'rtd-archive-service/localDeploy/data/publisher-venv/bin/python'), ['-c',
    'import sys,json;sys.path.insert(0,sys.argv[1]);from wallet_C107_nft_runtime import held;held(json.load(open(sys.argv[2])))',
    path.dirname(pythonFile), intentFile], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 });
}

module.exports = { buildFile, profileFile, operation, pins, validateProfile, validateBuild, held };
