// Read-only real-chain preparation: never signs or submits transactions.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { GrpcTypes } from "rtd-typescript/grpc";
import { Transaction } from "rtd-typescript/transactions";
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
  const simulations: unknown[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.hostname, "127.0.0.1");
    assert(!url.pathname.endsWith("/ExecuteTransaction"));
    assert(!String(init?.body).includes('"jsonrpc"'));
    paths.push(url.href);
    const response = await originalFetch(input, init);
    if(url.pathname.endsWith('/SimulateTransaction')) {
      const bytes=new Uint8Array(await response.clone().arrayBuffer());
      const size=new DataView(bytes.buffer).getUint32(1);assert.equal(bytes[0],0);
      const request=new Uint8Array(init?.body as Uint8Array);
      const length=new DataView(request.buffer,request.byteOffset).getUint32(1);
      simulations.push({request:GrpcTypes.SimulateTransactionRequest.fromBinary(request.slice(5,5+length)),response:GrpcTypes.SimulateTransactionResponse.fromBinary(bytes.slice(5,5+size))});
    }
    return response;
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
    const balance = await fullnode.balance(fixture.target, fixture.coinType);
    const coins=await fullnode.coins(fixture.target,fixture.coinType);
    assert.equal(balance.coinBalance,"1000000");
    assert.equal(balance.addressBalance,"1000000");
    assert.equal(balance.balance,"2000000");
    assert.equal(coins.reduce((sum,coin)=>sum+BigInt(coin.balance),0n),1000000n);
    const results = [];
    for (const amount of ["500000", "1500000", "2000000"]) {
      const prepared = await prepareCoinTransfer(rpc, {
        sender: fixture.target,
        to: fixture.sender,
        coinType: fixture.coinType,
        coinDecimals: 0,
        amount,
        isPayAllRtd: false,
      });
      await revalidateCoinTransfer(rpc, prepared, fixture.target);
      const data = Transaction.from(prepared.bytesBase64).getData();
      const result=prepared.simulation.Transaction;assert(result);
      const receive=result.balanceChanges.filter(item=>item.address===fixture.sender&&item.coinType===fixture.coinType).reduce((sum,item)=>sum+BigInt(item.amount),0n);
      const gas=result.effects.gasUsed;
      const netGas=BigInt(gas.computationCost)+BigInt(gas.storageCost)-BigInt(gas.storageRebate);
      assert.equal(receive,BigInt(amount));
      const senderChange=result.balanceChanges.filter(item=>item.address===fixture.target&&item.coinType===fixture.coinType).reduce((sum,item)=>sum+BigInt(item.amount),0n);
      assert.equal(senderChange,-BigInt(amount));
      assert(data.commands.some(command=>command.$kind==='MoveCall'&&command.MoveCall.function==='redeem_funds'));
      assert.equal(data.commands.some(command=>command.$kind==='MergeCoins'),BigInt(amount)>1000000n);
      assert(coins.every(coin=>!data.gasData.payment?.some(ref=>ref.objectId===coin.objectId)),'non-native token cannot fund gas');
      results.push({receive:receive.toString(),netGas:netGas.toString(),
        amount,
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
          owner: fixture.target,coinType:fixture.coinType,
          balance,coins,recovery,
          results,
          paths,
          dispatches: 0,
          scope:
            "Actual production wallet preparation and same-byte simulation for non-native address-only amount, mixed amount and full token amount. No signing, wallet execution or UI acceptance.",
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
    writeFileSync(output+'.diagnostic.json',JSON.stringify({simulations,dispatches:0},(_,v)=>typeof v==='bigint'?v.toString():v instanceof Uint8Array?Buffer.from(v).toString('base64'):v,2)+'\n',{flag:'wx'});
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
