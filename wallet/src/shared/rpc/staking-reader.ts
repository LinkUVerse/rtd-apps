// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from "rtd-typescript/bcs";
import { normalizeRtdAddress, normalizeStructTag } from "rtd-typescript/utils";
import type { WalletDynamicField } from "rtd-apps-core/src/rpc/WalletRpcContext";
import type {
  StakePosition,
  WalletStakingView,
  WalletValidator,
} from "rtd-apps-core/src/rpc/staking-types";
import type { SnapshotResult } from "./asset-reader";
import type {
  WalletStakingObject,
  WalletStakingSource,
} from "./staking-source";
import { walletAddress } from "./asset-address";
import { SnapshotReadError } from "./graphql-snapshot";
import {
  estimateStakingApy,
  estimateStakingReward,
  type StakingRate,
} from "./staking-rates";
import {
  stakingBcs,
  SYSTEM_WRAPPER_BCS,
  SYSTEM_V1_BCS,
  SYSTEM_V2_BCS,
  VALIDATOR_BCS,
  VALIDATOR_WRAPPER_BCS,
  STAKED_RTD_BCS,
  STAKING_RATE_BCS,
} from "./staking-bcs";

const type = normalizeStructTag;
function field(value: WalletDynamicField | null, expectedType: string) {
  if (
    !value ||
    value.$kind !== "DynamicField" ||
    value.valueType !== type(expectedType)
  )
    throw new SnapshotReadError("incompatible");
  return value.value.bcs;
}
/** Uses current checkpoint-bound 0x5, never Epoch.systemState (which is epoch-start state). */
export async function readStaking(
  reader: WalletStakingSource,
  owner?: string,
  callerSignal?: AbortSignal,
): Promise<SnapshotResult<WalletStakingView>> {
  const operation = new AbortController();
  const signal = AbortSignal.any([
    AbortSignal.timeout(20_000),
    operation.signal,
    ...(callerSignal ? [callerSignal] : []),
  ]);
  try {
    return await readCompleteStaking(reader, owner, signal, operation);
  } finally {
    // Cancel only this combination; the reader/session remains available to other queries.
    operation.abort();
  }
}

/** Every task is a complete collection through the reader's existing physical request queue. */
async function readCompleteCollections(
  tasks: readonly (() => Promise<void>)[],
  signal: AbortSignal,
  operation: AbortController,
) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, tasks.length) }, async () => {
      while (next < tasks.length) {
        signal.throwIfAborted();
        const task = tasks[next++];
        try {
          await task();
          signal.throwIfAborted();
        } catch (error) {
          // Abort siblings before a settled worker can start another queued collection.
          operation.abort(error);
          throw error;
        }
      }
    }),
  );
}

