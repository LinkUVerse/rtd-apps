// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs, type BcsType } from "rtd-typescript/bcs";
import { toBase64 } from "rtd-typescript/utils";
import { SnapshotReadError } from "./graphql-snapshot";

const table = bcs.struct("Table", { id: bcs.Address, size: bcs.u64() });
const balance = bcs.struct("Balance", { value: bcs.u64() });
const bytes = bcs.vector(bcs.u8());
const metadata = bcs.struct("ValidatorMetadata", {
  rtd_address: bcs.Address,
  protocol_pubkey_bytes: bytes,
  network_pubkey_bytes: bytes,
  worker_pubkey_bytes: bytes,
  proof_of_possession_bytes: bytes,
  name: bcs.string(),
  description: bcs.string(),
  image_url: bcs.string(),
  project_url: bcs.string(),
  net_address: bcs.string(),
  p2p_address: bcs.string(),
  primary_address: bcs.string(),
  worker_address: bcs.string(),
  next_epoch_protocol_pubkey_bytes: bcs.option(bytes),
  next_epoch_proof_of_possession: bcs.option(bytes),
  next_epoch_network_pubkey_bytes: bcs.option(bytes),
  next_epoch_worker_pubkey_bytes: bcs.option(bytes),
  next_epoch_net_address: bcs.option(bcs.string()),
  next_epoch_p2p_address: bcs.option(bcs.string()),
  next_epoch_primary_address: bcs.option(bcs.string()),
  next_epoch_worker_address: bcs.option(bcs.string()),
  extra_fields: table,
});
export const STAKING_POOL_BCS = bcs.struct("StakingPool", {
  id: bcs.Address,
  activation_epoch: bcs.option(bcs.u64()),
  deactivation_epoch: bcs.option(bcs.u64()),
  rtd_balance: bcs.u64(),
  rewards_pool: balance,
  pool_token_balance: bcs.u64(),
  exchange_rates: table,
  pending_stake: bcs.u64(),
  pending_total_rtd_withdraw: bcs.u64(),
  pending_pool_token_withdraw: bcs.u64(),
  extra_fields: table,
});
export const VALIDATOR_BCS = bcs.struct("Validator", {
  metadata,
  voting_power: bcs.u64(),
  operation_cap_id: bcs.Address,
  gas_price: bcs.u64(),
  staking_pool: STAKING_POOL_BCS,
  commission_rate: bcs.u64(),
  next_epoch_stake: bcs.u64(),
  next_epoch_gas_price: bcs.u64(),
  next_epoch_commission_rate: bcs.u64(),
  extra_fields: table,
});
const validatorSet = bcs.struct("ValidatorSet", {
  total_stake: bcs.u64(),
  active_validators: bcs.vector(VALIDATOR_BCS),
  pending_active_validators: bcs.struct("TableVec", { contents: table }),
  pending_removals: bcs.vector(bcs.u64()),
  staking_pool_mappings: table,
  inactive_validators: table,
  validator_candidates: table,
  at_risk_validators: bcs.struct("VecMap", {
    contents: bcs.vector(
      bcs.struct("Entry", { key: bcs.Address, value: bcs.u64() }),
    ),
  }),
  extra_fields: table,
});
const parametersHead = {
  epoch_duration_ms: bcs.u64(),
  stake_subsidy_start_epoch: bcs.u64(),
};
const parametersTail = {
  max_validator_count: bcs.u64(),
  min_validator_joining_stake: bcs.u64(),
  validator_low_stake_threshold: bcs.u64(),
  validator_very_low_stake_threshold: bcs.u64(),
  validator_low_stake_grace_period: bcs.u64(),
  extra_fields: table,
};
const systemHead = {
  epoch: bcs.u64(),
  protocol_version: bcs.u64(),
  system_state_version: bcs.u64(),
  validators: validatorSet,
  storage_fund: bcs.struct("StorageFund", {
    total_object_storage_rebates: balance,
    non_refundable_balance: balance,
  }),
};
const systemTail = {
  reference_gas_price: bcs.u64(),
  validator_report_records: bcs.struct("VecMap", {
    contents: bcs.vector(
      bcs.struct("Entry", {
        key: bcs.Address,
        value: bcs.struct("VecSet", { contents: bcs.vector(bcs.Address) }),
      }),
    ),
  }),
  stake_subsidy: bcs.struct("StakeSubsidy", {
    balance,
    distribution_counter: bcs.u64(),
    current_distribution_amount: bcs.u64(),
    stake_subsidy_period_length: bcs.u64(),
    stake_subsidy_decrease_rate: bcs.u16(),
    extra_fields: table,
  }),
  safe_mode: bcs.bool(),
  safe_mode_storage_rewards: balance,
  safe_mode_computation_rewards: balance,
  safe_mode_storage_rebates: bcs.u64(),
  safe_mode_non_refundable_storage_fee: bcs.u64(),
  epoch_start_timestamp_ms: bcs.u64(),
  extra_fields: table,
};
export const SYSTEM_V1_BCS = bcs.struct("RtdSystemStateInner", {
  ...systemHead,
  parameters: bcs.struct("SystemParameters", {
    ...parametersHead,
    ...parametersTail,
  }),
  ...systemTail,
});
export const SYSTEM_V2_BCS = bcs.struct("RtdSystemStateInnerV2", {
  ...systemHead,
  parameters: bcs.struct("SystemParametersV2", {
    ...parametersHead,
    min_validator_count: bcs.u64(),
    ...parametersTail,
  }),
  ...systemTail,
});
export const SYSTEM_WRAPPER_BCS = bcs.struct("RtdSystemState", {
  id: bcs.Address,
  version: bcs.u64(),
});
export const VALIDATOR_WRAPPER_BCS = bcs.struct("ValidatorWrapper", {
  inner: bcs.struct("Versioned", { id: bcs.Address, version: bcs.u64() }),
});
export const STAKED_RTD_BCS = bcs.struct("StakedRtd", {
  id: bcs.Address,
  pool_id: bcs.Address,
  stake_activation_epoch: bcs.u64(),
  principal: balance,
});
export const STAKING_RATE_BCS = bcs.struct("PoolTokenExchangeRate", {
  rtd_amount: bcs.u64(),
  pool_token_amount: bcs.u64(),
});
export function stakingBcs<T, Input>(
  codec: BcsType<T, Input>,
  bytes: Uint8Array,
): T {
  try {
    if (bytes.length > 2 * 1024 * 1024) throw new Error("BCS budget");
    const value = codec.parse(bytes);
    if (
      toBase64(codec.serialize(value as unknown as Input).toBytes()) !==
      toBase64(bytes)
    )
      throw new Error("Non-canonical BCS");
    return value;
  } catch {
    throw new SnapshotReadError("incompatible");
  }
}
