// Read-only actual staking domain and complete rate tables; no simulation/signing/dispatch.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { bcs } from 'rtd-typescript/bcs';
import { normalizeStructTag } from 'rtd-typescript/utils';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletStakingSnapshotReader } from '../src/shared/rpc/staking-snapshot-reader';
import { stakingBcs, STAKING_RATE_BCS } from '../src/shared/rpc/staking-bcs';

async function main() {
  const [profileFile, owner, output, mode] = process.argv.slice(2);
  assert(mode === undefined || mode === 'native');
  const raw = JSON.parse(readFileSync(profileFile, 'utf8'));
  const profile = validateNetworkProfile(mode === 'native'
    ? {...raw, endpoints:{...raw.endpoints, graphqlUrl:'http://127.0.0.1:39540/graphql'}} : raw);
  const nativeFetch = globalThis.fetch;
  const originalFields = WalletStakingSnapshotReader.prototype.dynamicFields;
  const histories: { parent: string; checkpoint: string; rows: {epoch: string; rtd_amount: string; pool_token_amount: string}[] }[] = [];
  let requests = 0;
  globalThis.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.hostname, '127.0.0.1');
    if(url.pathname === '/graphql') assert.equal(url.protocol, mode === 'native' ? 'http:' : 'https:');
    assert(url.pathname === '/graphql' || url.pathname.endsWith('/GetServiceInfo'));
    if(url.pathname === '/graphql') {
      const body = JSON.parse(String(init?.body));
      assert(!/\bdisplay\b|\bbasis\b|\bjson\b|hasPublicTransfer|walletDisplayService/.test(body.query));
    }
    requests++;
    return nativeFetch(input, init);
  };
  WalletStakingSnapshotReader.prototype.dynamicFields = async function(...args) {
    const result = await originalFields.apply(this, args);
    const rows = result.value.filter(field => field.valueType === normalizeStructTag('0x3::staking_pool::PoolTokenExchangeRate')).map(field => {
      assert.equal(field.$kind, 'DynamicField'); assert.equal(field.name.type, 'u64');
      return {epoch: stakingBcs(bcs.u64(), field.name.bcs), ...stakingBcs(STAKING_RATE_BCS, field.value.bcs)};
    });
    if(rows.length) histories.push({parent: args[0], checkpoint: result.snapshot.checkpoint, rows});
    return result;
  };
  const session = new WalletReadSession(profile);
  const start = performance.now();
  try {
    assert(globalThis.navigator?.locks, 'Native read budget unavailable');
    const result = await WalletStakingSnapshotReader.read(session, owner);
    assert.equal(result.snapshot.displayHistory, undefined);
    assert.equal(result.snapshot.dependencies.length, 6);
    assert(result.value.validators.length > 0);
    assert(result.value.positions);
    if(mode !== 'native') assert(result.value.positions.length > 0, 'Original nonempty owner portfolio required');
    assert(histories.length > 0);
    assert(histories.every(h => h.checkpoint === result.snapshot.checkpoint));
    const evidence = {verifiedAt: new Date().toISOString(), elapsedMs: performance.now() - start,
      profileRevision: profile.revision, endpoint:profile.endpoints.graphqlUrl, mode:mode ?? 'public-tls', owner, proof: result.snapshot, value: result.value, histories,
      requests, simulations:0, signatures:0, dispatches:0,
      scope:mode === 'native' ? 'Explicit native-only ingress and production staking-only reader at one S; actual rates and owner positions at S, including an empty portfolio. No public TLS, nonempty original stake, Chrome/UI or redemption acceptance.' : 'Actual public TLS ingress and production staking-only reader at one S; all original owner positions and all rate histories; no Chrome/UI or redemption acceptance.'};
    writeFileSync(output, JSON.stringify(evidence,null,2)+'\n', {flag:'wx', mode:0o600});
    console.log(JSON.stringify({passed:true, checkpoint: result.snapshot.checkpoint, epoch:result.value.epoch,
      positions:result.value.positions.map(p => ({objectId:p.objectId, status:p.status, principal:p.principal, reward:p.reward})),
      rateTables:histories.length, rateRows:histories.reduce((n,h)=>n+h.rows.length,0), requests,
      elapsedMs: evidence.elapsedMs, simulations:0, signatures:0, dispatches:0}));
  } finally {session.close(); globalThis.fetch=nativeFetch; WalletStakingSnapshotReader.prototype.dynamicFields=originalFields;}
}
main().catch(error => { console.error(JSON.stringify({passed:false,name:error.name,message:error.message})); process.exitCode=1; });
