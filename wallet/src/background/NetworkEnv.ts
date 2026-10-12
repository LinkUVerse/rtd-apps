// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { DEFAULT_API_ENV } from "_app/ApiProvider";
import { API_ENV, type NetworkEnvType } from "_src/shared/api-env";
import { validateNetworkProfile } from "../shared/rpc/profile";
import {
  CustomProfileReviews,
  profilePermissionOrigins,
} from "../shared/rpc/custom-profile-review";
import { probeNetworkIdentity } from "../shared/rpc/identity";
import { WalletReadSession } from "../shared/rpc/session";
import mitt from "mitt";
import Browser from "webextension-polyfill";

import { withWalletContextMutation } from "./wallet-context-mutation";

const STORAGE_KEY = "wallet_network_v2";
const isEnv = (value: unknown): value is API_ENV =>
  typeof value === "string" &&
  Object.values(API_ENV).includes(value as API_ENV);
class NetworkEnv {
  #events = mitt<{ changed: NetworkEnvType }>();
  #queue: Promise<unknown> = Promise.resolve();
  #selectionEpoch = 0;
  async #selectionKey() {
    return JSON.stringify([
      this.#selectionEpoch,
      await this.getActiveNetwork(),
    ]);
  }
  #reviews = new CustomProfileReviews(async (profile) => {
    if (
      !(await Browser.permissions.contains({
        origins: profilePermissionOrigins(profile),
      }))
    ) {
      throw new Error("请先在网络设置中授权这些服务地址");
    }
    const session = new WalletReadSession(profile);
    try {
      return await probeNetworkIdentity(session);
    } finally {
      session.close();
    }
  });

  async getActiveNetwork(): Promise<NetworkEnvType> {
    const stored = await Browser.storage.local.get({
      [STORAGE_KEY]: null,
      rtd_Env: DEFAULT_API_ENV,
      rtd_Env_RPC: null,
    });
    const value = stored[STORAGE_KEY];
    const current =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
    if (value !== null && !current) throw new Error("已保存的网络配置无效");
    if (current) {
      if (current.schemaVersion !== 2 || !isEnv(current.env)) {
        throw new Error("已保存的网络配置版本无效");
      }
      if (current.env === API_ENV.customRPC) {
        const profile = validateNetworkProfile(current.profile);
        return {
          env: API_ENV.customRPC,
          customRpcUrl: profile.endpoints.fullnodeGrpcWeb,
          profile,
        };
      }
      return { env: current.env, customRpcUrl: null };
    }
    // Legacy data remains intact and never becomes trusted multi-service configuration.
    if (stored.rtd_Env === API_ENV.customRPC) {
      return {
        env: API_ENV.customRPC,
        customRpcUrl:
          typeof stored.rtd_Env_RPC === "string" ? stored.rtd_Env_RPC : "",
      };
    }
    const env = isEnv(stored.rtd_Env) ? stored.rtd_Env : DEFAULT_API_ENV;
    return env === API_ENV.customRPC
      ? { env, customRpcUrl: "" }
      : { env, customRpcUrl: null };
  }

  async getSavedCustomProfile() {
    const stored = await Browser.storage.local.get({
      wallet_custom_profile_v2: null,
    });
    if (stored.wallet_custom_profile_v2 !== null)
      return validateNetworkProfile(stored.wallet_custom_profile_v2);
    const active = await this.getActiveNetwork();
    return active.env === API_ENV.customRPC && active.profile
      ? validateNetworkProfile(active.profile)
      : null;
  }

  async prepareCustomProfile(input: unknown) {
    const previous = await this.#selectionKey();
    const review = await this.#reviews.prepare(input, previous);
    if ((await this.#selectionKey()) !== previous) {
      this.#reviews.consume(review.token, "changed");
      throw new Error("网络已改变，请重新预检");
    }
    return review;
  }

  async confirmCustomProfile(token: string): Promise<NetworkEnvType> {
    return this.#serialize(async () => {
      const previous = await this.getSavedCustomProfile();
      const profile = this.#reviews.consume(token, await this.#selectionKey());
      if (
        !(await Browser.permissions.contains({
          origins: profilePermissionOrigins(profile),
        }))
      ) {
        throw new Error("网络服务权限已撤销，请重新预检");
      }
      // Reusing the same profile identity requires an explicit revision advance.
      if (
        previous?.id === profile.id &&
        profile.revision <= previous.revision
      ) {
        throw new Error("修改现有网络时必须增加配置版本");
      }
      const network: NetworkEnvType = {
        env: API_ENV.customRPC,
        customRpcUrl: profile.endpoints.fullnodeGrpcWeb,
        profile,
      };
      return withWalletContextMutation(async () => {
        await Browser.storage.local.set({
          [STORAGE_KEY]: { schemaVersion: 2, env: API_ENV.customRPC, profile },
          wallet_custom_profile_v2: profile,
        });
        this.#selectionEpoch += 1;
        this.#events.emit("changed", network);
        return network;
      });
    });
  }

  async setActiveNetwork(network: NetworkEnvType) {
    if (
      !network ||
      network.env === API_ENV.customRPC ||
      !Object.values(API_ENV).includes(network.env)
    ) {
      throw new Error("自定义网络必须先预检并确认完整配置");
    }
    return this.#serialize(() =>
      withWalletContextMutation(async () => {
        await Browser.storage.local.set({
          [STORAGE_KEY]: { schemaVersion: 2, env: network.env },
        });
        this.#selectionEpoch += 1;
        this.#events.emit("changed", { env: network.env, customRpcUrl: null });
      }),
    );
  }

  #serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.#queue.then(operation);
    this.#queue = result.catch(() => undefined);
    return result;
  }
  on = this.#events.on;
  off = this.#events.off;
}

const networkEnv = new NetworkEnv();
export default networkEnv;
