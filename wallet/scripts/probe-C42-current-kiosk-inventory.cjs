// Actual current production Kiosk collection, fresh identities, no keys or transaction actions.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const loader = require('tsx/cjs/api'), { toBase64 } = require('rtd-typescript/utils');
const wallet = path.resolve(__dirname, '..'), read = f => JSON.parse(fs.readFileSync(f));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const load = n => loader.require(path.join(wallet, 'src/shared/rpc', n + '.ts'), __filename);
(async () => {
  const [windowFile, output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
  const logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog'), rt = path.join(os.homedir(), '.local/state/rtd-wallet-migration/dev-20261006-03');
  const buildFile = path.join(logs, '20261007-default-generation-positive-C42-build-01.json'), build = read(buildFile);
  const originalFile = path.join(logs, '20261007-C40-framework-single-native-audit-01.json'), original = read(originalFile);
  const profileFile = path.join(rt, 'certified-positive-transport-release-20261006-01/profile.json'), env = read(windowFile);
  let session, report = {}, stage = 'current prerequisite'; const frames = [], originalFetch = globalThis.fetch;
  const project = o => ({ objectId: o.objectId, version: o.version, digest: o.digest, owner: o.owner, type: o.type,
    contentBase64: toBase64(o.content), previousTransaction: o.previousTransaction, ...(o.objectBcs ? { objectBcsBase64: toBase64(o.objectBcs) } : {}) });
  globalThis.fetch = async (input, init) => {
    const u = new URL(input instanceof Request ? input.url : String(input)); assert.equal(u.hostname, '127.0.0.1');
    assert(u.href === 'http://127.0.0.1:41954/graphql' || u.port === '41750' && /\/(GetServiceInfo|GetObject)$/.test(u.pathname));
    const req = Buffer.from(init?.body ?? []); assert(!req.toString().includes('"jsonrpc"'));
    const response = await originalFetch(input, { ...init, credentials: 'omit', redirect: 'error' });
    frames.push({ url: u.href, status: response.status, requestBase64: req.toString('base64'), responseBase64: Buffer.from(await response.clone().arrayBuffer()).toString('base64') });
    return response;
  };
  try {
    assert(env.passed && env.phase === 'restored' && env.catchupAccepted && env.currentC42OriginRegistered);
    assert(Date.now() - Date.parse(env.observedAt) < 300000);
    for (const [f, h] of Object.entries(env.inputsSha256)) assert.equal(sha(f), h);
    assert(build.passed && original.passed); assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), build.sourceAfter);
    const { validateNetworkProfile } = load('profile'), { WalletReadSession } = load('session');
    const { WalletAssetReader } = load('asset-reader'), { WalletFullnodeReader } = load('fullnode-reader');
    const { nativeKioskCap, KIOSK_BCS } = load('kiosk-reader');
    const { originByteOwnerToken } = load('originbyte-kiosk');
    session = new WalletReadSession(validateNetworkProfile(read(profileFile)));
    const asset = await WalletAssetReader.open(session, { timeoutMs: 60000, minimumCheckpoint: '281963',
      window: { lower: env.effectiveAssetWindow.commonLo, upper: env.effectiveAssetWindow.commonHi } });
    const fresh = new WalletFullnodeReader(session), owners = [];
    for (const [role, owner] of [['sender', original.owner], ['recipient', original.recipient]]) {
      stage = role + ' full production Kiosk collection'; const kiosks = await asset.kiosks(owner), result = [];
      for (const kiosk of kiosks.value) {
        assert.equal(kiosk.owner, owner);
        assert(['framework', 'originbyte'].includes(kiosk.kind));
        const authorityId = kiosk.kind === 'framework' ? kiosk.ownerCap.objectId : kiosk.ownerTokenId;
        const cap = await fresh.object(authorityId), root = await fresh.object(kiosk.kioskId); assert(cap && root);
        assert(cap.owner.$kind === 'AddressOwner' && cap.owner.AddressOwner === owner);
        if (kiosk.kind === 'framework') {
          const decoded = nativeKioskCap(cap, session.profile.packages); assert(decoded);
          assert.equal(decoded.kioskId, kiosk.kioskId); assert.equal(decoded.isPersonal, kiosk.ownerCap.isPersonal);
        } else {
          const decoded = originByteOwnerToken(cap, owner, session.profile.packages); assert(decoded);
          assert.equal(decoded.kioskId, kiosk.kioskId);
        }
        const decodedRoot = KIOSK_BCS.parse(root.content);
        assert.equal(decodedRoot.owner, owner); assert.equal(decodedRoot.id, kiosk.kioskId);
        assert.equal(decodedRoot.item_count, kiosk.items.length);
        const items = [];
        for (const item of kiosk.items) {
          const native = await fresh.object(item.objectId); assert(native);
          for (const field of ['objectId', 'version', 'digest', 'type', 'previousTransaction']) assert.equal(native[field], item[field]);
          assert.deepEqual(native.owner, item.owner); assert.equal(toBase64(native.content), toBase64(item.content));
          items.push({ ...project(native), isLocked: item.isLocked, listing: item.listing ?? null, kioskId: item.kioskId,
            originByteRegistered: item.originByteRegistered ?? null, originByteExclusive: item.originByteExclusive ?? null });
        }
        result.push({ kind: kiosk.kind, kioskId: kiosk.kioskId, owner: kiosk.owner, ownerCap: kiosk.ownerCap ?? null,
          ownerTokenId: kiosk.ownerTokenId ?? null, ownershipObject: project(cap), root: project(root), decodedRoot, items });
      }
      owners.push({ role, owner, kiosks: result });
    }
    await asset.snapshot.revalidate();
    report = { passed: true, observedAt: new Date().toISOString(), source: build.sourceAfter, h0: original.h0,
      generation: session.profile.generation, snapshot: asset.proof, owners, completeBothProductionKioskCollections: true,
      allCurrentItemBodiesAndOwnersMatchFreshFullnode: true, currentChromeAllBranchesAccepted: false, parentQA07Complete: false };
  } catch (error) { report = { passed: false, observedAt: new Date().toISOString(), stage, errorType: error.name, message: String(error.message).slice(0, 650) }; process.exitCode = 1; }
  finally {
    session?.close(); globalThis.fetch = originalFetch;
    fs.writeFileSync(output, JSON.stringify({ ...report, frames, simulations: 0, signatures: 0, executeRequests: 0, keystoreRead: false,
      inputsSha256: Object.fromEntries([__filename, path.resolve(windowFile), buildFile, originalFile, profileFile].map(f => [f, sha(f)])),
      scope: 'Current C42 source/full restored asset window and all production Kiosk routes for two controlled owners, actual cap/root and each indexed item fresh native canonical body/owner/version/digest comparison. Current inventory only, no branch UI/approval/transfer/persistent competition or parent acceptance.' }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: report.passed, stage: report.stage, message: report.message, requests: frames.length,
      kiosks: report.owners?.reduce((n, o) => n + o.kiosks.length, 0), items: report.owners?.reduce((n, o) => n + o.kiosks.reduce((s, k) => s + k.items.length, 0), 0) }));
  }
})().catch(error => { console.error(JSON.stringify({ passed: false, message: String(error.message).slice(0, 300) })); process.exitCode = 1; });
