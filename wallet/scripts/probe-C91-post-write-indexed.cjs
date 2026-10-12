// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Current production post-write reads only; no browser, key, signing or Execute.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), cp = require('node:child_process');
const contract = require('./lib/C53-post-write-contract.cjs');
const wallet = path.resolve(__dirname, '..'), root = path.resolve(wallet, '../..');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

async function main() {
  const [readinessFile, output] = process.argv.slice(2);
  assert(readinessFile && output && !fs.existsSync(output));
  const logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
  const executionFile = path.join(logs, '20261007-C48-nft-execution-browser-independent-02.json');
  const browserFile = path.join(logs, '20261007-C48-nft-execution-browser-01.json');
  const oracleFile = path.join(logs, '20261007-C43-nonempty-kiosk-native-independent-01.json');
  const readiness = read(readinessFile), execution = read(executionFile), browser = read(browserFile), oracle = read(oracleFile);
  const frames = [], oldFetch = globalThis.fetch;
  let session, stage = 'fresh prerequisites', result = { passed: false };
  const files = [__filename, path.resolve(readinessFile), executionFile, browserFile, oracleFile,
    path.join(__dirname, 'lib/C53-post-write-contract.cjs')];
  let pins = {}, protectedPins = {};
  try {
    for (const proof of [readiness, execution, browser, oracle]) {
      assert(proof.passed);
      for (const [file, hash] of Object.entries(proof.inputsSha256)) assert.equal(sha(file), hash);
    }
    assert.equal(readiness.h0, oracle.h0);
    assert.equal(browser.owner, oracle.addresses.source);
    assert(execution.postWriteIndexAccepted === false && browser.executeRequests === 6);
    assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), execution.source);
    protectedPins = read(path.join(readiness.fixture, 'intent.json')).protectedOriginalsSha256;
    assert.equal(Object.keys(protectedPins).length, 1015);
    const heldFiles = () => { for (const [file, hash] of Object.entries(protectedPins)) assert.equal(sha(file), hash); };
    heldFiles();
    if (!readiness.infrastructureReadyForProductionProbe) {
      assert.throws(() => contract.admission(readiness, execution), { message: /Post-write coverage is incomplete/ });
      assert.equal(frames.length, 0);
      result = { passed: true, mode: 'uncovered-preflight-denied', observedAt: new Date().toISOString(),
        h0: execution.h0, generation: execution.generation, targetCheckpoint: 524022,
        missingGates: Object.entries(readiness.coverageGates).filter(([, value]) => value !== true).map(([key]) => key),
        sessionsCreated: 0, requests: 0, postWriteIndexAccepted: false, completeAccountHistoryAccepted: false,
        completeSupportedAccountWindowAccepted: false,
        scope: 'Actual fresh coverage evidence fails the new post-write preflight before any session or IO. This limited negative test does not repeat the previously proven production reader coverage refusal and does not accept inventory, history, Chrome or a parent task.' };
    } else {
      contract.admission(readiness, execution);
      const profileFile = path.resolve(readiness.fixture, '../certified-positive-transport-release-20261006-01/profile.json');
      files.push(profileFile);
      const loader = require('tsx/cjs/api');
      const load = name => loader.require(path.join(wallet, 'src/shared/rpc', name + '.ts'), __filename);
      const { validateNetworkProfile } = load('profile'), { WalletReadSession } = load('session');
      const { WalletAssetReader } = load('asset-reader'), { WalletFullnodeReader } = load('fullnode-reader');
      const { WalletExecutionReader } = load('execution-reader'), { WalletAccountHistoryReader } = load('account-history-reader');
      const { RtdGrpcClient } = require('rtd-typescript/grpc');
      const { Transaction } = require('rtd-typescript/transactions'), { bcs } = require('rtd-typescript/bcs');
      const { toBase64, toBase58 } = require('rtd-typescript/utils'), { blake2b } = require('@noble/hashes/blake2.js');
      const typed = (type, bytes) => toBase58(blake2b(Buffer.concat([Buffer.from(type + '::'), Buffer.from(bytes)]), { dkLen: 32 }));
      const profile = validateNetworkProfile(read(profileFile));
      assert.equal(profile.expectedGenesisDigest, execution.h0);
      assert.equal(profile.generation, execution.generation);
      assert.deepEqual([profile.endpoints.fullnodeGrpcWeb, profile.endpoints.graphqlUrl,
        profile.endpoints.archiveGrpcWeb, profile.endpoints.accountHistoryUrl].map(u => new URL(u).port),
        ['41750', '41954', '41955', '41956']);
      const ld = path.join(root, 'link-u-smart-contract/all-in-one-deploy/localDeploy');
      const capture = () => cp.execFileSync(path.join(root, 'rtd-archive-service/localDeploy/data/publisher-venv/bin/python'),
        ['-c', 'import sys,json,hashlib;sys.path.insert(0,sys.argv[1]);from wallet_C91_publisher_current_ownership import capture;c=capture();print(hashlib.sha256(json.dumps(c,sort_keys=True).encode()).hexdigest())', ld],
        { encoding: 'utf8', timeout: 60000 }).trim();
      const authority = capture();
      assert.match(authority, /^[0-9a-f]{64}$/);
      globalThis.fetch = async (input, init) => {
        const u = new URL(input instanceof Request ? input.url : String(input));
        assert.equal(u.hostname, '127.0.0.1');
        assert(['41750', '41954', '41955', '41956'].includes(u.port));
        assert(['/graphql', '/account/graphql'].includes(u.pathname) ||
          /\/(GetServiceInfo|GetObject|GetTransaction|GetCheckpoint|GetAvailableRange)$/.test(u.pathname));
        const request = Buffer.from(init?.body ?? []);
        assert(!request.toString().includes('"jsonrpc"'));
        const response = await oldFetch(input, { ...init, credentials: 'omit', redirect: 'error',
          headers: { ...Object.fromEntries(new Headers(init?.headers)), Origin: 'chrome-extension://nbmpcfknfgjmecallhngcincnhklllpj' } });
        const body = Buffer.from(await response.clone().arrayBuffer());
        assert(body.length <= 16 * 1024 * 1024);
        frames.push({ stage, url: u.href, status: response.status,
          requestBase64: request.toString('base64'), responseBase64: body.toString('base64') });
        return response;
      };
      session = new WalletReadSession(profile);
      stage = 'same-S post-write inventories';
      const asset = await WalletAssetReader.open(session, { minimumCheckpoint: '524022', timeoutMs: 60000,
        window: { lower: readiness.effectiveAssetWindow.commonLo, upper: readiness.effectiveAssetWindow.commonHi } });
      assert(BigInt(asset.proof.checkpoint) >= 524022n && asset.proof.dependencies.length === 10);
      const routeFile = path.join(readiness.fixture, 'seed/route-binding.json');
      files.push(routeFile);
      const route = read(routeFile), owners = {};
      for (const role of ['source', 'existingTarget', 'newTarget']) {
        const address = oracle.addresses[role];
        const kiosks = await asset.kiosks(address);
        const direct = await asset.ownedObjects(address, { type: route.nftType, pageSize: 1 });
        assert.equal(kiosks.snapshot.cacheKey, asset.proof.cacheKey);
        assert.equal(direct.snapshot.cacheKey, asset.proof.cacheKey);
        owners[role] = { address, kiosks: kiosks.value, direct: direct.value };
      }
      const items = contract.inventory(oracle, execution, owners);
      const caps = Object.entries(owners).flatMap(([role, value]) => value.kiosks.map(kiosk => ({
        role, owner: value.address, objectId: kiosk.kind === 'framework' ? kiosk.ownerCap.objectId : kiosk.ownerTokenId,
      })));
      assert.equal(caps.length, 5);
      assert.equal(new Set(caps.map(cap => cap.objectId)).size, 5);
      const capObjects = await asset.objects(caps.map(cap => cap.objectId));
      assert.equal(capObjects.snapshot.cacheKey, asset.proof.cacheKey);
      for (const cap of caps) {
        const object = capObjects.value.find(object => !(object instanceof Error) && object.objectId === cap.objectId);
        assert(object && !(object instanceof Error));
        assert.deepEqual(object.owner, { $kind: 'AddressOwner', AddressOwner: cap.owner });
      }
      stage = 'fresh native and exact archive versions';
      const fullnode = new WalletFullnodeReader(session), current = [];
      const archive = new RtdGrpcClient({ network: profile.sdkNetwork, baseUrl: profile.endpoints.archiveGrpcWeb,
        format: 'binary', fetch: globalThis.fetch, mvr: { url: '' } });
      assert.equal((await archive.ledgerService.getServiceInfo({}, { timeout: 20000 })).response.chainId, execution.h0);
      for (const item of [...items, ...capObjects.value]) {
        assert(!(item instanceof Error));
        const fresh = await fullnode.object(item.objectId);
        assert(fresh);
        for (const field of ['objectId', 'version', 'digest', 'type', 'previousTransaction']) assert.equal(fresh[field], item[field]);
        assert.deepEqual(fresh.owner, item.owner);
        assert.equal(toBase64(fresh.content), toBase64(item.content));
        const object = (await archive.ledgerService.getObject({ objectId: item.objectId, version: BigInt(item.version),
          readMask: { paths: ['object_id', 'version', 'digest', 'owner', 'object_type', 'bcs', 'contents', 'previous_transaction'] } },
          { timeout: 20000 })).response.object;
        assert(object && String(object.version) === item.version && object.digest === item.digest);
        assert.equal(toBase64(object.contents.value), toBase64(fresh.content));
        assert.equal(toBase64(object.bcs.value), toBase64(fresh.objectBcs));
        const value = bcs.Object.parse(object.bcs.value);
        assert.equal(toBase64(bcs.Object.serialize(value).toBytes()), toBase64(object.bcs.value));
        assert.deepEqual(value.owner, fresh.owner);
        assert.equal(typed('Object', object.bcs.value), item.digest);
        current.push({ objectId: fresh.objectId, version: fresh.version, digest: fresh.digest, type: fresh.type,
          owner: fresh.owner, previousTransaction: fresh.previousTransaction,
          contentBase64: toBase64(fresh.content), objectBcsBase64: toBase64(fresh.objectBcs) });
      }
      const marker = (await archive.ledgerService.getCheckpoint({ checkpointId: { oneofKind: 'sequenceNumber',
        sequenceNumber: BigInt(asset.proof.checkpoint) }, readMask: { paths: ['sequence_number', 'digest', 'summary', 'contents'] } },
        { timeout: 20000 })).response.checkpoint;
      assert.equal(String(marker.sequenceNumber), asset.proof.checkpoint);
      assert.equal(marker.digest, asset.proof.digest);
      assert.equal(typed('CheckpointSummary', marker.summary.bcs.value), marker.digest);
      assert.equal(typed('CheckpointContents', marker.contents.bcs.value), marker.contents.digest);
      assert.equal(marker.summary.contentDigest, marker.contents.digest);
      stage = 'original six digest details';
      const details = [];
      for (const dispatch of execution.sixFirstDispatches) {
        const detail = await new WalletExecutionReader(session).details(dispatch.digest);
        assert(detail);
        const original = browser.previews.find(row => row.label === dispatch.label);
        assert.equal(toBase64(detail.transaction.bcs), original.approval.prepared.bytesBase64);
        assert.equal(await Transaction.from(detail.transaction.bcs).getDigest(), dispatch.digest);
        details.push({ label: dispatch.label, digest: dispatch.digest, originalBytesMatch: true,
          transactionBase64: toBase64(detail.transaction.bcs) });
      }
      stage = 'complete three-owner account histories';
      const historyReader = new WalletAccountHistoryReader(session, { minimumCheckpoint: '524022', pageSize: 2 });
      const histories = {};
      for (const role of ['source', 'existingTarget', 'newTarget']) histories[role] = await historyReader.read(oracle.addresses[role]);
      contract.histories(oracle, execution, histories);
      await asset.snapshot.revalidate();
      heldFiles();
      assert.equal(capture(), authority);
      assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), execution.source);
      result = { passed: true, mode: 'covered-post-write-read', observedAt: new Date().toISOString(),
        h0: execution.h0, generation: execution.generation, targetCheckpoint: 524022, snapshot: asset.proof,
        owners, caps, freshNativeAndArchivedObjects: current, originalDigestDetails: details, histories,
        runtimeCaptureSha256: authority, source: execution.source,
        postWriteIndexAccepted: true, completeAccountHistoryAccepted: false,
        completeSupportedAccountWindowAccepted: true,
        chromeAccepted: false, parentCompletion: false,
        scope: 'Actual current production same-S ten-domain/Display post-six-transfer inventories, original caps and two retained restrictions, four recipient direct NFT pages and two OB targets; thirteen fresh native/exact archive versions and canonical BCS, typed archive S, original six bytes/digests, and three separately admitted complete supported-activity windows with original false/nullable whole-account flags preserved. Readonly only; whole-account certification, Chrome refresh and whole parent acceptance remain separate.' };
    }
  } catch (error) {
    result = { passed: false, observedAt: new Date().toISOString(), stage, errorType: error.name,
      message: String(error.message).slice(0, 1000), postWriteIndexAccepted: false, completeAccountHistoryAccepted: false };
    process.exitCode = 1;
  } finally {
    session?.close();
    globalThis.fetch = oldFetch;
    pins = Object.fromEntries(files.map(file => [file, sha(file)]));
    Object.assign(result, { frames, requests: frames.length, inputsSha256: pins,
      protectedOriginalFilesHeld: Object.keys(protectedPins).length,
      profilesOpened: 0, keystoreRead: false, simulations: 0, signatures: 0, executeRequests: 0,
      containersCreated: 0, serviceActions: 0 });
    fs.writeFileSync(output, JSON.stringify(result, (_key, value) => typeof value === 'bigint' ? value.toString() : value, 2) + '\n',
      { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: result.passed, mode: result.mode, requests: frames.length,
      postWriteIndexAccepted: result.postWriteIndexAccepted, errorType: result.errorType }));
  }
}
main().catch(error => { console.error(JSON.stringify({ passed: false, errorType: error.name,
  message: String(error.message).slice(0, 400) })); process.exitCode = 1; });
