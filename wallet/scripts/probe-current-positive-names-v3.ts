// Actual current production resolver; no simulation, signature, execution or fixture edits.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletFullnodeReader } from '../src/shared/rpc/fullnode-reader';
import { WalletNameReader } from '../src/shared/rpc/name-reader';

async function main() {
  const [profileFile, nativeFile, output] = process.argv.slice(2);
  assert(!existsSync(output));
  const json = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
  const native = json(nativeFile), profile = validateNetworkProfile(json(profileFile));
  assert(native.passed && native.h0 === profile.expectedGenesisDigest && native.checkpoint === '68041');
  assert(profile.generation === 'dev-20261006-03');
  const target = native.rows.find((row: any) => row.decoded?.name?.labels?.join('.') === 'rtd.wallet-migration').decoded.value.target_address;
  const cases = [
    { mode: 'resolve', input: 'wallet-migration.rtd', name: 'wallet-migration.rtd', address: target },
    { mode: 'resolve', input: 'leaf.wallet-migration.rtd', name: 'leaf.wallet-migration.rtd', address: target },
    { mode: 'reverse', input: target, name: 'wallet-migration.rtd', address: target },
    { mode: 'resolve', input: 'expired-migration.rtd', name: null, address: null },
    { mode: 'resolve', input: 'absent-migration.rtd', name: null, address: null },
    { mode: 'resolve', input: 'unassigned-migration.rtd', name: null, address: null },
    { mode: 'resolve', input: 'wrong.wallet-migration.rtd', name: null, address: null },
    { mode: 'reverse', input: native.sender, name: null, address: null },
  ];
  const originalFetch = globalThis.fetch, paths: string[] = [], observations: unknown[] = [], coverage: unknown[] = [], frames: unknown[] = [];
  const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
  const inputFiles = [resolve(process.argv[1]), profileFile, nativeFile, ...['profile', 'session', 'name-reader', 'fullnode-reader', 'graphql-snapshot', 'dynamic-fields'].map(name => resolve(__dirname, '../src/shared/rpc/' + name + '.ts'))];
  const inputsSha256 = Object.fromEntries(inputFiles.map(file => [resolve(file), sha(file)]));
  let currentCase: unknown, minimumNativeHeight: string | undefined;
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert(['http://127.0.0.1:41750', 'http://127.0.0.1:41954', 'http://127.0.0.1:41955', 'http://127.0.0.1:41956'].includes(url.origin));
    assert(url.pathname === '/graphql' || url.pathname === '/account/graphql' || /\/(GetServiceInfo|GetObject|GetCheckpoint|GetAvailableRange)$/.test(url.pathname));
    assert(!String(init?.body).includes('"jsonrpc"'));
    const body = init?.body;
    const requestBytes = input instanceof Request && body === undefined
      ? Buffer.from(await input.clone().arrayBuffer())
      : body === undefined || body === null ? Buffer.alloc(0)
        : typeof body === 'string' ? Buffer.from(body)
          : body instanceof ArrayBuffer ? Buffer.from(body)
            : ArrayBuffer.isView(body) ? Buffer.from(body.buffer, body.byteOffset, body.byteLength)
              : (() => { throw new Error('Unsupported read request body'); })();
    assert(requestBytes.length <= 16 * 1024 * 1024);
    assert(!requestBytes.toString('utf8').includes('"jsonrpc"'));
    paths.push(url.href);
    return originalFetch(input, { ...init, credentials: 'omit', redirect: 'error' }).then(async response => {
      const bytes = Buffer.from(await response.clone().arrayBuffer());
      assert(bytes.length <= 16 * 1024 * 1024);
      frames.push({ currentCase, url: url.href, status: response.status,
        requestBase64: requestBytes.toString('base64'),
        responseBase64: bytes.toString('base64') });
      if (url.pathname.endsWith('/graphql')) {
        const body = JSON.parse(bytes.toString('utf8'));
        if (body.data?.serviceConfig) coverage.push({ status: response.status, data: body.data.serviceConfig, errors: body.errors });
      }
      return response;
    });
  };
  try {
    for (const row of cases) {
      currentCase = row;
      const session = new WalletReadSession(profile), reader = new WalletNameReader(session);
      try {
        minimumNativeHeight = await new WalletFullnodeReader(session).checkpoint();
        const value = row.mode === 'reverse' ? await reader.defaultName(row.input) : await reader.resolve(row.input);
        if (row.name === null) assert.equal(value, null);
        else {
          assert(value); assert.equal(value.name, row.name); assert.equal(value.address, row.address);
          assert.equal(value.registry, native.forwardRegistry);
          assert(value.validUntilMonotonicMs > performance.now());
        }
        observations.push({ ...row, actual: value });
      } finally { session.close(); }
    }
    const proof = { passed: true, observedAt: new Date().toISOString(), h0: profile.expectedGenesisDigest,
      generation: profile.generation, seedCheckpoint: native.checkpoint, target, observations, paths,
      simulations: 0, signatures: 0, executeRequests: 0,
      inputsSha256, frames,
      scope: 'Eight actual production WalletNameReader positive/negative cases with current certified G3 profile and indexed reads. Chrome, final prepared target, expiry renewal or complete QA-A15 remain separately required.' };
    writeFileSync(output, JSON.stringify(proof, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: true, cases: observations.length, target }));
  } catch (error: any) {
    const proof = { passed: false, observedAt: new Date().toISOString(), h0: profile.expectedGenesisDigest, generation: profile.generation, currentCase, minimumNativeHeight, errorType: error.name, reason: error.reason, coverage, observations, paths, frames, inputsSha256, simulations: 0, signatures: 0, executeRequests: 0, scope: 'Actual current resolver refused before producing a target; preserves native-height freshness requirement and real indexed coverage, does not accept positive names or Chrome.' };
    writeFileSync(output, JSON.stringify(proof, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    throw error;
  } finally { globalThis.fetch = originalFetch; }
}
main().catch(error => { console.error(JSON.stringify({ passed: false, errorType: error.name, reason: error.reason })); process.exitCode = 1; });
