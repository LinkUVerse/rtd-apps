// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { approvedTransaction } from "./execution-reader";
import type { ValidatedNetworkProfile } from "./profile";
import { walletAddress } from "./asset-address";
import {
  walletMoveContracts,
  type WalletMoveContractGroup,
} from "./wallet-move-contracts";
import type { NetworkAdmissionArea } from "./network-admission-state";

/** Only authored action modules own a transaction target; copied reader descriptors do not. */
const actionModules = {
  coins: "coin",
  staking: "rtd_system",
  kiosk: "kiosk",
  personalKiosk: "personal_kiosk",
  originByteExecution: "ob_kiosk",
} as const;
export interface TransactionMoveDependencies {
  readonly scope: "fixed-approved-authored-targets";
  readonly areas: readonly NetworkAdmissionArea[];
  readonly groups: readonly WalletMoveContractGroup[];
  readonly reviewedCalls: number;
  readonly nativeCommands: number;
  readonly opaqueCommands: number;
  readonly customMoveTypes: "opaque";
  readonly builtinSemantics: "sdk-pinned";
}

/** No IO, runtime ABI inference, package-wide matching, or user-supplied dependency list. */
export function transactionMoveDependencies(
  profile: ValidatedNetworkProfile,
  bytesBase64: string,
  sender: string,
): TransactionMoveDependencies {
  const { transaction } = approvedTransaction(bytesBase64, sender);
  const contracts = walletMoveContracts(profile),
    selected = new Set<WalletMoveContractGroup>();
  let reviewedCalls = 0,
    nativeCommands = 0,
    opaqueCommands = 0;
  for (const command of transaction.commands) {
    if (command.$kind !== "MoveCall") {
      if (
        ["SplitCoins", "MergeCoins", "TransferObjects", "MakeMoveVec"].includes(
          command.$kind,
        )
      )
        nativeCommands++;
      else opaqueCommands++;
      continue;
    }
    const call = command.MoveCall;
    const matches = (
      Object.entries(actionModules) as [keyof typeof actionModules, string][]
    ).filter(([group, module]) => {
      const contract = contracts[group];
      return (
        call.module === module &&
        contract.state === "configured" &&
        contract.contracts.some(
          (pkg) =>
            pkg.packageId === walletAddress(call.package) &&
            pkg.functions.some(
              (fn) =>
                fn.module === call.module &&
                fn.descriptor.name === call.function,
            ),
        )
      );
    });
    if (matches.length !== 1) {
      opaqueCommands++;
      continue;
    }
    reviewedCalls++;
    const visit = (group: WalletMoveContractGroup): void => {
      if (selected.has(group)) return;
      selected.add(group);
      const contract = contracts[group];
      if (contract.state === "configured") contract.dependencies.forEach(visit);
    };
    visit(matches[0][0]);
  }
  const groups = Object.freeze([...selected].sort());
  return Object.freeze({
    scope: "fixed-approved-authored-targets",
    groups,
    areas: Object.freeze(
      groups.map((group) =>
        Object.freeze({ kind: "move-group" as const, group }),
      ),
    ),
    reviewedCalls,
    nativeCommands,
    opaqueCommands,
    customMoveTypes: "opaque",
    builtinSemantics: "sdk-pinned",
  });
}
