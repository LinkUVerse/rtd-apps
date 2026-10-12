// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { NetworkIdentityReport } from "./identity";
import { networkBindingKey, type ValidatedNetworkProfile } from "./profile";

type NativeRole = "fullnode" | "archive";
type Heights = Readonly<Partial<Record<NativeRole, string>>>;
export class WalletNetworkObservationError extends Error {
  constructor(readonly reason: "unavailable" | "corrupt" | "stale") {
    super(
      reason === "stale"
        ? "网络观察已更新，请重新查询或预览"
        : "网络校验记录不可用，已停止新交易",
    );
    this.name = "WalletNetworkObservationError";
  }
}
export class TransactionNetworkResetError extends Error {
  constructor(
    readonly role: NativeRole,
    readonly previousHeight: bigint,
    readonly observedHeight: bigint,
  ) {
    super("网络入口水位已倒退，已停止本次交易；请核对部署并更新网络绑定");
    this.name = "TransactionNetworkResetError";
  }
}
export interface NetworkObservationRecord {
  readonly schemaVersion: 1;
  readonly scope: string;
  readonly genesisDigest: string;
  readonly generation: string;
  readonly highest: Heights;
  readonly state: "observed" | "reset-required";
  readonly reset?: Readonly<{
    role: NativeRole;
    previousHeight: string;
    observedHeight: string;
  }>;
}
export interface NetworkObservationSnapshot {
  readonly scope: string;
  readonly existed: boolean;
  readonly highest: Heights;
}
export interface NetworkObservationStore {
  capture(
    profile: ValidatedNetworkProfile,
  ): Promise<NetworkObservationSnapshot>;
  observe(
    profile: ValidatedNetworkProfile,
    before: NetworkObservationSnapshot,
    report: NetworkIdentityReport,
  ): Promise<void>;
}
export function networkObservationScope(profile: ValidatedNetworkProfile) {
  return JSON.stringify([1, profile.expectedGenesisDigest, profile.generation]);
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new WalletNetworkObservationError("corrupt");
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, permitted: readonly string[]) {
  if (Object.keys(value).some((k) => !permitted.includes(k)))
    throw new WalletNetworkObservationError("corrupt");
}
function height(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^(0|[1-9][0-9]{0,19})$/.test(value) ||
    BigInt(value) > 0xffffffffffffffffn
  )
    throw new WalletNetworkObservationError("corrupt");
  return value;
}
function heights(value: unknown): Heights {
  const raw = object(value);
  keys(raw, ["fullnode", "archive"]);
  const result: Partial<Record<NativeRole, string>> = {};
  for (const role of ["fullnode", "archive"] as const)
    if (Object.hasOwn(raw, role)) result[role] = height(raw[role]);
  return Object.freeze(result);
}
export function validateNetworkObservation(
  profile: ValidatedNetworkProfile,
  value: unknown,
): NetworkObservationRecord | undefined {
  if (value === undefined) return undefined;
  const raw = object(value);
  keys(raw, [
    "schemaVersion",
    "scope",
    "genesisDigest",
    "generation",
    "highest",
    "state",
    "reset",
  ]);
  if (
    raw.schemaVersion !== 1 ||
    raw.scope !== networkObservationScope(profile) ||
    raw.genesisDigest !== profile.expectedGenesisDigest ||
    raw.generation !== profile.generation ||
    (raw.state !== "observed" && raw.state !== "reset-required")
  )
    throw new WalletNetworkObservationError("corrupt");
  const highest = heights(raw.highest);
  if (highest.fullnode === undefined)
    throw new WalletNetworkObservationError("corrupt");
  let reset: NetworkObservationRecord["reset"];
  if (raw.state === "reset-required") {
    const r = object(raw.reset);
    keys(r, ["role", "previousHeight", "observedHeight"]);
    if (r.role !== "fullnode" && r.role !== "archive")
      throw new WalletNetworkObservationError("corrupt");
    const previousHeight = height(r.previousHeight),
      observedHeight = height(r.observedHeight);
    if (
      highest[r.role] === undefined ||
      BigInt(observedHeight) >= BigInt(previousHeight) ||
      BigInt(previousHeight) > BigInt(highest[r.role]!)
    )
      throw new WalletNetworkObservationError("corrupt");
    reset = Object.freeze({ role: r.role, previousHeight, observedHeight });
  } else if (raw.reset !== undefined)
    throw new WalletNetworkObservationError("corrupt");
  return Object.freeze({
    schemaVersion: 1,
    scope: networkObservationScope(profile),
    genesisDigest: profile.expectedGenesisDigest,
    generation: profile.generation,
    highest,
    state: raw.state as NetworkObservationRecord["state"],
    ...(reset ? { reset } : {}),
  });
}
export function networkObservationReset(
  record: NetworkObservationRecord,
): TransactionNetworkResetError | undefined {
  const r = record.reset;
  return r
    ? new TransactionNetworkResetError(
        r.role,
        BigInt(r.previousHeight),
        BigInt(r.observedHeight),
      )
    : undefined;
}
export function captureNetworkObservation(
  profile: ValidatedNetworkProfile,
  value: unknown,
): NetworkObservationSnapshot {
  const row = validateNetworkObservation(profile, value);
  const reset = row && networkObservationReset(row);
  if (reset) throw reset;
  return Object.freeze({
    scope: networkObservationScope(profile),
    existed: !!row,
    highest: row?.highest ?? Object.freeze({}),
  });
}
export type ObservationDecision = Readonly<{
  kind: "accepted" | "reset-required" | "stale";
  next?: NetworkObservationRecord;
  reset?: TransactionNetworkResetError;
}>;
/** Reconcile inside the storage transaction. A concurrent newer read is not proof of a reset. */
export function reconcileNetworkObservation(
  profile: ValidatedNetworkProfile,
  before: NetworkObservationSnapshot,
  report: NetworkIdentityReport,
  currentValue: unknown,
): ObservationDecision {
  const snapshot = object(before);
  keys(snapshot, ["scope", "existed", "highest"]);
  if (
    snapshot.scope !== networkObservationScope(profile) ||
    typeof snapshot.existed !== "boolean"
  )
    throw new WalletNetworkObservationError("corrupt");
  const previous = heights(snapshot.highest);
  if (snapshot.existed !== (previous.fullnode !== undefined))
    throw new WalletNetworkObservationError("corrupt");
  const current = validateNetworkObservation(profile, currentValue);
  if (snapshot.existed && !current)
    throw new WalletNetworkObservationError("corrupt");
  if (current) {
    const reset = networkObservationReset(current);
    if (reset) return Object.freeze({ kind: "reset-required", reset });
    for (const role of ["fullnode", "archive"] as const)
      if (
        previous[role] !== undefined &&
        (current.highest[role] === undefined ||
          BigInt(current.highest[role]!) < BigInt(previous[role]!))
      )
        throw new WalletNetworkObservationError("corrupt");
  }
  if (
    report.bindingKey !== networkBindingKey(profile) ||
    report.endpoints.length !== 3 ||
    new Set(report.endpoints.map((e) => e.role)).size !== 3 ||
    !report.endpoints.every((e) =>
      ["fullnode", "graphql", "archive"].includes(e.role),
    ) ||
    report.endpoints.find((e) => e.role === "fullnode")?.state !== "verified"
  )
    throw new WalletNetworkObservationError("corrupt");
  const observed: Partial<Record<NativeRole, string>> = {};
  for (const endpoint of report.endpoints) {
    if (endpoint.state !== "verified") continue;
    if (endpoint.genesisDigest !== profile.expectedGenesisDigest)
      throw new WalletNetworkObservationError("corrupt");
    if (endpoint.role === "graphql") continue;
    if (
      typeof endpoint.checkpointHeight !== "bigint" ||
      endpoint.checkpointHeight < 0n ||
      endpoint.checkpointHeight > 0xffffffffffffffffn
    )
      throw new WalletNetworkObservationError("corrupt");
    observed[endpoint.role] = endpoint.checkpointHeight.toString();
  }
  const base = current ?? {
    schemaVersion: 1 as const,
    scope: networkObservationScope(profile),
    genesisDigest: profile.expectedGenesisDigest,
    generation: profile.generation,
    highest: {},
    state: "observed" as const,
  };
  for (const role of ["fullnode", "archive"] as const) {
    if (
      observed[role] !== undefined &&
      previous[role] !== undefined &&
      BigInt(observed[role]!) < BigInt(previous[role]!)
    ) {
      const reset = Object.freeze({
        role,
        previousHeight: previous[role]!,
        observedHeight: observed[role]!,
      });
      const next = validateNetworkObservation(profile, {
        ...base,
        state: "reset-required",
        reset,
      })!;
      return Object.freeze({
        kind: "reset-required",
        next,
        reset: networkObservationReset(next),
      });
    }
  }
  for (const role of ["fullnode", "archive"] as const)
    if (
      observed[role] !== undefined &&
      current?.highest[role] !== undefined &&
      BigInt(observed[role]!) < BigInt(current.highest[role]!)
    )
      return Object.freeze({ kind: "stale" });
  const next = validateNetworkObservation(profile, {
    ...base,
    highest: { ...base.highest, ...observed },
  })!;
  return Object.freeze({ kind: "accepted", next });
}
