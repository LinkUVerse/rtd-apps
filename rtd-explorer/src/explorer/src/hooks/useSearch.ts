// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { isRtdNSName, useRtdNSEnabled } from "rtd-apps-core";
import { useRtdClientQuery, useRtdClient } from "rtd-dapp-kit";
import { type RtdClient, type RtdSystemStateSummary } from "rtd-typescript/client";
import {
	isValidTransactionDigest,
	isValidRtdAddress,
	isValidRtdObjectId,
	normalizeRtdObjectId,
} from "rtd-typescript/utils";
import { useQuery } from "@tanstack/react-query";

const isGenesisLibAddress = (value: string): boolean => /^(0x|0X)0{0,39}[12]$/.test(value);

type Results = { id: string; label: string; type: string }[];

const getResultsForTransaction = async (client: RtdClient, query: string) => {
	if (!isValidTransactionDigest(query)) return null;
	const txdata = await client.getTransactionBlock({ digest: query });
	return [
		{
			id: txdata.digest,
			label: txdata.digest,
			type: "transaction",
		},
	];
};

const getResultsForObject = async (client: RtdClient, query: string) => {
	const normalized = normalizeRtdObjectId(query);
	if (!isValidRtdObjectId(normalized)) return null;

	const { data, error } = await client.getObject({ id: normalized });
	if (!data || error) return null;

	return [
		{
			id: data.objectId,
			label: data.objectId,
			type: "object",
		},
	];
};

const getResultsForCheckpoint = async (client: RtdClient, query: string) => {
	// Checkpoint digests have the same format as transaction digests:
	if (!isValidTransactionDigest(query)) return null;

	const { digest } = await client.getCheckpoint({ id: query });
	if (!digest) return null;

	return [
		{
			id: digest,
			label: digest,
			type: "checkpoint",
		},
	];
};

const getResultsForAddress = async (client: RtdClient, query: string, rtdNSEnabled: boolean) => {
	if (rtdNSEnabled && isRtdNSName(query)) {
		const resolved = await client.resolveNameServiceAddress({ name: query.toLowerCase() });
		if (!resolved) return null;
		return [
			{
				id: resolved,
				label: resolved,
				type: "address",
			},
		];
	}

	const normalized = normalizeRtdObjectId(query);
	if (!isValidRtdAddress(normalized) || isGenesisLibAddress(normalized)) return null;

	const [from, to] = await Promise.all([
		client.queryTransactionBlocks({
			filter: { FromAddress: normalized },
			limit: 1,
		}),
		client.queryTransactionBlocks({
			filter: { ToAddress: normalized },
			limit: 1,
		}),
	]);

	if (!from.data?.length && !to.data?.length) return null;

	return [
		{
			id: normalized,
			label: normalized,
			type: "address",
		},
	];
};

// Query for validator by pool id or rtd address.
const getResultsForValidatorByPoolIdOrRtdAddress = (
	systemStateSummery: RtdSystemStateSummary | null,
	query: string,
) => {
	const normalized = normalizeRtdObjectId(query);
	if ((!isValidRtdAddress(normalized) && !isValidRtdObjectId(normalized)) || !systemStateSummery)
		return null;

	// find validator by pool id or rtd address
	const validator = systemStateSummery.activeValidators?.find(
		({ stakingPoolId, rtdAddress }) => stakingPoolId === normalized || rtdAddress === query,
	);

	if (!validator) return null;

	return [
		{
			id: validator.rtdAddress || validator.stakingPoolId,
			label: normalized,
			type: "validator",
		},
	];
};

export function useSearch(query: string) {
	const client = useRtdClient();
	const { data: systemStateSummery } = useRtdClientQuery("getLatestRtdSystemState");
	const rtdNSEnabled = useRtdNSEnabled();

	return useQuery({
		queryKey: ["search", query],
		queryFn: async () => {
			const results = (
				await Promise.allSettled([
					getResultsForTransaction(client, query),
					getResultsForCheckpoint(client, query),
					getResultsForAddress(client, query, rtdNSEnabled),
					getResultsForObject(client, query),
					getResultsForValidatorByPoolIdOrRtdAddress(systemStateSummery || null, query),
				])
			).filter((r) => r.status === "fulfilled" && r.value) as PromiseFulfilledResult<Results>[];

			return results.map(({ value }) => value).flat();
		},
		enabled: !!query,
		gcTime: 10000,
	});
}
