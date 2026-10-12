import { describe, expect, it } from 'vitest';
import type { KioskItem } from 'rtd-kiosk';
import { explorerKioskItem, explorerDisplayString, explorerVideoUrl, explorerDisplayStrings } from 'rtd-apps-core/src/utils/explorer-kiosk';

function item(): KioskItem {
  return { objectId:'0xa', type:'0xb::nft::NFT', kioskId:'0xc', isLocked:false,
    data:{objectId:'0xa', type:'0xb::nft::NFT', version:'12', digest:'actual-digest',
      owner:{$kind:'ObjectOwner',ObjectOwner:'0xd'},content:new Uint8Array([1,2]),
      previousTransaction:'previous-digest',objectBcs:undefined,json:undefined,
      display:{data:{name:'NFT',image_url:'https://example.test/nft.png',attributes:{level:2}},error:null}} };
}
describe('Explorer Kiosk presentation boundary', () => {
  it('preserves identity and display while keeping BCS out of the parsed Move JSON slot', () => {
    const response = explorerKioskItem(item());
    expect(response.data).toMatchObject({objectId:'0xa',version:'12',digest:'actual-digest',type:'0xb::nft::NFT',previousTransaction:'previous-digest'});
    expect(response.kioskId).toBe('0xc');
    expect(response.data).not.toHaveProperty('content');
    expect(response.data).not.toHaveProperty('owner');
    expect(explorerDisplayString(response,'name')).toBe('NFT');
    expect(explorerDisplayString(response,'image_url')).toBe('https://example.test/nft.png');
    expect(explorerDisplayString(response,'attributes')).toBeUndefined();
    expect(response.data?.display?.data?.attributes).toEqual({level:2});
  });
  it('retains partial display success and a typed displayError', () => {
    const value=item(); value.data!.display!.error='{"description":"template failure"}';
    const response=explorerKioskItem(value);
    expect(response.data?.display?.error).toEqual({code:'displayError',error:'{"description":"template failure"}'});
    expect(explorerDisplayString(response,'name')).toBe('NFT');
  });
  it('does not invent display metadata for objects without a template', () => {
    const value=item(); value.data!.display=undefined;
    expect(explorerKioskItem(value).data?.display).toBeNull();
  });
  it.each(['missing','id','type'])('refuses %s object data rather than presenting an empty item', failure => {
    const value=item();
    if(failure==='missing')value.data=undefined;
    else if(failure==='id')value.data!.objectId='0xf';
    else value.data!.type='0xb::other::Type';
    expect(()=>explorerKioskItem(value)).toThrow(/missing or inconsistent/);
  });
  it.each([{},[],7,true,null])('does not render non-string display %j as text or URL', value => {
    expect(explorerDisplayString({data:{objectId:'0xa',version:'1',digest:'d',display:{data:{name:value}}}},'name')).toBeUndefined();
  });
});

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import type { KioskClient } from 'rtd-kiosk';
import type { RtdJsonRpcClient } from 'rtd-typescript/jsonRpc';
import { ExplorerRpcContext } from 'rtd-apps-core/src/rpc/ExplorerRpcContext';
import { KioskClientContext } from 'rtd-apps-core/src/components/KioskClientProvider';
import { useGetKioskContents } from 'rtd-apps-core/src/hooks/useGetKioskContents';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it.each([false,true])('actual hook respects disabled OriginByte and missing native object fails: %s', async missing => {
  const source=item(); if(missing)source.data=undefined;
  const client={getOwnedObjects:vi.fn().mockRejectedValue(new Error('OriginByte must stay disabled'))};
  const kioskClient={network:'custom',getOwnedKiosks:vi.fn().mockResolvedValue({kioskIds:['0xc'],kioskOwnerCaps:[]}),
    getKiosk:vi.fn().mockResolvedValue({itemIds:['0xa'],items:[source]})};
  const cache=new QueryClient({defaultOptions:{queries:{retry:false}}});
  const root=createRoot(document.createElement('div'));
  let result: ReturnType<typeof useGetKioskContents> | undefined;
  function Consumer(){result=useGetKioskContents('0xe',true);return null;}
  try {
    await act(async()=>root.render(createElement(QueryClientProvider,{client:cache},
      createElement(ExplorerRpcContext.Provider,{value:{client:client as unknown as RtdJsonRpcClient,network:'custom'}},
        createElement(KioskClientContext.Provider,{value:kioskClient as unknown as KioskClient},createElement(Consumer))))));
    await act(async()=>{await vi.waitFor(()=>expect(kioskClient.getKiosk).toHaveBeenCalledOnce());});
    await act(async()=>{await new Promise(resolve=>setTimeout(resolve,20));});
    expect(client.getOwnedObjects).not.toHaveBeenCalled();
    if(missing){expect(result?.isError).toBe(true);expect(result?.data).toBeUndefined();}
    else {expect(result?.data?.list[0]).toEqual(explorerKioskItem(source));expect(result?.data?.lookup.get('0xa')).toBe('0xc');}
  } finally {await act(async()=>root.unmount());cache.clear();}
});


describe('Explorer recognized NFT video', () => {
  it('uses the explicit Move type ahead of the package-content conditional', () => {
    const value=explorerKioskItem(item());
    value.data!.display!.data!.video_url='https://example.test/video.mp4';
    expect(explorerVideoUrl(value,['0xb'])).toBe('https://example.test/video.mp4');
    expect(explorerVideoUrl(value,['0xff'])).toBeNull();
  });
  it('refuses structured video metadata and missing object data', () => {
    const value=explorerKioskItem(item());value.data!.display!.data!.video_url={url:'not-a-string'};
    expect(explorerVideoUrl(value,['0xb'])).toBeNull();
    expect(explorerVideoUrl({},['0xb'])).toBeNull();
  });
});

it('projects text metadata for detail cards without mutating raw structured display', () => {
  const value=explorerKioskItem(item());
  expect(explorerDisplayStrings(value)).toEqual({name:'NFT',image_url:'https://example.test/nft.png'});
  expect(value.data?.display?.data?.attributes).toEqual({level:2});
  expect(explorerDisplayStrings({})).toBeNull();
});
