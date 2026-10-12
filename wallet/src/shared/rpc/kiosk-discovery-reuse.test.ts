// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';
import { bcs } from 'rtd-typescript/bcs';
import { deriveDynamicFieldID, normalizeStructTag } from 'rtd-typescript/utils';
import type { WalletAssetObject } from 'rtd-apps-core/src/rpc/WalletRpcContext';
import { walletAddress } from './asset-address';
import type { WalletAssetReader } from './asset-reader';
import { dynamicType } from './dynamic-fields';
import { KIOSK_BCS, KIOSK_CAP_BCS, KIOSK_ITEM_BCS, readFrameworkKioskContents } from './kiosk-reader';
import { ORIGINBYTE_EMPTY_KEY_BCS, ORIGINBYTE_NFT_REF_BCS, ORIGINBYTE_OWNER_TOKEN_BCS,
  ORIGINBYTE_TABLE_BCS, readOriginByteKiosks } from './originbyte-kiosk';

function fixture() {
  const owner = walletAddress('0xb'), kiosk = walletAddress('0xc'), item = walletAddress('0xd');
  const tokenId = walletAddress('0xa'), table = walletAddress('0xe'), packageId = walletAddress('0x88');
  const proof = { cacheKey: 'same-reader-snapshot' };
  const type = (name: string) => normalizeStructTag(`${packageId}::ob_kiosk::${name}`);
  const itemName = KIOSK_ITEM_BCS.serialize({ id: item }).toBytes();
  const wrapper = deriveDynamicFieldID(kiosk, '0x2::dynamic_object_field::Wrapper<0x2::kiosk::Item>', itemName);
  const nft = { objectId: item, type: normalizeStructTag('0x44::nft::Nft'), content: bcs.Address.serialize(item).toBytes(),
    owner: { $kind: 'ObjectOwner', ObjectOwner: wrapper } } as WalletAssetObject;
  const kioskObject = { objectId: kiosk, type: normalizeStructTag('0x2::kiosk::Kiosk'),
    owner: { $kind: 'Shared', Shared: { initialSharedVersion: '1' } },
    content: KIOSK_BCS.serialize({ id: kiosk, owner, profits: { value: '0' }, item_count: 1, allow_extensions: true }).toBytes() } as WalletAssetObject;
  const token = { objectId: tokenId, type: type('OwnerToken'), owner: { $kind: 'AddressOwner', AddressOwner: owner },
    content: ORIGINBYTE_OWNER_TOKEN_BCS.serialize({ id: tokenId, kiosk, owner }).toBytes() } as WalletAssetObject;
  const field = (name: string, valueType: string, content: Uint8Array) => ({ $kind: 'DynamicField',
    name: { type: type(name), bcs: ORIGINBYTE_EMPTY_KEY_BCS.serialize({ dummy_field: false }).toBytes() },
    valueType: dynamicType(valueType), value: { bcs: content } });
  const fields = [
    { $kind: 'DynamicObject', fieldId: wrapper, childId: item, name: { type: normalizeStructTag('0x2::kiosk::Item'), bcs: itemName },
      valueType: nft.type, value: { bcs: nft.content } },
    field('VersionDfKey', 'u64', bcs.u64().serialize('3').toBytes()),
    field('KioskOwnerCapDfKey', '0x2::kiosk::KioskOwnerCap', KIOSK_CAP_BCS.serialize({ id: tokenId, for: kiosk }).toBytes()),
    field('NftRefsDfKey', `0x2::table::Table<0x2::object::ID,${type('NftRef')}>`, ORIGINBYTE_TABLE_BCS.serialize({ id: table, size: '1' }).toBytes()),
  ];
  const objects = vi.fn(async (ids: readonly string[]) => ({ snapshot: proof,
    value: ids.map(id => id === kiosk ? kioskObject : id === item ? nft : new Error('unexpected object')) }));
  const dynamicFields = vi.fn(async (id: string) => ({ snapshot: proof, value: id === kiosk ? fields : [{
    $kind: 'DynamicField', name: { type: normalizeStructTag('0x2::object::ID'), bcs: bcs.Address.serialize(item).toBytes() },
    valueType: type('NftRef'), value: { bcs: ORIGINBYTE_NFT_REF_BCS.serialize({ auths: { contents: [] }, is_exclusively_listed: false }).toBytes() },
  }] }));
  const revalidate = vi.fn(async () => {});
  const reader = { proof, snapshot: { session: { profile: { packages: { originByte: { discoveryPackage: packageId } } } }, revalidate },
    objects, dynamicFields, ownedObjects: vi.fn(async () => ({ snapshot: proof, value: [token] })) } as unknown as WalletAssetReader;
  return { reader, proof, objects, dynamicFields, owner, kiosk, kioskObject, nft, wrapper, revalidate };
}

describe('same-snapshot Kiosk discovery reuse', () => {
  it('reads nonempty registered contents and checks the wrapper while fetching the Kiosk once', async () => {
    const f = fixture();
    const result = await readOriginByteKiosks(f.reader, f.owner);
    expect(result.value[0].items).toHaveLength(1);
    expect(result.value[0].items[0]).toMatchObject({ objectId: f.nft.objectId, originByteRegistered: true, isLocked: false });
    expect(f.objects.mock.calls.filter(([ids]) => ids.includes(f.kiosk))).toHaveLength(1);
    expect(f.objects.mock.calls.some(([ids]) => ids.includes(f.nft.objectId))).toBe(true);
    expect(f.revalidate).toHaveBeenCalledTimes(2);
  });

  it('rejects a different admitted reader even when a caller copies the cache-key text', async () => {
    const f = fixture();
    await expect(readFrameworkKioskContents(f.reader, f.kiosk, new AbortController().signal,
      { snapshot: { ...f.proof } as any, value: f.kioskObject })).rejects.toThrow();
    expect(f.dynamicFields).not.toHaveBeenCalled(); expect(f.objects).not.toHaveBeenCalled();
  });

  it.each(['object-id', 'owner', 'bcs-uid', 'type'])('checks reused object integrity: %s', async failure => {
    const f = fixture(); const value = { ...f.kioskObject };
    if (failure === 'object-id') value.objectId = walletAddress('0xff');
    if (failure === 'owner') value.owner = { $kind: 'AddressOwner', AddressOwner: f.owner };
    if (failure === 'type') value.type = normalizeStructTag('0x2::other::Other');
    if (failure === 'bcs-uid') value.content = KIOSK_BCS.serialize({ id: walletAddress('0xff'), owner: f.owner,
      profits: { value: '0' }, item_count: 1, allow_extensions: true }).toBytes();
    await expect(readFrameworkKioskContents(f.reader, f.kiosk, new AbortController().signal,
      { snapshot: f.reader.proof, value })).rejects.toThrow();
    expect(f.dynamicFields).not.toHaveBeenCalled();
  });

  it('still rejects a child under another wrapper after discovery reuse', async () => {
    const f = fixture(); f.nft.owner = { $kind: 'ObjectOwner', ObjectOwner: f.kiosk };
    await expect(readOriginByteKiosks(f.reader, f.owner)).rejects.toThrow();
  });

  it('honors cancellation before using the admitted result', async () => {
    const f = fixture(), controller = new AbortController(); controller.abort();
    await expect(readFrameworkKioskContents(f.reader, f.kiosk, controller.signal,
      { snapshot: f.reader.proof, value: f.kioskObject })).rejects.toThrow();
    expect(f.dynamicFields).not.toHaveBeenCalled(); expect(f.objects).not.toHaveBeenCalled();
  });
});
