// Read-only current-service receipt and explicit historical-version verification.
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { validateNetworkProfile } from "../src/shared/rpc/profile";
import { WalletReadSession } from "../src/shared/rpc/session";
import { WalletLedgerReader } from "../src/shared/rpc/ledger-reader";
import { WalletArchiveObjectReader } from "../src/shared/rpc/archive-object-reader";
import { receiptObjectEffects } from "rtd-apps-core/src/rpc/transaction-view";

async function main() {
  const profileFile = "/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C46-isolated-browser-gateway-20261007-01/profile.json";
  const oldFile = "migrationToGRpcOrGraphQLDoc/workLog/20261008-C102-full-post-write-positive-02.json";
  const old = JSON.parse(readFileSync(oldFile, "utf8"));
  assert(old.passed);
  const profile = validateNetworkProfile(JSON.parse(readFileSync(profileFile, "utf8")));
  assert.equal(profile.expectedGenesisDigest, old.h0);
  const session = new WalletReadSession(profile);
  const requests: any[] = [], receipts: any[] = [];
  const transport: typeof fetch = async (input, init) => {
    const url = String(input);
    assert([profile.endpoints.fullnodeGrpcWeb, profile.endpoints.archiveGrpcWeb].some(base => base && url.startsWith(base)));
    const started = Date.now();
    const response = await fetch(input, init);
    const body = new Uint8Array(await response.clone().arrayBuffer());
    requests.push({url, startedAt:new Date(started).toISOString(), elapsedMs:Date.now()-started, status:response.status, bodyBase64:Buffer.from(body).toString("base64"), headers:Object.fromEntries(response.headers)});
    return response;
  };
  const ledger = new WalletLedgerReader(session, {fetch:transport});
  const archive = new WalletArchiveObjectReader(session, {fetch:transport});
  let passed = true;
  for (const previous of old.originalDigestDetails) {
    const offset = requests.length, started = Date.now();
    try {
      const details = await ledger.details(previous.digest);
      assert(details && details.transaction.checkpoint !== null);
      assert.equal(details.transaction.digest, previous.digest);
      const effects = receiptObjectEffects(details.transaction).filter(e => e.version !== null && e.objectDigest && ["ObjectWrite", "PackageWrite"].includes(e.outputState));
      assert(effects.length > 0);
      const selectors = effects.map(e => ({objectId:e.objectId,version:e.version!}));
      const objects = await archive.objects(selectors);
      assert.equal(objects.values.length, effects.length);
      objects.values.forEach((object, index) => {
        assert(!(object instanceof Error));
        assert.equal(object.objectId, effects[index].objectId);
        assert.equal(object.version, effects[index].version);
        assert.equal(object.digest, effects[index].objectDigest);
      });
      receipts.push({passed:true, digest:previous.digest, source:details.source, checkpoint:details.transaction.checkpoint, success:details.transaction.status.success, effects:effects.map(e=>({objectId:e.objectId,version:e.version,digest:e.objectDigest,outputState:e.outputState})), coverage:objects.coverage, requestCount:requests.length-offset, elapsedMs:Date.now()-started});
    } catch(error) {
      passed=false;receipts.push({passed:false,digest:previous.digest,requestCount:requests.length-offset,error:String(error)});
    }
  }
  session.close();
  const proof={passed,observedAt:new Date().toISOString(),scope:"Six existing public dev transactions through current C51 endpoints, canonical receipt and explicit archived versions; CLI only, no account/credential access.",h0:profile.expectedGenesisDigest,receipts,requests,signatures:0,executions:0,accountOrCredentialReads:0,inputsSha256:Object.fromEntries([profileFile,oldFile,process.argv[1]].map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')]))};
  writeFileSync(process.argv[2],JSON.stringify(proof,null,2)+"\n",{flag:"wx",mode:0o600});
  console.log(JSON.stringify({passed,receipts}));
  if(!passed)process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
