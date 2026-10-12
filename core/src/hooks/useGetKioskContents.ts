// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useExplorerRpcContext as useRtdClientContext } from '../rpc/ExplorerRpcContext';
import { KIOSK_ITEM, KioskClient, KioskOwnerCap } from 'rtd-kiosk';
import type { RtdJsonRpcClient } from 'rtd-typescript/jsonRpc';
import { useQuery } from '@tanstack/react-query';

import { getKioskIdFromOwnerCap, ORIGINBYTE_KIOSK_OWNER_TOKEN } from '../utils/kiosk';
import { explorerKioskItem, type ExplorerKioskItem } from '../utils/explorer-kiosk';
import { useKioskClient } from './useKioskClient';

export enum KioskTypes {
	RTD = 'rtd',
	ORIGINBYTE = 'originByte',
}

export type Kiosk = {
	items: ExplorerKioskItem[];
	itemIds: string[];
	kioskId: string;
	type: KioskTypes;
	ownerCap?: KioskOwnerCap;
};

async function getOriginByteKioskContents(address: string, client: RtdJsonRpcClient) {
	const data = await client.getOwnedObjects({
		owner: address,
		filter: {
			StructType: ORIGINBYTE_KIOSK_OWNER_TOKEN,
		},
		options: {
			showContent: true,
		},
	});
	const ids = data.data.map((object) => getKioskIdFromOwnerCap(object));

	// fetch the user's kiosks
	const ownedKiosks = await client.multiGetObjects({
		ids: ids.flat(),
		options: {
			showContent: true,
		},
	});

	const contents = await Promise.all(
		ownedKiosks
			.map(async (kiosk): Promise<Kiosk> => {
				if (!kiosk.data) throw new Error('OriginByte Kiosk object is unavailable');
				const kioskId = kiosk.data.objectId;
				const objects = await client.getDynamicFields({
					parentId: kioskId,
				});

				const objectIds = objects.data
					.filter((obj) => obj.name.type === KIOSK_ITEM)
					.map((obj) => obj.objectId);

				// fetch the contents of the objects within a kiosk
				const kioskContent = await client.multiGetObjects({
					ids: objectIds,
					options: {
						showDisplay: true,
						showType: true,
					},
				});

				return {
					itemIds: objectIds,
					items: kioskContent.map((item) => ({ ...item, kioskId })),
					kioskId,
					type: KioskTypes.ORIGINBYTE,
				};
			}),
	);
	return contents;
}

async function getRtdKioskContents(address: string, kioskClient: KioskClient) {
	const ownedKiosks = await kioskClient.getOwnedKiosks({ address });
	const contents = await Promise.all(
		ownedKiosks.kioskIds.map(async (id: string) => {
			const kiosk = await kioskClient.getKiosk({
				id,
				options: {
					withObjects: true,
				},
			});
			return {
				itemIds: kiosk.itemIds,
				items: kiosk.items.map(explorerKioskItem),
				kioskId: id,
				type: KioskTypes.RTD,
				ownerCap: ownedKiosks.kioskOwnerCaps.find((k) => k.kioskId === id),
			};
		}),
	);
	return contents;
}

export function useGetKioskContents(address?: string | null, disableOriginByteKiosk?: boolean) {
	const { client: rtdClient, network } = useRtdClientContext();
	const kioskClient = useKioskClient();
	return useQuery({
		// eslint-disable-next-line @tanstack/query/exhaustive-deps
		queryKey: ['get-kiosk-contents', address, disableOriginByteKiosk, network, kioskClient.network],
		queryFn: async () => {
			const rtdKiosks = await getRtdKioskContents(address!, kioskClient);
			const obKiosks = disableOriginByteKiosk ? [] : await getOriginByteKioskContents(address!, rtdClient);
			return [...rtdKiosks, ...obKiosks];
		},
		select(data) {
			const kiosks = new Map<string, Kiosk>();
			const lookup = new Map<string, string>();

			data.forEach((kiosk) => {
				kiosks.set(kiosk.kioskId, kiosk);
				kiosk.itemIds.forEach((id) => {
					lookup.set(id, kiosk.kioskId);
				});
			});

			return {
				kiosks,
				list: data.flatMap((kiosk) => kiosk.items),
				lookup,
			};
		},
		enabled: !!address,
	});
}
