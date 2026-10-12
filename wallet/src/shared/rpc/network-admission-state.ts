// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type {
  WalletGraphQLCapabilityDomain,
  WalletMoveCapabilityGroup,
} from "rtd-apps-core/src/rpc/capability-types";
import {
  networkBindingKey,
  type EndpointRole,
  type ValidatedNetworkProfile,
} from "./profile";

const roles = {
  fullnode: true,
  graphql: true,
  archive: true,
  accountHistory: true,
} as const satisfies Record<EndpointRole, true>;
const domains = {
  balances: true,
  coinMetadata: true,
  staking: true,
  assets: true,
  names: true,
  sentTransactions: true,
  eventsByType: true,
  eventsByModule: true,
} as const satisfies Record<WalletGraphQLCapabilityDomain, true>;
const groups = {
  standardLibrary: true,
  readerSupport: true,
  coins: true,
  staking: true,
  dynamicFields: true,
  display: true,
  framework: true,
  kiosk: true,
  personalKiosk: true,
  originByteDiscovery: true,
  originByteExecution: true,
  names: true,
} as const satisfies Record<WalletMoveCapabilityGroup, true>;
export type NetworkAdmissionArea = Readonly<
  | { kind: "identity"; role: EndpointRole }
  | { kind: "graphql-domain"; domain: WalletGraphQLCapabilityDomain }
  | { kind: "move-group"; group: WalletMoveCapabilityGroup }
>;
export type NetworkAdmissionFault = Readonly<
  | {
      kind: "identity";
      role: EndpointRole;
      reason: "chain-mismatch" | "incompatible";
    }
  | {
      kind: "graphql-domain";
      domain: WalletGraphQLCapabilityDomain;
      reason: "schema";
    }
  | { kind: "move-group"; group: WalletMoveCapabilityGroup; reason: "abi" }
