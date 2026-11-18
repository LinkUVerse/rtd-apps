// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
//
// Explorer read facade. Every method is backed by the RTD v2 gRPC client or
// the archive/indexer GraphQL API from `rtd-typescript`; this module contains
// no JSON-RPC transport and no JSON-RPC method names.
import { RtdGraphQLClient } from "rtd-typescript/graphql";
import { RtdGrpcClient } from "rtd-typescript/grpc";

import type { ExplorerEpochInfo, ExplorerEpochPage } from "./epoch-schema";

export type ExplorerNetwork = "localnet" | "devnet" | "testnet" | "mainnet" | "custom";

export type ExplorerRpcClientOptions = {
	network: ExplorerNetwork | string;
	grpcUrl: string;
	graphqlUrl: string;
	fetch?: typeof fetch;
};

const OWNER_FIELDS = `
__typename
... on AddressOwner { address { address } }
... on ObjectOwner { address { address } }
... on Shared { initialSharedVersion }
... on ConsensusAddressOwner { startVersion address { address } }
`;

const OBJECT_FIELDS = `
address
digest
version
objectBcs
owner { ${OWNER_FIELDS} }
previousTransaction { digest }
asMoveObject {
  contents {
    json
    bcs
    type { repr }
    display { output errors }
  }
}
asMovePackage { __typename }
`;

const MOVE_OBJECT_FIELDS = `
address
digest
version
objectBcs
owner { ${OWNER_FIELDS} }
previousTransaction { digest }
contents { json bcs type { repr } display { output errors } }
`;

const OBJECT_CHANGE_FIELDS = `
address
idCreated
idDeleted
inputState {
  address version digest objectBcs
  owner { ${OWNER_FIELDS} }
  asMoveObject { contents { type { repr } } }
}
outputState {
  address version digest objectBcs
  owner { ${OWNER_FIELDS} }
  asMoveObject { contents { type { repr } } }
}
`;

const TRANSACTION_FIELDS = `
digest
transactionJson
signatures { signatureBytes }
effects {
  status
  timestamp
  checkpoint { sequenceNumber }
  effectsJson
  balanceChangesJson
  objectChanges(first: 50) { nodes { ${OBJECT_CHANGE_FIELDS} } }
  events(first: 50) {
    nodes {
      transactionModule { package { address } name }
      sender { address }
      contents { type { repr } bcs json }
    }
  }
}
`;

const CHECKPOINT_FIELDS = `
sequenceNumber
digest
timestamp
networkTotalTransactions
previousCheckpointDigest
rollingGasSummary { computationCost storageCost storageRebate nonRefundableStorageFee }
epoch { epochId }
validatorSignatures { signature signersMap }
`;

const CHECKPOINT_LIST_FIELDS = `${CHECKPOINT_FIELDS}
transactions(first: 50) { nodes { digest } }
`;

const EPOCH_FIELDS = `
epochId
startTimestamp
endTimestamp
referenceGasPrice
totalStakeRewards
totalStakeSubsidies
totalTransactions
totalCheckpoints
validatorSet {
  activeValidators(first: 50) { nodes { contents { json } } }
  contents { json }
}
systemState { json }
`;

const asString = (value: unknown): string =>
	value === null || value === undefined ? "0" : String(value);
const fieldsOf = (value: any): any => value?.fields ?? value ?? {};

function mapOwner(owner: any): any {
	if (!owner) return null;
	switch (owner.__typename) {
		case "AddressOwner":
			return { AddressOwner: owner.address?.address };
		case "ObjectOwner":
			return { ObjectOwner: owner.address?.address };
		case "Shared":
			return { Shared: { initialSharedVersion: asString(owner.initialSharedVersion) } };
		case "ConsensusAddressOwner":
			return {
				ConsensusAddressOwner: {
					startVersion: asString(owner.startVersion),
					owner: owner.address?.address,
				},
			};
		default:
			return null;
	}
}

function mapObject(node: any): any {
	if (!node) return null;
	const move = node.asMoveObject?.contents;
	const json = fieldsOf(move?.json);
	return {
		data: {
			objectId: node.address,
			version: asString(node.version),
			digest: node.digest,
			type: move?.type?.repr ?? "package",
			owner: mapOwner(node.owner),
			previousTransaction: node.previousTransaction?.digest ?? null,
			storageRebate: "0",
			display: move?.display?.output ?? undefined,
			content: move
				? { dataType: "moveObject", type: move.type?.repr, hasPublicTransfer: true, fields: json }
				: { dataType: "package", disassembled: {} },
			bcs: node.objectBcs ?? (move ? JSON.stringify(json) : undefined),
		},
	};
}

function mapMoveObject(node: any): any {
	if (!node) return null;
	const contents = node.contents;
	const json = fieldsOf(contents?.json);
	return {
		data: {
			objectId: node.address,
			version: asString(node.version),
			digest: node.digest,
			type: contents?.type?.repr,
			owner: mapOwner(node.owner),
			previousTransaction: node.previousTransaction?.digest ?? null,
			storageRebate: "0",
			display: contents?.display?.output ?? undefined,
			content: { dataType: "moveObject", type: contents?.type?.repr, hasPublicTransfer: true, fields: json },
			bcs: node.objectBcs ?? JSON.stringify(json),
		},
	};
}

function mapObjectChange(node: any): any {
	const output = node.outputState;
	const input = node.inputState;
	const inner = output ?? input;
	const mt = inner?.asMoveObject?.contents;
	return {
		type: node.idCreated ? "created" : node.idDeleted ? "deleted" : "mutated",
		objectId: node.address,
		objectType: mt?.type?.repr,
		version: asString(inner?.version),
		digest: inner?.digest,
		owner: mapOwner(inner?.owner),
	};
}

function mapEvent(node: any, digest: string, index: number, timestamp: any): any {
	return {
		id: `${digest}:${index}`,
		packageId: node.transactionModule?.package?.address,
		transactionModule: node.transactionModule?.name,
		sender: node.sender?.address,
		type: node.contents?.type?.repr,
		parsedJson: node.contents?.json,
		bcs: node.contents?.bcs,
		timestampMs: timestamp === null || timestamp === undefined ? undefined : asString(timestamp),
	};
}

