// Actual production NFT core and native readers; no Provider/Chrome guard assertion.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const cp = require('node:child_process'), loader = require('tsx/cjs/api');
const { Transaction } = require('rtd-typescript/transactions'), { bcs } = require('rtd-typescript/bcs');
const { Ed25519Keypair } = require('rtd-typescript/keypairs/ed25519');
const { verifyTransactionSignature } = require('rtd-typescript/verify');
const { toBase64, normalizeStructTag } = require('rtd-typescript/utils');
const { RtdGrpcClient } = require('rtd-typescript/grpc');
const wallet = path.resolve(__dirname, '..'), root = path.resolve(wallet, '../..');
const logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
const read = f => JSON.parse(fs.readFileSync(f)), sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const load = name => loader.require(path.join(wallet, 'src/shared/rpc', name + '.ts'), __filename);
function record(file, value) { const fd = fs.openSync(file, 'wx', 0o600); try { fs.writeFileSync(fd, JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); } }
(async () => {
  const [output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
  const fixtureProof = path.join(logs, '20261008-C93-recovered-fixture-independent-01.json');
  const nativeFile = path.join(logs, '20261008-C93-recovered-native-independent-01.json');
  const proof = read(fixtureProof), oracle = read(nativeFile); assert(proof.passed && oracle.passed && proof.checkpoint === '687127');
  const op = proof.operation, intent = read(path.join(op, 'intent.json')), addresses = read(path.join(op, 'addresses.json'));
  const profileFile = intent.profile, keyFile = path.join(op, 'keys.json');
  const sourceFiles = ['nft-transfer-preparation', 'transaction-reader', 'fullnode-reader', 'transaction-sponsorship', 'session', 'profile'].map(n => path.join(wallet, 'src/shared/rpc', n + '.ts'));
  const files = [__filename, fixtureProof, nativeFile, profileFile, keyFile, path.join(op, 'intent.json'), ...sourceFiles,
    path.join(logs, '20261008-C94-current-nft-core-authorization-design.md'), path.join(logs, '20261008-C94-before-implementation-doc-archive-01.json')];
  const pins = Object.fromEntries(files.map(f => [f, sha(f)]));
  for (const p of [proof, oracle]) for (const [f, h] of Object.entries(p.inputsSha256)) assert.equal(sha(f), h);
  const productSource = require('./build-reviewed-generation-production-extension.cjs').productSource;
  const source = productSource(); assert.deepEqual(source, { files: 1120, sha256: 'a03cb96c62e2ae6d7908a8506fc1411a0e92aa1a0cb27b69f49783659ab12521' });
  const held = () => {
    for (const [f, h] of Object.entries({ ...pins, ...intent.inputsSha256, ...intent.protectedOriginalsSha256 })) assert.equal(sha(f), h);
    const code = 'import sys,json;sys.path.insert(0,sys.argv[1]);from prepare_wallet_C93_independent_nft_fixture import held;held(json.load(open(sys.argv[2])))';
    cp.execFileSync(path.join(root, 'rtd-archive-service/localDeploy/data/publisher-venv/bin/python'), ['-c', code, path.join(root, 'link-u-smart-contract/all-in-one-deploy/localDeploy'), path.join(op, 'intent.json')], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 });
    assert.deepEqual(productSource(), source);
  };
  held();
  const { validateNetworkProfile } = load('profile'), { WalletReadSession } = load('session');
  const { WalletFullnodeReader } = load('fullnode-reader'), { WalletTransactionReader } = load('transaction-reader');
  const { prepareNftTransfer, revalidateNftTransfer } = load('nft-transfer-preparation');
  const { unsupportedSponsorExecution } = load('transaction-sponsorship');
  const { WalletAssetReader } = load('asset-reader');
  const frames = [], checks = [], cases = [], rejected = []; let phase = 'fresh initial state', session, report = {}, snapshotCalls = 0;
  const check = (label, value) => { assert(value, label); checks.push({ label, passed: true }); };
  const beforeFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.origin, 'http://127.0.0.1:41750');
    assert(/\/(GetServiceInfo|GetObject|BatchGetObjects|GetCoinInfo|GetBalance|GetPackage|GetDatatype|GetFunction|ListOwnedObjects|SimulateTransaction)$/.test(url.pathname));
    const body = Buffer.from(init?.body ?? []); assert(!body.toString().includes('"jsonrpc"'));
    const row = { phase, url: url.href, requestBase64: body.toString('base64'), startedAt: new Date().toISOString() }; frames.push(row);
    try { const res = await beforeFetch(input, init); Object.assign(row, { status: res.status, headers: Object.fromEntries(res.headers), responseBase64: Buffer.from(await res.clone().arrayBuffer()).toString('base64'), endedAt: new Date().toISOString() }); return res; }
    catch (error) { row.transportError = error.name; throw error; }
  };
  const objectProjection = o => ({ objectId: o.objectId, version: o.version, digest: o.digest, owner: o.owner, type: normalizeStructTag(o.type), contentBase64: Buffer.from(o.content).toString('base64') });
  const capIds = [oracle.frameworkCap.objectId, oracle.personalCap.objectId, oracle.purchaseCap.objectId, ...oracle.originByte.map(o => o.tokenId)];
  const newIds = [...oracle.nfts, ...oracle.obNfts].map(o => o.objectId).concat(capIds); assert.equal(new Set(newIds).size, 13);
  let nativeBefore;
  try {
    const profile = validateNetworkProfile(read(profileFile)); assert.equal(profile.expectedGenesisDigest, intent.h0);
    session = new WalletReadSession(profile);
    const native = new WalletFullnodeReader(session), transactions = new WalletTransactionReader(session);
    const rpc = { bindingKey: session.bindingKey, readSessionKey: session.cacheKey,
      readFreshObject: native.object.bind(native), prepareTransaction: transactions.prepare.bind(transactions), simulateTransaction: transactions.simulate.bind(transactions),
      openAssetSnapshot: () => { snapshotCalls++; throw Error('Direct NFT must not replace indexed snapshot with a native oracle'); } };
    const sdk = new RtdGrpcClient({ network: 'localnet', baseUrl: 'http://127.0.0.1:41750', format: 'binary', mvr: { url: '' } });
    async function mappedObjects(ids) { const objects = []; for (const id of ids) { const o = (await sdk.core.getObject({ objectId: id, include: { content: true } })).object; assert(o && !(o instanceof Error)); objects.push(objectProjection(o)); } return objects; }
    const originalBefore = await mappedObjects(intent.original13ObjectIds); assert.deepEqual(originalBefore, read(path.join(op, 'inspect/original-objects.json')));
    const policyBefore = await mappedObjects(read(path.join(op, 'inspect/policy.json')).map(o => o.objectId)); assert.deepEqual(policyBefore, read(path.join(op, 'inspect/policy.json')));
    nativeBefore = await mappedObjects(newIds);
    const direct = oracle.nfts.find(o => o.value.serial === '6'); assert(direct && direct.owner.AddressOwner === addresses.source);
    const input = { sender: addresses.source, to: addresses.existingTarget, objectId: direct.objectId, objectType: direct.owner && nativeBefore.find(o => o.objectId === direct.objectId).type };
    phase = 'direct production core preparation'; const prepared = await prepareNftTransfer(rpc, input);
    assert.equal(prepared.route, 'direct'); assert(Object.isFrozen(prepared) && Object.isFrozen(prepared.input));
    assert.equal(await Transaction.from(prepared.bytesBase64).getDigest(), prepared.digest);
    const data = bcs.TransactionData.parse(Buffer.from(prepared.bytesBase64, 'base64')); assert.equal(bcs.TransactionData.serialize(data).toBase64(), prepared.bytesBase64);
    assert.equal(data.V1.sender, addresses.source); assert.equal(data.V1.gasData.owner, addresses.source);
    report.prepared = prepared; report.canonical = data; check('real direct production core fixes complete final bytes, GasData, expiration and digest', true);
    phase = 'same original NFT revalidation'; const same = await revalidateNftTransfer(rpc, prepared, addresses.source);
    assert.equal(same, prepared); check('same approved NFT bytes are revalidated without rebuilding', true);
    async function denied(label, operation, expected, zeroIO = false) {
      const start = frames.length; let caught;
      try { await operation(); } catch (error) { caught = error; }
      assert(caught, label); if (expected) assert.match(String(caught.message), expected);
      if (zeroIO) assert.equal(frames.length, start);
      rejected.push({ label, phase, errorType: caught.name, message: String(caught.message), actualRequests: frames.length - start, zeroIO }); check(label, true); return caught;
    }
    async function changed(label, edit) {
      phase = label; const tx = Transaction.from(prepared.bytesBase64); await edit(tx);
      const bytes = Buffer.from(await tx.build()).toString('base64'), digest = await Transaction.from(bytes).getDigest(); assert.notEqual(digest, prepared.digest);
      await denied(label, () => revalidateNftTransfer(rpc, { ...prepared, bytesBase64: bytes }, addresses.source), /已授权的交易模拟未通过|交易模拟未通过|交易不能|compatible|incompatible/);
      cases.push({ label, bytesBase64: bytes, digest, originalDigest: prepared.digest, originalPreparedUnchanged: prepared.bytesBase64 === report.prepared.bytesBase64 });
    }
    await changed('changed Gas budget stale NFT digest', tx => tx.setGasBudget(BigInt(prepared.gasBudget) + 1000n));
    phase = 'changed recipient stale NFT digest'; const changedData = Transaction.from(prepared.bytesBase64).getData();
    const oldTo = bcs.Address.serialize(addresses.existingTarget).toBase64(); const pure = changedData.inputs.filter(i => i.$kind === 'Pure' && i.Pure.bytes === oldTo); assert.equal(pure.length, 1); pure[0].Pure.bytes = bcs.Address.serialize(addresses.newTarget).toBase64();
    const changedBytes = Buffer.from(await Transaction.from(JSON.stringify(changedData)).build()).toString('base64');
    await denied(phase, () => revalidateNftTransfer(rpc, { ...prepared, bytesBase64: changedBytes }, addresses.source), /已授权的交易模拟未通过/);
    cases.push({ label: phase, bytesBase64: changedBytes, digest: await Transaction.from(changedBytes).getDigest(), originalDigest: prepared.digest });
    await changed('changed expiration None stale NFT digest', tx => tx.setExpiration({ None: true }));
    phase = 'changed sender pre-IO denial'; await denied(phase, () => revalidateNftTransfer(rpc, prepared, addresses.sponsor), /钱包会话已改变/, true);
    phase = 'changed binding pre-IO denial'; await denied(phase, () => revalidateNftTransfer({ ...rpc, bindingKey: rpc.bindingKey + ':changed' }, prepared, addresses.source), /钱包会话已改变/, true);
    phase = 'changed session pre-IO denial'; await denied(phase, () => revalidateNftTransfer({ ...rpc, readSessionKey: rpc.readSessionKey + ':changed' }, prepared, addresses.source), /钱包会话已改变/, true);
    phase = 'already canceled NFT pre-IO denial'; await denied(phase, () => revalidateNftTransfer(rpc, prepared, addresses.source, AbortSignal.abort()), null, true);
    phase = 'fresh sponsor coin reference'; const sponsorCoins = await native.coins(addresses.sponsor, '0x2::rtd::RTD'); assert(sponsorCoins.length > 0);
    const sponsorTx = Transaction.from(prepared.bytesBase64); sponsorTx.setGasOwner(addresses.sponsor); sponsorTx.setGasPayment([sponsorCoins[0]]);
    assert(unsupportedSponsorExecution(sponsorTx, addresses.source, false)); assert.equal(unsupportedSponsorExecution(sponsorTx, addresses.source, true), false);
    check('current production sponsor execute rejection and sign-only boundary remain', true);
    phase = 'production sponsor NFT preparation'; const sponsored = await transactions.prepare(sponsorTx, addresses.source);
    assert.equal(sponsored.gasOwner, addresses.sponsor); assert.equal(sponsored.gasPaymentKind, 'coins'); assert.notEqual(sponsored.digest, prepared.digest);
    report.sponsored = sponsored; phase = 'same sponsor NFT final simulation'; const sponsorSim = await transactions.simulate(sponsored.bytesBase64, addresses.source);
    assert(sponsorSim.$kind === 'Transaction' && sponsorSim.Transaction.status.success && sponsorSim.Transaction.digest === sponsored.digest);
    check('real sponsor-funded NFT final GasData and exact bytes simulate enabled', true);
    phase = 'sponsor NFT expiration changed to expired epoch zero'; const expired = Transaction.from(sponsored.bytesBase64); expired.setExpiration({ Epoch: 0 });
    const expiredBytes = Buffer.from(await expired.build()).toString('base64');
    let expirationFailure;
    let expiredResult;
    try { expiredResult = await transactions.simulate(expiredBytes, addresses.source); }
    catch (error) { expirationFailure = { errorType: error.name, message: String(error.message) }; }
    if (expiredResult) { assert.equal(expiredResult.$kind, 'FailedTransaction'); expirationFailure = { errorType: 'FailedTransaction', result: expiredResult }; }
    assert(expirationFailure); report.expirationFailure = { ...expirationFailure, bytesBase64: expiredBytes, digest: await Transaction.from(expiredBytes).getDigest() };
    check('actual expired sponsored NFT bytes cannot form a positive approval', true);
    phase = 'same complete NFT bytes sender and sponsor private signatures'; const keys = read(keyFile);
    const signer = Ed25519Keypair.fromSecretKey(keys.source), sponsor = Ed25519Keypair.fromSecretKey(keys.sponsor); assert.equal(signer.toRtdAddress(), addresses.source); assert.equal(sponsor.toRtdAddress(), addresses.sponsor);
    const sponsoredBytes = Buffer.from(sponsored.bytesBase64, 'base64'); const senderSigned = await signer.signTransaction(sponsoredBytes), sponsorSigned = await sponsor.signTransaction(sponsoredBytes);
    assert.equal(senderSigned.bytes, sponsorSigned.bytes); assert.equal(senderSigned.bytes, sponsored.bytesBase64);
    assert.equal((await verifyTransactionSignature(sponsoredBytes, senderSigned.signature)).toRtdAddress(), addresses.source); assert.equal((await verifyTransactionSignature(sponsoredBytes, sponsorSigned.signature)).toRtdAddress(), addresses.sponsor);
    assert.equal(await signer.getPublicKey().verifyTransaction(Buffer.from(expiredBytes, 'base64'), senderSigned.signature), false);
    assert.equal(await sponsor.getPublicKey().verifyTransaction(Buffer.from(expiredBytes, 'base64'), sponsorSigned.signature), false);
    report.localSignatures = { bytesBase64: sponsored.bytesBase64, digest: sponsored.digest, sender: addresses.source, sponsor: addresses.sponsor, senderSignature: senderSigned.signature, sponsorSignature: sponsorSigned.signature, changedExpirationBytesBase64: expiredBytes, changedBytesRejectBothOriginalSignatures: true };
    check('both signatures cover same complete NFT bytes and reject expiration changes', true);
    phase = 'fresh all new thirteen and original thirteen and policy postconditions'; const nativeAfter = await mappedObjects(newIds);
    assert.deepEqual(nativeAfter, nativeBefore); assert.deepEqual(await mappedObjects(intent.original13ObjectIds), originalBefore); assert.deepEqual(await mappedObjects(policyBefore.map(o => o.objectId)), policyBefore);
    assert.equal(snapshotCalls, 0); report.nativeBefore = nativeBefore; report.nativeAfter = nativeAfter; report.original13Before = originalBefore; report.policyBefore = policyBefore;
    check('all new eight NFT five caps and original thirteen policy exact bodies are unchanged', true);
    held(); report = { ...report, passed: true, observedAt: new Date().toISOString(), operation: op, h0: intent.h0, source, checks, cases, rejected, frames,
      directNFT: input, sponsor: addresses.sponsor, snapshotCalls, privateSignatures: 2, executeRequests: 0, faucetRequests: 0, newContainers: 0, serviceSignals: 0,
      original13AndPolicyHeld: true, newEightNFTFiveCapsHeld: true, providerChromeAccepted: false, fourRouteCompetitionAccepted: false, fullNFTAuthorizationAccepted: false,
      indexedAccepted: false, parentAcceptance: false, inputsSha256: pins,
      scope: 'Actual production direct NFT/TransactionReader/FullnodeReader core combination, complete native bytes/Gas/expiration, unchanged revalidation and real changed-digest/pre-IO refusals; real fresh sponsor coin preparation and two local full-byte signatures, zero Execute. Not Provider native browser lock/IndexedDB admission, real UI approval, all Kiosk routes, complete sponsorship execution or parent acceptance.' };
  } catch (error) { report = { ...report, passed: false, observedAt: new Date().toISOString(), phase, errorType: error.name, message: String(error.message).slice(0, 700), checks, cases, rejected, frames, executeRequests: 0, parentAcceptance: false, inputsSha256: pins }; }
  finally { session?.close(); globalThis.fetch = beforeFetch; }
  record(output, report); console.log(JSON.stringify({ passed: report.passed, phase, checks: checks.length, actualFrames: frames.length, executeRequests: 0 })); if (!report.passed) process.exitCode = 1;
})();
