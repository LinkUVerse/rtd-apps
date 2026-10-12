// Read-only verification of the exact saved profile; no package defaults are added.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletAssetReader } from '../src/shared/rpc/asset-reader';

async function main() {
  const [profileFile, owner, output] = process.argv.slice(2);
  const profile = validateNetworkProfile(JSON.parse(readFileSync(profileFile, 'utf8')));
  assert(profile.packages.originByte && !profile.packages.kiosk);
  const fetch = globalThis.fetch;
  const paths: string[] = [];
  globalThis.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.hostname, '127.0.0.1');
    assert(url.pathname === '/graphql' || url.pathname.endsWith('/GetServiceInfo'));
    paths.push(url.href);
    return fetch(input, init);
  };
  const session = new WalletReadSession(profile);
  try {
    const reader = await WalletAssetReader.open(session, { timeoutMs: 30000 });
    const result = await reader.kiosks(owner);
    const evidence = {
      verifiedAt: new Date().toISOString(), h0: profile.expectedGenesisDigest,
      packages: profile.packages, owner, proof: result.snapshot,
      passed: result.value.length > 0 && result.value.every(kiosk => kiosk.kind === "originbyte") && result.value.some(kiosk => kiosk.items.length > 0),
      kiosks: result.value.map(kiosk => ({ kind: kiosk.kind, id: kiosk.kioskId,
        items: kiosk.items.map(item => ({ id: item.objectId, version: item.version, digest: item.digest })),
      })), paths, dispatches: 0,
      scope: 'Actual configured OriginByte-only snapshot reader; no signing, execution or Chrome acceptance.',
    };
    writeFileSync(output, JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx' });
    assert(result.value.length > 0, `No OriginByte fixture visible at checkpoint ${result.snapshot.checkpoint}`);
    assert(result.value.every(kiosk => kiosk.kind === 'originbyte'));
    assert(result.value.some(kiosk => kiosk.items.length > 0));
    console.log(JSON.stringify({ checkpoint: result.snapshot.checkpoint, kiosks: evidence.kiosks, dispatches: 0 }));
  } finally { session.close(); globalThis.fetch = fetch; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
