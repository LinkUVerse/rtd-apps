// Original once-executed stake, current complete production domains, fresh canonical objects; no keys/actions.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const loader = require('tsx/cjs/api'), { RtdGrpcClient } = require('rtd-typescript/grpc'), { toBase64 } = require('rtd-typescript/utils');
const wallet = path.resolve(__dirname, '..'), read = f => JSON.parse(fs.readFileSync(f)), sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const load = n => loader.require(path.join(wallet, 'src/shared/rpc', n + '.ts'), __filename);
(async () => {
  const [windowFile, output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
  const logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog'), rt = path.join(os.homedir(), '.local/state/rtd-wallet-migration/dev-20261006-03');
  const buildFile = path.join(logs, '20261007-default-generation-positive-C42-build-01.json'), fixtureFile = path.join(logs, '20261007-G3-staking-fixture-native-audit-02.json');
  const profileFile = path.join(rt, 'certified-positive-transport-release-20261006-01/profile.json'), build = read(buildFile), fixture = read(fixtureFile), env = read(windowFile);
  const frames = [], originalFetch = globalThis.fetch; let session, report = {}, stage = 'new interval environment';
  globalThis.fetch = async (input, init) => {
    const u = new URL(input instanceof Request ? input.url : String(input)), body = Buffer.from(init?.body ?? []);
    assert.equal(u.hostname, '127.0.0.1'); assert(!body.toString().includes('"jsonrpc"'));
    assert(u.href === 'http://127.0.0.1:41954/graphql' || u.port === '41750' && /\/(GetServiceInfo|GetObject|GetCheckpoint)$/.test(u.pathname));
    const response = await originalFetch(input, { ...init, credentials: 'omit', redirect: 'error' });
    frames.push({ url: u.href, status: response.status, requestBase64: body.toString('base64'), responseBase64: Buffer.from(await response.clone().arrayBuffer()).toString('base64') }); return response;
  };
  const project = o => ({ objectId: o.objectId, version: o.version, digest: o.digest, owner: o.owner, type: o.type, contentBase64: toBase64(o.content), previousTransaction: o.previousTransaction, ...(o.objectBcs ? { objectBcsBase64: toBase64(o.objectBcs) } : {}) });
  try {
    assert(env.passed && ['finite', 'restored'].includes(env.phase) && env.through === 333000 && env.currentC42OriginRegistered);
    assert(Date.now() - Date.parse(env.observedAt) < 300000); assert(env.effectiveAssetWindow.originalStakingExecutionHeightReached);
    for (const [f, h] of Object.entries(env.inputsSha256)) assert.equal(sha(f), h);
    assert(build.passed && fixture.passed && fixture.actualBrowserExecuteRequests === 1);
    assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), build.sourceAfter);
    const { validateNetworkProfile } = load('profile'), { WalletReadSession } = load('session'), { WalletStakingSnapshotReader } = load('staking-snapshot-reader');
    const { WalletAssetReader } = load('asset-reader'), { WalletFullnodeReader } = load('fullnode-reader'), { STAKED_RTD_BCS, SYSTEM_WRAPPER_BCS, stakingBcs } = load('staking-bcs');
    session = new WalletReadSession(validateNetworkProfile(read(profileFile))); assert.equal(session.profile.expectedGenesisDigest, fixture.h0);
    const owner = fixture.newStake.owner.AddressOwner, stakeId = fixture.newStake.objectId;
    const options = { minimumCheckpoint: '332734', window: { lower: env.effectiveAssetWindow.commonLo, upper: env.effectiveAssetWindow.commonHi } };
    stage = 'current complete six-dependency staking domain';
    const staking = await WalletStakingSnapshotReader.open(session, options), domain = await staking.staking(owner);
    assert.equal(domain.snapshot.dependencies.length, 6); assert(BigInt(domain.snapshot.checkpoint) >= 332734n);
    assert.equal(domain.value.positions.length, 1); const position = domain.value.positions[0]; assert.equal(position.objectId, stakeId);
    assert.equal(position.version, fixture.newStake.version); assert.equal(position.digest, fixture.newStake.digest);
    assert.equal(position.principal, '1000000000'); assert.equal(position.poolId, fixture.newStake.decoded.pool_id);
    assert.equal(position.activationEpoch, fixture.newStake.decoded.stake_activation_epoch);
    const pendingAtSnapshot = BigInt(position.activationEpoch) > BigInt(domain.value.epoch);
    assert.equal(position.status, pendingAtSnapshot ? 'pending' : 'active');
    if (pendingAtSnapshot) assert.deepEqual(position.reward, { state: 'unknown', reason: 'pending' });
    assert(domain.value.validators.some(v => v.address === position.validatorAddress && v.active && v.poolId === position.poolId));
    const indexed = (await staking.objects([stakeId])).value[0]; assert(indexed && !(indexed instanceof Error));
    stage = 'current full ten-dependency owned asset collection';
    const assets = await WalletAssetReader.open(session, options), owned = await assets.ownedObjects(owner);
    const assetStake = owned.value.find(o => o.objectId === stakeId); assert(assetStake);
    stage = 'fresh canonical stake and V2 system'; const native = new WalletFullnodeReader(session), stake = await native.object(stakeId), system = await native.object('0x5');
    assert(stake && system); assert.equal(stake.previousTransaction, fixture.originalDigest ?? fixture.digest);
    assert.equal(stakingBcs(SYSTEM_WRAPPER_BCS, system.content).version, '2');
    assert.deepEqual(stakingBcs(STAKED_RTD_BCS, stake.content), fixture.newStake.decoded);
    for (const o of [indexed, assetStake]) { for (const field of ['objectId', 'version', 'digest', 'type']) assert.equal(o[field], stake[field]); assert.deepEqual(o.owner, stake.owner); assert.equal(toBase64(o.content), toBase64(stake.content)); }
    stage = 'fresh snapshot markers'; const client = new RtdGrpcClient({ network: 'localnet', baseUrl: 'http://127.0.0.1:41750', format: 'binary', fetch: globalThis.fetch, mvr: { url: '' } }), markers = [];
    for (const snapshot of [domain.snapshot, assets.proof]) { const cp = (await client.ledgerService.getCheckpoint({ checkpointId: { oneofKind: 'sequenceNumber', sequenceNumber: BigInt(snapshot.checkpoint) }, readMask: { paths: ['sequence_number', 'digest', 'summary', 'contents'] } }, { timeout: 20000 })).response.checkpoint; assert.equal(cp.digest, snapshot.digest); if (snapshot === domain.snapshot) assert.equal(String(cp.summary.epoch), domain.value.epoch); markers.push({ checkpoint: snapshot.checkpoint, digest: snapshot.digest, epoch: String(cp.summary.epoch) }); }
    await staking.snapshot.revalidate(); await assets.snapshot.revalidate();
    assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), build.sourceAfter);
    report = { passed: true, observedAt: new Date().toISOString(), source: build.sourceAfter, h0: fixture.h0, generation: session.profile.generation, owner,
      originalDigest: fixture.originalDigest ?? fixture.digest, originalCheckpoint: '332734', stakeId, domain, assetProof: assets.proof,
      completeOwnedAssetCount: owned.value.length, indexedStake: project(indexed), assetStake: project(assetStake), freshStake: project(stake), freshSystem: project(system), markers,
      originalStakeIndexedInBothProductionDomains: true, pendingAtSnapshot, unknownPendingRewardRetained: pendingAtSnapshot, currentChromeStakeWithdrawAccepted: false, parentTX08Complete: false };
  } catch (error) { report = { passed: false, observedAt: new Date().toISOString(), stage, errorType: error.name, message: String(error.message).slice(0, 650) }; process.exitCode = 1; }
  finally { session?.close(); globalThis.fetch = originalFetch; fs.writeFileSync(output, JSON.stringify({ ...report, frames, simulations: 0, signatures: 0, executeRequests: 0, keystoreRead: false,
    inputsSha256: Object.fromEntries([__filename, path.resolve(windowFile), buildFile, fixtureFile, profileFile].map(f => [f, sha(f)])),
    scope: 'Original once-executed332734 stake; current C42 complete six-dependency staking and ten-dependency owned assets at real S>=T, original current identity/principal/pool/pending-unknown reward plus fresh native canonical stake/V2 system and two actual native markers. Node only; no journal injection, key access, browser competition, new staking/withdraw dispatch, parent acceptance.' }, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ passed: report.passed, stage: report.stage, message: report.message, frames: frames.length })); }
})().catch(error => { console.error(JSON.stringify({ passed: false, message: String(error.message).slice(0, 300) })); process.exitCode = 1; });
