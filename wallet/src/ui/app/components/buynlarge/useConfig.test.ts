import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { decodeBuyNLargeConfig, useConfig } from './useConfig';
import { groupCollectibles } from '_src/shared/rpc/nft-assets';
const state=vi.hoisted(()=>({value:undefined as unknown}));
vi.mock('@growthbook/growthbook-react',()=>({useFeatureValue:()=>state.value}));
const valid={enabled:true,objectType:'0x2::example::NFT',sheetTitle:'Title',sheetDescription:'Description',
 homeDescription:'Home',homeImage:'https://example.test/nft.png',backgroundColor:'#fff'};
describe('remote featured NFT configuration boundary',()=>{
 it.each([null,{},'invalid',false,3])('ignores non-array payload %j',value=>expect(decodeBuyNLargeConfig(value)).toEqual([]));
 it('keeps valid neighbors but rejects invalid types and malformed display properties',()=>{
  const result=decodeBuyNLargeConfig([valid,{...valid,objectType:'not-a-move-type'},null,
   {...valid,homeDescription:{unexpected:true}},{...valid,enabled:'true'}]);
  expect(result).toEqual([valid]);
  expect(()=>groupCollectibles([],[],{},result.map(value=>value.objectType))).not.toThrow();
 });
 it.each(['0x2::::NFT', '0x2::nft::NFT trailing', '@example/pkg::nft::NFT', 'u64', 'vector<u8>'])('rejects malformed or non-object type %s', objectType=>{
  expect(decodeBuyNLargeConfig([{...valid,objectType}])).toEqual([]);
 });
 it('preserves the configured type spelling used by existing seen preferences',()=>{
  expect(decodeBuyNLargeConfig([valid])[0].objectType).toBe(valid.objectType);
 });
 it('actual feature hook tolerates malformed payload and recovers on the next render',()=>{
  let result:ReturnType<typeof useConfig>=[];
  function Consumer(){result=useConfig();return createElement('span',null,result.length);}
  state.value={unexpected:true};expect(renderToStaticMarkup(createElement(Consumer))).toContain('0');
  state.value=[valid];expect(renderToStaticMarkup(createElement(Consumer))).toContain('1');
  expect(result).toEqual([valid]);
 });
});
