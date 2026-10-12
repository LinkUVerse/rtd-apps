// Read-only evidence of actual admitted rate histories through the wallet reader.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { bcs } from 'rtd-typescript/bcs';
import { normalizeStructTag } from 'rtd-typescript/utils';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletAssetReader } from '../src/shared/rpc/asset-reader';
import { stakingBcs, STAKING_RATE_BCS } from '../src/shared/rpc/staking-bcs';
async function main() {
 const [profileFile, output] = process.argv.slice(2);
 const profile = validateNetworkProfile(JSON.parse(readFileSync(profileFile, 'utf8')));
 const originalFetch = globalThis.fetch;
 const paths: string[] = [];
 globalThis.fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  assert.equal(url.hostname, '127.0.0.1');
  assert(url.pathname === '/graphql' || url.pathname.endsWith('/GetServiceInfo'));
  paths.push(url.href); return originalFetch(input, init);
 };
 const session = new WalletReadSession(profile);
 try {
  const reader = await WalletAssetReader.open(session, {timeoutMs: 30000});
  const originalFields = reader.dynamicFields.bind(reader);
  const histories: {parent: string; rows: unknown[]}[] = [];
  reader.dynamicFields = async (...args: Parameters<typeof originalFields>) => {
   const result = await originalFields(...args);
   const rows = result.value.filter(field => field.valueType === normalizeStructTag('0x3::staking_pool::PoolTokenExchangeRate')).map(field => {
    assert.equal(field.$kind, 'DynamicField'); assert.equal(field.name.type, 'u64');
    return {epoch: stakingBcs(bcs.u64(), field.name.bcs), ...stakingBcs(STAKING_RATE_BCS, field.value.bcs)};
   });
   if(rows.length) histories.push({parent: args[0], rows});
   return result;
  };
  const {value} = await reader.staking();
  assert(histories.some(history => history.rows.length >= 2), 'No multi-epoch rate table observed');
  assert(value.validators.some(v => v.active && v.apy.state === 'estimated' && v.apy.sampleCount > 0));
  const evidence = {verifiedAt: new Date().toISOString(), proof: reader.proof, epoch: value.epoch, safeMode: value.safeMode, subsidyStartEpoch: value.subsidyStartEpoch, histories, validators: value.validators.map(v => ({address:v.address,poolId:v.poolId,active:v.active,apy:v.apy})), paths, dispatches:0, scope:'Actual current-snapshot rate history and wallet APY; no transaction, signing, browser or live safe-mode transition.'};
  writeFileSync(output, JSON.stringify(evidence,null,2)+'\n', {flag:'wx'});
  console.log(JSON.stringify({checkpoint: reader.proof.checkpoint,epoch:value.epoch,histories,validators:evidence.validators,dispatches:0}));
 } finally {session.close();globalThis.fetch = originalFetch;}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
