// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
  fromBase58,
  isValidRtdAddress,
  normalizeRtdAddress,
  toBase58,
} from "rtd-typescript/utils";

export type EndpointRole =
  | "fullnode"
  | "graphql"
  | "archive"
  | "accountHistory";

export interface WalletNetworkProfile {
  schemaVersion: 2;
  id: string;
  displayName: string;
  sdkNetwork: string;
  walletStandardChain: `rtd:${string}`;
  expectedGenesisDigest: string;
  generation: string;
  revision: number;
  endpoints: {
    fullnodeGrpcWeb: string;
    graphqlUrl?: string;
    archiveGrpcWeb?: string;
    accountHistoryUrl?: string;
  };
  packages: {
    kiosk?: string;
    personalKiosk?: string;
    originByte?: {
      discoveryPackage: string;
      executionPackage: string;
    };
    name?: {
      packageId: string;
      forwardRegistry: string;
      reverseRegistry: string;
    };
  };
  explorerUrl?: string;
  faucetUrl?: string;
}

export type ValidatedNetworkProfile = Readonly<
  Omit<WalletNetworkProfile, "endpoints" | "packages"> & {
    endpoints: Readonly<WalletNetworkProfile["endpoints"]>;
    packages: Readonly<
      Omit<WalletNetworkProfile["packages"], "name" | "originByte"> & {
        originByte?: Readonly<NonNullable<WalletNetworkProfile["packages"]["originByte"]>>;
        name?: Readonly<NonNullable<WalletNetworkProfile["packages"]["name"]>>;
      }
    >;
  }
>;

export class NetworkProfileError extends Error {
  constructor(public readonly field: string) {
    super(`钱包网络配置无效：${field}`);
    this.name = "NetworkProfileError";
  }
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new NetworkProfileError(field);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value !== value.trim() ||
    value.length > 2048
  ) {
    throw new NetworkProfileError(field);
  }
  return value;
}

/** Reject the old four-byte chain label instead of silently rebinding it. */
export function assertGenesisDigest(value: unknown): string {
  const digest = text(value, "expectedGenesisDigest");
  try {
    const bytes = fromBase58(digest);
    if (bytes.length !== 32 || toBase58(bytes) !== digest)
      throw new Error("invalid digest");
  } catch {
    throw new NetworkProfileError("expectedGenesisDigest");
  }
  return digest;
}

