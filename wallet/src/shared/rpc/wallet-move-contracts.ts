// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { GrpcTypes } from "rtd-typescript/grpc";
import {
  T,
  A,
  R,
  primitive,
  param,
  datatype,
  vector,
  argument,
  typeParameter,
  struct,
  fn,
} from "./move-contract-template";
import {
  reviewedReaderContracts,
  nameMoveContract,
} from "./wallet-reader-move-contracts";
import { walletAddress } from "./asset-address";
import type { ValidatedNetworkProfile } from "./profile";

export type WalletMoveContractGroup =
  | "standardLibrary"
  | "readerSupport"
  | "coins"
  | "staking"
  | "dynamicFields"
  | "display"
  | "framework"
  | "kiosk"
  | "personalKiosk"
  | "originByteDiscovery"
  | "originByteExecution"
  | "names";
export interface WalletMovePackageContract {
  readonly packageId: string;
  readonly datatypes: readonly GrpcTypes.DatatypeDescriptor[];
  readonly functions: readonly {
    module: string;
    descriptor: GrpcTypes.FunctionDescriptor;
  }[];
}
export type WalletMoveGroupContract = Readonly<
  | { state: "unconfigured" }
  | { state: "unsupported"; reason: "contract-not-reviewed" | "kiosk-package" }
  | {
      state: "configured";
      contracts: readonly WalletMovePackageContract[];
      dependencies: readonly WalletMoveContractGroup[];
    }
>;
const core = walletAddress("0x2"),
  std = walletAddress("0x1");
const uid = datatype("0x2::object::UID"),
  id = datatype("0x2::object::ID"),
  kiosk = datatype("0x2::kiosk::Kiosk"),
  cap = datatype("0x2::kiosk::KioskOwnerCap");