function mapV2Owner(owner: any): any {
	if (!owner) return null;
	if (owner.kind === "ADDRESS") return { AddressOwner: owner.address };
	if (owner.kind === "OBJECT") return { ObjectOwner: owner.address };
	if (owner.kind === "SHARED") return { Shared: { initialSharedVersion: asString(owner.initialSharedVersion) } };
	if (owner.kind === "IMMUTABLE") return "Immutable";
	return null;
}

function mapV2Arg(arg: any): any {
	if (!arg) return null;
	switch (arg.kind) {
		case "GAS":
			return "GasCoin";
		case "INPUT":
			return { Input: arg.input };
		case "RESULT":
			return arg.subresult !== undefined && arg.subresult !== null
				? { NestedResult: [arg.result, arg.subresult] }
				: { Result: arg.result };
		default:
			return "GasCoin";
	}
}

function mapV2Input(input: any): any {
	if (!input) return { Pure: { bytes: "" } };
	switch (input.kind) {
		case "PURE":
			return { Pure: { bytes: input.pure } };
		case "IMMUTABLE_OR_OWNED":
			return {
				Object: {
					ImmutableOrOwned: {
						objectId: input.objectId,
						version: asString(input.version),
						digest: input.digest,
					},
				},
			};
		case "SHARED":
			return {
				Object: {
					Shared: {
						objectId: input.objectId,
						initialSharedVersion: asString(input.initialSharedVersion),
						mutable: Boolean(input.mutable),
					},
				},
			};
		case "RECEIVING":
			return {
				Object: {
					Receiving: {
						objectId: input.objectId,
						version: asString(input.version),
						digest: input.digest,
					},
				},
			};
		default:
			return { Pure: { bytes: input.pure ?? "" } };
	}
}

function mapV2Command(command: any): any {
	if (!command) return null;
	if (command.moveCall) {
		const call = command.moveCall;
		return {
			MoveCall: {
				package: call.package,
				module: call.module,
				function: call.function,
				type_arguments: call.typeArguments ?? [],
				arguments: (call.arguments ?? []).map(mapV2Arg),
			},
		};
	}
	if (command.transferObjects) {
		return {
			TransferObjects: [
				(command.transferObjects.objects ?? []).map(mapV2Arg),
				mapV2Arg(command.transferObjects.address),
			],
		};
	}
	if (command.splitCoins) {
		return {
			SplitCoins: [
				mapV2Arg(command.splitCoins.coin),
				(command.splitCoins.amounts ?? []).map(mapV2Arg),
			],
		};
	}
	if (command.mergeCoins) {
		return {
			MergeCoins: [
				mapV2Arg(command.mergeCoins.destination),
				(command.mergeCoins.sources ?? []).map(mapV2Arg),
			],
		};
	}
	if (command.publish) {
		return {
			Publish: [
				...(command.publish.modules ?? []),
				...(command.publish.dependencies ?? []),
			],
		};
	}
	if (command.upgrade) {
		return {
			Upgrade: [
				command.upgrade.modules ?? [],
				command.upgrade.package ?? "",
				mapV2Arg(command.upgrade.argument),
			],
		};
	}
	if (command.makeMoveVec) {
		return {
			MakeMoveVec: [
				command.makeMoveVec.type ?? null,
				(command.makeMoveVec.elements ?? []).map(mapV2Arg),
			],
		};
	}
	return null;
}

function normalizeTransactionData(jsonValue: any): any {
	const kind = jsonValue?.kind;
	const programmable = kind?.programmableTransaction;
	const base = {
		messageVersion: "v1",
		sender: jsonValue.sender,
		gasData: {
			owner: jsonValue.gasPayment?.owner,
			price: asString(jsonValue.gasPayment?.price),
			budget: asString(jsonValue.gasPayment?.budget),
			payment: (jsonValue.gasPayment?.objects ?? []).map((object: any) => ({
				objectId: object.objectId,
				version: asString(object.version),
				digest: object.digest,
			})),
		},
	};
	if (programmable) {
		return {
			...base,
			transaction: {
				kind: "ProgrammableTransaction",
				inputs: (programmable.inputs ?? []).map(mapV2Input),
				transactions: (programmable.commands ?? []).map(mapV2Command),
			},
		};
	}
	const systemKind = String(kind?.kind ?? "");
	if (systemKind === "GENESIS") {
		return {
			...base,
			transaction: {
				kind: "Genesis",
				objects: (kind?.genesis?.objects ?? []).map((object: any) => object.objectId),
			},
		};
	}
	if (systemKind === "CONSENSUS_COMMIT_PROLOGUE") {
		const prologue = kind?.consensusCommitPrologue ?? {};
		return {
			...base,
			transaction: {
				kind: "ConsensusCommitPrologue",
				commit_timestamp_ms: asString(prologue.commitTimestampMs),
				epoch: asString(prologue.epoch),
				round: asString(prologue.round),
			},
		};
	}
	if (systemKind === "CHANGE_EPOCH") {
		return { ...base, transaction: { kind: "ChangeEpoch", ...(kind?.changeEpoch ?? {}) } };
	}
	return { ...base, transaction: { kind: systemKind || "Unknown" } };
}

function mapV2ObjectRef(entry: any, output: boolean): any {
	const state = output ? entry?.outputState : entry?.inputState;
	const status = String(state ?? "");
	if (status.includes("DOES_NOT_EXIST")) return null;
	const version = output ? entry?.outputVersion : entry?.inputVersion;
	const digest = output ? entry?.outputDigest : entry?.inputDigest;
	const owner = output ? entry?.outputOwner : entry?.inputOwner;
	return {
		owner: mapV2Owner(owner),
		reference: {
			objectId: entry?.objectId,
			version: asString(version),
			digest,
		},
	};
}

