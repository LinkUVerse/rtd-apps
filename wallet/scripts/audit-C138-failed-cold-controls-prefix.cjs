// Qualify actual control evidence in a failed actor without changing its result.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { GrpcTypes } = require('rtd-typescript/grpc');
const parser = require('./lib/C88-post-write-bytes.cjs');
const expected = require('./test-C138-current-non-nft-pending-creator.cjs');
const gaps = require('./lib/C133-cold-capture-gaps.cjs');
const logs = path.resolve(__dirname, '../migrationToGRpcOrGraphQLDoc/workLog');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const pins = p => { for (const [f, h] of Object.entries(p)) assert.equal(sha(f), h, f); };

function audit(p, creator, unknown) {
    assert.equal(p.passed, false);
    assert.equal(p.stage, 'normal second Reject Disconnect relock');
    assert.match(p.message, /assert\(captureErrors\.every/);
    assert.equal(p.profile, expected.profile);
    assert.equal(p.operation, expected.op);
    assert.equal(p.h0, expected.h0);
    assert.deepEqual(p.source, creator.source);
    for (const k of ['normalUnlock', 'normalReject', 'normalDisconnect', 'normalRelock']) assert.equal(p[k], true);
    for (const k of ['initialJournal', 'finalJournal']) assert.deepEqual(p[k], creator.pendingJournal);
    for (const k of ['cipherBefore', 'cipherAfter']) assert.deepEqual(p[k], creator.cipherAfter);
    assert.equal(p.cipherBefore.owner, expected.owner);
    assert.equal(p.allOriginalHttpBodiesCaptured, false);
    assert.equal(p.captureScopeIncludesTeardown, false);
    assert.equal(p.workerSource, undefined);
    assert.equal(p.uiSource, undefined);
    assert(p.secondPopupSource.matchesDisk);
    assert(p.secondPopupSource.loadedBundles.every(x => x.matchesDisk && x.loadedSha256 === x.diskSha256));
    assert.deepEqual(p.forbidden, []);
    assert.deepEqual(p.pageErrors, []);
    pins(p.inputsSha256);

    assert.deepEqual(p.forms.map(x => x.kind), ['coin', 'stake', 'withdraw']);
    const routes = ['#/send?type=0x2%3A%3Artd%3A%3ARTD', '#/stake/new?address=' + creator.input.validator,
        '#/stake/new?unstake=true&staked=' + creator.input.originalStakeId];
    for (const [i, f] of p.forms.entries()) {
        assert.equal(f.route, routes[i]);
        assert(f.text.includes(creator.input.digest) && f.noEnabledNewApproval);
        assert.deepEqual(f.journal, creator.pendingJournal);
        assert(f.disabledApprovalButtons.every(x => x.disabled));
        assert.equal(f.ordinaryCoinAmountAndRecipientFilled, i === 0);
        assert(f.contexts.length > 0);
        for (const c of f.contexts) {
            assert(BigInt(JSON.parse(c.assetSnapshotKey)[2]) >= 332734n);
        }
    }
    const coin = p.forms[0];
    assert(coin.disabledApprovalButtons.some(x => x.type === 'submit' && x.disabled));
    assert(coin.filledPreparationQueries.length > 0);
    for (const q of coin.filledPreparationQueries) {
        assert.equal(q.status, 'error');
        assert.equal(q.hasData, false);
        assert.equal(q.error, '当前链账户有待确认交易，请先恢复原交易');
        assert.equal(q.key[0], 'wallet-transfer-preparation');
        assert.equal(JSON.parse(q.key[1])[5], expected.h0);
        assert.equal(q.key[3].coinType, '0x2::rtd::RTD');
        assert.equal(q.key[3].amount, '0.000000001');
        assert.equal(q.key[3].to, expected.owner);
        assert.equal(q.key[3].activeAddress, expected.owner);
        assert.equal(q.key[3].isPayAllRtd, false);
        assert(q.key[3].coins.some(x => x.objectId === expected.senderCoinId));
    }
    assert(p.lockProbes.length >= 7);
    const scope = creator.pendingJournal['journal-v2'][0].scope;
    for (const l of p.lockProbes) assert(l.actualIfAvailable === true && l.scope === scope);
    for (const label of ['cold owner without original live lock', 'coin observer normal exit',
        'stake observer normal exit', 'withdraw observer normal exit', 'second actual popup observer normal exit',
        'final recovery observer exit']) assert(p.lockProbes.some(x => x.label === label));
    assert.equal(p.refusal.error, true);
    assert.equal(p.refusal.message, '当前链账户有待确认交易，请先恢复原交易');
    assert(p.refusalAttempts.some(x => JSON.stringify(x) === JSON.stringify(p.refusal)));
    assert.notEqual(p.secondRequest.id, creator.actualRequest.id);
    assert.equal(p.secondRequest.approved, null);
    assert.equal(p.secondRequest.tx.justSign, true);
    assert.equal(p.secondRequest.tx.chain, 'rtd:localnet');
    assert.equal(p.secondRequest.tx.account, expected.owner);
    assert.equal(p.secondRequest.tx.data, creator.input.json);
    assert.deepEqual(p.secondPrepared, []);
    assert.match(p.secondBody, /Gas estimation failed|网络费用估算失败/);
    assert.match(p.secondRequest.origin, /^http:\/\/127\.0\.0\.1:\d+$/);

    const allowed = new Set(['http://127.0.0.1:41750', 'http://127.0.0.1:42011',
        'http://127.0.0.1:42012', 'http://127.0.0.1:42013', 'http://127.0.0.1:41718', p.secondRequest.origin]);
    for (const r of [...p.traffic, ...p.frames, ...p.captureErrors]) {
        assert(allowed.has(new URL(r.url).origin));
        assert(!/\/(SimulateTransaction|VerifySignature|ExecuteTransaction)$/.test(new URL(r.url).pathname));
        if (r.requestBase64) assert(!Buffer.from(r.requestBase64, 'base64').toString().includes('"jsonrpc"'));
    }
    for (const r of p.frames) {
        assert.equal(Buffer.from(r.requestBase64, 'base64').toString('base64'), r.requestBase64);
        assert.equal(Buffer.from(r.responseBase64, 'base64').toString('base64'), r.responseBase64);
        if (r.url.endsWith('/GetTransaction')) {
            const req = GrpcTypes.GetTransactionRequest.fromBinary(parser.grpcBody(r.requestBase64, false));
            assert.equal(req.digest, creator.input.digest);
        }
    }
    assert(p.lookups.length > 0);
    assert(p.lookups.every(x => x.digest === creator.input.digest));
    const unknownRows = p.captureErrors.filter(r => !gaps.accepted(r, creator.input.digest));
    assert.deepEqual(unknownRows, [unknown.unknownPositiveBodyGap]);
    assert.equal(unknown.positiveBodyRecovered, false);
    assert.equal(unknown.rootCauseKnown, false);
    assert.equal(unknown.oldAllowlistChanged, false);
    assert.equal(unknownRows[0].url, 'http://127.0.0.1:42011/graphql');
    assert.equal(unknownRows[0].stage, 'normal unmount popup recovery observer');
    assert.equal(unknownRows[0].status, 200);
    assert.equal(unknownRows[0].headers['content-length'], '1417');
    assert.equal(JSON.parse(Buffer.from(unknownRows[0].requestBase64, 'base64')).variables.constructor, Object);
    assert(JSON.parse(Buffer.from(unknownRows[0].requestBase64, 'base64')).query.startsWith('query WalletSnapshotAdmission'));
    return { exactKnownNotFoundBodyGaps: p.captureErrors.length - 1, unknownPositiveBodyGaps: 1 };
}

async function main() {
    const out = process.argv[2];
    assert(out && !fs.existsSync(out));
    const actorFile = path.join(logs, '20261009-C138-current-non-nft-pending-cold-03.json');
    const creatorFile = path.join(logs, '20261009-C138-current-non-nft-pending-creator-01.json');
    const creatorAuditFile = path.join(logs, '20261009-C138-current-non-nft-pending-creator-independent-01.json');
    const gapFile = path.join(logs, '20261009-C138-cold-03-unknown-positive-body-gap-01.json');
    const p = read(actorFile), creator = read(creatorFile), qualified = read(creatorAuditFile), unknown = read(gapFile);
    assert(qualified.passed && qualified.actualCurrentProductCoinPendingGenerated);
    pins(qualified.inputsSha256);
    assert.equal(unknown.actor, actorFile);
    assert.equal(unknown.actorSha256, sha(actorFile));
    await require('./audit-C138-current-non-nft-pending-creator.cjs').audit(creator);
    const facts = audit(p, creator, unknown);
    const changes = [x => x.passed = true, x => x.normalReject = false, x => x.normalRelock = false,
        x => x.forms[2].route = '#/stake/new?unstake=true&staked=' + expected.owner,
        x => x.forms[0].ordinaryCoinAmountAndRecipientFilled = false,
        x => x.forms[0].filledPreparationQueries[0].hasData = true,
        x => x.forms[0].filledPreparationQueries[0].key[3].amount = '2',
        x => x.forms[0].filledPreparationQueries[0].key[3].to = creator.input.validator,
        x => x.refusal.message = 'wrong guard', x => x.lockProbes[0].actualIfAvailable = false,
        x => x.finalJournal['pending-scopes-v2'] = [], x => x.cipherAfter.sha256 = '0'.repeat(64),
        x => x.secondPrepared.push({ digest: creator.input.digest }), x => x.secondRequest.approved = true,
        x => x.secondPopupSource.matchesDisk = false,
        x => x.traffic.push({url: 'http://127.0.0.1:41750/rtd.rpc.v2.TransactionExecutionService/ExecuteTransaction'}),
        x => x.traffic.push({url: 'http://127.0.0.1:41750/rtd.rpc.v2.TransactionExecutionService/SimulateTransaction'}),
        x => x.traffic.push({url: 'https://fullnode.mainnet.sui.io/'}),
        x => x.captureErrors.find(r => r.url.endsWith('/graphql')).headers['content-length'] = '0',
        x => x.captureErrors.find(r => r.url.endsWith('/graphql')).requestBase64 = Buffer.from('{"query":"query Wrong","variables":{}}').toString('base64')];
    for (const change of changes) {
        const wrong = structuredClone(p); change(wrong);
        assert.throws(() => audit(wrong, creator, unknown));
    }
    const lineage = require('./lib/C136-product-source-lineage.cjs'), q = read(lineage.qualificationFile);
    assert.deepEqual(lineage.validate(q.originalSource, q.buildFile), p.source);
    assert.deepEqual(require('./lib/C137-current-core-gateway-ownership-v3.cjs').capture(), creator.currentGatewayAuthority);
    const files = [__filename, actorFile, creatorFile, creatorAuditFile, gapFile,
        path.join(logs, '20261009-C138-failed-cold-controls-prefix-design.md'),
        path.join(logs, '20261009-C138-cold-bounded-capture-sources-independent-04.json')];
    const result = {passed:true, observedAt:new Date().toISOString(), source:p.source, h0:expected.h0,
        digest:creator.input.digest, actualActorPassed:false, actualCurrentColdControlPrefixAccepted:true,
        actualThreeFundsFormsAndRealDappDurableRefusalAccepted:true,
        actualFreeNativeLockAndTrustedDurableRefusalAccepted:true,
        actualThreeStoresAndCipherRetained:true, actualNormalUnlockRejectDisconnectRelockAccepted:true,
        actualCurrentSecondPopupLoadedBytesAccepted:true, fullInitialWorkerUiEvidenceAccepted:false,
        directPrivateSignDataCallCounterObserved:false, newApproveActions:0, newSignatureDeliveries:0,
        newSimulateNetworkRequests:0, newVerifyNetworkRequests:0, newExecuteNetworkRequests:0,
        completeSavedResponseFrames:p.frames.length, fixedDigestRecoveryLookups:p.lookups.length, ...facts,
        allOriginalHttpBodiesCaptured:false, captureScopeIncludesTeardown:false,
        originalFailedActorAndUnknownPositiveGapPreserved:true, bodyRecovered:false,
        oldCaptureGapAllowlistChanged:false, artifactMutationRefusals:changes.length,
        creatorRerun:false, auditSignatures:0, auditExecuteRequests:0, originalProfilesOpened:0,
        nftBusinessRequests:0, ordinaryChromeAccepted:false, fullNonNftM5Accepted:false, parentCompletion:false,
        inputsSha256:{...p.inputsSha256,...qualified.inputsSha256,...Object.fromEntries(files.map(f=>[f,sha(f)]))}};
    expected.record(path.resolve(out), result);
    console.log(JSON.stringify({passed:true,limitedControlPrefix:true,actorPassed:false,
        mutations:changes.length,unknownPositiveBodyGaps:1,fullNonNftM5Accepted:false}));
}
if (require.main === module) main().catch(e => { console.error(JSON.stringify({passed:false,errorType:e.name,message:String(e.message).slice(0,1000)})); process.exitCode=1; });
module.exports = { audit };
