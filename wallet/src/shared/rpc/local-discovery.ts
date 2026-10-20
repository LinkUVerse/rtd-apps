// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RtdGraphQLClient } from "rtd-typescript/graphql";
import { RtdGrpcClient } from "rtd-typescript/grpc";

import { boundedGrpcFetch } from "./grpc-response-budget";
import {
  LOCAL_DEV_CHAIN,
  LOCAL_DEV_ENDPOINTS,
  type LocalDevEndpoints,
} from "./local-dev-endpoints";
import {
  assertGenesisDigest,
  NetworkProfileError,
  validateNetworkProfile,
  type ValidatedNetworkProfile,
} from "./profile";

/**
 * Discover the chain that the local dev stack is serving right now.
 *
 * `rtd-dev.sh reset` creates a brand new chain, so any genesis digest baked
 * into a build is stale after the first reset. The stack publishes fixed
 * loopback ports for every generation, and the machine's operator owns those
 * endpoints, so the identity of a loopback deployment is discovered at runtime
 * instead of being pinned at build time.
 *
 * Every endpoint that answers must agree on one genesis digest. A disagreement
 * means the ports belong to different chains (a half-restarted stack), which is
 * refused exactly like a chain mismatch against a pinned profile. The runtime
 * identity checks keep comparing each endpoint against the discovered digest,
 * so a mid-session reset is still caught.
 */

/** Only loopback deployments may be discovered; a remote host always needs a pinned digest. */
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);

function isLoopback(url: string): boolean {
  try {
    return LOOPBACK_HOSTS.has(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export class LocalChainDiscoveryError extends Error {
  constructor(
    readonly reason: "not-running" | "disagreement" | "incompatible",
    readonly detail?: string,
  ) {
    super(
      reason === "not-running"
        ? "本地开发链未运行，请先执行 localDeploy/rtd-dev.sh start"
        : reason === "disagreement"
          ? "本地端点属于不同链，已拒绝接入；请重新执行 localDeploy/rtd-dev.sh reset"
          : "本地端点身份响应不兼容",
    );
    this.name = "LocalChainDiscoveryError";
  }
}

export interface LocalDiscoveryOptions {
  fetch?: typeof fetch;
  timeoutMs?: number;
  /** Defaults to the fixed dev-stack ports; overridable for tests. */
  endpoints?: LocalDevEndpoints;
  /** Test seam: the clock used by the discovery cache. */
  now?: () => number;
  /**
   * Probe now instead of answering from the short cache. A caller that is
   * re-checking an already-configured profile uses this: a reset rewrites the
   * chain while the previous digest is still inside the cache window.
   */
  fresh?: boolean;
}

async function grpcChainId(
  baseUrl: string,
  options: LocalDiscoveryOptions,
  signal: AbortSignal,
): Promise<string> {
  const client = new RtdGrpcClient({
    network: LOCAL_DEV_CHAIN.sdkNetwork,
    baseUrl,
    format: "binary",
    fetch: boundedGrpcFetch(options.fetch ?? globalThis.fetch),
    // Empty MVR override: a named package must never reach an external resolver.
    mvr: { url: "" },
  });
  const { response } = await client.ledgerService.getServiceInfo(
    {},
    { abort: signal, timeout: options.timeoutMs ?? 5_000 },
  );
  return assertGenesisDigest(response.chainId);
}

async function graphqlGenesisDigest(
  url: string,
  options: LocalDiscoveryOptions,
  signal: AbortSignal,
): Promise<string> {
  const client = new RtdGraphQLClient({
    network: LOCAL_DEV_CHAIN.sdkNetwork,
    url,
    fetch: boundedGrpcFetch(options.fetch ?? globalThis.fetch),
    mvr: { url: "" },
  });
  const result = await client.query<{
    checkpoint?: { digest?: unknown } | null;
  }>({
    query:
      "query WalletGenesisIdentity { checkpoint(sequenceNumber: 0) { digest } }",
    variables: {},
    signal,
  });
  if (result.errors?.length)
    throw new LocalChainDiscoveryError("incompatible", "graphql");
  return assertGenesisDigest(result.data?.checkpoint?.digest);
}

interface DiscoveryResult {
  readonly digest: string;
  readonly roles: readonly string[];
}

async function probe(
  options: LocalDiscoveryOptions,
): Promise<DiscoveryResult> {
  const endpoints = options.endpoints ?? LOCAL_DEV_ENDPOINTS;
  for (const url of Object.values(endpoints))
    if (!isLoopback(url))
      throw new LocalChainDiscoveryError("incompatible", "non-loopback");

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 5_000;
  const timer = setTimeout(
    () => controller.abort(new DOMException("本地链发现超时", "TimeoutError")),
    timeoutMs,
  );
  const probes: { role: string; work: Promise<string> }[] = [
    {
      role: "fullnode",
      work: grpcChainId(endpoints.fullnodeGrpcWeb, options, controller.signal),
    },
    ...(endpoints.graphqlUrl
      ? [
          {
            role: "graphql",
            work: graphqlGenesisDigest(
              endpoints.graphqlUrl,
              options,
              controller.signal,
            ),
          },
        ]
      : []),
    ...(endpoints.archiveGrpcWeb
      ? [
          {
            role: "archive",
            work: grpcChainId(
              endpoints.archiveGrpcWeb,
              options,
              controller.signal,
            ),
          },
        ]
      : []),
  ];
  let results: PromiseSettledResult<string>[];
  try {
    results = await Promise.allSettled(probes.map((entry) => entry.work));
  } finally {
    clearTimeout(timer);
  }

  const verified: { role: string; digest: string }[] = [];
  let incompatible = false;
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      verified.push({ role: probes[i].role, digest: result.value });
      return;
    }
    const reason = result.reason;
    if (reason instanceof LocalChainDiscoveryError) incompatible = true;
    else if (reason instanceof NetworkProfileError) incompatible = true;
  });
  if (verified.length === 0)
    throw incompatible
      ? new LocalChainDiscoveryError("incompatible")
      : new LocalChainDiscoveryError("not-running");
  const fullnode = verified.find((entry) => entry.role === "fullnode");
  if (!fullnode) throw new LocalChainDiscoveryError("incompatible", "fullnode");
  const digest = fullnode.digest;
  if (verified.some((entry) => entry.digest !== digest))
    throw new LocalChainDiscoveryError("disagreement");
  return { digest, roles: verified.map((entry) => entry.role) };
}