function normalizeEffects(effectsJson: any): any {
	if (!effectsJson) return effectsJson;
	const changed = effectsJson.changedObjects ?? [];
	const status = effectsJson.status ?? {};
	return {
		...effectsJson,
		executedEpoch: effectsJson.epoch ?? effectsJson.executedEpoch,
		status: {
			status: status.success === true ? "success" : "failure",
			error: status.success === false ? status.error ?? "Transaction failed" : undefined,
		},
		created: changed
			.filter((entry: any) => entry.idOperation === "CREATED")
			.map((entry: any) => mapV2ObjectRef(entry, true))
			.filter(Boolean),
		mutated: changed
			.filter((entry: any) => entry.idOperation === "NONE" || entry.idOperation === "MUTATED")
			.map((entry: any) => mapV2ObjectRef(entry, true))
			.filter(Boolean),
		deleted: changed
			.filter((entry: any) => entry.idOperation === "DELETED")
			.map((entry: any) => mapV2ObjectRef(entry, false))
			.filter(Boolean),
		gasObject: mapV2ObjectRef(effectsJson.gasObject, true),
	};
}

function mapTransaction(node: any): any {
	if (!node) return null;
	const effects = node.effects ?? {};
	const effectsJson = fieldsOf(effects.effectsJson);
	const events = (effects.events?.nodes ?? []).map((event: any, index: number) =>
		mapEvent(event, node.digest, index, effects.timestamp),
	);
	const objectChanges =
		effectsJson.objectChanges ??
		(effects.objectChanges?.nodes ?? []).map(mapObjectChange);
	const balanceChanges = (effects.balanceChangesJson ?? []).map((change: any) => ({
		owner: { AddressOwner: change.address },
		coinType: change.coinType,
		amount: asString(change.amount),
	}));
	return {
		digest: node.digest,
		transaction: node.transactionJson
			? {
					data: normalizeTransactionData(node.transactionJson),
					txSignatures: (node.signatures ?? []).map((s: any) => s.signatureBytes),
				}
			: null,
		effects: normalizeEffects(effectsJson),
		events,
		balanceChanges,
		objectChanges,
		checkpoint: effects.checkpoint?.sequenceNumber
			? asString(effects.checkpoint.sequenceNumber)
			: null,
		timestampMs: effects.timestamp === null || effects.timestamp === undefined
			? null
			: asString(new Date(effects.timestamp).getTime()),
	};
}

function mapTransactionFilter(filter: any): any {
	if (!filter) return null;
	const out: any = {};
	if (filter.FromAddress) out.sentAddress = filter.FromAddress;
	if (filter.ToAddress) out.affectedAddress = filter.ToAddress;
	if (filter.Checkpoint) out.atCheckpoint = Number(filter.Checkpoint);
	if (filter.ChangedObject) out.affectedObject = filter.ChangedObject;
	if (filter.InputObject) out.affectedObject = filter.InputObject;
	if (filter.MoveFunction) {
		const { package: pkg, module, function: fn } = filter.MoveFunction;
		out.function = [pkg, module, fn].filter(Boolean).join("::");
	}
	return out;
}

function mapEventFilter(query: any): any {
	if (!query) return null;
	const out: any = {};
	if (query.MoveEventType) out.type = query.MoveEventType;
	if (query.Sender) out.sender = query.Sender;
	if (query.MoveModule) {
		out.module = [query.MoveModule.package, query.MoveModule.module].filter(Boolean).join("::");
	}
	if (query.TimeRange) {
		if (query.TimeRange.startTime) out.afterCheckpoint = Number(query.TimeRange.startTime);
		if (query.TimeRange.endTime) out.beforeCheckpoint = Number(query.TimeRange.endTime);
	}
	return out;
}

function mapValidator(jsonValue: any): any {
	const f = fieldsOf(jsonValue);
	const metadata = fieldsOf(f.metadata);
	return {
		commissionRate: asString(f.commission_rate),
		description: metadata.description ?? "",
		exchangeRatesId: "",
		exchangeRatesSize: "0",
		gasPrice: asString(f.gas_price),
		imageUrl: metadata.image_url ?? "",
		name: metadata.name ?? "",
		netAddress: metadata.net_address ?? "",
		networkPubkeyBytes: metadata.network_pubkey_bytes ?? "",
		nextEpochCommissionRate: asString(f.next_epoch_commission_rate),
		nextEpochGasPrice: asString(f.next_epoch_gas_price),
		nextEpochStake: asString(f.next_epoch_stake),
		operationCapId: f.operation_cap_id ?? "",
		p2pAddress: metadata.p2p_address ?? "",
		pendingPoolTokenWithdraw: asString(f.staking_pool?.pending_pool_token_withdraw ?? f.pending_pool_token_withdraw),
		pendingStake: asString(f.staking_pool?.pending_stake ?? f.pending_stake),
		pendingTotalRtdWithdraw: asString(f.staking_pool?.pending_total_rtd_withdraw ?? f.pending_total_rtd_withdraw),
		poolTokenBalance: asString(f.staking_pool?.pool_token_balance ?? f.pool_token_balance),
		primaryAddress: metadata.primary_address ?? "",
		projectUrl: metadata.project_url ?? "",
		proofOfPossessionBytes: metadata.proof_of_possession_bytes ?? "",
		protocolPubkeyBytes: metadata.protocol_pubkey_bytes ?? "",
		rewardsPool: f.staking_pool?.rewards_pool ?? f.rewards_pool ?? f.rewards_pool_id ?? "",
		stakingPoolActivationEpoch: f.activation_epoch ?? null,
		stakingPoolDeactivationEpoch: f.deactivation_epoch ?? null,
		stakingPoolId: f.staking_pool?.id ?? f.staking_pool_id ?? f.staking_pool?.fields?.id ?? "",
		stakingPoolRtdBalance: asString(f.staking_pool?.rtd_balance ?? f.staking_pool_rtd_balance ?? f.stake),
		rtdAddress: metadata.rtd_address ?? f.rtd_address ?? "",
		votingPower: asString(f.voting_power),
		workerAddress: metadata.worker_address ?? "",
		workerPubkeyBytes: metadata.worker_pubkey_bytes ?? "",
	};
}

