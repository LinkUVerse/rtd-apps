// Actual post-transfer production snapshot. No keystore, Chrome, simulation or dispatch.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), { execFileSync } = require('node:child_process');
const { RtdGrpcClient } = require('rtd-typescript/grpc');
const { toBase64 } = require('rtd-typescript/utils');
const { Transaction } = require('rtd-typescript/transactions');
const { bcs } = require('rtd-typescript/bcs');
const loader = require('tsx/cjs/api');
const wallet = path.resolve(__dirname, '..'), root = path.resolve(wallet, '../..');
const load = n => loader.require(path.join(wallet, 'src/shared/rpc', n + '.ts'), __filename);
const read = f => JSON.parse(fs.readFileSync(f));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
(async () => {
  const [windowFile, output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
  const logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
  const rt = path.join(os.homedir(), '.local/state/rtd-wallet-migration/dev-20261006-03');
  const oracleFile = path.join(logs, '20261007-C40-framework-single-native-audit-01.json');
  const buildFile = path.join(logs, '20261007-default-generation-positive-C42-build-01.json');
  const profileFile = path.join(rt, 'certified-positive-transport-release-20261006-01/profile.json');
  const proof = read(windowFile), oracle = read(oracleFile), build = read(buildFile);
  const pins = Object.fromEntries([__filename, path.resolve(windowFile), oracleFile, buildFile, profileFile].map(f => [f, sha(f)]));
  const originalFetch = globalThis.fetch, frames = []; let session, stage = 'current authority', report = {};
  const ld = path.join(root, 'link-u-smart-contract/all-in-one-deploy/localDeploy');
  const held = () => execFileSync(path.join(root, 'rtd-archive-service/localDeploy/data/publisher-venv/bin/python'),
    ['-c', 'import sys;sys.path.insert(0,sys.argv[1]);from wallet_C41_followup_ownership import holder;holder()();print("held")', ld], { encoding: 'utf8', timeout: 60000 }).trim();
  const project = o => ({ objectId: o.objectId, version: o.version, digest: o.digest, owner: o.owner, type: o.type,
    previousTransaction: o.previousTransaction, contentBase64: toBase64(o.content), ...(o.objectBcs ? { objectBcsBase64: toBase64(o.objectBcs) } : {}) });
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert(url.hostname === '127.0.0.1'); assert(['41750', '41954', '41955'].includes(url.port));
    assert(url.pathname === '/graphql' || /\/(GetServiceInfo|GetObject|GetTransaction|GetCheckpoint)$/.test(url.pathname));
    const request = Buffer.from(init?.body ?? []); assert(!request.toString().includes('"jsonrpc"'));
    const response = await originalFetch(input, { ...init, credentials: 'omit', redirect: 'error',
      headers: { ...Object.fromEntries(new Headers(init?.headers)), Origin: 'chrome-extension://inejiinamojodncefjohnjceedcpbgfg' } });
    const bytes = Buffer.from(await response.clone().arrayBuffer()); assert(bytes.length <= 8 * 1024 * 1024);
    frames.push({ phase: stage, url: url.href, status: response.status,
      responseHeaders: Object.fromEntries(['content-type', 'grpc-status', 'grpc-message', 'x-rtd-chain-id'].map(n => [n, response.headers.get(n)])),
      requestBase64: request.toString('base64'), responseBase64: bytes.toString('base64') });
    return response;
  };
  try {
    assert(proof.passed && proof.phase === 'restored' && proof.catchupAccepted && proof.currentC42OriginRegistered);
    assert(Date.now() - Date.parse(proof.observedAt) < 300000);
    for (const [f, h] of Object.entries(proof.inputsSha256)) assert.equal(sha(f), h);
    assert(oracle.passed && oracle.receipt.checkpoint === '281963' && build.passed);
    assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), build.sourceAfter);
    assert.equal(held(), 'held');
    const { validateNetworkProfile } = load('profile'), { WalletReadSession } = load('session');
    const { WalletAssetReader } = load('asset-reader'), { WalletFullnodeReader } = load('fullnode-reader');
    const { WalletExecutionReader } = load('execution-reader');
    const profile = validateNetworkProfile(read(profileFile)); assert.equal(profile.expectedGenesisDigest, oracle.h0);
    session = new WalletReadSession(profile);
    stage = 'current complete production snapshot';
    const asset = await WalletAssetReader.open(session, { timeoutMs: 60000, minimumCheckpoint: '281963',
      window: { lower: proof.effectiveAssetWindow.commonLo, upper: proof.effectiveAssetWindow.commonHi } });
    assert.equal(asset.proof.dependencies.length, 10); assert(BigInt(asset.proof.checkpoint) >= 281963n);
    const kiosks = await asset.nativeKiosks(oracle.owner);
    assert.equal(typeof oracle.sourceKiosk.id, 'string');
    const original = kiosks.value.filter(k => k.kioskId === oracle.sourceKiosk.id);
    assert.equal(original.length, 1); const kiosk = original[0];
    assert.equal(kiosk.ownerCap.objectId, oracle.originalCapId); assert.equal(kiosk.ownerCap.isPersonal, false);
    assert.equal(kiosk.owner, oracle.owner); assert.equal(kiosk.items.length, 0);
    const owned = await asset.ownedObjects(oracle.recipient, { pageSize: 3 });
    const nft = owned.value.find(o => o.objectId === oracle.nftId); assert(nft);
    assert.deepEqual(nft.owner, { $kind: 'AddressOwner', AddressOwner: oracle.recipient });
    assert.equal(nft.previousTransaction, oracle.digest); assert.equal(nft.version, oracle.currentNftVersion);
    assert.equal(nft.digest, oracle.currentNftDigest);
    stage = 'fresh current native and original receipt';
    const fresh = await new WalletFullnodeReader(session).object(oracle.nftId); assert(fresh);
    for (const field of ['objectId', 'version', 'digest', 'type', 'previousTransaction']) assert.equal(fresh[field], nft[field]);
    assert.deepEqual(fresh.owner, nft.owner); assert.equal(toBase64(fresh.content), toBase64(nft.content));
    const details = await new WalletExecutionReader(session).details(oracle.digest); assert(details);
    assert.equal(await Transaction.from(details.transaction.bcs).getDigest(), oracle.digest);
    assert.equal(toBase64(details.transaction.bcs), read(path.join(rt, 'framework-C40-single-execution-20261007-01/attempt.json')).bytesBase64);
    stage = 'exact archive version and snapshot marker';
    const archive = new RtdGrpcClient({ network: profile.sdkNetwork, baseUrl: profile.endpoints.archiveGrpcWeb, format: 'binary', fetch: globalThis.fetch, mvr: { url: '' } });
    assert.equal((await archive.ledgerService.getServiceInfo({}, { timeout: 20000 })).response.chainId, oracle.h0);
    const obj = (await archive.ledgerService.getObject({ objectId: oracle.nftId, version: BigInt(nft.version),
      readMask: { paths: ['object_id', 'version', 'digest', 'owner', 'object_type', 'bcs', 'contents', 'previous_transaction'] } }, { timeout: 20000 })).response.object;
    assert(obj && obj.digest === nft.digest && String(obj.version) === nft.version && obj.owner.address === oracle.recipient);
    assert.equal(toBase64(obj.contents.value), toBase64(nft.content)); assert.equal(toBase64(obj.bcs.value), toBase64(fresh.objectBcs));
    const parsed = bcs.Object.parse(obj.bcs.value); assert.deepEqual(parsed.owner, fresh.owner);
    const marker = (await archive.ledgerService.getCheckpoint({ checkpointId: { oneofKind: 'sequenceNumber', sequenceNumber: BigInt(asset.proof.checkpoint) },
      readMask: { paths: ['sequence_number', 'digest', 'summary', 'contents'] } }, { timeout: 20000 })).response.checkpoint;
    assert.equal(marker.digest, asset.proof.digest); assert.equal(String(marker.sequenceNumber), asset.proof.checkpoint);
    await asset.snapshot.revalidate(); assert.equal(held(), 'held');
    for (const [f, h] of Object.entries(pins)) assert.equal(sha(f), h);
    report = { passed: true, observedAt: new Date().toISOString(), source: build.sourceAfter, h0: oracle.h0, generation: profile.generation,
      snapshot: asset.proof, originalDigest: oracle.digest, originalCheckpoint: oracle.receipt.checkpoint,
      sender: oracle.owner, recipient: oracle.recipient, kioskId: kiosk.kioskId, originalCapId: kiosk.ownerCap.objectId,
      currentKioskItems: 0, recipientOwnedObjects: owned.value.map(project), currentNft: project(fresh),
      senderOriginalCapRetained: true, completeRecipientPagination: true, fullnodeArchiveAndGraphqlExactVersionMatch: true,
      currentC42BrowserAccepted: false, allNamesCurrentAccepted: false, parentTX08Complete: false };
  } catch (error) {
    report = { passed: false, observedAt: new Date().toISOString(), stage, errorType: error.name, message: String(error.message).slice(0, 800) }; process.exitCode = 1;
  } finally {
    session?.close(); globalThis.fetch = originalFetch;
    fs.writeFileSync(output, JSON.stringify({ ...report, frames, inputsSha256: pins, originalProfilesOpened: 0,
      keystoreRead: false, browserLaunches: 0, simulations: 0, signatures: 0, executeRequests: 0,
      scope: 'Current C42 source and completed restored authority. Actual full production ten-dependency snapshot, original sender cap/empty Kiosk and all recipient owned-object pages; original NFT fresh native and exact archive version/body/owner and S marker, original receipt details readonly. No original execution profile opened or resent; not UI refresh, names freshness, all transfer entries or parent acceptance.' }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: report.passed, stage: report.stage, message: report.message, requests: frames.length, executeRequests: 0 }));
  }
})().catch(error => { console.error(JSON.stringify({ passed: false, message: String(error.message).slice(0, 300) })); process.exitCode = 1; });
