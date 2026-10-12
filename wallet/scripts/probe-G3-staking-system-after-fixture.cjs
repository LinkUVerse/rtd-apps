// Fresh canonical system after the unique actual G3 stake. Native reads only.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const { bcs } = require('rtd-typescript/bcs');
const { deriveDynamicFieldID, toBase64 } = require('rtd-typescript/utils');
const loader = require('tsx/cjs/api');
const wallet = path.resolve(__dirname, '..');
const load = name => loader.require(path.join(wallet, 'src/shared/rpc', name + '.ts'), __filename);
const read = file => JSON.parse(fs.readFileSync(file));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
(async () => {
  const output = process.argv[2]; assert(output && !fs.existsSync(output));
  const logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
  const rt = path.join(os.homedir(), '.local/state/rtd-wallet-migration/dev-20261006-03');
  const profileFile = path.join(rt, 'certified-positive-transport-release-20261006-01/profile.json');
  const auditFile = path.join(logs, '20261007-G3-staking-fixture-native-audit-02.json');
  const preflightFile = path.join(logs, '20261007-C42-staking-preflight-01.json');
  const buildFile = path.join(logs, '20261007-default-generation-positive-C42-build-01.json');
  const audit = read(auditFile), before = read(preflightFile), build = read(buildFile);
  assert(audit.passed && before.passed && build.passed);
  const productSource = require('./build-reviewed-generation-production-extension.cjs').productSource;
  assert.deepEqual(productSource(), build.sourceAfter);
  const { validateNetworkProfile } = load('profile'), { WalletReadSession } = load('session');
  const { WalletFullnodeReader } = load('fullnode-reader');
  const { SYSTEM_WRAPPER_BCS, SYSTEM_V2_BCS, STAKED_RTD_BCS, stakingBcs } = load('staking-bcs');
  const profile = validateNetworkProfile(read(profileFile)); assert.equal(profile.expectedGenesisDigest, audit.h0);
  const session = new WalletReadSession(profile), originalFetch = globalThis.fetch, frames = [];
  let stage = 'fresh canonical system wrapper', report;
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.origin, 'http://127.0.0.1:41750');
    assert(/\/(GetServiceInfo|GetObject)$/.test(url.pathname));
    const response = await originalFetch(input, init), bytes = Buffer.from(await response.clone().arrayBuffer());
    assert(bytes.length <= 8 * 1024 * 1024);
    frames.push({ url: url.href, status: response.status, requestBase64: Buffer.from(init?.body ?? []).toString('base64'), responseBase64: bytes.toString('base64') });
    return response;
  };
  try {
    const native = new WalletFullnodeReader(session), wrapper = await native.object('0x5'); assert(wrapper);
    assert(wrapper.owner.$kind === 'Shared');
    const value = stakingBcs(SYSTEM_WRAPPER_BCS, wrapper.content);
    assert.equal(value.version, '2'); assert.equal(wrapper.version, '2'); assert.equal(wrapper.previousTransaction, audit.digest);
    const innerId = deriveDynamicFieldID(wrapper.objectId, 'u64', bcs.u64().serialize(value.version).toBytes());
    stage = 'canonical current V2 inner and old V1 retirement';
    const inner = await native.object(innerId); assert(inner && inner.content.length > 40);
    assert(inner.owner.$kind === 'ObjectOwner' && inner.owner.ObjectOwner === wrapper.objectId);
    assert.equal(inner.previousTransaction, audit.digest);
    assert.equal(bcs.Address.parse(inner.content.subarray(0, 32)), innerId);
    assert.equal(stakingBcs(bcs.u64(), inner.content.subarray(32, 40)), '2');
    const current = stakingBcs(SYSTEM_V2_BCS, inner.content.subarray(40));
    assert.equal(current.epoch, before.senderDomain.value.epoch); assert.equal(current.system_state_version, '2');
    assert.equal(current.validators.active_validators.length, 1);
    const validator = current.validators.active_validators[0];
    assert.equal(validator.metadata.rtd_address, audit.event.validatorAddress);
    assert.equal(validator.staking_pool.id, audit.event.poolId);
    assert.equal(validator.staking_pool.pending_stake, audit.event.amount);
    assert.equal(await native.object(before.nativeSystem.innerObjectId), null);
    stage = 'same actual new stake still held'; const stake = await native.object(audit.newStake.objectId); assert(stake);
    assert.equal(stake.digest, audit.newStake.digest); assert.equal(stake.version, audit.newStake.version);
    assert.deepEqual(stake.owner, audit.newStake.owner); assert.equal(toBase64(stake.objectBcs), audit.newStake.objectBcsBase64);
    assert.deepEqual(stakingBcs(STAKED_RTD_BCS, stake.content), audit.newStake.decoded);
    assert.deepEqual(productSource(), build.sourceAfter);
    const publicObject = object => ({ objectId: object.objectId, version: object.version, digest: object.digest, owner: object.owner, previousTransaction: object.previousTransaction, objectBcsBase64: toBase64(object.objectBcs) });
    report = { passed: true, observedAt: new Date().toISOString(), h0: profile.expectedGenesisDigest, generation: profile.generation,
      source: build.sourceAfter, originalDigest: audit.digest, originalCheckpoint: audit.receipt.checkpoint,
      wrapper: { ...publicObject(wrapper), value }, inner: publicObject(inner), current,
      oldV1InnerAbsent: true, oldIndexedPreflightCheckpoint: before.senderDomain.snapshot.checkpoint,
      oldIndexedPreflightIsCurrentNativeSystem: false, actualNewStakeHeld: true, stake: publicObject(stake),
      indexedPositionAccepted: false, currentC42BrowserAccepted: false, frames, simulations: 0, signatures: 0, executeRequests: 0,
      inputsSha256: Object.fromEntries([__filename, profileFile, auditFile, preflightFile, buildFile].map(f => [f, sha(f)])),
      scope: 'Fresh native canonical wrapper/derived V2 inner, exact actual original stake-induced version2/epoch/validator/pool/pending stake, original V1 field absent and exact original new stake still held. Current production V2 decoder roundtrip verified. Historical indexed V1 preflight remains valid at its recorded S only; no current indexed V2/stake, C42 browser, reward/redeem or parent acceptance.' };
  } catch (error) {
    report = { passed: false, observedAt: new Date().toISOString(), stage, errorType: error.name, message: String(error.message).slice(0, 600), frames, simulations: 0, signatures: 0, executeRequests: 0 }; process.exitCode = 1;
  } finally {
    session.close(); globalThis.fetch = originalFetch;
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: report.passed, stage: report.stage, systemVersion: report.wrapper?.value.version, frames: frames.length, executeRequests: 0 }));
  }
})().catch(error => { console.error(JSON.stringify({ passed: false, stage: 'preflight', errorType: error.name })); process.exitCode = 1; });