function mapEpoch(epoch: any): ExplorerEpochInfo {
	const validatorNodes = epoch?.validatorSet?.activeValidators?.nodes ?? [];
	const validators = validatorNodes.map((node: any) => mapValidator(node.contents?.json));
	const referenceGasPrice =
		epoch?.referenceGasPrice === null || epoch?.referenceGasPrice === undefined
			? null
			: Number(epoch.referenceGasPrice);
	return {
		epoch: asString(epoch?.epochId),
		validators: validators.map((v: any) => ({
			name: v.name,
			imageUrl: v.imageUrl,
			rtdAddress: v.rtdAddress,
			stakingPoolRtdBalance: v.stakingPoolRtdBalance,
			nextEpochGasPrice: v.nextEpochGasPrice,
			commissionRate: v.commissionRate,
			votingPower: v.votingPower,
		})),
		epochTotalTransactions: asString(epoch?.totalTransactions),
		firstCheckpointId: "0",
		epochStartTimestamp: asString(epoch?.startTimestamp ? new Date(epoch.startTimestamp).getTime() : 0),
		endOfEpochInfo:
			epoch?.endTimestamp === null || epoch?.endTimestamp === undefined
				? null
				: {
						lastCheckpointId: "0",
						epochEndTimestamp: asString(new Date(epoch.endTimestamp).getTime()),
						protocolVersion: "0",
						referenceGasPrice: asString(epoch.referenceGasPrice),
						totalStake: "0",
						storageFundReinvestment: "0",
						storageCharge: "0",
						storageRebate: "0",
						storageFundBalance: "0",
						stakeSubsidyAmount: "0",
						totalGasFees: "0",
						totalStakeRewardsDistributed: asString(epoch.totalStakeRewards),
						leftoverStorageFundInflow: "0",
					},
		referenceGasPrice: referenceGasPrice !== null && Number.isFinite(referenceGasPrice) ? referenceGasPrice : null,
	};
}

/**
 * Compatibility surface for the Explorer pages. Method names mirror the
 * pre-migration view models, but the implementation is gRPC/GraphQL only.
 */
export class ExplorerRpcClient {
	readonly network: ExplorerNetwork | string;
	readonly grpc: RtdGrpcClient;
	readonly graphql: RtdGraphQLClient;
	readonly core: RtdGrpcClient["core"];

	constructor({ network, grpcUrl, graphqlUrl, fetch: fetchFn }: ExplorerRpcClientOptions) {
		this.network = network;
		const transport = fetchFn ?? globalThis.fetch.bind(globalThis);
		this.grpc = new RtdGrpcClient({
			network: "custom",
			baseUrl: grpcUrl,
			format: "binary",
			mvr: { url: "" },
			fetch: transport,
		} as any);
		this.graphql = new RtdGraphQLClient({
			network: "custom",
			url: graphqlUrl,
			mvr: { url: "" },
			fetch: transport,
		});
		this.core = this.grpc.core;
	}

	private async query<T>(query: string, variables: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
		const result = await this.graphql.query<T>({ query, variables, signal });
		if (result.errors?.length) {
			throw new Error(result.errors.map((error) => error.message).join("; "));
		}
		if (!result.data) throw new Error("archive GraphQL returned no data");
		return result.data;
	}

	async getRpcApiVersion({ signal }: { signal?: AbortSignal } = {}): Promise<string | undefined> {
		const { response } = await this.grpc.ledgerService.getServiceInfo({}, { abort: signal, timeout: 10_000 } as any);
		const value = (response as any).version ?? (response as any).binaryVersion;
		return value === null || value === undefined ? String((response as any).chainId ?? "RTD") : String(value);
	}

	async getChainIdentifier({ signal }: { signal?: AbortSignal } = {}): Promise<string> {
		const { response } = await this.grpc.ledgerService.getServiceInfo({}, { abort: signal, timeout: 10_000 } as any);
		return String((response as any).chainId ?? "");
	}

	async getReferenceGasPrice({ signal }: { signal?: AbortSignal } = {}): Promise<bigint> {
		const { referenceGasPrice } = await this.grpc.core.getReferenceGasPrice({
			signal,
		} as any);
		return BigInt(referenceGasPrice || "0");
	}

	async getProtocolConfig(options: any = {}): Promise<any> {
		return this.grpc.core.getProtocolConfig({ signal: options.signal } as any);
	}

	async getObject(input: { id: string; options?: any; signal?: AbortSignal }): Promise<any> {
		const data = await this.query<any>(
			`query ExplorerObject($keys: [ObjectKey!]!) { multiGetObjects(keys: $keys) { ${OBJECT_FIELDS} } }`,
			{ keys: [{ address: input.id, ...(input.options?.version ? { version: Number(input.options.version) } : {}) }] },
			input.signal,
		);
		const node = data.multiGetObjects?.[0];
		return node ? mapObject(node) : { error: { code: "notExists" } };
	}

	async multiGetObjects(input: { ids: string[]; options?: any; signal?: AbortSignal }): Promise<any[]> {
		const data = await this.query<any>(
			`query ExplorerObjects($keys: [ObjectKey!]!) { multiGetObjects(keys: $keys) { ${OBJECT_FIELDS} } }`,
			{ keys: input.ids.map((address) => ({ address })) },
			input.signal,
		);
		return (data.multiGetObjects ?? []).map((node: any) => (node ? mapObject(node) : { error: { code: "notExists" } }));
	}