async function readCompleteStaking(
  reader: WalletStakingSource,
  owner: string | undefined,
  signal: AbortSignal,
  operation: AbortController,
): Promise<SnapshotResult<WalletStakingView>> {
  signal.throwIfAborted();
  const systemId = normalizeRtdAddress("0x5");
  const [object] = (await reader.objects([systemId], signal)).value;
  if (
    !object ||
    object instanceof Error ||
    object.objectId !== systemId ||
    object.type !== type("0x3::rtd_system::RtdSystemState") ||
    object.owner.$kind !== "Shared"
  )
    throw new SnapshotReadError("incompatible");
  const wrapper = stakingBcs(SYSTEM_WRAPPER_BCS, object.content);
  if (wrapper.id !== systemId || !["1", "2"].includes(wrapper.version))
    throw new SnapshotReadError("incompatible");
  const inner = (
    await reader.dynamicField(
      systemId,
      { type: "u64", bcs: bcs.u64().serialize(wrapper.version).toBytes() },
      "DynamicField",
      signal,
    )
  ).value;
  const suffix =
    wrapper.version === "1" ? "RtdSystemStateInner" : "RtdSystemStateInnerV2";
  const content = field(inner, `0x3::rtd_system_state_inner::${suffix}`);
  const system =
    wrapper.version === "1"
      ? stakingBcs(SYSTEM_V1_BCS, content)
      : stakingBcs(SYSTEM_V2_BCS, content);
  if (system.system_state_version !== wrapper.version)
    throw new SnapshotReadError("incompatible");
  type Validator = ReturnType<typeof VALIDATOR_BCS.parse>;
  const validators: { value: Validator; active: boolean }[] =
    system.validators.active_validators.map((value) => ({
      value,
      active: true,
    }));
  const inactiveTable = system.validators.inactive_validators;
  if (validators.length > 1000 || BigInt(inactiveTable.size) > 1000n)
    throw new SnapshotReadError("incompatible");
  const inactive = (await reader.dynamicFields(inactiveTable.id, signal)).value;
  if (BigInt(inactive.length) !== BigInt(inactiveTable.size))
    throw new SnapshotReadError("incompatible");
  for (const entry of inactive) {
    signal.throwIfAborted();
    if (entry.name.type !== type("0x2::object::ID"))
      throw new SnapshotReadError("incompatible");
    const poolId = stakingBcs(bcs.Address, entry.name.bcs);
    const wrapped = stakingBcs(
      VALIDATOR_WRAPPER_BCS,
      field(entry, "0x3::validator_wrapper::ValidatorWrapper"),
    );
    if (wrapped.inner.version !== "1")
      throw new SnapshotReadError("incompatible");
    const body = (
      await reader.dynamicField(
        wrapped.inner.id,
        {
          type: "u64",
          bcs: bcs.u64().serialize(wrapped.inner.version).toBytes(),
        },
        "DynamicField",
        signal,
      )
    ).value;
    const validator = stakingBcs(
      VALIDATOR_BCS,
      field(body, "0x3::validator::Validator"),
    );
    if (validator.staking_pool.id !== poolId)
      throw new SnapshotReadError("incompatible");
    validators.push({ value: validator, active: false });
  }
  const pools = new Map<
    string,
    { validator: WalletValidator; rates: readonly StakingRate[] }
  >();
  const activeAddresses = new Set<string>();
  const risk = new Map<string, string>();
  for (const entry of system.validators.at_risk_validators.contents) {
    if (risk.has(entry.key)) throw new SnapshotReadError("incompatible");
    risk.set(entry.key, entry.value);
  }
  // Validate declared identities and the total budget before scheduling independent I/O.
  const declaredPools = new Set<string>(),
    declaredActive = new Set<string>();
  let declaredRates = 0n;
  for (const { value, active } of validators) {
    signal.throwIfAborted();
    const pool = value.staking_pool,
      address = value.metadata.rtd_address;
    declaredRates += BigInt(pool.exchange_rates.size);
    if (
      declaredPools.has(pool.id) ||
      (active && declaredActive.has(address)) ||
      BigInt(value.commission_rate) > 10000n ||
      BigInt(pool.exchange_rates.size) > 10000n ||
      declaredRates > 10000n ||
      (active &&
        (pool.activation_epoch === null ||
          BigInt(pool.activation_epoch) > BigInt(system.epoch) ||
          pool.deactivation_epoch !== null))
    )
      throw new SnapshotReadError("incompatible");
    declaredPools.add(pool.id);
    if (active) declaredActive.add(address);
  }
  const address = owner === undefined ? undefined : walletAddress(owner);
  const rateTables: (readonly WalletDynamicField[])[] = new Array(
    validators.length,
  );
  let owned: readonly WalletStakingObject[] = [];
  const tasks = validators.map(({ value }, index) => async () => {
    rateTables[index] = (
      await reader.dynamicFields(value.staking_pool.exchange_rates.id, signal)
    ).value;
  });
  if (address !== undefined)
    tasks.push(async () => {
      owned = (
        await reader.ownedObjects(address, {
          type: "0x3::staking_pool::StakedRtd",
          signal,
        })
      ).value;
    });
  await readCompleteCollections(tasks, signal, operation);
  let totalRateCount = 0;
  for (const [index, { value, active }] of validators.entries()) {
    signal.throwIfAborted();
    const pool = value.staking_pool,
      address = value.metadata.rtd_address;
    if (
      pools.has(pool.id) ||
      (active && activeAddresses.has(address)) ||
      BigInt(value.commission_rate) > 10000n ||
      BigInt(pool.exchange_rates.size) > 10000n ||
      (active &&
        (pool.activation_epoch === null ||
          BigInt(pool.activation_epoch) > BigInt(system.epoch) ||
          pool.deactivation_epoch !== null))
    )
      throw new SnapshotReadError("incompatible");
    if (active) activeAddresses.add(address);
    const entries = rateTables[index];
    totalRateCount += entries.length;
    if (
      BigInt(entries.length) !== BigInt(pool.exchange_rates.size) ||
      totalRateCount > 10000
    )
      throw new SnapshotReadError("incompatible");
    const rates = entries.map((entry) => {
      if (entry.name.type !== "u64")
        throw new SnapshotReadError("incompatible");
      const epoch = stakingBcs(bcs.u64(), entry.name.bcs);
      const rate = stakingBcs(
        STAKING_RATE_BCS,
        field(entry, "0x3::staking_pool::PoolTokenExchangeRate"),
      );
      return Object.freeze({
        epoch,
        rtdAmount: rate.rtd_amount,
        poolTokenAmount: rate.pool_token_amount,
      });
    });
    // Validate all rate tables even for inactive pools; the public APY remains unknown there.
    const apy = estimateStakingApy({
      rates,
      currentEpoch: system.epoch,
      subsidyStartEpoch: system.parameters.stake_subsidy_start_epoch,
    });
    const validator: WalletValidator = Object.freeze({
      address,
      name: value.metadata.name,
      description: value.metadata.description,
      imageUrl: value.metadata.image_url,
      projectUrl: value.metadata.project_url,
      poolId: pool.id,
      active,
      votingPower: value.voting_power,
      commissionBps: value.commission_rate,
      stakeBalance: pool.rtd_balance,
      activationEpoch: pool.activation_epoch,
      deactivationEpoch: pool.deactivation_epoch,
      atRiskEpochs: active ? (risk.get(address) ?? null) : null,
      apy: active
        ? apy
        : { state: "unknown" as const, reason: "inactive-pool" as const },
    });
    pools.set(pool.id, { validator, rates });
  }
  if ([...risk.keys()].some((address) => !activeAddresses.has(address)))
    throw new SnapshotReadError("incompatible");
  let positions: readonly StakePosition[] | null = null;
  if (address !== undefined) {
    positions = Object.freeze(
      owned.map((object) => {
        if (
          object.type !== type("0x3::staking_pool::StakedRtd") ||
          (object.owner.$kind === "AddressOwner"
            ? object.owner.AddressOwner !== address
            : object.owner.$kind !== "ConsensusAddressOwner" ||
              object.owner.ConsensusAddressOwner.owner !== address)
        )
          throw new SnapshotReadError("incompatible");
        const stake = stakingBcs(STAKED_RTD_BCS, object.content);
        if (stake.id !== object.objectId)
          throw new SnapshotReadError("incompatible");
        const pool = pools.get(stake.pool_id),
          activation = BigInt(stake.stake_activation_epoch),
          pending = activation > BigInt(system.epoch);
        const position: StakePosition = {
          objectId: object.objectId,
          version: object.version,
          digest: object.digest,
          poolId: stake.pool_id,
          validatorAddress: pool?.validator.address ?? null,
          principal: stake.principal.value,
          activationEpoch: stake.stake_activation_epoch,
          requestEpoch: (activation === 0n ? 0n : activation - 1n).toString(),
          status: pending ? "pending" : "active",
          poolState: pool
            ? pool.validator.active
              ? "active"
              : "inactive"
            : "unresolved",
          reward: pending
            ? { state: "unknown", reason: "pending" }
            : pool
              ? estimateStakingReward({
                  principal: stake.principal.value,
                  activationEpoch: stake.stake_activation_epoch,
                  currentEpoch: system.epoch,
                  rates: pool.rates,
                })
              : { state: "unknown", reason: "pool-unresolved" },
        };
        return Object.freeze(position);
      }),
    );
  }
  await reader.snapshot.revalidate(signal);
  signal.throwIfAborted();
  return Object.freeze({
    snapshot: reader.proof,
    value: Object.freeze({
      epoch: system.epoch,
      safeMode: system.safe_mode,
      protocolVersion: system.protocol_version,
      referenceGasPrice: system.reference_gas_price,
      epochStartTimestampMs: system.epoch_start_timestamp_ms,
      epochDurationMs: system.parameters.epoch_duration_ms,
      subsidyStartEpoch: system.parameters.stake_subsidy_start_epoch,
      totalStake: system.validators.total_stake,
      validators: Object.freeze(
        [...pools.values()].map((pool) => pool.validator),
      ),
      positions,
    }),
  });
}
