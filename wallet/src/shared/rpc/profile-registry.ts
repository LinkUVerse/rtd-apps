// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { API_ENV, type NetworkEnvType } from "../api-env";
import {
  discoverLocalProfile,
  localChainDiscoveryEnabled,
  type LocalDiscoveryOptions,
} from "./local-discovery";
import {
  NetworkProfileError,
  type ValidatedNetworkProfile,
  validateNetworkProfile,
} from "./profile";

export type ProfileSelection =
  | { state: "configured"; profile: ValidatedNetworkProfile }
  | { state: "unconfigured" | "invalid"; message: string };

/** Built-ins require explicit reviewed profiles. The legacy single URL is never expanded. */
export function selectBuiltinProfile(
  env: API_ENV,
  registryJson: string | undefined,
): ProfileSelection {
  if (env === API_ENV.customRPC)
    return {
      state: "unconfigured",
      message: "此自定义网络需要配置新版数据服务入口",
    };
  if (!registryJson || !registryJson.trim())
    return { state: "unconfigured", message: "当前网络尚未配置钱包数据服务" };
  try {
    const registry: unknown = JSON.parse(registryJson);
    if (!registry || typeof registry !== "object" || Array.isArray(registry))
      throw new NetworkProfileError("networkProfiles");
    const entry = (registry as Record<string, unknown>)[env];
    if (entry === undefined)
      return { state: "unconfigured", message: "当前网络尚未配置钱包数据服务" };
    const profile = validateNetworkProfile(entry, { requireComplete: true });
    return { state: "configured", profile };
  } catch (error) {
    return {
      state: "invalid",
      message:
        error instanceof NetworkProfileError
          ? error.message
          : "钱包网络配置格式无效",
    };
  }
}

/** All consumers use the same persisted profile; legacy URLs remain unconfigured. */
export function selectNetworkProfile(network: NetworkEnvType, registryJson: string | undefined): ProfileSelection {
  if (network.env !== API_ENV.customRPC || !network.profile) return selectBuiltinProfile(network.env, registryJson);
  try {
    return { state: 'configured', profile: validateNetworkProfile(network.profile) };
  } catch (error) {
    return { state: 'invalid', message: error instanceof Error ? error.message : '自定义网络配置无效' };
  }
}

/**
 * Resolve the profile for a network, discovering the local dev deployment when
 * no usable pinned identity is available.
 *
 * `rtd-dev.sh reset` mints a new chain, so a local digest pinned at build time
 * is stale after the first reset. A loopback deployment is owned by the same
 * person running the wallet, so the chain identity is read from the running
 * endpoints instead of being pinned. Any non-loopback network, and every other
 * built-in network, keeps the reviewed pinned profile.
 *
 * Precedence for `local`:
 * 1. the chain currently served on the fixed loopback ports;
 * 2. the reviewed registry entry, if the stack is not reachable;
 * 3. unconfigured.
 */
export async function resolveNetworkProfile(
  network: NetworkEnvType,
  registryJson: string | undefined,
  discovery: LocalDiscoveryOptions = {},
): Promise<ProfileSelection> {
  const pinned = selectNetworkProfile(network, registryJson);
  if (network.env !== API_ENV.local || !localChainDiscoveryEnabled())
    return pinned;
  try {
    return {
      state: "configured",
      profile: await discoverLocalProfile(discovery),
    };
  } catch (error) {
    if (pinned.state === "configured") return pinned;
    return {
      state: "unconfigured",
      message:
        error instanceof Error && error.message
          ? error.message
          : "本地开发链未运行",
    };
  }
}
