// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { Transaction } from 'rtd-typescript/transactions';
import { isValidRtdAddress, isValidTransactionDigest } from 'rtd-typescript/utils';

/** Public complete transaction inputs only; no secrets, plugins or implicit remote resolver. */
export function authorizationFixtureTransaction(url: URL, network: string, sender: string) {
 const encoded=url.searchParams.get('authorization');
 if(encoded===null)return null;
 if(network!=='localnet'||url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!encoded||encoded.length>64000)
  throw new Error('Authorization fixture requires localnet / http://127.0.0.1');
 const json=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(encoded),char=>char.charCodeAt(0)));
 const tx=Transaction.from(json),data=tx.getData();
 const u64=(value:unknown)=>typeof value==='string'&&/^[1-9]\d*$/.test(value)&&BigInt(value)<=0xffffffffffffffffn;
 if(!isValidRtdAddress(sender)||data.sender!==sender||!isValidRtdAddress(data.gasData.owner??'')||
  !u64(data.gasData.price)||!u64(data.gasData.budget)||!data.gasData.payment?.length||
  data.gasData.payment.some(ref=>!isValidRtdAddress(ref.objectId)||!u64(ref.version)||!isValidTransactionDigest(ref.digest))||
  !data.expiration||!('None' in data.expiration||'Epoch' in data.expiration))
  throw new Error('Authorization fixture requires the selected sender and complete gas / expiration');
 return tx;
}
