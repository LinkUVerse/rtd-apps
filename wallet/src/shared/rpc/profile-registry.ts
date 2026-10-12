// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { API_ENV, type NetworkEnvType } from "../api-env";
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