>;
export interface NetworkAdmissionTicket {
  readonly id: string;
  readonly areas: readonly NetworkAdmissionArea[];
}
export interface NetworkAdmissionRecord {
  readonly schemaVersion: 1;
  readonly bindingKey: string;
  readonly faults: readonly NetworkAdmissionFault[];
  readonly pending: readonly NetworkAdmissionTicket[];
}
export class WalletNetworkAdmissionStateError extends Error {
  constructor(readonly reason: "corrupt" | "budget" | "stale" | "unavailable") {
    super("网络准入记录未通过精确合同，已停止本次操作");
    this.name = "WalletNetworkAdmissionStateError";
  }
}
export class WalletNetworkAdmissionBlockedError extends Error {
  constructor(readonly reason: "quarantined" | "reviewing") {
    super(
      reason === "quarantined"
        ? "当前网络绑定已有未解除的负面记录"
        : "当前查询范围尚有未完成的身份或合同观察",
    );
    this.name = "WalletNetworkAdmissionBlockedError";
  }
}
function fail(
  reason: WalletNetworkAdmissionStateError["reason"] = "corrupt",
): never {
  throw new WalletNetworkAdmissionStateError(reason);
}
function object(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getOwnPropertyNames(value).length !== keys.length ||
    Object.getOwnPropertySymbols(value).length ||
    keys.some((k) => !Object.hasOwn(value, k))
  )
    fail();
  return value as Record<string, unknown>;
}
function member<T extends string>(value: unknown, options: Record<T, true>): T {
  if (typeof value !== "string" || !Object.hasOwn(options, value)) fail();
  return value as T;
}
function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
export function validateNetworkAdmissionArea(
  value: unknown,
): NetworkAdmissionArea {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail();
  const kind = (value as Record<string, unknown>).kind;
  if (kind === "identity") {
    const row = object(value, ["kind", "role"]);
    return Object.freeze({ kind, role: member(row.role, roles) });
  }
  if (kind === "graphql-domain") {
    const row = object(value, ["kind", "domain"]);
    return Object.freeze({ kind, domain: member(row.domain, domains) });
  }
  if (kind === "move-group") {
    const row = object(value, ["kind", "group"]);
    return Object.freeze({ kind, group: member(row.group, groups) });
  }
  return fail();
}
export function validateNetworkAdmissionFault(
  value: unknown,
): NetworkAdmissionFault {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail();
  const kind = (value as Record<string, unknown>).kind;
  if (kind === "identity") {
    const row = object(value, ["kind", "role", "reason"]);
    if (row.reason !== "chain-mismatch" && row.reason !== "incompatible")
      fail();
    return Object.freeze({
      kind,
      role: member(row.role, roles),
      reason: row.reason,
    });
  }
  if (kind === "graphql-domain") {
    const row = object(value, ["kind", "domain", "reason"]);
    if (row.reason !== "schema") fail();
    return Object.freeze({
      kind,
      domain: member(row.domain, domains),
      reason: row.reason,
    });
  }
  if (kind === "move-group") {
    const row = object(value, ["kind", "group", "reason"]);
    if (row.reason !== "abi") fail();
    return Object.freeze({
      kind,
      group: member(row.group, groups),
      reason: row.reason,
    });
  }
  return fail();
}
export function networkAdmissionAreaKey(value: NetworkAdmissionArea): string {
  return JSON.stringify([
    value.kind,
    value.kind === "identity"
      ? value.role
      : value.kind === "graphql-domain"
        ? value.domain
        : value.group,
  ]);
}
function faultKey(value: NetworkAdmissionFault): string {
  return JSON.stringify([networkAdmissionAreaKey(value), value.reason]);
}
function uniqueSorted<T>(rows: T[], key: (row: T) => string): T[] {
  const seen = new Set<string>();
  for (const row of rows) {
    const id = key(row);
    if (seen.has(id)) fail();
    seen.add(id);
  }
  return rows.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
}
function areas(
  value: unknown,
  allowEmpty = false,
): readonly NetworkAdmissionArea[] {
  if (!Array.isArray(value) || (!allowEmpty && !value.length)) fail();
  if (value.length > 24) fail("budget");
  return Object.freeze(
    uniqueSorted(
      value.map(validateNetworkAdmissionArea),
      networkAdmissionAreaKey,
    ),
  );
}
export function validateNetworkAdmissionTicket(
  value: unknown,
): NetworkAdmissionTicket {
  const row = object(value, ["id", "areas"]);
  if (
    typeof row.id !== "string" ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      row.id,
    )
  )
    fail();
  return freeze({ id: row.id, areas: areas(row.areas) });
}
export function createNetworkAdmissionTicket(
  targets: readonly NetworkAdmissionArea[],
): NetworkAdmissionTicket {
  return validateNetworkAdmissionTicket({
    id: crypto.randomUUID(),
    areas: targets,
  });
}
function faults(value: unknown): readonly NetworkAdmissionFault[] {
  if (!Array.isArray(value)) fail();
  if (value.length > 28) fail("budget");
  return Object.freeze(
    uniqueSorted(value.map(validateNetworkAdmissionFault), faultKey),
  );
}
function boundedBinding(profile: ValidatedNetworkProfile) {
  const value = networkBindingKey(profile);
  if (new TextEncoder().encode(value).length > 65536) fail("budget");
  return value;
}
function record(
  profile: ValidatedNetworkProfile,
  fs: readonly NetworkAdmissionFault[],
  pending: readonly NetworkAdmissionTicket[],
): NetworkAdmissionRecord {
  if (pending.length > 32 || fs.length > 28) fail("budget");
  const value = freeze({
    schemaVersion: 1 as const,
    bindingKey: boundedBinding(profile),
    faults: fs,
    pending,
  });
  if (new TextEncoder().encode(JSON.stringify(value)).length > 131072)
    fail("budget");
  return value;
}
/** Detached exact stored value. An absent/empty row is never an authorization or readiness proof. */
export function validateNetworkAdmissionRecord(
  profile: ValidatedNetworkProfile,
  value: unknown,
): NetworkAdmissionRecord | undefined {
  boundedBinding(profile);
  if (value === undefined) return undefined;
  const row = object(value, [
    "schemaVersion",
    "bindingKey",
    "faults",
    "pending",
  ]);
  if (typeof row.bindingKey !== "string") fail();
  if (new TextEncoder().encode(row.bindingKey).length > 65536) fail("budget");
  if (
    row.schemaVersion !== 1 ||
    row.bindingKey !== networkBindingKey(profile) ||
    !Array.isArray(row.pending)
  )
    fail();
  if (row.pending.length > 32) fail("budget");
  const fs = faults(row.faults),
    ps = uniqueSorted(
      row.pending.map(validateNetworkAdmissionTicket),
      (t) => t.id,
    );
  const occupied = new Set<string>();
  for (const ticket of ps)
    for (const area of ticket.areas) {
      const key = networkAdmissionAreaKey(area);
      if (occupied.has(key)) fail();
      occupied.add(key);
    }
  if (
    JSON.stringify(row.faults) !== JSON.stringify(fs) ||
    JSON.stringify(row.pending) !== JSON.stringify(ps)
  )
    fail();
  return record(profile, fs, Object.freeze(ps));
}
function applies(
  area: NetworkAdmissionArea,
  targets: readonly NetworkAdmissionArea[],
) {
  return (
    area.kind === "identity" ||
    targets.some(
      (t) => networkAdmissionAreaKey(t) === networkAdmissionAreaKey(area),
    )
  );
}
/** Negative admission check only; callers must still prove current identity/facts and recheck before publication. */
export function assertNetworkAdmissionClear(
  profile: ValidatedNetworkProfile,
  value: unknown,
  targets: readonly NetworkAdmissionArea[] = [],
) {
  const selected = areas(targets, true),
    row = validateNetworkAdmissionRecord(profile, value);
  if (!row) return;
  if (row.faults.some((f) => applies(f, selected)))
    throw new WalletNetworkAdmissionBlockedError("quarantined");
  if (row.pending.some((t) => t.areas.some((a) => applies(a, selected))))
    throw new WalletNetworkAdmissionBlockedError("reviewing");
}
/** Called inside the storage transaction, before starting observation IO. */
export function reserveNetworkAdmissionObservation(
  profile: ValidatedNetworkProfile,
  value: unknown,
  input: NetworkAdmissionTicket,
): NetworkAdmissionRecord {
  const ticket = validateNetworkAdmissionTicket(input),
    row = validateNetworkAdmissionRecord(profile, value);
  if (row?.pending.some((t) => t.id === ticket.id)) fail("stale");
  assertNetworkAdmissionClear(profile, row, ticket.areas);
  return record(
    profile,
    row?.faults ?? Object.freeze([]),
    Object.freeze(uniqueSorted([...(row?.pending ?? []), ticket], (t) => t.id)),
  );
}
/** Merge into the current transactional value. Never clear another observation or any confirmed fault. */
export function completeNetworkAdmissionObservation(
  profile: ValidatedNetworkProfile,
  value: unknown,
  input: NetworkAdmissionTicket,
  observed: readonly NetworkAdmissionFault[],
): NetworkAdmissionRecord {
  const ticket = validateNetworkAdmissionTicket(input),
    added = faults(observed),
    row = validateNetworkAdmissionRecord(profile, value);
  const saved = row?.pending.find((t) => t.id === ticket.id);
  if (!row || !saved) fail("stale");
  if (
    JSON.stringify(saved) !== JSON.stringify(ticket) ||
    added.some(
      (f) =>
        !ticket.areas.some(
          (a) => networkAdmissionAreaKey(a) === networkAdmissionAreaKey(f),
        ),
    )
  )
    fail();
  const merged = new Map(row.faults.map((f) => [faultKey(f), f]));
  for (const f of added) merged.set(faultKey(f), f);
  return record(
    profile,
    Object.freeze(uniqueSorted([...merged.values()], faultKey)),
    Object.freeze(row.pending.filter((t) => t.id !== ticket.id)),
  );
}