export function normalizeEndpoint(
  value: unknown,
  field: string,
  grpc = false,
): string {
  let url: URL;
  const raw = text(value, field);
  try {
    url = new URL(raw);
  } catch {
    throw new NetworkProfileError(field);
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const literalHost = raw
    .match(/^https?:\/\/(\[[^\]]+\]|[^:/?#@]+)(?::\d+)?(?:[/?#]|$)/i)?.[1]
    .toLowerCase();
  if (
    (url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
    !literalHost ||
    (url.protocol === "http:" &&
      !["localhost", "127.0.0.1", "[::1]"].includes(literalHost)) ||
    url.username ||
    url.password ||
    raw.includes("#") ||
    raw.includes("?") ||
    url.hash ||
    url.search
  ) {
    throw new NetworkProfileError(field);
  }
  return grpc ? url.href.replace(/\/+$/, "") : url.href;
}

function packageId(value: unknown, field: string): string {
  const id = text(value, field);
  if (
    !/^0x[0-9a-fA-F]+$/.test(id) ||
    !isValidRtdAddress(normalizeRtdAddress(id))
  ) {
    throw new NetworkProfileError(field);
  }
  return normalizeRtdAddress(id);
}

/** Copy and freeze configuration; a caller cannot mutate an admitted session afterwards. */
export function validateNetworkProfile(
  input: unknown,
  options: { requireComplete?: boolean } = {},
): ValidatedNetworkProfile {
  const raw = record(input, "profile");
  if (raw.schemaVersion !== 2) throw new NetworkProfileError("schemaVersion");
  if (!Number.isSafeInteger(raw.revision) || Number(raw.revision) < 1) {
    throw new NetworkProfileError("revision");
  }
  const chain = text(raw.walletStandardChain, "walletStandardChain");
  if (
    !/^rtd:[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(chain) ||
    chain === "rtd:unknown"
  ) {
    throw new NetworkProfileError("walletStandardChain");
  }
  const endpoints = record(raw.endpoints, "endpoints");
  const normalized: WalletNetworkProfile["endpoints"] = {
    fullnodeGrpcWeb: normalizeEndpoint(
      endpoints.fullnodeGrpcWeb,
      "fullnodeGrpcWeb",
      true,
    ),
  };
  for (const field of [
    "graphqlUrl",
    "archiveGrpcWeb",
    "accountHistoryUrl",
  ] as const) {
    if (endpoints[field] !== undefined) {
      normalized[field] = normalizeEndpoint(
        endpoints[field],
        field,
        field === "archiveGrpcWeb",
      );
    }
  }
  if (
    options.requireComplete &&
    (!normalized.graphqlUrl ||
      !normalized.archiveGrpcWeb ||
      !normalized.accountHistoryUrl)
  ) {
    throw new NetworkProfileError("completeNetworkEndpoints");
  }
  // Both gRPC roles have a Ledger service. Distinct prefixes/URLs prevent accidental routing.
  if (normalized.archiveGrpcWeb === normalized.fullnodeGrpcWeb) {
    throw new NetworkProfileError("archiveGrpcWeb");
  }
  if (
    normalized.accountHistoryUrl &&
    normalized.accountHistoryUrl === normalized.graphqlUrl
  ) {
    throw new NetworkProfileError("accountHistoryUrl");
  }
  const faucetUrl = raw.faucetUrl === undefined ? undefined : normalizeEndpoint(raw.faucetUrl, "faucetUrl");
  // SDK V2 resolves /v2/gas from the origin; accepting a prefix would silently discard it.
  if (faucetUrl && new URL(faucetUrl).pathname !== "/") throw new NetworkProfileError("faucetUrl");
  const packages = record(raw.packages, "packages");
  const normalizedPackages: WalletNetworkProfile["packages"] = {};
  for (const field of ["kiosk", "personalKiosk"] as const) {
    if (packages[field] !== undefined)
      normalizedPackages[field] = packageId(packages[field], field);
  }
  if (packages.name !== undefined) {
    const name = record(packages.name, "name");
    normalizedPackages.name = Object.freeze({
      packageId: packageId(name.packageId, "name.packageId"),
      forwardRegistry: packageId(name.forwardRegistry, "name.forwardRegistry"),
      reverseRegistry: packageId(name.reverseRegistry, "name.reverseRegistry"),
    });
  }
  if (packages.originByte !== undefined) {
    const originByte = record(packages.originByte, "originByte");
    normalizedPackages.originByte = Object.freeze({
      discoveryPackage: packageId(originByte.discoveryPackage, "originByte.discoveryPackage"),
      executionPackage: packageId(originByte.executionPackage, "originByte.executionPackage"),
    });
  }
  return Object.freeze({
    schemaVersion: 2,
    id: text(raw.id, "id"),
    displayName: text(raw.displayName, "displayName"),
    sdkNetwork: text(raw.sdkNetwork, "sdkNetwork"),
    walletStandardChain: chain as WalletNetworkProfile["walletStandardChain"],
    expectedGenesisDigest: assertGenesisDigest(raw.expectedGenesisDigest),
    generation: text(raw.generation, "generation"),
    revision: raw.revision as number,
    endpoints: Object.freeze(normalized),
    packages: Object.freeze(normalizedPackages),
    ...(faucetUrl === undefined ? {} : { faucetUrl }),
    ...(raw.explorerUrl === undefined
      ? {}
      : { explorerUrl: normalizeEndpoint(raw.explorerUrl, "explorerUrl") }),
  });
}

/** Stable tuple encoding avoids collisions from separators embedded in profile IDs or URLs. */
export function networkBindingKey(profile: ValidatedNetworkProfile): string {
  return JSON.stringify([
    2,
    profile.id,
    profile.revision,
    profile.sdkNetwork,
    profile.walletStandardChain,
    profile.expectedGenesisDigest,
    profile.generation,
    profile.endpoints.fullnodeGrpcWeb,
    profile.endpoints.graphqlUrl ?? null,
    profile.endpoints.archiveGrpcWeb ?? null,
    profile.endpoints.accountHistoryUrl ?? null,
    profile.packages.kiosk ?? null,
    profile.packages.personalKiosk ?? null,
    profile.packages.name?.packageId ?? null,
    profile.packages.name?.forwardRegistry ?? null,
    profile.packages.name?.reverseRegistry ?? null,
    profile.faucetUrl ?? null,
    // Preserve pre-OriginByte bindings when this optional deployment is absent.
    ...(profile.packages.originByte ? [
      ["originByte", profile.packages.originByte.discoveryPackage, profile.packages.originByte.executionPackage],
    ] : []),
  ]);
}

/** Execution lock scope deliberately excludes endpoint URLs, revisions and profile aliases. */
export function executionScopeKey(
  profile: ValidatedNetworkProfile,
  accountAddress: string,
): string {
  return JSON.stringify([
    2,
    profile.expectedGenesisDigest,
    profile.generation,
    packageId(accountAddress, "accountAddress"),
  ]);
}
