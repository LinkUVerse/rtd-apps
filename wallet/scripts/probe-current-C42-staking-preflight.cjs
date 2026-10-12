// Actual current C42 staking prerequisites; readonly and no legacy transport.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { RtdGrpcClient } = require('rtd-typescript/grpc');
const { Ed25519Keypair } = require('rtd-typescript/keypairs/ed25519');
const { bcs } = require('rtd-typescript/bcs');
const { normalizeStructTag, normalizeRtdAddress, toBase64 } = require('rtd-typescript/utils');
const loader = require('tsx/cjs/api');
const wallet = path.resolve(__dirname, '..');
const read = file => JSON.parse(fs.readFileSync(file));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const load = name => loader.require(path.join(wallet, 'src/shared/rpc', name + '.ts'), __filename);

(async () => {
  const [output] = process.argv.slice(2);
  assert(output && !fs.existsSync(output));
  const rt = path.join(os.homedir(), '.local/state/rtd-wallet-migration/dev-20261006-03');
  const profileFile = path.join(rt, 'certified-positive-transport-release-20261006-01/profile.json');
  const buildFile = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog/20261007-default-generation-positive-C42-build-01.json');
  const build = read(buildFile);
  assert(build.passed);
  const productSource = require('./build-reviewed-generation-production-extension.cjs').productSource;
  assert.deepEqual(productSource(), build.sourceAfter);
  const { validateNetworkProfile } = load('profile');
  const { WalletReadSession } = load('session');
  const { WalletStakingSnapshotReader } = load('staking-snapshot-reader');
  const { WalletFullnodeReader } = load('fullnode-reader');
  const { decodeFreshObject, FRESH_OBJECT_MASK } = load('fresh-object');
  const { stakingBcs, SYSTEM_WRAPPER_BCS, SYSTEM_V1_BCS, SYSTEM_V2_BCS, STAKED_RTD_BCS, STAKING_RATE_BCS } = load('staking-bcs');
  const profile = validateNetworkProfile(read(profileFile));
  const originalFetch = globalThis.fetch;
  const frames = [], requests = [], rates = [], fields = [], nativeOwners = [];
  let stage = 'private controlled owner inventory', session, proof = {}, phase = 'preflight';
  const beforeMethods = {
    dynamicField: WalletStakingSnapshotReader.prototype.dynamicField,
    dynamicFields: WalletStakingSnapshotReader.prototype.dynamicFields,
  };
  try {
    const owners = read(path.join(rt, 'config/rtd.keystore')).map(encoded => {
      const bytes = Buffer.from(encoded, 'base64');
      return bytes.length === 33 && bytes[0] === 0
        ? Ed25519Keypair.fromSecretKey(bytes.subarray(1)).toRtdAddress() : null;
    }).filter(Boolean);
    assert(owners.length > 0 && owners.length <= 30 && new Set(owners).size === owners.length);
    const sender = '0xf320ddb32e8f502479f3bd65ef4d86eeae16e4eec1c01177aa54fb4d603a7590';
    const receiver = '0x32707d815917729a49dc103a1b511f297de389b19600611fcc1a5cdb8b91dcb7';
    assert(owners.includes(sender) && owners.includes(receiver));
    stage = 'public readonly transport';
    globalThis.fetch = async (input, init) => {
      const u = new URL(input instanceof Request ? input.url : String(input));
      assert.equal(u.hostname, '127.0.0.1');
      const body = init?.body;
      const request = typeof body === 'string' ? Buffer.from(body) : Buffer.from(body ?? []);
      if (u.href === profile.endpoints.graphqlUrl) {
        const parsed = JSON.parse(request.toString());
        assert(!/\bmutation\b/.test(parsed.query));
      } else {
        assert.equal(u.origin, new URL(profile.endpoints.fullnodeGrpcWeb).origin);
        assert(/\/(GetServiceInfo|GetObject|GetCheckpoint|ListOwnedObjects|GetBalance)$/.test(u.pathname));
      }
      const observedPhase = phase;
      requests.push({ phase: observedPhase, url: u.href });
      const response = await originalFetch(input, init);
      const bytes = Buffer.from(await response.clone().arrayBuffer());
      assert(bytes.length <= 8 * 1024 * 1024);
      frames.push({ phase: observedPhase, url: u.href, status: response.status,
        requestBase64: request.toString('base64'), responseBase64: bytes.toString('base64'),
        requestSha256: sha(request), responseSha256: sha(bytes) });
      return response;
    };
    WalletStakingSnapshotReader.prototype.dynamicField = async function(...args) {
      const result = await beforeMethods.dynamicField.apply(this, args);
      if (args[0] === normalizeRtdAddress('0x5')) fields.push({ proof: this.proof, value: result.value });
      return result;
    };
    WalletStakingSnapshotReader.prototype.dynamicFields = async function(...args) {
      const result = await beforeMethods.dynamicFields.apply(this, args);
      const rows = result.value.filter(f => f.valueType === normalizeStructTag('0x3::staking_pool::PoolTokenExchangeRate'))
        .map(f => ({ epoch: stakingBcs(bcs.u64(), f.name.bcs), ...stakingBcs(STAKING_RATE_BCS, f.value.bcs) }));
      if (rows.length) rates.push({ parent: args[0], checkpoint: this.proof.checkpoint, rows });
      return result;
    };
    session = new WalletReadSession(profile);
    const native = new WalletFullnodeReader(session);
    stage = 'actual complete sender staking domain'; phase = 'sender-domain';
    const start = performance.now();
    const senderDomain = await WalletStakingSnapshotReader.read(session, sender);
    assert(senderDomain.snapshot.dependencies.length === 6 && senderDomain.value.validators.length > 0);
    assert(senderDomain.value.positions && rates.length > 0);
    assert(rates.every(r => r.checkpoint === senderDomain.snapshot.checkpoint));
    proof.senderDomain = senderDomain; proof.rateTables = rates.slice();
    proof.domainElapsedMs = performance.now() - start;
    stage = 'fresh canonical system object and active validator membership'; phase = 'native-system';
    const system = await native.object('0x5');
    assert(system && system.owner.$kind === 'Shared');
    const wrapper = stakingBcs(SYSTEM_WRAPPER_BCS, system.content);
    assert(wrapper.id === normalizeRtdAddress('0x5'));
    const systemField = fields.find(f => f.proof.digest === senderDomain.snapshot.digest);
    assert(systemField?.value && systemField.value.name.type === 'u64');
    const inner = await native.object(systemField.value.fieldId);
    assert(inner && inner.content.length > 40 && toBase64(inner.content.subarray(0, 32)) === toBase64(bcs.Address.serialize(inner.objectId).toBytes()));
    assert(stakingBcs(bcs.u64(), inner.content.subarray(32, 40)) === wrapper.version);
    assert(toBase64(inner.content.subarray(40)) === toBase64(systemField.value.value.bcs));
    const current = stakingBcs(wrapper.version === '1' ? SYSTEM_V1_BCS : SYSTEM_V2_BCS, inner.content.subarray(40));
    assert(current.epoch === senderDomain.value.epoch);
    assert.deepEqual(current.validators.active_validators.map(v => v.metadata.rtd_address).sort(),
      senderDomain.value.validators.filter(v => v.active).map(v => v.address).sort());
    proof.nativeSystem = { objectId: system.objectId, version: system.version, digest: system.digest,
      objectBcsBase64: toBase64(system.objectBcs), innerObjectId: inner.objectId, innerVersion: inner.version,
      innerDigest: inner.digest, innerObjectBcsBase64: toBase64(inner.objectBcs), epoch: current.epoch,
      activeValidatorAddresses: current.validators.active_validators.map(v => v.metadata.rtd_address) };
    const client = new RtdGrpcClient({ network: profile.sdkNetwork, baseUrl: profile.endpoints.fullnodeGrpcWeb,
      format: 'binary', fetch: globalThis.fetch, mvr: { url: '' } });
    const stakeType = normalizeStructTag('0x3::staking_pool::StakedRtd');
    stage = 'actual controlled native stake inventory'; phase = 'native-stakes';
    for (const owner of owners) {
      const signal = AbortSignal.any([session.signal, AbortSignal.timeout(20000)]);
      const before = (await session.request(signal, () => client.ledgerService.getServiceInfo({}, { abort: signal }))).response;
      assert.equal(before.chainId, profile.expectedGenesisDigest);
      let token; const positions = [], cursors = new Set();
      for (let page = 0; page < 100; page++) {
        const response = (await session.request(signal, () => client.stateService.listOwnedObjects({ owner,
          objectType: stakeType, pageSize: 100, pageToken: token, readMask: { paths: [...FRESH_OBJECT_MASK] } }, { abort: signal }))).response;
        for (const raw of response.objects) {
          const item = decodeFreshObject(raw, raw.objectId);
          assert(item.type === stakeType);
          assert(item.owner.$kind === 'AddressOwner' ? item.owner.AddressOwner === owner
            : item.owner.$kind === 'ConsensusAddressOwner' && item.owner.ConsensusAddressOwner.owner === owner);
          const decoded = stakingBcs(STAKED_RTD_BCS, item.content); assert(decoded.id === item.objectId);
          positions.push({ objectId: item.objectId, version: item.version, digest: item.digest,
            principal: decoded.principal.value, poolId: decoded.pool_id, activationEpoch: decoded.stake_activation_epoch,
            owner: item.owner, objectBcsBase64: toBase64(item.objectBcs) });
        }
        token = response.nextPageToken;
        if (token === undefined) break;
        assert(page < 99 && token.length > 0 && !cursors.has(toBase64(token))); cursors.add(toBase64(token));
      }
      assert(new Set(positions.map(p => p.objectId)).size === positions.length);
      const after = (await session.request(signal, () => client.ledgerService.getServiceInfo({}, { abort: signal }))).response;
      assert.equal(after.chainId, before.chainId); assert(after.checkpointHeight >= before.checkpointHeight);
      nativeOwners.push({ owner, beforeCheckpoint: String(before.checkpointHeight), afterCheckpoint: String(after.checkpointHeight), positions });
    }
    phase = 'controlled-available-funds';
    proof.senderBalance = await native.balance(sender, '0x2::rtd::RTD');
    proof.senderCoins = await native.coins(sender, '0x2::rtd::RTD');
    assert(BigInt(proof.senderBalance.balance) > 0n);
    assert.deepEqual(productSource(), build.sourceAfter);
    proof = { ...proof, passed: true, observedAt: new Date().toISOString(), source: build.sourceAfter,
      h0: profile.expectedGenesisDigest, controlledOwners: nativeOwners, requests, frames,
      withdrawalFixtureAvailable: nativeOwners.some(row => row.positions.length > 0),
      simulations: 0, signatures: 0, executeRequests: 0, originalProfilesOpened: 0, containersChanged: 0,
      inputsSha256: Object.fromEntries([__filename, profileFile, buildFile].map(file => [file, sha(fs.readFileSync(file))])),
      scope: 'Actual C42 unchanged staking production source, complete sender staking-only snapshot and rates; independently fresh canonical system inner matches indexed bytes/epoch/active members. Complete controlled-keystore native stake scan and fresh balance/coins. Node read-only prerequisite, not Chrome origin/TLS, full stake/withdraw forms, execution lock or parent acceptance.' };
  } catch (error) {
    proof = { ...proof, passed: false, stage, errorType: error.name,
      message: stage.startsWith('private') ? 'Private inventory failure redacted' : String(error.message).slice(0, 700),
      requests, frames, controlledOwners: nativeOwners, simulations: 0, signatures: 0, executeRequests: 0 };
    process.exitCode = 1;
  } finally {
    if (session) session.close(); globalThis.fetch = originalFetch;
    Object.assign(WalletStakingSnapshotReader.prototype, beforeMethods);
    fs.writeFileSync(output, JSON.stringify(proof, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: proof.passed, stage: proof.stage, frames: frames.length,
      owners: nativeOwners.length, stakes: nativeOwners.reduce((n, row) => n + row.positions.length, 0),
      withdrawalFixtureAvailable: proof.withdrawalFixtureAvailable, executeRequests: 0 }));
  }
})().catch(error => { console.error(JSON.stringify({ passed: false, stage: 'preflight', errorType: error.name })); process.exitCode = 1; });
