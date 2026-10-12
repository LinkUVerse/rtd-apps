// Current production readers must refuse an uncovered executed checkpoint; no writes.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { WalletReadSession } from '../src/shared/rpc/session';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletAssetReader } from '../src/shared/rpc/asset-reader';
import { WalletAccountHistoryReader } from '../src/shared/rpc/account-history-reader';

async function main() {
  const [readinessFile, output] = process.argv.slice(2);
  assert(output && !existsSync(output));
  const read = (f: string) => JSON.parse(readFileSync(f, 'utf8'));
  const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');
  const wallet = resolve(__dirname, '..'), logs = join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
  const readiness = read(readinessFile); assert(readiness.passed);
  assert(Date.now() - Date.parse(readiness.observedAt) < 300000);
  assert(!readiness.infrastructureReadyForProductionProbe && readiness.targetCheckpoint === 524022);
  const nativeFile = join(logs, '20261007-C48-nft-execution-browser-independent-02.json'), native = read(nativeFile);
  assert(native.passed && native.originalExecutions === 6 && native.h0 === readiness.h0);
  const gatewayFile = join(logs, '20261007-C48-nft-execution-gateway-started-01.json');
  const gateway = read(gatewayFile);
  const temporaryProfileFile = gateway.profile;
  const rt = resolve(temporaryProfileFile, '../../..');
  const installedProfileFile = join(rt, 'certified-positive-transport-release-20261006-01/profile.json');
  assert(existsSync(installedProfileFile));
  const profile = validateNetworkProfile(read(installedProfileFile));
  assert(profile.expectedGenesisDigest === readiness.h0 && profile.generation === readiness.generation);
  for (const p of [native, readiness]) for (const [f, h] of Object.entries(p.inputsSha256)) assert.equal(sha(f), h);
  assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), native.source);
  const sourceFixture = readiness.fixture, protectedPins = read(join(sourceFixture, 'intent.json')).protectedOriginalsSha256;
  assert.equal(Object.keys(protectedPins).length, 1015);
  const held = () => { for (const [f, h] of Object.entries(protectedPins)) assert.equal(sha(f), h); };
  const frames: any[] = [], originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const u = new URL(input instanceof Request ? input.url : String(input));
    assert(['http://127.0.0.1:41750', 'http://127.0.0.1:41954', 'http://127.0.0.1:41955', 'http://127.0.0.1:41956'].includes(u.origin));
    assert(['/graphql', '/account/graphql'].includes(u.pathname) || /\/(GetServiceInfo|GetAvailableRange|GetCheckpoint)$/.test(u.pathname));
    const response = await originalFetch(input, init);
    frames.push({ url: u.href, status: response.status, requestBase64: Buffer.from(init?.body as any ?? '').toString('base64'), responseBase64: Buffer.from(await response.clone().arrayBuffer()).toString('base64') });
    return response;
  };
  let session: WalletReadSession | undefined, result: any = { passed: false };
  try {
    held(); session = new WalletReadSession(profile);
    const denials = [];
    try { await WalletAssetReader.open(session, { minimumCheckpoint: String(readiness.targetCheckpoint), timeoutMs: 60000 }); assert.fail('Uncovered NFT write admitted'); }
    catch (e: any) { assert.equal(e.reason, 'coverage'); denials.push({ service: 'assets', reason: e.reason }); }
    try { await new WalletAccountHistoryReader(session, { minimumCheckpoint: String(readiness.targetCheckpoint) }).read(native.sixFirstDispatches[0] && read(join(logs, '20261007-C48-nft-execution-browser-01.json')).owner); assert.fail('Uncovered NFT history admitted'); }
    catch (e: any) { assert.equal(e.reason, 'coverage'); denials.push({ service: 'account-history', reason: e.reason }); }
    held();
    result = { passed: true, observedAt: new Date().toISOString(), h0: readiness.h0, generation: readiness.generation, targetCheckpoint: readiness.targetCheckpoint, denials, frames, sixNativeTerminalSuccessesRetained: true, postWriteIndexAccepted: false, trialReady: false, signatures: 0, simulations: 0, executeRequests: 0, profilesOpened: 0, originalPrivateFilesHeld: 1015, productSource: native.source, scope: 'Actual current production asset/history minimum524022 refusal under the observed incomplete index. Prior six actual native success/effects/journals remain terminal. No snapshot substitution, minimum reduction, signing/replay or whole indexed acceptance.' };
  } catch (e: any) { result = { passed: false, observedAt: new Date().toISOString(), errorType: e.name, message: String(e.message).slice(0, 1000), frames }; process.exitCode = 1; }
  finally {
    session?.close(); globalThis.fetch = originalFetch;
    result.inputsSha256 = Object.fromEntries([resolve(process.argv[1]), resolve(readinessFile), nativeFile, installedProfileFile, gatewayFile].map(f => [f, sha(f)]));
    writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: result.passed, denials: result.denials?.length, errorType: result.errorType, message: result.message }));
  }
}
main().catch(() => { console.error('C48 readonly admission prerequisites failed; no private values printed'); process.exitCode = 1; });
