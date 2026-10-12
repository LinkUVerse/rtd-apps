// Read-only production readers against C51 ingress. No browser or signing access.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletBalanceReader } from '../src/shared/rpc/balance-reader';
import { WalletStakingSnapshotReader } from '../src/shared/rpc/staking-snapshot-reader';

async function main() {
  const profileFile = '/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C46-isolated-browser-gateway-20261007-01/profile.json';
  const profile = validateNetworkProfile(JSON.parse(readFileSync(profileFile, 'utf8')));
  assert.equal(profile.endpoints.graphqlUrl, 'http://127.0.0.1:41957/graphql');
  const owner = '0x9d7652713f02b13b73744ba47e4f21ca0a0a2966cc02df86adcde2041454e5bc';
  const samples: unknown[] = [];
  let passed = true;
  for (const kind of ['balance', 'staking'] as const) {
    const session = new WalletReadSession(profile);
    const start = performance.now();
    try {
      const result = kind === 'balance'
        ? await WalletBalanceReader.read(session, owner)
        : await WalletStakingSnapshotReader.read(session, owner);
      assert.equal(result.snapshot.bindingKey, session.bindingKey);
      samples.push({ kind, passed: true, milliseconds: Math.round(performance.now()-start), snapshot: result.snapshot, value: result.value });
    } catch (error) {
      passed = false;
      samples.push({kind, passed:false, milliseconds:Math.round(performance.now()-start), error:String(error)});
    } finally { session.close(); }
  }
  const report = {passed, observedAt:new Date().toISOString(), samples,
    profileSha256:createHash('sha256').update(readFileSync(profileFile)).digest('hex'),
    scope:'Fresh CLI production readers via C51 ingress; compiled profile, not browser custom-profile or UI acceptance.',
    signatures:0, executionRequests:0};
  writeFileSync('migrationToGRpcOrGraphQLDoc/workLog/20261010-C208-live-readers-01.json', JSON.stringify(report,null,2)+'\n', {flag:'wx', mode:0o600});
  console.log(JSON.stringify({passed,samples}));
  if (!passed) process.exitCode=1;
}
main().catch(error=>{console.error(String(error));process.exitCode=1;});
