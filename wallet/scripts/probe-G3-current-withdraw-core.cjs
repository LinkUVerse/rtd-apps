// Current production readers and actual G3 pending-stake withdrawal simulation. No keys/signing/dispatch.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { Transaction } = require('rtd-typescript/transactions');
const { bcs } = require('rtd-typescript/bcs');
const { normalizeStructTag, toBase64 } = require('rtd-typescript/utils');
const loader = require('tsx/cjs/api');
const wallet = path.resolve(__dirname, '..');
const load = name => loader.require(path.join(wallet, 'src/shared/rpc', name + '.ts'), __filename);
const read = file => JSON.parse(fs.readFileSync(file));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

(async () => {
  const [output] = process.argv.slice(2);
  assert(output && !fs.existsSync(output));
  const rt = path.join(os.homedir(), '.local/state/rtd-wallet-migration/dev-20261006-03');
  const logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
  const buildFile = path.join(logs, '20261007-default-generation-positive-C42-build-01.json');
  const fixtureFile = path.join(logs, '20261007-G3-staking-fixture-native-audit-02.json');
  const profileFile = path.join(rt, 'certified-positive-transport-release-20261006-01/profile.json');
  const build = read(buildFile), fixture = read(fixtureFile);
  assert(build.passed && fixture.passed && fixture.actualBrowserExecuteRequests === 1);
  const productSource = require('./build-reviewed-generation-production-extension.cjs').productSource;
  assert.deepEqual(productSource(), build.sourceAfter);
  const guard = () => JSON.parse(execFileSync(path.resolve(wallet, '../../rtd-archive-service/localDeploy/data/publisher-venv/bin/python'), ['-c', 'import sys,json;sys.path.insert(0,sys.argv[1]);from restore_wallet_after_system_boot import guard;print(json.dumps(guard()))', path.resolve(wallet, '../../link-u-smart-contract/all-in-one-deploy/localDeploy')], { encoding: 'utf8' }));
  const source = guard();
  const { validateNetworkProfile } = load('profile'), { WalletReadSession } = load('session');
  const { WalletFullnodeReader } = load('fullnode-reader');
  const { WalletTransactionReader } = load('transaction-reader');
  const { prepareStaking, revalidateStaking } = load('staking-preparation');
  const { STAKED_RTD_BCS, SYSTEM_WRAPPER_BCS, stakingBcs } = load('staking-bcs');
  const profile = validateNetworkProfile(read(profileFile));
  assert.equal(profile.expectedGenesisDigest, fixture.h0);
  const owner = fixture.newStake.owner.AddressOwner, stakeId = fixture.newStake.objectId;
  assert.equal(owner, '0x32707d815917729a49dc103a1b511f297de389b19600611fcc1a5cdb8b91dcb7');
  const originalFetch = globalThis.fetch, frames = [], rejected = [], checks = [];
  let session, stage = 'fresh source and original stake', phase = 'native-before', report = {};
  const check = (label, value) => { assert(value, label); checks.push({ label, passed: true }); };
  const project = object => ({ objectId: object.objectId, version: object.version, digest: object.digest, owner: object.owner, type: object.type, contentBase64: toBase64(object.content), objectBcsBase64: toBase64(object.objectBcs) });
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const request = Buffer.from(init?.body ?? []);
    assert.equal(url.origin, 'http://127.0.0.1:41750');
    assert(/\/(GetServiceInfo|GetObject|GetCheckpoint|GetBalance|GetCoinInfo|GetDatatype|GetFunction|GetPackage|ListOwnedObjects|SimulateTransaction)$/.test(url.pathname));
    assert(!request.toString().includes('"jsonrpc"'));
    const callPhase = phase;
    const response = await originalFetch(input, { ...init, credentials: 'omit', redirect: 'error' });
    const bytes = Buffer.from(await response.clone().arrayBuffer());
    assert(bytes.length <= 8 * 1024 * 1024);
    frames.push({ phase: callPhase, url: url.href, status: response.status, requestBase64: request.toString('base64'), responseBase64: bytes.toString('base64') });
    return response;
  };
  try {
    session = new WalletReadSession(profile);
    const native = new WalletFullnodeReader(session), transactions = new WalletTransactionReader(session);
    // Exactly the production reader methods; no browser admission/journal/lock assertion.
    const rpc = { bindingKey: session.bindingKey, readSessionKey: session.cacheKey,
      readFreshObject: native.object.bind(native), readFreshBalance: native.balance.bind(native),
      prepareTransaction: transactions.prepare.bind(transactions), simulateTransaction: transactions.simulate.bind(transactions) };
    const beforeStake = await native.object(stakeId), beforeSystem = await native.object('0x5');
    assert(beforeStake && beforeSystem);
    assert.equal(beforeStake.type, normalizeStructTag('0x3::staking_pool::StakedRtd'));
    assert.deepEqual(beforeStake.owner, { $kind: 'AddressOwner', AddressOwner: owner });
    const decoded = stakingBcs(STAKED_RTD_BCS, beforeStake.content);
    assert.equal(decoded.id, stakeId); assert.equal(decoded.principal.value, '1000000000');
    assert.deepEqual(decoded, fixture.newStake.decoded);
    assert.equal(beforeStake.digest, fixture.newStake.digest); assert.equal(beforeStake.version, fixture.newStake.version);
    const wrapper = stakingBcs(SYSTEM_WRAPPER_BCS, beforeSystem.content);
    assert.equal(wrapper.version, '2'); assert.equal(beforeSystem.owner.$kind, 'Shared');
    const beforeBalance = await native.balance(owner, '0x2::rtd::RTD');
    report.nativeBefore = { stake: project(beforeStake), system: project(beforeSystem), balance: beforeBalance, decoded, wrapper };
    check('fresh original canonical stake and V2 system are still held', true);
    stage = 'production withdraw prepare'; phase = 'withdraw-prepare';
    const prepared = await prepareStaking(rpc, { kind: 'withdraw', sender: owner, objectId: stakeId });
    assert.equal(prepared.sender, owner); assert.equal(prepared.input.kind, 'withdraw');
    assert.equal(prepared.withdrawal.principal, '1000000000');
    assert.equal(prepared.withdrawal.poolId, decoded.pool_id);
    assert.equal(prepared.withdrawal.activationEpoch, decoded.stake_activation_epoch);
    assert.equal(await Transaction.from(prepared.bytesBase64).getDigest(), prepared.digest);
    report.prepared = prepared;
    check('production withdrawal final bytes have original principal and pool', true);
    stage = 'exact original withdrawal revalidation'; phase = 'withdraw-revalidate';
    assert.equal(await revalidateStaking(rpc, prepared, owner), prepared);
    check('actual same approved bytes revalidate without rebuilding', true);
    stage = 'actual changed Gas budget stale digest rejection'; phase = 'changed-gas-stale-digest';
    const changed = Transaction.from(prepared.bytesBase64);
    changed.setGasBudget((BigInt(prepared.gasBudget) + 1000n).toString());
    const changedBytes = toBase64(await changed.build());
    const changedDigest = await changed.getDigest();
    assert.notEqual(changedBytes, prepared.bytesBase64); assert.notEqual(changedDigest, prepared.digest);
    report.changedGas = { bytesBase64: changedBytes, digest: changedDigest, budget: changed.getData().gasData.budget };
    async function rejects(label, action, expected, zeroSimulation) {
      const before = frames.filter(row => row.url.endsWith('/SimulateTransaction')).length;
      let error;
      try { await action(); } catch (caught) { error = caught; }
      assert(error && expected.test(error.message), label);
      const count = frames.filter(row => row.url.endsWith('/SimulateTransaction')).length - before;
      if (zeroSimulation) assert.equal(count, 0);
      rejected.push({ label, errorType: error.name, message: error.message, simulations: count });
      check(label, true);
    }
    await rejects('changed real Gas bytes cannot retain old reviewed digest', () => revalidateStaking(rpc, { ...prepared, bytesBase64: changedBytes }, owner), /原批准交易模拟未通过/, false);
    phase = 'wrong-owner';
    await rejects('fresh real stake rejects a different owner before fee simulation', () => prepareStaking(rpc, { kind: 'withdraw', sender: '0xf320ddb32e8f502479f3bd65ef4d86eeae16e4eec1c01177aa54fb4d603a7590', objectId: stakeId }), /当前账户不拥有该质押仓位/, true);
    phase = 'wrong-type';
    const gasId = Transaction.from(prepared.bytesBase64).getData().gasData.payment[0].objectId;
    await rejects('fresh actual coin cannot masquerade as a staking position', () => prepareStaking(rpc, { kind: 'withdraw', sender: owner, objectId: gasId }), /质押仓位不存在或类型已改变/, true);
    phase = 'wrong-binding';
    await rejects('different binding cannot revalidate the original approval', () => revalidateStaking({ ...rpc, bindingKey: rpc.bindingKey + ':changed' }, prepared, owner), /钱包会话已改变/, true);
    stage = 'fresh unchanged stake and balance'; phase = 'native-after';
    assert.deepEqual(project(await native.object(stakeId)), project(beforeStake));
    assert.deepEqual(await native.balance(owner, '0x2::rtd::RTD'), beforeBalance);
    check('actual simulations do not consume original stake or change balance', true);
    assert.deepEqual(productSource(), build.sourceAfter); assert.deepEqual(guard(), source);
    report = { ...report, passed: true, observedAt: new Date().toISOString(), source: build.sourceAfter, debugSource: source,
      h0: fixture.h0, owner, stakeId, originalStakeDigest: fixture.digest, originalStakeCheckpoint: fixture.receipt.checkpoint,
      frames, rejected, checks, signatures: 0, executeRequests: 0, originalProfilesOpened: 0, browserLaunches: 0,
      indexedStakeAccepted: false, currentC42BrowserAccepted: false, withdrawalExecuted: false, rewardsPaid: false,
      actualSimulationRequests: frames.filter(row => row.url.endsWith('/SimulateTransaction')).length,
      inputsSha256: Object.fromEntries([__filename, buildFile, fixtureFile, profileFile].map(file => [file, sha(file)])),
      scope: 'Current C42 production fresh readers/transaction reader and withdrawal core only. Real original pending stake, current V2 shared system, kind/final enabled simulation and exact-byte revalidation; actual changed Gas budget must reject stale reviewed digest, wrong owner/type/binding fail closed. No browser Provider/preparation guard/journal/lock, indexed new stake, signing/dispatch/withdrawal/rewards or parent acceptance.' };
  } catch (error) {
    report = { ...report, passed: false, observedAt: new Date().toISOString(), stage, errorType: error.name, message: String(error.message).slice(0, 700), frames, rejected, checks, signatures: 0, executeRequests: 0 };
    process.exitCode = 1;
  } finally {
    session?.close(); globalThis.fetch = originalFetch;
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: report.passed, stage: report.stage, frames: frames.length, simulations: report.actualSimulationRequests, executeRequests: 0 }));
  }
})().catch(error => { console.error(JSON.stringify({ passed: false, stage: 'preflight', errorType: error.name, message: String(error.message).slice(0, 500) })); process.exitCode = 1; });
