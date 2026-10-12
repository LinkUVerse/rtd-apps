// Read-only real-chain preparation: never signs or submits transactions.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { Transaction } from "rtd-typescript/transactions";
import { RTD_TYPE_ARG } from "rtd-typescript/utils";
import type { WalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { validateNetworkProfile } from "../src/shared/rpc/profile";
import { WalletReadSession } from "../src/shared/rpc/session";
import { WalletFullnodeReader } from "../src/shared/rpc/fullnode-reader";
import { WalletExecutionReader } from "../src/shared/rpc/execution-reader";
import { WalletTransactionReader } from "../src/shared/rpc/transaction-reader";
import {
  prepareCoinTransfer,
  revalidateCoinTransfer,
} from "../src/shared/rpc/coin-transfer-preparation";
async function main() {
  const [profileFile, fixtureFile, output] = process.argv.slice(2);
  const fixture = JSON.parse(readFileSync(fixtureFile, "utf8"));
  const profile = validateNetworkProfile(
    JSON.parse(readFileSync(profileFile, "utf8")),
  );
  assert.equal(profile.expectedGenesisDigest, fixture.h0);
  assert.equal(profile.endpoints.fullnodeGrpcWeb, fixture.endpoint);
  assert.equal(new URL(fixture.endpoint).hostname, "127.0.0.1");
  const session = new WalletReadSession(profile),
    paths: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.hostname, "127.0.0.1");
    assert(!url.pathname.endsWith("/ExecuteTransaction"));
    assert(!String(init?.body).includes('"jsonrpc"'));
    paths.push(url.href);
    return originalFetch(input, init);
  };
  try {
    const fullnode = new WalletFullnodeReader(session),
      transactions = new WalletTransactionReader(session);
    const rpc = {
      bindingKey: session.bindingKey,
      readSessionKey: session.cacheKey,
      readFreshCoins: (owner, type, signal) =>
        fullnode.coins(owner, type, signal),
      readFreshBalance: (owner, type, signal) =>
        fullnode.balance(owner, type, signal),
      prepareTransaction: (tx, owner, signal) =>
        transactions.prepare(tx, owner, signal),
      simulateTransaction: (bytes, owner, signal) =>
        transactions.simulate(bytes, owner, signal),
    } as WalletRpc;
    const recovery=await new WalletExecutionReader(session).lookup(fixture.digest);
    assert(recovery?.success);assert.equal(recovery.digest,fixture.digest);
    const balance = await fullnode.balance(fixture.target, RTD_TYPE_ARG);
    const coins=await fullnode.coins(fixture.target,RTD_TYPE_ARG);
    assert.equal(balance.coinBalance,"1000000000");
    assert.equal(balance.addressBalance,"1000000000");
    assert.equal(balance.balance,"2000000000");
    assert.equal(coins.reduce((sum,coin)=>sum+BigInt(coin.balance),0n),1000000000n);
    const results = [];
    for (const payAll of [false, true]) {
      const prepared = await prepareCoinTransfer(rpc, {
        sender: fixture.target,
        to: fixture.sender,
        coinType: RTD_TYPE_ARG,
        coinDecimals: 0,
        amount: payAll ? balance.balance : "1500000000",
        isPayAllRtd: payAll,
      });
      await revalidateCoinTransfer(rpc, prepared, fixture.target);
      const data = Transaction.from(prepared.bytesBase64).getData();
      const result=prepared.simulation.Transaction;assert(result);
      const receive=result.balanceChanges.filter(item=>item.address===fixture.sender&&item.coinType===RTD_TYPE_ARG).reduce((sum,item)=>sum+BigInt(item.amount),0n);
      const gas=result.effects.gasUsed;
      const netGas=BigInt(gas.computationCost)+BigInt(gas.storageCost)-BigInt(gas.storageRebate);
      assert.equal(receive,payAll?2000000000n-netGas:1500000000n);
      if(payAll)assert(coins.every(coin=>data.gasData.payment?.some(ref=>ref.objectId===coin.objectId&&ref.version===coin.version&&ref.digest===coin.digest)));
      results.push({receive:receive.toString(),netGas:netGas.toString(),
        payAll,
        digest: prepared.digest,
        gasBudget: prepared.gasBudget,
        gasPrice: prepared.gasPrice,
        gasPaymentKind: prepared.gasPaymentKind,
        gasPayment: data.gasData.payment,
        expiration: data.expiration,
        commands: data.commands.map((command) => command.$kind),
      });
    }
    writeFileSync(
      output,
      JSON.stringify(
        {
          observedAt: new Date().toISOString(),
          h0: fixture.h0,
          owner: fixture.target,
          balance,coins,recovery,
          results,
          paths,
          dispatches: 0,
          scope:
            "Actual wallet preparation and same-byte formal simulation for mixed Coin/address native amount greater than either component and pay-all. No signing, execution or UI acceptance.",
        },
        null,
        2,
      ) + "\n",
      { flag: "wx" },
    );
    console.log(JSON.stringify({ balance, results, dispatches: 0 }));
  } finally {
    globalThis.fetch = originalFetch;
    session.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