	async getOwnedObjects(input: {
		owner: string;
		cursor?: string | null;
		limit?: number | null;
		filter?: any;
		options?: any;
		signal?: AbortSignal;
	}): Promise<any> {
		const filter = input.filter ? { type: input.filter.StructType ?? input.filter.type ?? undefined } : undefined;
		const data = await this.query<any>(
			`query ExplorerOwnedObjects($owner: RtdAddress!, $first: Int, $after: String, $filter: ObjectFilter) {
				address(address: $owner) {
					objects(first: $first, after: $after, filter: $filter) {
						pageInfo { hasNextPage endCursor }
						nodes { ${MOVE_OBJECT_FIELDS} }
					}
				}
			}`,
			{ owner: input.owner, first: input.limit ?? 50, after: input.cursor ?? null, filter },
			input.signal,
		);
		const page = data.address?.objects;
		return {
			data: (page?.nodes ?? []).map(mapMoveObject),
			hasNextPage: page?.pageInfo?.hasNextPage ?? false,
			nextCursor: page?.pageInfo?.endCursor ?? null,
		};
	}

	async getCoins(input: {
		owner: string;
		coinType?: string;
		cursor?: string | null;
		limit?: number | null;
		signal?: AbortSignal;
	}): Promise<any> {
		const coinType = input.coinType ?? "0x2::rtd::RTD";
		const data = await this.query<any>(
			`query ExplorerCoins($owner: RtdAddress!, $first: Int, $after: String, $type: String) {
				address(address: $owner) {
					objects(first: $first, after: $after, filter: { type: $type }) {
						pageInfo { hasNextPage endCursor }
						nodes { address version digest previousTransaction { digest } contents { json type { repr } } }
					}
				}
			}`,
			{ owner: input.owner, first: input.limit ?? 50, after: input.cursor ?? null, type: coinType },
			input.signal,
		);
		const page = data.address?.objects;
		return {
			data: (page?.nodes ?? []).map((node: any) => {
				const fields = fieldsOf(node.contents?.json);
				return {
					coinType: node.contents?.type?.repr ?? coinType,
					coinObjectId: node.address,
					version: asString(node.version),
					digest: node.digest,
					balance: asString(fields.balance),
					previousTransaction: node.previousTransaction?.digest ?? null,
				};
			}),
			hasNextPage: page?.pageInfo?.hasNextPage ?? false,
			nextCursor: page?.pageInfo?.endCursor ?? null,
		};
	}

	async getAllBalances(input: { owner: string; signal?: AbortSignal }): Promise<any[]> {
		const balances: any[] = [];
		let cursor: string | null = null;
		for (let page = 0; page < 20; page += 1) {
			const data: any = await this.query<any>(
				`query ExplorerBalances($owner: RtdAddress!, $first: Int, $after: String) {
					address(address: $owner) {
						balances(first: $first, after: $after) {
							pageInfo { hasNextPage endCursor }
							nodes { coinType { repr } totalBalance coinBalance addressBalance }
						}
					}
				}`,
				{ owner: input.owner, first: 50, after: cursor },
				input.signal,
			);
			const conn: any = data.address?.balances;
			for (const node of conn?.nodes ?? []) {
				balances.push({
					coinType: node.coinType?.repr,
					coinObjectCount: "0",
					totalBalance: asString(node.totalBalance),
					lockedBalance: "0",
				});
			}
			if (!conn?.pageInfo?.hasNextPage) break;
			cursor = conn.pageInfo.endCursor;
		}
		return balances;
	}

	async getBalance(input: { owner: string; coinType?: string; signal?: AbortSignal }): Promise<any> {
		const coinType = input.coinType ?? "0x2::rtd::RTD";
		const data = await this.query<any>(
			`query ExplorerBalance($owner: RtdAddress!, $coinType: String!) {
				address(address: $owner) { balance(coinType: $coinType) { coinType { repr } totalBalance coinBalance addressBalance } }
			}`,
			{ owner: input.owner, coinType },
			input.signal,
		);
		const balance = data.address?.balance;
		return {
			coinType: balance?.coinType?.repr ?? coinType,
			coinObjectCount: "0",
			totalBalance: asString(balance?.totalBalance),
			lockedBalance: "0",
		};
	}

	async getCoinMetadata(input: { coinType: string; signal?: AbortSignal }): Promise<any> {
		const data = await this.query<any>(
			`query ExplorerCoinMetadata($coinType: String!) {
				coinMetadata(coinType: $coinType) { address decimals name symbol description iconUrl }
			}`,
			{ coinType: input.coinType },
			input.signal,
		);
		const metadata = data.coinMetadata;
		if (!metadata) return null;
		return {
			id: metadata.address,
			decimals: metadata.decimals,
			name: metadata.name,
			symbol: metadata.symbol,
			description: metadata.description,
			iconUrl: metadata.iconUrl,
		};
	}

	async getDynamicFields(input: { parentId: string; cursor?: string | null; limit?: number | null; signal?: AbortSignal }): Promise<any> {
		const data = await this.query<any>(
			`query ExplorerDynamicFields($parentId: RtdAddress!, $first: Int, $after: String) {
				address(address: $parentId) {
					dynamicFields(first: $first, after: $after) {
						pageInfo { hasNextPage endCursor }
						nodes {
							name { bcs type { repr } }
							value {
								__typename
								... on MoveValue { type { repr } }
								... on MoveObject { address version digest contents { type { repr } } }
							}
						}
					}
				}
			}`,
			{ parentId: input.parentId, first: input.limit ?? 50, after: input.cursor ?? null },
			input.signal,
		);
		const page = data.address?.dynamicFields;
		return {
			data: (page?.nodes ?? []).map((node: any) => ({
				name: { type: node.name?.type?.repr, value: node.name?.bcs },
				objectType: node.value?.type?.repr ?? node.value?.contents?.type?.repr,
				objectId: node.value?.address,
				version: asString(node.value?.version ?? "0"),
				digest: node.value?.digest ?? "",
			})),
			hasNextPage: page?.pageInfo?.hasNextPage ?? false,
			nextCursor: page?.pageInfo?.endCursor ?? null,
		};
	}

