// Current admitted Kiosk read with bounded production deadlines and public timing evidence.
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletAssetReader} from '../src/shared/rpc/asset-reader';

async function main() {
  const [profileFile, owner, output] = process.argv.slice(2);
  const profile = validateNetworkProfile(JSON.parse(readFileSync(profileFile, 'utf8')));
  const session = new WalletReadSession(profile), original = globalThis.fetch;
  const requests: {operation: string; elapsedMs: number; status?: number; failure?: string}[] = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.hostname, '127.0.0.1');
    assert(url.pathname === '/graphql' || url.pathname.endsWith('/GetServiceInfo'));
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : {};
    const operation = body.query?.match(/(?:query|mutation)\s+(\w+)/)?.[1] ?? url.pathname;
    const started = performance.now();
    try {
      const response = await original(input, init);
      requests.push({operation, elapsedMs: Math.round(performance.now() - started), status: response.status});
      return response;
    } catch (error) {
      requests.push({operation, elapsedMs: Math.round(performance.now() - started), failure: error instanceof Error ? error.name : 'UnknownError'});
      throw error;
    }
  };
  let proof: unknown, admissionMs: number | undefined, readMs: number | undefined;
  const started = performance.now();
  try {
    const reader = await WalletAssetReader.open(session, {timeoutMs: 30000});
    proof = reader.proof;
    admissionMs = Math.round(performance.now() - started);
    const readStarted = performance.now();
    try {
      const result = await reader.kiosks(owner);
      readMs = Math.round(performance.now() - readStarted);
      const evidence = {observedAt: new Date().toISOString(), passed: true, owner, proof, admissionMs, readMs,
        kiosks: result.value.map(kiosk => ({kind: kiosk.kind, id: kiosk.kioskId, itemCount: kiosk.items.length})),
        requests, simulations: 0, dispatches: 0, scope: 'current production reader timing and admitted Kiosk contents; no Chrome or nonempty acceptance'};
      writeFileSync(output, JSON.stringify(evidence, null, 2) + '\n', {flag: 'wx'});
      console.log(JSON.stringify({passed: true, admissionMs, readMs, kiosks: evidence.kiosks}));
    } catch (error) {
      readMs = Math.round(performance.now() - readStarted);
      throw error;
    }
  } catch (error) {
    const failure = error instanceof Error ? {name: error.name, message: error.message} : {name: 'UnknownError'};
    writeFileSync(output, JSON.stringify({observedAt: new Date().toISOString(), passed: false, owner, proof,
      admissionMs, readMs, requests, failure, simulations: 0, dispatches: 0}, null, 2) + '\n', {flag: 'wx'});
    console.error(JSON.stringify({passed: false, admissionMs, readMs, failure}));
    process.exitCode = 1;
  } finally {globalThis.fetch = original; session.close();}
}
main().catch(error => {console.error(error); process.exitCode = 1;});
