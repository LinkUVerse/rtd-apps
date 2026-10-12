// Independent local test dApp. Real Wallet Standard requests; no execute feature.
import {getWallets} from 'rtd-wallet-standard';
import {Transaction} from 'rtd-typescript/transactions';
const registry = getWallets(), element = id => document.getElementById(id);
const selected = () => registry.get().find(w => w.name.toLowerCase().includes('rtd wallet'));
const refresh = () => {element('connect').disabled = !selected();element('request').disabled = !selected()?.accounts.length;element('execute').disabled = !selected()?.accounts.length;
  element('accounts').textContent = JSON.stringify(selected()?.accounts.map(a => a.address) ?? [])};
registry.on('register',refresh);registry.on('unregister',refresh);
let busy = false, observing = new WeakSet();
async function run(action) {
  if (busy) throw Error('A single request must settle first');busy = true;element('result').textContent = '';element('error').textContent = '';
  element('request').disabled = true;element('execute').disabled = true;
  try {const result = await action();element('result').textContent = JSON.stringify(result,(_,v) => typeof v === 'bigint' ? v.toString() : v)}
  catch (error) {element('error').textContent = error instanceof Error ? error.message : String(error)}
  finally {busy = false;refresh()}
}
element('connect').onclick = () => run(async () => {
  const wallet = selected();if (!wallet) throw Error('Wallet unavailable');
  if (!observing.has(wallet)) {observing.add(wallet);wallet.features['standard:events'].on('change',refresh)}
  return wallet.features['standard:connect'].connect();
});
element('request').onclick = () => run(async () => {
  const url = new URL(location.href), encoded = url.searchParams.get('authorization');
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !encoded || encoded.length > 64000) throw Error('Local complete data required');
  const json = new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(encoded),c => c.charCodeAt(0)));
  const tx = Transaction.from(json), data = tx.getData(), wallet = selected(), account = wallet?.accounts.find(a => a.address === data.sender);
  if (!wallet || !account || !data.expiration || !data.gasData.payment?.length || !data.gasData.owner || data.gasData.price === null || data.gasData.budget === null) throw Error('Exact connected sender and complete gas / expiration required');
  const digest = await tx.getDigest();element('input').textContent = JSON.stringify({digest,expiration:data.expiration,sender:data.sender,gasData:data.gasData});
  return wallet.features['rtd:signTransaction'].signTransaction({account,chain:'rtd:localnet',transaction:{toJSON:async () => json}});
});
element('execute').onclick = () => run(async () => {
  const url = new URL(location.href), encoded = url.searchParams.get('authorization');
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !encoded || encoded.length > 64000) throw Error('Local complete data required');
  const json = new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(encoded),c => c.charCodeAt(0)));
  const tx = Transaction.from(json), data = tx.getData(), wallet = selected(), account = wallet?.accounts.find(a => a.address === data.sender);
  if (!wallet || !account || !data.expiration || !data.gasData.payment?.length || !data.gasData.owner || data.gasData.price === null || data.gasData.budget === null) throw Error('Exact connected sender and complete gas / expiration required');
  const digest = await tx.getDigest();element('input').textContent = JSON.stringify({digest,expiration:data.expiration,sender:data.sender,gasData:data.gasData});
  return wallet.features['rtd:signAndExecuteTransaction'].signAndExecuteTransaction({account,chain:'rtd:localnet',transaction:{toJSON:async () => json}});
});
element('disconnect').onclick = () => run(async () => {await selected()?.features['standard:disconnect'].disconnect();refresh();return {disconnected:true}});
refresh();