	async getDynamicFieldObject(input: { parentId: string; name: any; signal?: AbortSignal }): Promise<any> {
		const field = await this.graphql.core.getDynamicField({
			parentId: input.parentId,
			name: input.name,
			signal: input.signal,
		} as any);
		const value: any = (field as any)?.value ?? field;
		if (!value) return { error: { code: "notExists" } };
		const node = value.object ?? value;
		return mapObject({
			...node,
			address: node.address ?? node.objectId,
			asMoveObject: node.asMoveObject ?? { contents: node.content ?? node.contents },
		});
	}

	async getTransactionBlock(input: { digest: string; options?: any; signal?: AbortSignal }): Promise<any> {
		const data = await this.query<any>(
			`query ExplorerTransaction($digest: String!) { transaction(digest: $digest) { ${TRANSACTION_FIELDS} } }`,
			{ digest: input.digest },
			input.signal,
		);
		return data.transaction ? mapTransaction(data.transaction) : { digest: input.digest, error: "notFound" };
	}

	async queryTransactionBlocks(input: {
		filter?: any;
		cursor?: string | null;
		limit?: number | null;
		order?: "ascending" | "descending";
		options?: any;
		signal?: AbortSignal;
	}): Promise<any> {
		const data = await this.query<any>(
			`query ExplorerTransactions($first: Int, $after: String, $filter: TransactionFilter) {
				transactions(first: $first, after: $after, filter: $filter) {
					pageInfo { hasNextPage endCursor }
					nodes { ${TRANSACTION_FIELDS} }
				}
			}`,
			{
				first: input.limit ?? 50,
				after: input.cursor ?? null,
				filter: mapTransactionFilter(input.filter),
			},
			input.signal,
		);
		const page = data.transactions;
		return {
			data: (page?.nodes ?? []).map(mapTransaction),
			hasNextPage: page?.pageInfo?.hasNextPage ?? false,
			nextCursor: page?.pageInfo?.endCursor ?? null,
		};
	}

	async multiGetTransactionBlocks(input: { digests: string[]; options?: any; signal?: AbortSignal }): Promise<any[]> {
		if (!input.digests.length) return [];
		const data = await this.query<any>(
			`query ExplorerTransactionsByDigest($keys: [String!]!) {
				multiGetTransactions(keys: $keys) { ${TRANSACTION_FIELDS} }
			}`,
			{ keys: input.digests },
			input.signal,
		);
		return (data.multiGetTransactions ?? [])
			.filter((node: any) => node)
			.map(mapTransaction);
	}

	async queryEvents(input: { query?: any; cursor?: string | null; limit?: number | null; order?: string; signal?: AbortSignal }): Promise<any> {
		const data = await this.query<any>(
			`query ExplorerEvents($first: Int, $after: String, $filter: EventFilter) {
				events(first: $first, after: $after, filter: $filter) {
					pageInfo { hasNextPage endCursor }
					nodes {
						transactionModule { package { address } name }
						sender { address }
						contents { type { repr } bcs json }
					}
				}
			}`,
			{ first: input.limit ?? 50, after: input.cursor ?? null, filter: mapEventFilter(input.query) },
			input.signal,
		);
		const page = data.events;
		return {
			data: (page?.nodes ?? []).map((node: any, index: number) => mapEvent(node, "event", index, undefined)),
			hasNextPage: page?.pageInfo?.hasNextPage ?? false,
			nextCursor: page?.pageInfo?.endCursor ?? null,
		};
	}

	async getLatestCheckpointSequenceNumber({ signal }: { signal?: AbortSignal } = {}): Promise<string> {
		const data = await this.query<any>(
			`query ExplorerLatestCheckpoint { checkpoint { sequenceNumber } }`,
			{},
			signal,
		);
		return asString(data.checkpoint?.sequenceNumber);
	}

	async getCheckpoint(input: { id: string; signal?: AbortSignal }): Promise<any> {
		const numeric = /^\d+$/.test(input.id);
		const data = await this.query<any>(
			`query ExplorerCheckpoint($sequenceNumber: UInt53, $digest: String) {
				checkpoint(sequenceNumber: $sequenceNumber, digest: $digest) { ${CHECKPOINT_FIELDS} }
			}`,
			{ sequenceNumber: numeric ? Number(input.id) : null, digest: numeric ? null : input.id },
			input.signal,
		);
		const c = data.checkpoint;
		if (!c) return null;
		return {
			epoch: asString(c.epoch?.epochId),
			sequenceNumber: asString(c.sequenceNumber),
			digest: c.digest,
			networkTotalTransactions: asString(c.networkTotalTransactions),
			previousDigest: c.previousCheckpointDigest,
			epochRollingGasCostSummary: {
				computationCost: asString(c.rollingGasSummary?.computationCost),
				storageCost: asString(c.rollingGasSummary?.storageCost),
				storageRebate: asString(c.rollingGasSummary?.storageRebate),
				nonRefundableStorageFee: asString(c.rollingGasSummary?.nonRefundableStorageFee),
			},
			timestampMs: c.timestamp ? asString(new Date(c.timestamp).getTime()) : "0",
			transactions: [],
			checkpointCommitments: [],
			validatorSignature: c.validatorSignatures
				? {
						epoch: asString(c.epoch?.epochId),
						signature: c.validatorSignatures.signature,
						signersMap: c.validatorSignatures.signersMap,
					}
				: null,
		};
	}

