// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { RtdClientTypes } from "rtd-typescript/client";
import { bcs } from "rtd-typescript/bcs";
import {
  normalizeRtdAddress,
  normalizeStructTag,
  parseStructTag,
  toBase64,
} from "rtd-typescript/utils";
import type { WalletReceiptTransaction } from "./WalletRpcContext";

export interface WalletBalanceChange {
  coinType: string;
  amount: string;
  owner?: string;
  unRecognizedToken: boolean;
}
export type WalletBalanceChanges = Record<string, WalletBalanceChange[]> | null;
export interface WalletGasSummary extends RtdClientTypes.GasCostSummary {
  totalGas: string;
  owner: string;
  isSponsored: boolean;
  gasUsed: RtdClientTypes.GasCostSummary;
}
export function receiptBalanceChanges(
  transaction: Pick<WalletReceiptTransaction, "balanceChanges">,
  recognized: readonly string[],
): WalletBalanceChanges {
  const packages = new Set(
    recognized.map((value) => normalizeRtdAddress(value)),
  );
  const groups: Record<string, WalletBalanceChange[]> = {};
  for (const item of transaction.balanceChanges) {
    const owner = normalizeRtdAddress(item.address);
    const coinType = normalizeStructTag(item.coinType);
    const group = (groups[owner] ??= []);
    const existing = group.find((change) => change.coinType === coinType);
    if (existing)
      existing.amount = (
        BigInt(existing.amount) + BigInt(item.amount)
      ).toString();
    else
      group.push({
        owner,
        coinType,
        amount: BigInt(item.amount).toString(),
        unRecognizedToken: !packages.has(parseStructTag(coinType).address),
      });
  }
  // Balance changes are accounting facts, not proof that a matched opposite amount is a recipient.
  return Object.keys(groups).length ? groups : null;
}
export function splitRecognizedChanges(changes: WalletBalanceChange[]) {
  return {
    recognizedTokenChanges: changes.filter(
      (change) => !change.unRecognizedToken,
    ),
    unRecognizedTokenChanges: changes.filter(
      (change) => change.unRecognizedToken,
    ),
  };
}
export function receiptGas(
  transaction: WalletReceiptTransaction,
): WalletGasSummary {
  const gasUsed = transaction.effects.gasUsed;
  return {
    ...gasUsed,
    gasUsed,
    totalGas: (
      BigInt(gasUsed.computationCost) +
      BigInt(gasUsed.storageCost) -
      BigInt(gasUsed.storageRebate)
    ).toString(),
    owner: transaction.transaction.gasData.owner!,
    isSponsored:
      transaction.transaction.gasData.owner !== transaction.transaction.sender,
  };
}

