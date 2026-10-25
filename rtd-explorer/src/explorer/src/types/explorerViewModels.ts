// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * View-model shapes rendered by the Explorer UI. These structural types are
 * produced by the gRPC and GraphQL adapters in ~/rpc/ExplorerRpcClient; they
 * are local declarations so the UI has no dependency on any RPC SDK types.
 */

export interface AccumulatorEvent {
	accumulatorObj: string;
	address: string;
	operation: AccumulatorOperation;
	ty: string;
	value: AccumulatorValue;
}

export type AccumulatorOperation = 'merge' | 'split';

export type AccumulatorValue =
	| {
			integer: string;
	  }
	| {
			integerTuple: [string, string];
	  }
	| {
			eventDigest: [string, string][];
	  };

export interface BalanceChange {
	
	amount: string;
	coinType: string;
	
	owner: ObjectOwner;
}

export interface Checkpoint {
	
	checkpointCommitments: CheckpointCommitment[];
	
	digest: string;
	
	endOfEpochData?: EndOfEpochData | null;
	
	epoch: string;
	
	epochRollingGasCostSummary: GasCostSummary;
	
	networkTotalTransactions: string;
	
	previousDigest?: string | null;
	
	sequenceNumber: string;
	
	timestampMs: string;
	
	transactions: string[];
	
	validatorSignature: string;
}

export type CheckpointCommitment =
	| {
			ECMHLiveObjectSetDigest: ECMHLiveObjectSetDigest;
	  }
	| {
			CheckpointArtifactsDigest: string;
	  };

export interface CoinStruct {
	balance: string;
	coinObjectId: string;
	coinType: string;
	digest: string;
	previousTransaction: string;
	version: string;
}

export type ConsensusDeterminedVersionAssignments =
	| {
			CancelledTransactions: [string, [string, string][]][];
	  }
	| {
			CancelledTransactionsV2: [string, [[string, string], string][]][];
	  };

export type RtdParsedData =
	| {
			dataType: 'moveObject';
			fields: MoveStruct;
			hasPublicTransfer: boolean;
			type: string;
	  }
	| {
			dataType: 'package';
			disassembled: {
				[key: string]: unknown;
			};
	  };

export interface DisplayFieldsResponse {
	data?: {
		[key: string]: unknown;
	} | null;
	error?: ObjectResponseError | null;
}

export type DynamicFieldInfo =
	| {
			digest: string;
			name: DynamicFieldName;
			objectId: string;
			objectType: string;
			type: DynamicFieldType;
			version: string;
			bcsEncoding: 'base64';
			bcsName: string;
	  }
	| {
			digest: string;
			name: DynamicFieldName;
			objectId: string;
			objectType: string;
			type: DynamicFieldType;
			version: string;
			bcsEncoding: 'base58';
			bcsName: string;
	  };

export interface DynamicFieldName {
	type: string;
	value: unknown;
}

export type DynamicFieldType = 'DynamicField' | 'DynamicObject';

export interface ECMHLiveObjectSetDigest {
	digest: number[];
}

export interface EndOfEpochData {
	
	epochCommitments: CheckpointCommitment[];
	
	nextEpochCommittee: [string, string][];
	
	nextEpochProtocolVersion: string;
}

export type RtdEvent =
	| {
			
			id: EventId;
			
			packageId: string;
			
			parsedJson: unknown;
			
			sender: string;
			
			timestampMs?: string | null;
			
			transactionModule: string;
			
			type: string;
			bcs: string;
			bcsEncoding: 'base64';
	  }
	| {
			
			id: EventId;
			
			packageId: string;
			
			parsedJson: unknown;
			
			sender: string;
			
			timestampMs?: string | null;
			
			transactionModule: string;
			
			type: string;
			bcs: string;
			bcsEncoding: 'base58';
	  };

export interface EventId {
	eventSeq: string;
	txDigest: string;
}

export type ExecutionStatus = {
	status: 'success' | 'failure';
	error?: string;
};

export interface GasCostSummary {
	
	computationCost: string;
	
	nonRefundableStorageFee: string;
	
	storageCost: string;
	
	storageRebate: string;
}

export interface RtdGasData {
	budget: string;
	owner: string;
	payment: RtdObjectRef[];
	price: string;
}