	async getCheckpoints(input: { cursor?: string | null; limit?: number | null; descendingOrder?: boolean; signal?: AbortSignal } = {}): Promise<any> {
		const descending = input.descendingOrder === true;
		const data = await this.query<any>(
			descending
				? `query ExplorerCheckpoints($last: Int, $before: String) { checkpoints(last: $last, before: $before) { pageInfo { hasPreviousPage startCursor } nodes { ${CHECKPOINT_LIST_FIELDS} } } }`
				: `query ExplorerCheckpoints($first: Int, $after: String) { checkpoints(first: $first, after: $after) { pageInfo { hasNextPage endCursor } nodes { ${CHECKPOINT_LIST_FIELDS} } } }`,
			descending
				? { last: input.limit ?? 20, before: input.cursor ?? null }
				: { first: input.limit ?? 20, after: input.cursor ?? null },
			input.signal,
		);
		const page = data.checkpoints;
		return {
			data: (page?.nodes ?? []).map((c: any) => ({
				epoch: asString(c.epoch?.epochId),
				sequenceNumber: asString(c.sequenceNumber),
				digest: c.digest,
				networkTotalTransactions: asString(c.networkTotalTransactions),
				previousDigest: c.previousCheckpointDigest,
				timestampMs: c.timestamp ? asString(new Date(c.timestamp).getTime()) : "0",
				transactions: (c.transactions?.nodes ?? []).map((t: any) => t.digest),
			})),
			hasNextPage: descending ? page?.pageInfo?.hasPreviousPage ?? false : page?.pageInfo?.hasNextPage ?? false,
			nextCursor: descending ? page?.pageInfo?.startCursor ?? null : page?.pageInfo?.endCursor ?? null,
		};
	}

	async getEpoch(input: { id: string; signal?: AbortSignal }): Promise<ExplorerEpochInfo> {
		const data = await this.query<any>(
			`query ExplorerEpoch($id: UInt53!) { epoch(epochId: $id) { ${EPOCH_FIELDS} } }`,
			{ id: Number(input.id) },
			input.signal,
		);
		if (!data.epoch) throw new Error(`Epoch ${input.id} not found`);
		return mapEpoch(data.epoch);
	}

	async getEpochs(input: { cursor?: string | null; limit?: number | null; descendingOrder?: boolean; signal?: AbortSignal } = {}): Promise<ExplorerEpochPage> {
		const data = await this.query<any>(
			`query ExplorerEpochs($first: Int, $after: String) { epochs(first: $first, after: $after) { pageInfo { hasNextPage endCursor } nodes { ${EPOCH_FIELDS} } } }`,
			{ first: input.limit ?? 20, after: input.cursor ?? null },
			input.signal,
		);
		const page = data.epochs;
		return {
			data: (page?.nodes ?? []).map(mapEpoch),
			hasNextPage: page?.pageInfo?.hasNextPage ?? false,
			nextCursor: page?.pageInfo?.endCursor ?? null,
		};
	}

	async getCurrentEpoch({ signal }: { signal?: AbortSignal } = {}): Promise<ExplorerEpochInfo> {
		const data = await this.query<any>(
			`query ExplorerCurrentEpoch { epoch { ${EPOCH_FIELDS} } }`,
			{},
			signal,
		);
		return mapEpoch(data.epoch);
	}

	async getTotalTransactionBlocks({ signal }: { signal?: AbortSignal } = {}): Promise<bigint> {
		const data = await this.query<any>(
			`query ExplorerTotalTransactions { checkpoint { networkTotalTransactions } }`,
			{},
			signal,
		);
		return BigInt(asString(data.checkpoint?.networkTotalTransactions));
	}

	async getLatestRtdSystemState({ signal }: { signal?: AbortSignal } = {}): Promise<any> {
		const data = await this.query<any>(
			`query ExplorerSystemState {
				epoch {
					epochId startTimestamp referenceGasPrice
					validatorSet { activeValidators(first: 50) { nodes { contents { json } } } contents { json } }
					systemState { json }
				}
			}`,
			{},
			signal,
		);
		const epoch = data.epoch;
		const system = fieldsOf(epoch?.systemState?.json);
		const validatorSet = fieldsOf(epoch?.validatorSet?.contents?.json);
		const activeValidators = (epoch?.validatorSet?.activeValidators?.nodes ?? []).map((node: any) =>
			mapValidator(node.contents?.json),
		);
		const totalStake = asString(validatorSet.total_stake ?? system.total_stake);
		return {
			activeValidators,
			atRiskValidators: [],
			epoch: asString(epoch?.epochId),
			epochDurationMs: asString(system.parameters?.fields?.epoch_duration_ms ?? system.parameters?.epoch_duration_ms),
			epochStartTimestampMs: asString(epoch?.startTimestamp ? new Date(epoch.startTimestamp).getTime() : system.epoch_start_timestamp_ms),
			inactivePoolsId: "",
			inactivePoolsSize: "0",
			maxValidatorCount: asString(system.parameters?.fields?.max_validator_count ?? system.parameters?.max_validator_count),
			minValidatorJoiningStake: asString(system.parameters?.fields?.min_validator_joining_stake ?? system.parameters?.min_validator_joining_stake),
			pendingActiveValidatorsId: "",
			pendingActiveValidatorsSize: "0",
			pendingRemovals: validatorSet.pending_removals ?? [],
			protocolVersion: asString(system.protocol_version),
			referenceGasPrice: asString(epoch?.referenceGasPrice ?? system.reference_gas_price),
			safeMode: Boolean(system.safe_mode ?? false),
			safeModeComputationRewards: "0",
			safeModeNonRefundableStorageFee: "0",
			safeModeStorageRebates: "0",
			safeModeStorageRewards: "0",
			stakeSubsidyBalance: "0",
			stakeSubsidyCurrentDistributionAmount: "0",
			stakeSubsidyDecreaseRate: 0,
			stakeSubsidyDistributionCounter: "0",
			stakeSubsidyPeriodLength: "0",
			stakeSubsidyStartEpoch: asString(system.parameters?.fields?.stake_subsidy_start_epoch ?? system.parameters?.stake_subsidy_start_epoch),
			stakingPoolMappingsId: "",
			stakingPoolMappingsSize: "0",
			storageFundNonRefundableBalance: "0",
			storageFundTotalObjectStorageRebates: "0",
			systemStateVersion: asString(system.system_state_version),
			totalStake,
			validatorCandidatesId: "",
			validatorCandidatesSize: "0",
			validatorLowStakeGracePeriod: asString(system.parameters?.fields?.validator_low_stake_grace_period ?? system.parameters?.validator_low_stake_grace_period),
			validatorLowStakeThreshold: asString(system.parameters?.fields?.validator_low_stake_threshold ?? system.parameters?.validator_low_stake_threshold),
			validatorReportRecords: [],
			validatorVeryLowStakeThreshold: asString(system.parameters?.fields?.validator_very_low_stake_threshold ?? system.parameters?.validator_very_low_stake_threshold),
		};
	}