export interface WalletObjectEffect {
  readonly objectId: string;
  readonly objectType: string | null;
  readonly operation: "Created" | "Deleted" | "None";
  readonly inputOwner: string | null;
  readonly outputOwner: string | null;
  readonly outputState:
    | "NotExist"
    | "ObjectWrite"
    | "PackageWrite"
    | "AccumulatorWriteV1";
  readonly version: string | null;
  readonly objectDigest?: string | null;
}
type ParsedEffects = ReturnType<typeof bcs.TransactionEffects.parse>;
type ParsedOwner = ReturnType<typeof bcs.Owner.parse>;
function ownerText(owner: ParsedOwner): string {
  switch (owner.$kind) {
    case "AddressOwner":
      return owner.AddressOwner;
    case "ObjectOwner":
      return owner.ObjectOwner;
    case "ConsensusAddressOwner":
      return owner.ConsensusAddressOwner.owner;
    case "Shared":
      return "Shared";
    case "Immutable":
      return "Immutable";
  }
}
export function receiptObjectEffects(
  transaction: Pick<WalletReceiptTransaction, "effects" | "objectTypes">,
): readonly WalletObjectEffect[] {
  const parsed: ParsedEffects = bcs.TransactionEffects.parse(
    transaction.effects.bcs!,
  );
  if (parsed.$kind === "V2")
    return parsed.V2.changedObjects.map(([objectId, change]) => {
      const output = change.outputState;
      return {
        objectId,
        objectType: transaction.objectTypes[objectId] ?? null,
        operation: change.idOperation.$kind,
        inputOwner:
          change.inputState.$kind === "Exist"
            ? ownerText(change.inputState.Exist[1])
            : null,
        outputOwner:
          output.$kind === "ObjectWrite"
            ? ownerText(output.ObjectWrite[1])
            : output.$kind === "PackageWrite"
              ? "Immutable"
              : null,
        outputState: output.$kind,
        objectDigest: output.$kind === "ObjectWrite" ? output.ObjectWrite[0] : output.$kind === "PackageWrite" ? output.PackageWrite[1] : null,
        version:
          output.$kind === "ObjectWrite"
            ? parsed.V2!.lamportVersion
            : output.$kind === "PackageWrite"
              ? output.PackageWrite[0]
              : null,
      };
    });
  // V1 owns distinct created/mutated/unwrapped/deleted/wrapped sets; preserve all effects IDs.
  const result: WalletObjectEffect[] = [];
  for (const [key, operation] of [
    ["created", "Created"],
    ["mutated", "None"],
    ["unwrapped", "None"],
  ] as const)
    for (const [ref, owner] of parsed.V1[key])
      result.push({
        objectId: ref.objectId,
        objectType: transaction.objectTypes[ref.objectId] ?? null,
        operation,
        inputOwner: null,
        outputOwner: ownerText(owner),
        outputState: "ObjectWrite",
        version: ref.version,
        objectDigest: ref.digest,
      });
  for (const key of ["deleted", "unwrappedThenDeleted", "wrapped"] as const)
    for (const ref of parsed.V1[key])
      result.push({
        objectId: ref.objectId,
        objectType: transaction.objectTypes[ref.objectId] ?? null,
        operation: key === "wrapped" ? "None" : "Deleted",
        inputOwner: null,
        outputOwner: null,
        outputState: "NotExist",
        version: ref.version,
      });
  return result;
}

export const StakeEventBcs = bcs.struct("StakingRequestEvent", {
  poolId: bcs.Address,
  validatorAddress: bcs.Address,
  stakerAddress: bcs.Address,
  epoch: bcs.u64(),
  amount: bcs.u64(),
});
export const UnstakeEventBcs = bcs.struct("UnstakingRequestEvent", {
  poolId: bcs.Address,
  validatorAddress: bcs.Address,
  stakerAddress: bcs.Address,
  stakeActivationEpoch: bcs.u64(),
  unstakingEpoch: bcs.u64(),
  principalAmount: bcs.u64(),
  rewardAmount: bcs.u64(),
});
export type WalletStakeEvent =
  | ({ kind: "stake"; index: number } & ReturnType<typeof StakeEventBcs.parse>)
  | ({ kind: "unstake"; index: number } & ReturnType<
      typeof UnstakeEventBcs.parse
    >);
export function receiptStakeEvents(
  transaction: WalletReceiptTransaction,
  currentAddress: string,
): WalletStakeEvent[] {
  const address = normalizeRtdAddress(currentAddress);
  const result: WalletStakeEvent[] = [];
  transaction.events.forEach((event, index) => {
    const type = normalizeStructTag(event.eventType);
    if (type === normalizeStructTag("0x3::validator::StakingRequestEvent")) {
      const body = StakeEventBcs.parse(event.bcs);
      if (
        toBase64(StakeEventBcs.serialize(body).toBytes()) !==
        toBase64(event.bcs)
      )
        throw new Error("质押事件BCS不完整");
      if (body.stakerAddress === address)
        result.push({ kind: "stake", index, ...body });
    } else if (
      type === normalizeStructTag("0x3::validator::UnstakingRequestEvent")
    ) {
      const body = UnstakeEventBcs.parse(event.bcs);
      if (
        toBase64(UnstakeEventBcs.serialize(body).toBytes()) !==
        toBase64(event.bcs)
      )
        throw new Error("赎回事件BCS不完整");
      if (body.stakerAddress === address)
        result.push({ kind: "unstake", index, ...body });
    }
  });
  return result;
}