interface CachedDiscovery {
  readonly digest: string;
  readonly at: number;
}

/**
 * A short cache keeps one profile selection from re-probing every endpoint on
 * each authorization. It is keyed by digest, so a reset is picked up as soon as
 * the window passes, and the binding key changes with it.
 */
const CACHE_MS = 10_000;
let cache: CachedDiscovery | undefined;
let inflight: Promise<DiscoveryResult> | undefined;

let enabled = true;

/**
 * Discovery is the production default. Tests disable it so that a chain running
 * on the developer's machine cannot leak into assertions; with it disabled the
 * wallet behaves exactly like a build with pinned profiles only.
 */
export function setLocalChainDiscoveryEnabled(value: boolean): void {
  enabled = value;
  cache = undefined;
  inflight = undefined;
}

export function localChainDiscoveryEnabled(): boolean {
  return enabled;
}

export function __resetLocalDiscoveryCache(): void {
  cache = undefined;
  inflight = undefined;
}

async function discover(options: LocalDiscoveryOptions): Promise<DiscoveryResult> {
  const now = options.now ?? Date.now;
  if (!options.fresh && cache && now() - cache.at < CACHE_MS)
    return { digest: cache.digest, roles: ["fullnode"] };
  inflight ??= probe(options).finally(() => {
    inflight = undefined;
  });
  const result = await inflight;
  cache = { digest: result.digest, at: now() };
  return result;
}

/** Build the validated profile for the chain currently served on the loopback ports. */
export function localProfileFor(
  digest: string,
  endpoints: LocalDevEndpoints = LOCAL_DEV_ENDPOINTS,
): ValidatedNetworkProfile {
  return validateNetworkProfile(
    {
      schemaVersion: 2,
      id: LOCAL_DEV_CHAIN.id,
      displayName: LOCAL_DEV_CHAIN.displayName,
      sdkNetwork: LOCAL_DEV_CHAIN.sdkNetwork,
      walletStandardChain: LOCAL_DEV_CHAIN.walletStandardChain,
      expectedGenesisDigest: digest,
      // Derived from the digest so that a reset changes the binding and
      // invalidates stored observations, admission records and UI caches.
      generation: `${LOCAL_DEV_CHAIN.id}-${digest.slice(0, 8)}`,
      revision: 1,
      endpoints: { ...endpoints },
      // Package ids belong to a specific deployment; a fresh chain has none of
      // them, so a discovered profile ships none rather than stale ids.
      packages: {},
    },
    { requireComplete: true },
  );
}

/** Discover the local dev chain and return a profile bound to it. */
export async function discoverLocalProfile(
  options: LocalDiscoveryOptions = {},
): Promise<ValidatedNetworkProfile> {
  const result = await discover(options);
  return localProfileFor(result.digest, options.endpoints);
}