function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value && typeof value === "object" && !seen.has(value)) {
    seen.add(value);
    for (const child of Object.values(value)) deepFreeze(child, seen);
    Object.freeze(value);
  }
  return value;
}
function kioskContract(): WalletMovePackageContract {
  return {
    packageId: core,
    datatypes: [
      struct(
        core,
        "kiosk",
        "Kiosk",
        [A.KEY, A.STORE],
        [
          ["id", uid],
          [
            "profits",
            datatype("0x2::balance::Balance", datatype("0x2::rtd::RTD")),
          ],
          ["owner", primitive(T.ADDRESS)],
          ["item_count", primitive(T.U32)],
          ["allow_extensions", primitive(T.BOOL)],
        ],
      ),
      struct(
        core,
        "kiosk",
        "KioskOwnerCap",
        [A.KEY, A.STORE],
        [
          ["id", uid],
          ["for", id],
        ],
      ),
      struct(core, "kiosk", "Item", [A.COPY, A.DROP, A.STORE], [["id", id]]),
      struct(
        core,
        "kiosk",
        "Listing",
        [A.COPY, A.DROP, A.STORE],
        [
          ["id", id],
          ["is_exclusive", primitive(T.BOOL)],
        ],
      ),
      struct(core, "kiosk", "Lock", [A.COPY, A.DROP, A.STORE], [["id", id]]),
    ],
    functions: [
      fn(
        "kiosk",
        "take",
        [argument(kiosk, R.MUTABLE), argument(cap, R.IMMUTABLE), argument(id)],
        [argument(param(0))],
        { generic: true },
      ),
    ],
  };
}
function frameworkContract(): WalletMovePackageContract {
  return {
    packageId: core,
    datatypes: [
      struct(
        core,
        "object",
        "ID",
        [A.COPY, A.DROP, A.STORE],
        [["bytes", primitive(T.ADDRESS)]],
      ),
      struct(core, "object", "UID", [A.STORE], [["id", id]]),
      struct(
        core,
        "balance",
        "Balance",
        [A.STORE],
        [["value", primitive(T.U64)]],
        [typeParameter([], true)],
      ),
      struct(
        core,
        "vec_set",
        "VecSet",
        [A.COPY, A.DROP, A.STORE],
        [["contents", vector(param(0))]],
        [typeParameter([A.COPY, A.DROP])],
      ),
      struct(
        core,
        "table",
        "Table",
        [A.KEY, A.STORE],
        [
          ["id", uid],
          ["size", primitive(T.U64)],
        ],
        [
          typeParameter([A.COPY, A.DROP, A.STORE], true),
          typeParameter([A.STORE], true),
        ],
      ),
      struct(
        core,
        "rtd",
        "RTD",
        [A.DROP],
        [["dummy_field", primitive(T.BOOL)]],
      ),
      struct(
        core,
        "tx_context",
        "TxContext",
        [A.DROP],
        [
          ["sender", primitive(T.ADDRESS)],
          ["tx_hash", vector(primitive(T.U8))],
          ["epoch", primitive(T.U64)],
          ["epoch_timestamp_ms", primitive(T.U64)],
          ["ids_created", primitive(T.U64)],
        ],
      ),
    ],
    functions: [],
  };
}
/** Authored from the reviewed Move/BCS sources, never from a runtime GetPackage response. */
export function walletMoveContracts(
  profile: ValidatedNetworkProfile,
): Readonly<Record<WalletMoveContractGroup, WalletMoveGroupContract>> {
  const groups: Record<WalletMoveContractGroup, WalletMoveGroupContract> = {
    ...reviewedReaderContracts(),
    framework: {
      state: "configured",
      contracts: [frameworkContract()],
      dependencies: [],
    },
    kiosk: profile.packages.kiosk
      ? profile.packages.kiosk === core
        ? {
            state: "configured",
            contracts: [kioskContract()],
            dependencies: ["framework"],
          }
        : { state: "unsupported", reason: "kiosk-package" }
      : { state: "unconfigured" },
    personalKiosk: { state: "unconfigured" },
    originByteDiscovery: { state: "unconfigured" },
    originByteExecution: { state: "unconfigured" },
    names: profile.packages.name
      ? {
          state: "configured",
          contracts: [nameMoveContract(profile.packages.name.packageId)],
          dependencies: [
            "framework",
            "standardLibrary",
            "readerSupport",
            "dynamicFields",
          ],
        }
      : { state: "unconfigured" },
  };
  const pk = profile.packages.personalKiosk;
  if (pk) {
    const personal = datatype(`${pk}::personal_kiosk::PersonalKioskCap`),
      borrow = datatype(`${pk}::personal_kiosk::Borrow`);
    groups.personalKiosk = {
      state: "configured",
      dependencies: ["framework", "kiosk", "standardLibrary"],
      contracts: [
        kioskContract(),
        {
          packageId: std,
          datatypes: [
            struct(
              std,
              "option",
              "Option",
              [A.COPY, A.DROP, A.STORE],
              [["vec", vector(param(0))]],
              [typeParameter([])],
            ),
          ],
          functions: [],
        },
        {
          packageId: pk,
          datatypes: [
            struct(
              pk,
              "personal_kiosk",
              "PersonalKioskCap",
              [A.KEY],
              [
                ["id", uid],
                ["cap", datatype("0x1::option::Option", cap)],
              ],
            ),
            struct(
              pk,
              "personal_kiosk",
              "Borrow",
              [],
              [
                ["cap_id", id],
                ["owned_id", id],
              ],
            ),
          ],
          functions: [
            fn(
              "personal_kiosk",
              "borrow_val",
              [argument(personal, R.MUTABLE)],
              [argument(cap), argument(borrow)],
            ),
            fn(
              "personal_kiosk",
              "return_val",
              [argument(personal, R.MUTABLE), argument(cap), argument(borrow)],
              [],
            ),
          ],
        },
      ],
    };
  }
  const ob = profile.packages.originByte;
  if (ob) {
    const key = (name: string) =>
      struct(
        ob.discoveryPackage,
        "ob_kiosk",
        name,
        [A.COPY, A.DROP, A.STORE],
        [["dummy_field", primitive(T.BOOL)]],
      );
    groups.originByteDiscovery = {
      state: "configured",
      dependencies: ["framework"],
      contracts: [
        kioskContract(),
        {
          packageId: ob.discoveryPackage,
          datatypes: [
            struct(
              ob.discoveryPackage,
              "ob_kiosk",
              "OwnerToken",
              [A.KEY],
              [
                ["id", uid],
                ["kiosk", id],
                ["owner", primitive(T.ADDRESS)],
              ],
            ),
            struct(
              ob.discoveryPackage,
              "ob_kiosk",
              "NftRef",
              [A.DROP, A.STORE],
              [
                [
                  "auths",
                  datatype("0x2::vec_set::VecSet", primitive(T.ADDRESS)),
                ],
                ["is_exclusively_listed", primitive(T.BOOL)],
              ],
            ),
            key("VersionDfKey"),
            key("NftRefsDfKey"),
            key("KioskOwnerCapDfKey"),
          ],
          functions: [],
        },
      ],
    };
    const ctx = argument(datatype("0x2::tx_context::TxContext"), R.MUTABLE);
    groups.originByteExecution = {
      state: "configured",
      dependencies: ["framework", "originByteDiscovery"],
      contracts: [
        {
          packageId: ob.executionPackage,
          datatypes: [],
          functions: [
            fn(
              "ob_kiosk",
              "p2p_transfer",
              [
                argument(kiosk, R.MUTABLE),
                argument(kiosk, R.MUTABLE),
                argument(id),
                ctx,
              ],
              [],
              { private: true, entry: true, generic: true },
            ),
            fn(
              "ob_kiosk",
              "p2p_transfer_and_create_target_kiosk",
              [
                argument(kiosk, R.MUTABLE),
                argument(primitive(T.ADDRESS)),
                argument(id),
                ctx,
              ],
              [argument(id), argument(id)],
              { private: true, entry: true, generic: true },
            ),
          ],
        },
      ],
    };
  }
  // Templates stay private per invocation; callers receive no shared mutable runtime expectations.
  return deepFreeze(groups);
}
