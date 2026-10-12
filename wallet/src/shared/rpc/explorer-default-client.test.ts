import { afterEach, expect, it, vi } from 'vitest';
import { isRtdJsonRpcClient } from 'rtd-typescript/jsonRpc';
import { createRtdClient, Network } from '../../../../rtd-explorer/src/explorer/src/utils/api/DefaultRpcClient';

afterEach(()=>vi.unstubAllGlobals());
it('Explorer factory uses explicit legacy transport, separates endpoint cache and keeps exact read request',async()=>{
 const first=createRtdClient('http://127.0.0.1:48101');
 const second=createRtdClient('http://127.0.0.1:48102');
 expect(isRtdJsonRpcClient(first)).toBe(true);
 expect(first).toBe(createRtdClient('http://127.0.0.1:48101'));
 expect(second).not.toBe(first);
 expect(first.network).toBe('custom');
 const requests:{url:string;method:string;params:unknown}[]=[];
 vi.stubGlobal('fetch',vi.fn(async(url,init)=>{
  const request=JSON.parse(String(init.body));
  requests.push({url:String(url),method:request.method,params:request.params});
  return new Response(JSON.stringify({jsonrpc:'2.0',id:request.id,result:'1000'}),{status:200,headers:{'content-type':'application/json'}});
 }));
 expect(await first.getReferenceGasPrice()).toBe(1000n);
 expect(await second.getReferenceGasPrice()).toBe(1000n);
 expect(requests).toEqual([
  {url:'http://127.0.0.1:48101',method:'rtdx_getReferenceGasPrice',params:[]},
  {url:'http://127.0.0.1:48102',method:'rtdx_getReferenceGasPrice',params:[]},
 ]);
});
it.each([[Network.LOCAL,'localnet'],[Network.DEVNET,'devnet'],[Network.TESTNET,'testnet'],[Network.MAINNET,'mainnet']])('Explorer built-in %s passes explicit SDK label %s without connecting', (network,label)=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 expect(createRtdClient(network).network).toBe(label);
 expect(fetch).not.toHaveBeenCalled();
});
