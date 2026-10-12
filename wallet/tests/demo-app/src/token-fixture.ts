// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { isValidRtdAddress, isValidTransactionDigest, normalizeStructTag, RTD_TYPE_ARG } from 'rtd-typescript/utils';
import { addressFundedTransfer } from '../../../src/shared/rpc/address-funded-transfer';

/** Local test action using the production mixed-token builder and explicit live Coin reference. */
export function tokenFixtureTransaction(url: URL, network: string, sender: string) {
 const names=['tokenType','tokenCoin','tokenVersion','tokenDigest','tokenRecipient'] as const;
 const values=names.map(name=>url.searchParams.get(name));
 if(values.every(value=>value===null))return null;
 const [rawType,objectId,version,digest,to]=values;
 if(network!=='localnet'||url.protocol!=='http:'||url.hostname!=='127.0.0.1'||
   values.some(value=>!value)||!isValidRtdAddress(sender)||!isValidRtdAddress(objectId!)||
   !isValidRtdAddress(to!)||!isValidTransactionDigest(digest!)||
   !/^[1-9]\d*$/.test(version!)||BigInt(version!)>0xffffffffffffffffn)
  throw new Error('Token fixture requires a complete live Coin binding on localnet / 127.0.0.1');
 const type=normalizeStructTag(rawType!);
 if(type===RTD_TYPE_ARG)throw new Error('Token fixture requires a non-native token');
 return addressFundedTransfer({sender,to:to!,coinType:type,amount:1500000n,addressBalance:1000000n,payAll:false,
  coins:[{objectId:objectId!,version:version!,digest:digest!,balance:'1000000',
   type:normalizeStructTag(`0x2::coin::Coin<${type}>`),owner:{$kind:'AddressOwner',AddressOwner:sender}}]});
}