export type MoveStruct =
	| MoveValue[]
	| {
			fields: {
				[key: string]: MoveValue;
			};
			type: string;
	  }
	| {
			[key: string]: MoveValue;
	  };

export type MoveValue =
	| number
	| boolean
	| string
	| MoveValue[]
	| string
	| {
			id: string;
	  }
	| MoveStruct
	| null
	| MoveVariant;

export interface MoveVariant {
	fields: {
		[key: string]: MoveValue;
	};
	type: string;
	variant: string;
}

export type RtdObjectChange =
	
	| {
			digest: string;
			modules: string[];
			packageId: string;
			type: 'published';
			version: string;
	  } 
	| {
			digest: string;
			objectId: string;
			objectType: string;
			recipient: ObjectOwner;
			sender: string;
			type: 'transferred';
			version: string;
	  } 
	| {
			digest: string;
			objectId: string;
			objectType: string;
			owner: ObjectOwner;
			previousVersion: string;
			sender: string;
			type: 'mutated';
			version: string;
	  } 
	| {
			objectId: string;
			objectType: string;
			sender: string;
			type: 'deleted';
			version: string;
	  } 
	| {
			objectId: string;
			objectType: string;
			sender: string;
			type: 'wrapped';
			version: string;
	  } 
	| {
			digest: string;
			objectId: string;
			objectType: string;
			owner: ObjectOwner;
			sender: string;
			type: 'created';
			version: string;
	  };

export interface RtdObjectData {
	
	bcs?: RawData | null;
	
	content?: RtdParsedData | null;
	
	digest: string;
	
	display?: DisplayFieldsResponse | null;
	objectId: string;
	
	owner?: ObjectOwner | null;
	
	previousTransaction?: string | null;
	
	storageRebate?: string | null;
	
	type?: string | null;
	
	version: string;
}

export interface RtdObjectRef {
	
	digest: string;
	
	objectId: string;
	
	version: string;
}

export type ObjectResponseError =
	| {
			code: 'notExists';
			object_id: string;
	  }
	| {
			code: 'dynamicFieldNotFound';
			parent_object_id: string;
	  }
	| {
			code: 'deleted';
			
			digest: string;
			object_id: string;
			
			version: string;
	  }
	| {
			code: 'unknown';
	  }
	| {
			code: 'displayError';
			error: string;
	  };

export interface OwnedObjectRef {
	owner: ObjectOwner;
	reference: RtdObjectRef;
}

export type ObjectOwner =
	
	| {
			AddressOwner: string;
	  } 
	| {
			ObjectOwner: string;
	  } 
	| {
			Shared: {
				
				initial_shared_version: string;
			};
	  }
	| 'Immutable' 
	| {
			ConsensusAddressOwner: {
				owner: string;
				
				start_version: string;
			};
	  };

export type RawData =
	| {
			bcsBytes: string;
			dataType: 'moveObject';
			hasPublicTransfer: boolean;
			type: string;
			version: string;
	  }
	| {
			dataType: 'package';
			id: string;
			linkageTable: {
				[key: string]: UpgradeInfo;
			};
			moduleMap: {
				[key: string]: string;
			};
			typeOriginTable: TypeOrigin[];
			version: string;
	  };

export interface RtdActiveJwk {
	epoch: string;
	jwk: RtdJWK;
	jwk_id: RtdJwkId;
}

export type RtdArgument =
	| 'GasCoin' 
	| {
			Input: number;
	  } 
	| {
			Result: number;
	  } 
	| {
			NestedResult: [number, number];
	  };

export interface RtdAuthenticatorStateExpire {
	min_epoch: string;
}

export type RtdCallArg =
	| {
			type: 'object';
			digest: string;
			objectId: string;
			objectType: 'immOrOwnedObject';
			version: string;
	  }
	| {
			type: 'object';
			initialSharedVersion: string;
			mutable: boolean;
			objectId: string;
			objectType: 'sharedObject';
	  }
	| {
			type: 'object';
			digest: string;
			objectId: string;
			objectType: 'receiving';
			version: string;
	  }
	| {
			type: 'pure';
			value: unknown;
			valueType?: string | null;
	  }
	| {
			reservation: RtdReservation;
			type: 'fundsWithdrawal';
			typeArg: RtdWithdrawalTypeArg;
			withdrawFrom: RtdWithdrawFrom;
	  };

