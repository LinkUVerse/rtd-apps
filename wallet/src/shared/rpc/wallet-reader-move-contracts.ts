// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type {
  WalletMoveGroupContract,
  WalletMovePackageContract,
} from "./wallet-move-contracts";
import { walletAddress } from "./asset-address";
import {
  T,
  A,
  R,
  primitive as p,
  datatype as d,
  param,
  vector as v,
  argument as arg,
  typeParameter as tp,
  struct,
  fn,
} from "./move-contract-template";

const std = walletAddress("0x1"),
  core = walletAddress("0x2"),
  system = walletAddress("0x3");
const u64 = () => p(T.U64),
  address = () => p(T.ADDRESS),
  bytes = () => v(p(T.U8));
const uid = () => d("0x2::object::UID"),
  id = () => d("0x2::object::ID");
const native = () => d("0x2::rtd::RTD"),
  balance = () => d("0x2::balance::Balance", native());
const bag = () => d("0x2::bag::Bag"),
  string = () => d("0x1::string::String");
const option = (value: ReturnType<typeof d>) => d("0x1::option::Option", value);
const table = (key: ReturnType<typeof d>, value: ReturnType<typeof d>) =>
  d("0x2::table::Table", key, value);
const sys = (module: string, name: string) => d(`0x3::${module}::${name}`);
const namedU64 = (...names: string[]): [string, ReturnType<typeof d>][] =>
  names.map((name) => [name, u64()]);

