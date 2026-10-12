// Independent actual unsigned NFT UI approvals, whole simulations and fresh canonical inputs.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const cp = require('node:child_process'), loader = require('tsx/cjs/api');
const { Transaction } = require('rtd-typescript/transactions'), { GrpcTypes, RtdGrpcClient } = require('rtd-typescript/grpc');
const { bcs } = require('rtd-typescript/bcs'), { toBase64, toBase58 } = require('rtd-typescript/utils');
const { blake2b } = require('@noble/hashes/blake2.js');
const { assertLegacySharedKindEqual } = require('./lib/audit-legacy-shared-kind.cjs');
const wallet = path.resolve(__dirname, '..'), read = f => JSON.parse(fs.readFileSync(f));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const typed = (name, value) => toBase58(blake2b(Buffer.concat([Buffer.from(name + '::'), Buffer.from(value)]), { dkLen: 32 }));
function frame(encoded, codec, trailers) {
  const raw = Buffer.from(encoded, 'base64'); assert(raw.length >= 5 && raw[0] === 0);
  const end = 5 + raw.readUInt32BE(1); assert(end <= raw.length);
  if (trailers) { assert(raw[end] === 128 && end + 5 + raw.readUInt32BE(end + 1) === raw.length); assert.match(raw.subarray(end + 5).toString(), /(^|\r\n)grpc-status:[ \t]*0(\r\n|$)/); }
  else assert.equal(raw.length, end);
  return codec.fromBinary(raw.subarray(5, end));
}
function canonical(codec, value) { const v = codec.parse(Buffer.from(value, 'base64')); assert.equal(toBase64(codec.serialize(v).toBytes()), value); return v; }
(async () => {
  const [proofFile, inventoryAuditFile, output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
  const p = read(proofFile), inventoryAudit = read(inventoryAuditFile), supplementalFrames = [], originalFetch = globalThis.fetch;
  let session, report = {}, stage = 'original UI and complete original simulations';
  try {
    assert(p.passed && p.chromeClosed && p.accountsNormallyRelocked);
    assert(p.executeRequests === 0 && p.signatures === 0 && p.faucetRequests === 0 && p.contractsDeployed === 0 && p.seedRequests === 0);
    assert(p.originalProfilesOpened === 0 && p.originalPrivateFilesHeld === 1015);
    assert(!p.pageErrors.length && !p.captureErrors.length && !p.blocked.length);
    assert(inventoryAudit.passed && inventoryAudit.canonicalEightNFTs.length === 8 && inventoryAudit.h0 === p.h0);
    for (const proof of [p, inventoryAudit]) for (const [f, h] of Object.entries(proof.inputsSha256)) assert.equal(sha(f), h);
    const buildFile = Object.keys(p.inputsSha256).find(f => f.endsWith('/20261007-default-generation-positive-C46-build-03.json'));
    const oracleFile = Object.keys(p.inputsSha256).find(f => f.endsWith('/20261007-C43-nonempty-kiosk-native-independent-01.json'));
    const profileFile = Object.keys(p.inputsSha256).find(f => f.endsWith('/C46-isolated-browser-gateway-20261007-03/profile.json'));
    const intentFile = Object.keys(p.inputsSha256).find(f => f.endsWith('/nonempty-kiosk-C43-20261007-01/intent.json'));
    assert(buildFile && oracleFile && profileFile && intentFile);
    const build = read(buildFile), oracle = read(oracleFile), selectedProfile = read(profileFile);
    assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), p.source);
    assert.deepEqual(build.sourceAfter, p.source); for (const [f, h] of Object.entries(build.artifacts)) assert.equal(sha(path.join(build.output, f)), h);
    assert(p.workerSource.matchesDisk && p.workerSource.workerSha256 === build.artifacts['background.js'] && p.uiSource.matchesDisk);
    assert.deepEqual(p.initialJournal, p.finalJournal); assert(Object.values(p.finalJournal).every(r => Array.isArray(r) && r.length === 0));
    assert.deepEqual(p.cipherBefore, p.cipherAfter); assert.equal(p.cipherAfter.owner, p.owner);
    const protectedPins = read(intentFile).protectedOriginalsSha256; assert.equal(Object.keys(protectedPins).length, 1015);
    for (const [f, h] of Object.entries(protectedPins)) assert.equal(sha(f), h);
    assert(!cp.execFileSync('ps', ['-Ao', 'command=']).toString().split('\n').some(c => c.includes('Google Chrome') && c.includes('--user-data-dir=' + path.join(p.fixture, 'profile'))));
    assert.equal(p.previews.length, 6); assert.equal(p.denials.length, 2); assert.equal(p.renderedKiosks.length, 3);
    const n = serial => oracle.nfts.find(n => n.value.serial === serial).objectId;
    const expected = [
      ['direct', n('6'), oracle.addresses.existingTarget, 'direct', []],
      ['framework-ordinary', n('1'), oracle.addresses.existingTarget, 'framework-kiosk', ['take']],
      ['framework-listed', n('2'), oracle.addresses.existingTarget, 'framework-kiosk', ['take']],
      ['personal', n('5'), oracle.addresses.existingTarget, 'personal-kiosk', ['borrow_val', 'take', 'return_val']],
      ['originbyte-existing-target', oracle.obNfts[0].objectId, oracle.addresses.existingTarget, 'originbyte-kiosk', ['p2p_transfer']],
      ['originbyte-new-target', oracle.obNfts[1].objectId, oracle.addresses.newTarget, 'originbyte-kiosk', ['p2p_transfer_and_create_target_kiosk']],
    ];
    const decoded = p.simulations.map(w => {
      assert(p.frames.some(r => JSON.stringify(r) === JSON.stringify(w))); assert.equal(w.status, 200);
      assert.equal(w.url, 'http://127.0.0.1:41750/rtd.rpc.v2.TransactionExecutionService/SimulateTransaction');
      const request = frame(w.requestBase64, GrpcTypes.SimulateTransactionRequest, false), response = frame(w.responseBase64, GrpcTypes.SimulateTransactionResponse, true);
      assert.equal(request.checks, GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED); assert(response.transaction.effects.status.success);
      return { wire: w, request, response };
    });
    const gas = new Map(), objects = new Set(), audited = [];
    for (let index = 0; index < expected.length; index++) {
      const [label, id, recipient, route, calls] = expected[index], preview = p.previews[index], a = preview.approval, prepared = a.prepared;
      assert.deepEqual([preview.label, preview.id, preview.to, preview.route, preview.calls], [label, id, recipient, route, calls]);
      assert.equal(prepared.sender, p.owner); assert.equal(prepared.input.objectId, id); assert.equal(prepared.input.to, recipient); assert.equal(prepared.route, route);
      const tx = Transaction.from(prepared.bytesBase64), data = tx.getData(); assert.equal(await tx.getDigest(), prepared.digest);
      const raw = canonical(bcs.TransactionData, prepared.bytesBase64); assert.deepEqual(raw, preview.canonical);
      assert.equal(data.sender, p.owner); assert.equal(data.gasData.owner, p.owner); assert.equal(String(data.gasData.budget), prepared.gasBudget);
      assert.deepEqual(data.commands.filter(c => c.$kind === 'MoveCall').map(c => c.MoveCall.function), calls);
      for (const c of data.commands.filter(c => c.$kind === 'MoveCall')) {
        const v = c.MoveCall;
        if (['borrow_val', 'return_val'].includes(v.function)) { assert.equal(v.package, selectedProfile.packages.personalKiosk); assert.equal(v.module, 'personal_kiosk'); }
        else if (v.function === 'take') { assert.equal(v.package, selectedProfile.packages.kiosk); assert.equal(v.module, 'kiosk'); }
        else { assert.equal(v.package, selectedProfile.packages.originByte.executionPackage); assert.equal(v.module, 'ob_kiosk'); }
      }
      const selected = decoded.filter(r => r.wire.stage === label + ' actual preview');
      assert.equal(selected.length, 2, 'Each actually prepared preview must retain its exact gas-selection and final simulation');
      const [fee, final] = selected; assert(fee.request.doGasSelection && !fee.request.transaction.bcs?.value);
      assertLegacySharedKindEqual(fee.response.transaction.transaction.kind.data, fee.request.transaction.kind.data);
      const payment = fee.response.transaction.transaction.gasPayment;
      assert.deepEqual(data.gasData.payment, payment.objects.map(o => ({ objectId: o.objectId, version: String(o.version), digest: o.digest })));
      assert.equal(data.gasData.owner, payment.owner); assert.equal(String(data.gasData.price), String(payment.price)); assert.equal(String(data.gasData.budget), String(payment.budget));
      assert.equal(final.request.doGasSelection, false); assert.equal(toBase64(final.request.transaction.bcs.value), prepared.bytesBase64);
      assert.equal(toBase64(final.response.transaction.transaction.bcs.value), prepared.bytesBase64);
      const effects = canonical(bcs.TransactionEffects, toBase64(final.response.transaction.effects.bcs.value));
      assert.equal(effects[effects.$kind].transactionDigest, prepared.digest); assert.equal(final.response.transaction.effects.transactionDigest, prepared.digest);
      for (const ref of data.gasData.payment) { const old = gas.get(ref.objectId); if (old) assert.deepEqual(old, ref); gas.set(ref.objectId, ref); }
      objects.add(id);
      audited.push({ label, objectId: id, recipient, route, digest: prepared.digest, gasData: data.gasData, expiration: data.expiration, actualFinalBCSAndEffectsVerified: true });
    }
    assert.equal(decoded.length, 12);
    assert.deepEqual(p.denials.map(r => [r.label, r.id, r.simulations, r.approvals]), [['locked', n('3'), 0, 0], ['exclusive', n('4'), 0, 0]]);
    assert(!p.frames.some(r => r.url.endsWith('/SimulateTransaction') && /denial/.test(r.stage)));
    assert(!p.traffic.some(r => /\/(ExecuteTransaction|VerifySignature)$/.test(new URL(r.url).pathname)));
    stage = 'fresh native all eight original NFT and actual selected gas';
    globalThis.fetch = async (input, init) => {
      const u = new URL(input instanceof Request ? input.url : String(input)); assert.equal(u.origin, 'http://127.0.0.1:41750'); assert(/\/(GetObject|GetServiceInfo)$/.test(u.pathname));
      const r = await originalFetch(input, init); supplementalFrames.push({ url: u.href, status: r.status, requestBase64: Buffer.from(init?.body ?? []).toString('base64'), responseBase64: Buffer.from(await r.clone().arrayBuffer()).toString('base64') }); return r;
    };
    const load = name => loader.require(path.join(wallet, 'src/shared/rpc', name + '.ts'), __filename);
    const { WalletReadSession } = load('session'), { WalletFullnodeReader } = load('fullnode-reader'), { validateNetworkProfile } = load('profile');
    session = new WalletReadSession(validateNetworkProfile(selectedProfile)); const native = new WalletFullnodeReader(session), verified = [];
    for (const id of [...new Set([...inventoryAudit.canonicalEightNFTs.map(n => n.objectId), ...gas.keys()])]) {
      const o = await native.object(id); assert(o?.objectBcs); assert.equal(typed('Object', o.objectBcs), o.digest); canonical(bcs.Object, toBase64(o.objectBcs));
      const nft = inventoryAudit.canonicalEightNFTs.find(n => n.objectId === id), ref = gas.get(id);
      if (nft) { assert.equal(o.version, nft.version); assert.equal(o.digest, nft.digest); }
      if (ref) { assert.equal(o.version, ref.version); assert.equal(o.digest, ref.digest); assert(o.owner.AddressOwner === p.owner || o.owner.ConsensusAddressOwner?.owner === p.owner); }
      verified.push({ objectId: id, version: o.version, digest: o.digest, objectBcsBase64: toBase64(o.objectBcs), unchangedOriginalInputVerified: true });
    }
    const client = new RtdGrpcClient({ network: 'localnet', baseUrl: 'http://127.0.0.1:41750', format: 'binary', fetch: globalThis.fetch, mvr: { url: '' } });
    assert.equal((await client.ledgerService.getServiceInfo({})).response.chainId, p.h0);
    for (const r of supplementalFrames) { assert.equal(r.status, 200); const m = new URL(r.url).pathname.split('/').pop(); frame(r.requestBase64, GrpcTypes[m + 'Request'], false); frame(r.responseBase64, GrpcTypes[m + 'Response'], true); }
    for (const [f, h] of Object.entries({ ...p.inputsSha256, ...protectedPins })) assert.equal(sha(f), h);
    report = { passed: true, observedAt: new Date().toISOString(), h0: p.h0, generation: p.generation, source: p.source,
      sixActualUnsignedPreviews: audited, lockedExclusiveBothUIEntriesDenied: true, rawEnabledSimulations: 12,
      canonicalFinalEffects: 6, actualGasSelections: 6, allEightOriginalNFTsStillUnchanged: true,
      originalPrivateFilesHeld: 1015, journalsAndCipherHeld: true, normalRelockAndChromeAbsent: true,
      freshNativeInputs: verified, supplementalFrames, auditSimulations: 0, auditSignatures: 0,
      auditExecuteRequests: 0, originalProfilesOpened: 0, fullNFTTransferAccepted: false,
      inputsSha256: Object.fromEntries([__filename, path.resolve(proofFile), path.resolve(inventoryAuditFile), buildFile, oracleFile, profileFile, intentFile, path.join(__dirname, 'lib/audit-legacy-shared-kind.cjs')].map(f => [f, sha(f)])),
      scope: 'Independent six actual current C46 UI approvals, twelve original successful ENABLED simulations, canonical final full BCS/digest/GasData/expiration and fixed ABI, two locked/exclusive detail/manual-route denials, full original journal/cipher/1015 private retention, normal relock/Chrome absent, eight unchanged original NFT and selected gas typed native bytes. No extra simulation, signature, Execute, physical outage, normal CA or full parent acceptance.' };
  } catch (e) { report = { passed: false, observedAt: new Date().toISOString(), stage, errorType: e.name, message: String(e.message).slice(0, 1400), supplementalFrames }; process.exitCode = 1; }
  finally {
    session?.close(); globalThis.fetch = originalFetch;
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: report.passed, stage: report.stage, message: report.message, previews: report.sixActualUnsignedPreviews?.length, simulations: report.rawEnabledSimulations }));
  }
})().catch(() => { console.error('Current NFT browser independent prerequisites failed'); process.exitCode = 1; });