export interface RtdChangeEpoch {
	computation_charge: string;
	epoch: string;
	epoch_start_timestamp_ms: string;
	storage_charge: string;
	storage_rebate: string;
}

export interface CoinMetadata {
	
	decimals: number;
	
	description: string;
	
	iconUrl?: string | null;
	
	id?: string | null;
	
	name: string;
	
	symbol: string;
}

export type RtdEndOfEpochTransactionKind =
	| 'AuthenticatorStateCreate'
	| 'RandomnessStateCreate'
	| 'CoinDenyListStateCreate'
	| 'StoreExecutionTimeObservations'
	| 'AccumulatorRootCreate'
	| 'CoinRegistryCreate'
	| 'DisplayRegistryCreate'
	| 'AddressAliasStateCreate'
	| 'WriteAccumulatorStorageCost'
	| {
			ChangeEpoch: RtdChangeEpoch;
	  }
	| {
			AuthenticatorStateExpire: RtdAuthenticatorStateExpire;
	  }
	| {
			BridgeStateCreate: string;
	  }
	| {
			BridgeCommitteeUpdate: string;
	  };

export interface RtdJWK {
	alg: string;
	e: string;
	kty: string;
	n: string;
}

export interface RtdJwkId {
	iss: string;
	kid: string;
}

export type RtdMoveAbility = 'Copy' | 'Drop' | 'Store' | 'Key';

export interface RtdMoveAbilitySet {
	abilities: RtdMoveAbility[];
}

export interface RtdMoveAbort {
	error_code?: string | null;
	function?: string | null;
	line?: number | null;
	module_id?: string | null;
}

export interface RtdMoveNormalizedField {
	name: string;
	type: RtdMoveNormalizedType;
}

export interface RtdMoveNormalizedFunction {
	isEntry: boolean;
	parameters: RtdMoveNormalizedType[];
	return: RtdMoveNormalizedType[];
	typeParameters: RtdMoveAbilitySet[];
	visibility: RtdMoveVisibility;
}

export interface RtdMoveNormalizedStruct {
	abilities: RtdMoveAbilitySet;
	fields: RtdMoveNormalizedField[];
	typeParameters: RtdMoveStructTypeParameter[];
}

export type RtdMoveNormalizedType =
	| 'Bool'
	| 'U8'
	| 'U16'
	| 'U32'
	| 'U64'
	| 'U128'
	| 'U256'
	| 'Address'
	| 'Signer'
	| {
			Struct: {
				address: string;
				module: string;
				name: string;
				typeArguments: RtdMoveNormalizedType[];
			};
	  }
	| {
			Vector: RtdMoveNormalizedType;
	  }
	| {
			TypeParameter: number;
	  }
	| {
			Reference: RtdMoveNormalizedType;
	  }
	| {
			MutableReference: RtdMoveNormalizedType;
	  };

export interface RtdMoveStructTypeParameter {
	constraints: RtdMoveAbilitySet;
	isPhantom: boolean;
}

export type RtdMoveVisibility = 'Private' | 'Public' | 'Friend';

export interface RtdObjectResponse {
	data?: RtdObjectData | null;
	error?: ObjectResponseError | null;
}

export interface MoveCallRtdTransaction {
	
	arguments?: RtdArgument[];
	
	function: string;
	
	module: string;
	
	package: string;
	
	type_arguments?: string[];
}

export type RtdReservation = {
	maxAmountU64: string;
};

export interface RtdSystemStateSummary {
	
	activeValidators: RtdValidatorSummary[];
	
	atRiskValidators: [string, string][];
	
	epoch: string;
	
	epochDurationMs: string;
	
	epochStartTimestampMs: string;
	
	inactivePoolsId: string;
	
	inactivePoolsSize: string;
	
	maxValidatorCount: string;
	
	minValidatorJoiningStake: string;
	
	pendingActiveValidatorsId: string;
	
	pendingActiveValidatorsSize: string;
	
	pendingRemovals: string[];
	
	protocolVersion: string;
	
	referenceGasPrice: string;
	
	safeMode: boolean;
	
	safeModeComputationRewards: string;
	
	safeModeNonRefundableStorageFee: string;
	
	safeModeStorageRebates: string;
	
	safeModeStorageRewards: string;
	