function standardLibrary(): WalletMovePackageContract {
  return {
    packageId: std,
    datatypes: [
      struct(
        std,
        "option",
        "Option",
        [A.COPY, A.DROP, A.STORE],
        [["vec", v(param(0))]],
        [tp([])],
      ),
      struct(
        std,
        "string",
        "String",
        [A.COPY, A.DROP, A.STORE],
        [["bytes", bytes()]],
      ),
      struct(
        std,
        "ascii",
        "String",
        [A.COPY, A.DROP, A.STORE],
        [["bytes", bytes()]],
      ),
    ],
    functions: [],
  };
}
function readerSupport(): WalletMovePackageContract {
  return {
    packageId: core,
    datatypes: [
      struct(
        core,
        "bag",
        "Bag",
        [A.KEY, A.STORE],
        [
          ["id", uid()],
          ["size", u64()],
        ],
      ),
      struct(
        core,
        "versioned",
        "Versioned",
        [A.KEY, A.STORE],
        [
          ["id", uid()],
          ["version", u64()],
        ],
      ),
      struct(
        core,
        "vec_map",
        "VecMap",
        [A.COPY, A.DROP, A.STORE],
        [["contents", v(d("0x2::vec_map::Entry", param(0), param(1)))]],
        [tp([A.COPY]), tp([])],
      ),
      struct(
        core,
        "vec_map",
        "Entry",
        [A.COPY, A.DROP, A.STORE],
        [
          ["key", param(0)],
          ["value", param(1)],
        ],
        [tp([A.COPY]), tp([])],
      ),
      struct(
        core,
        "table_vec",
        "TableVec",
        [A.STORE],
        [["contents", table(u64(), param(0))]],
        [tp([A.STORE], true)],
      ),
      struct(
        core,
        "url",
        "Url",
        [A.COPY, A.DROP, A.STORE],
        [["url", d("0x1::ascii::String")]],
      ),
      struct(
        core,
        "clock",
        "Clock",
        [A.KEY],
        [
          ["id", uid()],
          ["timestamp_ms", u64()],
        ],
      ),
    ],
    functions: [],
  };
}
function coins(): WalletMovePackageContract {
  return {
    packageId: core,
    datatypes: [
      struct(
        core,
        "coin",
        "Coin",
        [A.KEY, A.STORE],
        [
          ["id", uid()],
          ["balance", d("0x2::balance::Balance", param(0))],
        ],
        [tp([], true)],
      ),
      struct(
        core,
        "funds_accumulator",
        "Withdrawal",
        [A.DROP],
        [
          ["owner", address()],
          ["limit", p(T.U256)],
        ],
        [tp([A.STORE], true)],
      ),
    ],
    functions: [
      fn(
        "coin",
        "redeem_funds",
        [
          arg(
            d(
              "0x2::funds_accumulator::Withdrawal",
              d("0x2::balance::Balance", param(0)),
            ),
          ),
          arg(d("0x2::tx_context::TxContext"), R.MUTABLE),
        ],
        [arg(d("0x2::coin::Coin", param(0)))],
        { typeParameters: [{ constraints: [] }] },
      ),
    ],
  };
}
function staking(): WalletMovePackageContract {
  const metadataFields: [string, ReturnType<typeof d>][] = [
    ["rtd_address", address()],
    ["protocol_pubkey_bytes", bytes()],
    ["network_pubkey_bytes", bytes()],
    ["worker_pubkey_bytes", bytes()],
    ["proof_of_possession", bytes()],
    ["name", string()],
    ["description", string()],
    ["image_url", d("0x2::url::Url")],
    ["project_url", d("0x2::url::Url")],
    ["net_address", string()],
    ["p2p_address", string()],
    ["primary_address", string()],
    ["worker_address", string()],
    ["next_epoch_protocol_pubkey_bytes", option(bytes())],
    ["next_epoch_proof_of_possession", option(bytes())],
    ["next_epoch_network_pubkey_bytes", option(bytes())],
    ["next_epoch_worker_pubkey_bytes", option(bytes())],
    ["next_epoch_net_address", option(string())],
    ["next_epoch_p2p_address", option(string())],
    ["next_epoch_primary_address", option(string())],
    ["next_epoch_worker_address", option(string())],
    ["extra_fields", bag()],
  ];
  const parameters = (v2: boolean) =>
    struct(
      system,
      "rtd_system_state_inner",
      v2 ? "SystemParametersV2" : "SystemParameters",
      [A.STORE],
      [
        ...namedU64("epoch_duration_ms", "stake_subsidy_start_epoch"),
        ...(v2 ? namedU64("min_validator_count") : []),
        ...namedU64(
          "max_validator_count",
          "min_validator_joining_stake",
          "validator_low_stake_threshold",
          "validator_very_low_stake_threshold",
          "validator_low_stake_grace_period",
        ),
        ["extra_fields", bag()],
      ],
    );
  const inner = (v2: boolean) =>
    struct(
      system,
      "rtd_system_state_inner",
      v2 ? "RtdSystemStateInnerV2" : "RtdSystemStateInner",
      [A.STORE],
      [
        ...namedU64("epoch", "protocol_version", "system_state_version"),
        ["validators", sys("validator_set", "ValidatorSet")],
        ["storage_fund", sys("storage_fund", "StorageFund")],
        [
          "parameters",
          sys(
            "rtd_system_state_inner",
            v2 ? "SystemParametersV2" : "SystemParameters",
          ),
        ],
        ["reference_gas_price", u64()],
        [
          "validator_report_records",
          d(
            "0x2::vec_map::VecMap",
            address(),
            d("0x2::vec_set::VecSet", address()),
          ),
        ],
        ["stake_subsidy", sys("stake_subsidy", "StakeSubsidy")],
        ["safe_mode", p(T.BOOL)],
        ["safe_mode_storage_rewards", balance()],
        ["safe_mode_computation_rewards", balance()],
        ...namedU64(
          "safe_mode_storage_rebates",
          "safe_mode_non_refundable_storage_fee",
          "epoch_start_timestamp_ms",
        ),
        ["extra_fields", bag()],
      ],
    );
  const wrapper = sys("rtd_system", "RtdSystemState"),
    stake = sys("staking_pool", "StakedRtd"),
    ctx = () => arg(d("0x2::tx_context::TxContext"), R.MUTABLE);
  return {
    packageId: system,
    datatypes: [
      struct(
        system,
        "rtd_system",
        "RtdSystemState",
        [A.KEY],
        [
          ["id", uid()],
          ["version", u64()],
        ],
      ),
      parameters(false),
      parameters(true),
      inner(false),
      inner(true),
      struct(
        system,
        "validator",
        "ValidatorMetadata",
        [A.STORE],
        metadataFields,
      ),
      struct(
        system,
        "validator",
        "Validator",
        [A.STORE],
        [
          ["metadata", sys("validator", "ValidatorMetadata")],
          ["voting_power", u64()],
          ["operation_cap_id", id()],
          ["gas_price", u64()],
          ["staking_pool", sys("staking_pool", "StakingPool")],
          ...namedU64(
            "commission_rate",
            "next_epoch_stake",
            "next_epoch_gas_price",
            "next_epoch_commission_rate",
          ),
          ["extra_fields", bag()],
        ],
      ),
      struct(
        system,
        "validator_set",
        "ValidatorSet",
        [A.STORE],
        [
          ["total_stake", u64()],
          ["active_validators", v(sys("validator", "Validator"))],
          [
            "pending_active_validators",
            d("0x2::table_vec::TableVec", sys("validator", "Validator")),
          ],
          ["pending_removals", v(u64())],
          ["staking_pool_mappings", table(id(), address())],
          [
            "inactive_validators",
            table(id(), sys("validator_wrapper", "ValidatorWrapper")),
          ],
          [
            "validator_candidates",
            table(address(), sys("validator_wrapper", "ValidatorWrapper")),
          ],
          ["at_risk_validators", d("0x2::vec_map::VecMap", address(), u64())],
          ["extra_fields", bag()],
        ],
      ),
      struct(
        system,
        "validator_wrapper",
        "ValidatorWrapper",
        [A.STORE],
        [["inner", d("0x2::versioned::Versioned")]],
      ),
      struct(
        system,
        "staking_pool",
        "StakingPool",
        [A.KEY, A.STORE],
        [
          ["id", uid()],
          ["activation_epoch", option(u64())],
          ["deactivation_epoch", option(u64())],
          ["rtd_balance", u64()],
          ["rewards_pool", balance()],
          ["pool_token_balance", u64()],
          [
            "exchange_rates",
            table(u64(), sys("staking_pool", "PoolTokenExchangeRate")),
          ],
          ...namedU64(
            "pending_stake",
            "pending_total_rtd_withdraw",
            "pending_pool_token_withdraw",
          ),
          ["extra_fields", bag()],
        ],
      ),
      struct(
        system,
        "staking_pool",
        "StakedRtd",
        [A.KEY, A.STORE],
        [
          ["id", uid()],
          ["pool_id", id()],
          ["stake_activation_epoch", u64()],
          ["principal", balance()],
        ],
      ),
      struct(
        system,
        "staking_pool",
        "PoolTokenExchangeRate",
        [A.COPY, A.DROP, A.STORE],
        namedU64("rtd_amount", "pool_token_amount"),
      ),
      struct(
        system,
        "storage_fund",
        "StorageFund",
        [A.STORE],
        [
          ["total_object_storage_rebates", balance()],
          ["non_refundable_balance", balance()],
        ],
      ),
      struct(
        system,
        "stake_subsidy",
        "StakeSubsidy",
        [A.STORE],
        [
          ["balance", balance()],
          ...namedU64(
            "distribution_counter",
            "current_distribution_amount",
            "stake_subsidy_period_length",
          ),
          ["stake_subsidy_decrease_rate", p(T.U16)],
          ["extra_fields", bag()],
        ],
      ),
    ],
    functions: [
      fn(
        "rtd_system",
        "request_add_stake",
        [
          arg(wrapper, R.MUTABLE),
          arg(d("0x2::coin::Coin", native())),
          arg(address()),
          ctx(),
        ],
        [],
        { entry: true },
      ),
      fn(
        "rtd_system",
        "request_withdraw_stake",
        [arg(wrapper, R.MUTABLE), arg(stake), ctx()],
        [],
        { entry: true },
      ),
    ],
  };
}

