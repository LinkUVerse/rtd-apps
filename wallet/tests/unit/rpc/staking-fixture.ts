// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from "rtd-typescript/bcs";
import {
  deriveDynamicFieldID,
  normalizeRtdAddress as address,
  normalizeStructTag,
  toBase64,
} from "rtd-typescript/utils";
import {
  SYSTEM_V1_BCS,
  SYSTEM_V2_BCS,
  SYSTEM_WRAPPER_BCS,
  VALIDATOR_WRAPPER_BCS,
  VALIDATOR_BCS,
  STAKED_RTD_BCS,
  STAKING_RATE_BCS,
} from "../../../src/shared/rpc/staking-bcs";
import { snapshotFixture, objectNode, connection } from "./fixtures";

export function stakingFixture(version: "1" | "2" = "2") {
  const emptyTable = { id: address("0x90"), size: "0" };
  const metadata = {
    rtd_address: address("0xb"),
    protocol_pubkey_bytes: [1, 2],
    network_pubkey_bytes: [],
    worker_pubkey_bytes: [],
    proof_of_possession_bytes: [],
    name: "Validator",
    description: "Current validator",
    image_url: "",
    project_url: "https://example.test",
    net_address: "",
    p2p_address: "",
    primary_address: "",
    worker_address: "",
    next_epoch_protocol_pubkey_bytes: null,
    next_epoch_proof_of_possession: null,
    next_epoch_network_pubkey_bytes: null,
    next_epoch_worker_pubkey_bytes: null,
    next_epoch_net_address: null,
    next_epoch_p2p_address: null,
    next_epoch_primary_address: null,
    next_epoch_worker_address: null,
    extra_fields: emptyTable,
  };
  const validator = {
    metadata,
    voting_power: "10000",
    operation_cap_id: address("0xa1"),
    gas_price: "1000",
    staking_pool: {
      id: address("0xc"),
      activation_epoch: "0",
      deactivation_epoch: null as string | null,
      rtd_balance: "9007199254740993",
      rewards_pool: { value: "1000" },
      pool_token_balance: "9007199254740000",
      exchange_rates: { id: address("0xd"), size: "2" },
      pending_stake: "0",
      pending_total_rtd_withdraw: "0",
      pending_pool_token_withdraw: "0",
      extra_fields: emptyTable,
    },
    commission_rate: "100",
    next_epoch_stake: "9007199254740993",
    next_epoch_gas_price: "1000",
    next_epoch_commission_rate: "100",
    extra_fields: emptyTable,
  };
  const inactive = {
    ...validator,
    metadata: { ...metadata, rtd_address: address("0xb2"), name: "Retired" },
    staking_pool: {
      ...validator.staking_pool,
      id: address("0xc2"),
      deactivation_epoch: "2",
      exchange_rates: { id: address("0xd2"), size: "2" },
    },
  };
  const system = {
    epoch: "2",
    protocol_version: "100",
    system_state_version: version,
    validators: {
      total_stake: "9007199254740993",
      active_validators: [validator],
      pending_active_validators: { contents: emptyTable },
      pending_removals: [],
      staking_pool_mappings: emptyTable,
      inactive_validators: { id: address("0xe"), size: "1" },
      validator_candidates: emptyTable,
      at_risk_validators: {
        contents: [{ key: metadata.rtd_address, value: "2" }],
      },
      extra_fields: emptyTable,
    },
    storage_fund: {
      total_object_storage_rebates: { value: "10" },
      non_refundable_balance: { value: "20" },
    },
    parameters: {
      epoch_duration_ms: "60000",
      stake_subsidy_start_epoch: "0",
      min_validator_count: "1",
      max_validator_count: "150",
      min_validator_joining_stake: "1",
      validator_low_stake_threshold: "1",
      validator_very_low_stake_threshold: "1",
      validator_low_stake_grace_period: "7",
      extra_fields: emptyTable,
    },
    reference_gas_price: "1000",
    validator_report_records: { contents: [] },
    stake_subsidy: {
      balance: { value: "100000" },
      distribution_counter: "2",
      current_distribution_amount: "100",
      stake_subsidy_period_length: "10",
      stake_subsidy_decrease_rate: 1000,
      extra_fields: emptyTable,
    },
    safe_mode: false,
    safe_mode_storage_rewards: { value: "0" },
    safe_mode_computation_rewards: { value: "0" },
    safe_mode_storage_rebates: "0",
    safe_mode_non_refundable_storage_fee: "0",
    epoch_start_timestamp_ms: "1700000000000",
    extra_fields: emptyTable,
  };
  const stakes = [
    {
      id: address("0xf1"),
      pool_id: address("0xc"),
      stake_activation_epoch: "1",
      principal: { value: "9007199254740993" },
    },
    {
      id: address("0xf2"),
      pool_id: address("0xc2"),
      stake_activation_epoch: "1",
      principal: { value: "3" },
    },
    {
      id: address("0xf3"),
      pool_id: address("0xc"),
      stake_activation_epoch: "3",
      principal: { value: "100" },
    },
  ];
  function dynamic(
    parent: string,
    nameType: string,
    name: Uint8Array,
    valueType: string,
    content: Uint8Array,
  ) {
    return {
      address: deriveDynamicFieldID(parent, nameType, name),
      name: { type: { repr: nameType }, bcs: toBase64(name) },
      value: {
        __typename: "MoveValue",
        type: { repr: valueType },
        bcs: toBase64(content),
      },
    };
  }
  const owner = address("0xa");
  let override:
    | ((
        response: Record<string, unknown>,
        request: import("./fixtures").GraphQLRequest,
      ) => Record<string, unknown>)
    | undefined;
  const source = snapshotFixture({
    read(request) {
      let result: Record<string, unknown>;
      if (request.query.includes("multiGetObjects")) {
        const wrapper = objectNode(address("0x5"));
        wrapper.owner = {
          __typename: "Shared",
          initialSharedVersion: 1,
        } as never;
        wrapper.contents.type.repr = "0x3::rtd_system::RtdSystemState";
        wrapper.contents.display.basis.objectType = normalizeStructTag(wrapper.contents.type.repr);
        wrapper.contents.bcs = toBase64(
          SYSTEM_WRAPPER_BCS.serialize({
            id: address("0x5"),
            version,
          }).toBytes(),
        );
        result = {
          multiGetObjects: [
            { address: wrapper.address, asMoveObject: wrapper },
          ],
        };
      } else if (request.query.includes("field: dynamicField")) {
        const parent = request.variables.parent as string;
        const isSystem = parent === address("0x5");
        const content = isSystem
          ? (version === "1"
              ? SYSTEM_V1_BCS.serialize(system)
              : SYSTEM_V2_BCS.serialize(system)
            ).toBytes()
          : VALIDATOR_BCS.serialize(inactive).toBytes();
        result = {
          address: {
            address: parent,
            field: dynamic(
              parent,
              "u64",
              bcs
                .u64()
                .serialize(isSystem ? version : "1")
                .toBytes(),
              isSystem
                ? `0x3::rtd_system_state_inner::RtdSystemStateInner${version === "1" ? "" : "V2"}`
                : "0x3::validator::Validator",
              content,
            ),
          },
        };
      } else if (request.query.includes("dynamicFields(first:")) {
        const parent = request.variables.parent as string;
        const fields =
          parent === address("0xe")
            ? [
                dynamic(
                  parent,
                  "0x2::object::ID",
                  bcs.Address.serialize(inactive.staking_pool.id).toBytes(),
                  "0x3::validator_wrapper::ValidatorWrapper",
                  VALIDATOR_WRAPPER_BCS.serialize({
                    inner: { id: address("0xe2"), version: "1" },
                  }).toBytes(),
                ),
              ]
            : [1, 2].map((epoch) =>
                dynamic(
                  parent,
                  "u64",
                  bcs.u64().serialize(String(epoch)).toBytes(),
                  "0x3::staking_pool::PoolTokenExchangeRate",
                  STAKING_RATE_BCS.serialize({
                    rtd_amount: epoch === 1 ? "1" : "3",
                    pool_token_amount: epoch === 1 ? "1" : "2",
                  }).toBytes(),
                ),
              );
        result = {
          address: { address: parent, dynamicFields: connection(fields) },
        };
      } else if (request.query.includes("objects(first:")) {
        const nodes = stakes.map((stake) => {
          const obj = objectNode(stake.id, owner, "0x3::staking_pool::StakedRtd");
          obj.contents.bcs = toBase64(
            STAKED_RTD_BCS.serialize(stake).toBytes(),
          );
          return obj;
        });
        result = { address: { address: owner, objects: connection(nodes) } };
      } else throw new Error("unexpected staking query");
      return override ? override(result, request) : result;
    },
  });
  return {
    ...source,
    owner,
    system,
    validator,
    inactive,
    stakes,
    override: (fn: typeof override) => {
      override = fn;
    },
  };
}