	stakeSubsidyBalance: string;
	
	stakeSubsidyCurrentDistributionAmount: string;
	
	stakeSubsidyDecreaseRate: number;
	
	stakeSubsidyDistributionCounter: string;
	
	stakeSubsidyPeriodLength: string;
	
	stakeSubsidyStartEpoch: string;
	
	stakingPoolMappingsId: string;
	
	stakingPoolMappingsSize: string;
	
	storageFundNonRefundableBalance: string;
	
	storageFundTotalObjectStorageRebates: string;
	
	systemStateVersion: string;
	
	totalStake: string;
	
	validatorCandidatesId: string;
	
	validatorCandidatesSize: string;
	
	validatorLowStakeGracePeriod: string;
	
	validatorLowStakeThreshold: string;
	
	validatorReportRecords: [string, string[]][];
	
	validatorVeryLowStakeThreshold: string;
}

export type RtdTransaction =
	
	| {
			MoveCall: MoveCallRtdTransaction;
	  } 
	| {
			TransferObjects: [RtdArgument[], RtdArgument];
	  } 
	| {
			SplitCoins: [RtdArgument, RtdArgument[]];
	  } 
	| {
			MergeCoins: [RtdArgument, RtdArgument[]];
	  } 
	| {
			Publish: string[];
	  } 
	| {
			Upgrade: [string[], string, RtdArgument];
	  } 
	| {
			MakeMoveVec: [string | null, RtdArgument[]];
	  };

export interface RtdValidatorSummary {
	commissionRate: string;
	description: string;
	
	exchangeRatesId: string;
	
	exchangeRatesSize: string;
	gasPrice: string;
	imageUrl: string;
	name: string;
	netAddress: string;
	networkPubkeyBytes: string;
	nextEpochCommissionRate: string;
	nextEpochGasPrice: string;
	nextEpochNetAddress?: string | null;
	nextEpochNetworkPubkeyBytes?: string | null;
	nextEpochP2pAddress?: string | null;
	nextEpochPrimaryAddress?: string | null;
	nextEpochProofOfPossession?: string | null;
	nextEpochProtocolPubkeyBytes?: string | null;
	nextEpochStake: string;
	nextEpochWorkerAddress?: string | null;
	nextEpochWorkerPubkeyBytes?: string | null;
	operationCapId: string;
	p2pAddress: string;
	
	pendingPoolTokenWithdraw: string;
	
	pendingStake: string;
	
	pendingTotalRtdWithdraw: string;
	
	poolTokenBalance: string;
	primaryAddress: string;
	projectUrl: string;
	proofOfPossessionBytes: string;
	protocolPubkeyBytes: string;
	
	rewardsPool: string;
	
	stakingPoolActivationEpoch?: string | null;
	
	stakingPoolDeactivationEpoch?: string | null;
	
	stakingPoolId: string;
	
	stakingPoolRtdBalance: string;
	rtdAddress: string;
	votingPower: string;
	workerAddress: string;
	workerPubkeyBytes: string;
}

export type RtdWithdrawFrom = 'sender' | 'sponsor';

export type RtdWithdrawalTypeArg = {
	balance: string;
};

export interface RtdTransactionBlock {
	data: TransactionBlockData;
	txSignatures: string[];
}

export type TransactionBlockData = {
	gasData: RtdGasData;
	messageVersion: 'v1';
	sender: string;
	transaction: RtdTransactionBlockKind;
};

export type TransactionEffects =
	
	{
		
		abortError?: RtdMoveAbort | null;
		accumulatorEvents?: AccumulatorEvent[];
		
		created?: OwnedObjectRef[];
		
		deleted?: RtdObjectRef[];
		
		dependencies?: string[];
		
		eventsDigest?: string | null;
		
		executedEpoch: string;
		
		gasObject: OwnedObjectRef;
		gasUsed: GasCostSummary;
		messageVersion: 'v1';
		
		modifiedAtVersions?: TransactionBlockEffectsModifiedAtVersions[];
		
		mutated?: OwnedObjectRef[];
		
		sharedObjects?: RtdObjectRef[];
		
		status: ExecutionStatus;
		
		transactionDigest: string;
		
		unwrapped?: OwnedObjectRef[];
		
		unwrappedThenDeleted?: RtdObjectRef[];
		
		wrapped?: RtdObjectRef[];
	};