/** Fixed reader dependencies are reviewed from source; generic user payloads remain opaque. */
export function reviewedReaderContracts(): Pick<
  Record<string, WalletMoveGroupContract>,
  | "standardLibrary"
  | "readerSupport"
  | "coins"
  | "staking"
  | "dynamicFields"
  | "display"
> {
  return {
    standardLibrary: {
      state: "configured",
      contracts: [standardLibrary()],
      dependencies: [],
    },
    readerSupport: {
      state: "configured",
      contracts: [readerSupport()],
      dependencies: ["framework", "standardLibrary"],
    },
    coins: {
      state: "configured",
      contracts: [coins()],
      dependencies: ["framework"],
    },
    staking: {
      state: "configured",
      contracts: [staking()],
      dependencies: ["framework", "standardLibrary", "readerSupport", "coins"],
    },
    dynamicFields: {
      state: "configured",
      contracts: [
        {
          packageId: core,
          datatypes: [
            struct(
              core,
              "dynamic_field",
              "Field",
              [A.KEY],
              [
                ["id", uid()],
                ["name", param(0)],
                ["value", param(1)],
              ],
              [tp([A.COPY, A.DROP, A.STORE]), tp([A.STORE])],
            ),
            struct(
              core,
              "dynamic_object_field",
              "Wrapper",
              [A.COPY, A.DROP, A.STORE],
              [["name", param(0)]],
              [tp([])],
            ),
          ],
          functions: [],
        },
      ],
      dependencies: ["framework"],
    },
    display: {
      state: "configured",
      contracts: [
        {
          packageId: core,
          datatypes: [
            struct(
              core,
              "display_registry",
              "DisplayKey",
              [A.COPY, A.DROP, A.STORE],
              [["dummy_field", p(T.BOOL)]],
              [tp([], true)],
            ),
          ],
          functions: [],
        },
      ],
      dependencies: ["framework"],
    },
  };
}
export function nameMoveContract(packageId: string): WalletMovePackageContract {
  return {
    packageId,
    datatypes: [
      struct(
        packageId,
        "domain",
        "Domain",
        [A.COPY, A.DROP, A.STORE],
        [["labels", v(string())]],
      ),
      struct(
        packageId,
        "name_record",
        "NameRecord",
        [A.COPY, A.DROP, A.STORE],
        [
          ["nft_id", id()],
          ["expiration_timestamp_ms", u64()],
          ["target_address", option(address())],
          ["data", d("0x2::vec_map::VecMap", string(), string())],
        ],
      ),
    ],
    functions: [],
  };
}