	async getValidatorsApy({ signal }: { signal?: AbortSignal } = {}): Promise<any> {
		const state = await this.getLatestRtdSystemState({ signal });
		const epoch = await this.getCurrentEpoch({ signal });
		const totalStake = Number(state.totalStake ?? "0");
		const rewards = Number(epoch?.endOfEpochInfo?.totalStakeRewardsDistributed ?? "0");
		const duration = Number(state.epochDurationMs ?? "0") || 1;
		const annualized = totalStake > 0 ? (rewards / totalStake) * (365 * 24 * 60 * 60 * 1000 / duration) : 0;
		const apys: Record<string, any> = {};
		for (const validator of state.activeValidators ?? []) {
			apys[validator.rtdAddress] = { apy: annualized, epoch: state.epoch };
		}
		return { epoch: state.epoch, apys };
	}

	async getStakes(input: { owner: string; signal?: AbortSignal }): Promise<any[]> {
		const data = await this.query<any>(
			`query ExplorerStakes($owner: RtdAddress!) {
				address(address: $owner) {
					objects(first: 50, filter: { type: "0x3::staking_pool::StakedRtd" }) {
						nodes { address version digest contents { json } }
					}
				}
			}`,
			{ owner: input.owner },
			input.signal,
		);
		return (data.address?.objects?.nodes ?? []).map((node: any) => {
			const f = fieldsOf(node.contents?.json);
			return {
				validatorAddress: f.validator_address ?? "",
				stakingPool: f.pool_id ?? "",
				stakes: [
					{
						stakedRtd: asString(f.principal ?? f.stake_active),
						estimatedReward: "0",
						status: "Active",
						requestEpoch: asString(f.stake_request_epoch),
					},
				],
			};
		});
	}

	async resolveNameServiceAddress(input: { name: string; signal?: AbortSignal }): Promise<string | null> {
		const result = await this.grpc.core.resolveNameServiceAddress({ name: input.name, signal: input.signal } as any);
		return (result as any)?.address ?? null;
	}

	async resolveNameServiceNames(input: { address: string; cursor?: string | null; limit?: number | null; signal?: AbortSignal }): Promise<any> {
		const result = await this.grpc.core.defaultNameServiceName({ address: input.address, signal: input.signal } as any);
		const name = (result as any)?.data?.name ?? null;
		return { data: name ? [name] : [], hasNextPage: false, nextCursor: null };
	}

	async getNormalizedMoveModulesByPackage(input: { package: string; signal?: AbortSignal }): Promise<any> {
		const data = await this.query<any>(
			`query ExplorerMoveModules($package: RtdAddress!) {
				object(address: $package) {
					asMovePackage {
						modules(first: 50) {
							nodes {
								name
								fileFormatVersion
								friends(first: 50) { nodes { fullyQualifiedName } }
								structs(first: 50) {
									nodes { name abilities fields { name } typeParameters { constraints isPhantom } }
								}
								functions(first: 50) {
									nodes { name visibility isEntry typeParameters { constraints } }
								}
							}
						}
					}
				}
			}`,
			{ package: input.package },
			input.signal,
		);
		const modules = data.object?.asMovePackage?.modules?.nodes ?? [];
		return Object.fromEntries(modules.map((module: any) => [module.name, this.mapMoveModule(module, input.package)]));
	}

	async getNormalizedMoveModule(input: { package: string; module: string; signal?: AbortSignal }): Promise<any> {
		const modules = await this.getNormalizedMoveModulesByPackage({ package: input.package, signal: input.signal });
		return modules[input.module] ?? null;
	}

	async getNormalizedMoveStruct(input: { package: string; module: string; struct: string; signal?: AbortSignal }): Promise<any> {
		const module = await this.getNormalizedMoveModule({ package: input.package, module: input.module, signal: input.signal });
		return module?.structs?.[input.struct] ?? null;
	}

	private mapMoveModule(module: any, packageAddress: string) {
		const structs: Record<string, any> = {};
		for (const struct of module.structs?.nodes ?? []) {
			structs[struct.name] = {
				abilities: struct.abilities ?? [],
				fields: (struct.fields ?? []).map((field: any) => ({ name: field.name, type: { TypeParameter: 0 } })),
				typeParameters: (struct.typeParameters ?? []).map((parameter: any) => ({
					constraints: parameter.constraints ?? [],
					isPhantom: Boolean(parameter.isPhantom),
				})),
			};
		}
		const exposedFunctions: Record<string, any> = {};
		for (const fn of module.functions?.nodes ?? []) {
			exposedFunctions[fn.name] = {
				isEntry: Boolean(fn.isEntry),
				visibility: fn.visibility,
				typeParameters: (fn.typeParameters ?? []).map((parameter: any) => ({
					constraints: parameter.constraints ?? [],
					isPhantom: Boolean(parameter.isPhantom),
				})),
				parameters: [],
				return: [],
			};
		}
		return {
			address: packageAddress,
			fileFormatVersion: module.fileFormatVersion ?? 6,
			moduleName: module.name,
			friends: (module.friends?.nodes ?? []).map((friend: any) => friend.fullyQualifiedName),
			structs,
			exposedFunctions,
		};
	}

	async executeTransactionBlock(input: any): Promise<any> {
		const transaction = input.transactionBlock ?? input.transaction;
		const signature = input.signature ?? input.signatures;
		const result = await this.grpc.core.executeTransaction({
			transaction,
			signatures: Array.isArray(signature) ? signature : [signature],
			include: { effects: true, events: true, balanceChanges: true, objectTypes: true },
			signal: input.signal,
		} as any);
		return mapTransaction((result as any)?.transaction ?? result);
	}
}