export interface TransactionBlockEffectsModifiedAtVersions {
	objectId: string;
	sequenceNumber: string;
}

export type RtdTransactionBlockKind =
	
	| {
			computation_charge: string;
			epoch: string;
			epoch_start_timestamp_ms: string;
			kind: 'ChangeEpoch';
			storage_charge: string;
			storage_rebate: string;
	  } 
	| {
			kind: 'Genesis';
			objects: string[];
	  } 
	| {
			commit_timestamp_ms: string;
			epoch: string;
			kind: 'ConsensusCommitPrologue';
			round: string;
	  } 
	| {
			
			inputs: RtdCallArg[];
			kind: 'ProgrammableTransaction';
			
			transactions: RtdTransaction[];
	  } 
	| {
			epoch: string;
			kind: 'AuthenticatorStateUpdate';
			new_active_jwks: RtdActiveJwk[];
			round: string;
	  } 
	| {
			epoch: string;
			kind: 'RandomnessStateUpdate';
			random_bytes: number[];
			randomness_round: string;
	  } 
	| {
			kind: 'EndOfEpochTransaction';
			transactions: RtdEndOfEpochTransactionKind[];
	  }
	| {
			commit_timestamp_ms: string;
			consensus_commit_digest: string;
			epoch: string;
			kind: 'ConsensusCommitPrologueV2';
			round: string;
	  }
	| {
			commit_timestamp_ms: string;
			consensus_commit_digest: string;
			consensus_determined_version_assignments: ConsensusDeterminedVersionAssignments;
			epoch: string;
			kind: 'ConsensusCommitPrologueV3';
			round: string;
			sub_dag_index?: string | null;
	  }
	| {
			additional_state_digest: string;
			commit_timestamp_ms: string;
			consensus_commit_digest: string;
			consensus_determined_version_assignments: ConsensusDeterminedVersionAssignments;
			epoch: string;
			kind: 'ConsensusCommitPrologueV4';
			round: string;
			sub_dag_index?: string | null;
	  } 
	| {
			
			inputs: RtdCallArg[];
			kind: 'ProgrammableSystemTransaction';
			
			transactions: RtdTransaction[];
	  };

export interface RtdTransactionBlockResponse {
	balanceChanges?: BalanceChange[] | null;
	
	checkpoint?: string | null;
	confirmedLocalExecution?: boolean | null;
	digest: string;
	effects?: TransactionEffects | null;
	errors?: string[];
	events?: RtdEvent[] | null;
	objectChanges?: RtdObjectChange[] | null;
	rawEffects?: number[];
	
	rawTransaction?: string;
	timestampMs?: string | null;
	
	transaction?: RtdTransactionBlock | null;
}

export type TransactionFilter =
	
	| {
			Checkpoint: string;
	  } 
	| {
			MoveFunction: {
				function?: string | null;
				module?: string | null;
				package: string;
			};
	  } 
	| {
			InputObject: string;
	  } 
	| {
			ChangedObject: string;
	  } 
	| {
			AffectedObject: string;
	  } 
	| {
			FromAddress: string;
	  } 
	| {
			ToAddress: string;
	  } 
	| {
			FromAndToAddress: {
				from: string;
				to: string;
			};
	  } 
	| {
			FromOrToAddress: {
				addr: string;
			};
	  } 
	| {
			TransactionKind: string;
	  } 
	| {
			TransactionKindIn: string[];
	  };

export interface TypeOrigin {
	datatype_name: string;
	module_name: string;
	package: string;
}

export interface UpgradeInfo {
	
	upgraded_id: string;
	
	upgraded_version: string;
}

export type CoinBalance = {
	coinType: string;
	coinObjectCount: number;
	totalBalance: string;
	lockedBalance: Record<string, string>;
	fundsInAddressBalance?: string;
};

export type CheckpointPage = {
	data: Checkpoint[];
	nextCursor: string | null;
	hasNextPage: boolean;
};

export type RtdMovePackage = Extract<RtdParsedData, { dataType: 'package' }>;

export type ProgrammableTransaction = {
	transactions: RtdTransaction[];
	inputs: RtdCallArg[];
};

export type RtdObjectChangePublished = Extract<RtdObjectChange, { type: 'published' }>;
