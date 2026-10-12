// Explicit isolated-dev probe. Actual wallet readers, CLI signing only; not Chrome journal acceptance.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { WalletRpc } from 'rtd-apps-core/src/rpc/WalletRpcContext';
import { RTD_TYPE_ARG } from 'rtd-typescript/utils';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletFullnodeReader } from '../src/shared/rpc/fullnode-reader';
import { WalletTransactionReader, WalletSimulationError } from '../src/shared/rpc/transaction-reader';
import { WalletExecutionReader } from '../src/shared/rpc/execution-reader';
import { prepareCoinTransfer, revalidateCoinTransfer } from '../src/shared/rpc/coin-transfer-preparation';

const json = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
const sha = (data: Buffer) => createHash('sha256').update(data).digest('hex');
function record(file: string, data: unknown) {
  const fd = openSync(file, 'wx', 0o600);
  try { writeFileSync(fd, JSON.stringify(data, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2) + '\n'); fsyncSync(fd); }
  finally { closeSync(fd); }
  const directory = openSync(dirname(file), 'r');
  try { fsyncSync(directory); } finally { closeSync(directory); }
}
async function main() {
  const [mode, runtimeArg, profileFile, fixtureFile, proofFile, outputArg] = process.argv.slice(2);
  assert(mode === 'execute' || mode === 'recover' || mode === 'simulate-failure');
  const runtime = resolve(runtimeArg), output = resolve(outputArg);
  assert(output.startsWith(runtime + '/'));
  const meta = json(join(runtime, 'runtime.json')), fixture = json(fixtureFile), proof = json(proofFile);
  if (mode !== 'recover') assert.equal(meta.ready, true, 'runtime readiness must be verified before preparation or dispatch');
  const profile = validateNetworkProfile(json(profileFile));
  assert.equal(profile.generation, fixture.generation);
  assert.equal(profile.expectedGenesisDigest, fixture.expectedGenesisDigest);
  assert.equal(profile.endpoints.fullnodeGrpcWeb, meta.rpcUrl);
  assert.equal(meta.rpcUrl, fixture.rpcUrl);
  assert.equal(new URL(meta.rpcUrl).hostname, '127.0.0.1');
  assert.equal(meta.binary, proof.binaries.rtd.path);
  const source = resolve(dirname(meta.binary), '../..');
  const git = (...args: string[]) => execFileSync('git', ['-C', source, ...args]);
  assert.equal(git('rev-parse', 'HEAD').toString().trim(), proof.source.head);
  assert.equal(sha(git('diff', '--binary', 'HEAD')), proof.source.diffSha256);
  for (const [file, hash] of Object.entries(proof.source.changedFiles))
    assert.equal(sha(readFileSync(join(source, file))), hash);
  assert.equal(sha(readFileSync(meta.binary)), proof.binaries.rtd.sha256);
  process.kill(meta.pid, 0);
  if (mode !== 'recover') mkdirSync(output, { mode: 0o700 }); // Existing attempt always fails closed.
  const session = new WalletReadSession(profile);
  const paths: string[] = [], originalFetch = globalThis.fetch;
  let dispatches = 0;
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.hostname, '127.0.0.1');
    assert(!String(init?.body).includes('"jsonrpc"'));
    if (url.pathname.endsWith('/ExecuteTransaction')) {
      assert.equal(mode, 'execute'); assert.equal(++dispatches, 1);
      assert(existsSync(join(output, 'pending.json')));
    }
    paths.push(url.href);
    return originalFetch(input, init);
  };
  try {
    const reader = new WalletExecutionReader(session, { timeoutMs: 60000 });
    if (mode === 'recover') {
      const pending = json(join(output, 'pending.json'));
      assert.equal(pending.bindingKey, session.bindingKey);
      assert.equal(pending.sender, fixture.deployer);
      const receipt = await reader.lookup(pending.digest);
      record(join(output, `recovery-${Date.now()}.json`), { verifiedAt: new Date().toISOString(), receipt, paths, dispatches });
      assert(receipt, 'original digest not yet visible; no resubmit');
      assert.equal(receipt.digest, pending.digest);
      console.log(JSON.stringify({ mode, digest: receipt.digest, success: receipt.success, dispatches }));
      return;
    }
    const fullnode = new WalletFullnodeReader(session), transactions = new WalletTransactionReader(session);
    const methods: Partial<WalletRpc> = {
      bindingKey: session.bindingKey, readSessionKey: session.cacheKey,
      readFreshCoins: (owner, type, signal) => fullnode.coins(owner, type, signal),
      readFreshBalance: (owner, type, signal) => fullnode.balance(owner, type, signal),
      prepareTransaction: (tx, owner, signal) => transactions.prepare(tx, owner, signal),
      simulateTransaction: (bytes, owner, signal) => transactions.simulate(bytes, owner, signal),
    };
    const rpc = new Proxy(methods, { get(target, key) {
      assert(key in target, `unexpected probe adapter operation: ${String(key)}`);
      return Reflect.get(target, key);
    } }) as WalletRpc;
    if (mode === 'simulate-failure') {
      let rejected = false;
      try {
        await prepareCoinTransfer(rpc, { sender: fixture.deployer, to: fixture.deployer,
          coinType: RTD_TYPE_ARG, amount: '18446744073709551615', coinDecimals: 0, isPayAllRtd: false });
      } catch (error) {
        assert(error instanceof WalletSimulationError);
        assert.equal(error.reason, 'failed');
        record(join(output, 'simulation-failure.json'), { verifiedAt: new Date().toISOString(),
          reason: error.reason, stage: error.stage, dispatches, paths,
          scope: 'Actual wallet oversized-transfer simulation fails before signing; not an executed failure.' });
        rejected = true;
      }
      assert(rejected); assert.equal(dispatches, 0);
      console.log(JSON.stringify({ mode, rejected, dispatches }));
      return;
    }
    const prepared = await prepareCoinTransfer(rpc, { sender: fixture.deployer, to: fixture.deployer,
      coinType: RTD_TYPE_ARG, amount: '0.000000001', coinDecimals: 9, isPayAllRtd: false });
    await revalidateCoinTransfer(rpc, prepared, fixture.deployer);
    record(join(output, 'prepared.json'), prepared);
    const signed = JSON.parse(execFileSync(meta.binary,
      ['keytool', 'sign', '--address', fixture.deployer, '--data', prepared.bytesBase64, '--json'],
      { env: { ...process.env, RTD_CONFIG_DIR: meta.config, RUST_LOG: 'off' }, encoding: 'utf8', timeout: 60000,
        stdio: ['ignore', 'pipe', 'pipe'] }));
    await reader.verifySignature(prepared.bytesBase64, fixture.deployer, signed.rtdSignature);
    record(join(output, 'pending.json'), { bindingKey: session.bindingKey, sender: fixture.deployer,
      digest: prepared.digest, bytesBase64: prepared.bytesBase64, signature: signed.rtdSignature });
    const receipt = await reader.dispatch(prepared.bytesBase64, fixture.deployer, [signed.rtdSignature]);
    record(join(output, 'receipt.json'), receipt);
    assert.equal(receipt.digest, prepared.digest); assert.equal(receipt.success, true);
    const recovered = await reader.lookup(prepared.digest);
    record(join(output, 'evidence.json'), { verifiedAt: new Date().toISOString(), sourceHead: proof.source.head,
      expectedGenesisDigest: profile.expectedGenesisDigest, sender: fixture.deployer, amountAtomic: '1',
      receipt, recovered, dispatches, paths,
      scope: 'Actual wallet coin preparation, same-byte simulation, gRPC signature verification, single execution and original-digest lookup. CLI dev-key signing and private filesystem attempt record; not browser signing, IndexedDB coordinator or UI acceptance.' });
    assert(recovered, 'successful dispatch receipt retained; original digest not yet visible; no resubmit');
    assert.equal(recovered.digest, prepared.digest); assert.equal(recovered.success, true);
    console.log(JSON.stringify({ digest: receipt.digest, success: receipt.success, dispatches, recovered: true }));
  } finally {
    record(join(output, `trace-${mode}-${Date.now()}.json`), { observedAt: new Date().toISOString(), mode, dispatches, paths });
    session.close(); globalThis.fetch = originalFetch;
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'probe failed'); process.exitCode = 1; });
