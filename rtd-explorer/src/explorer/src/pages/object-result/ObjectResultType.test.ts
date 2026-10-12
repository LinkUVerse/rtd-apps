import { expect, it } from 'vitest';
import { translate } from './ObjectResultType';
import type { RtdObjectResponse } from 'rtd-typescript/jsonRpc';

it('projects only strings into the detail view while retaining structured metadata and partial errors',()=>{
 const display={data:{name:'NFT name',attributes:{level:2,tags:['a','b']},image_url:7,description:false},error:{code:'displayError' as const,error:'partial template failure'}};
 const object:RtdObjectResponse={data:{objectId:'0x1',version:'9007199254740993',digest:'object-digest',owner:{AddressOwner:'0x2'},type:'0x3::nft::NFT',content:{dataType:'moveObject',type:'0x3::nft::NFT',hasPublicTransfer:true,fields:{id:{id:'0x1'}}},display}};
 const result=translate(object);
 expect(result.display).toEqual({name:'NFT name'});expect(result.rawDisplay).toBe(display);expect(result.version).toBe('9007199254740993');
 expect(object.data?.display).toEqual(display);
});
