// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { deobfuscate } from "_src/shared/cryptography/keystore";
import {
  Account,
  type SerializedAccount,
  type SerializedUIAccount,
} from "../Account";
import type { ZkLoginProvider } from "./providers";

export const ZKLOGIN_UNSUPPORTED =
  "当前RTD钱包不支持zkLogin创建、解锁或签名；已有账户记录已保留";
type JwtSerializedClaims = {
  email: string | null;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  picture: string | null;
  aud: string;
  iss: string;
  sub: string;
};

export interface ZkLoginAccountSerialized extends SerializedAccount {
  type: "zkLogin";
  provider: ZkLoginProvider;
  /**
   * the salt used to create the account obfuscated
   */
  salt: string;
  /**
   * obfuscated data that contains user info as it was in jwt
   */
  claims: string;
  /**
   * the addressSeed obfuscated
   */
  addressSeed: string;
  /**
   * the name/key of the claim in claims used for the address sub or email
   */
  claimName: "sub" | "email";
  warningAcknowledged?: boolean;
}

export interface ZkLoginAccountSerializedUI extends SerializedUIAccount {
  type: "zkLogin";
  email: string | null;
  picture: string | null;
  provider: ZkLoginProvider;
  warningAcknowledged: boolean;
}

export function isZkLoginAccountSerializedUI(
  account: SerializedUIAccount,
): account is ZkLoginAccountSerializedUI {
  return account.type === "zkLogin";
}

/** Read-only adapter for preserved development records; no OAuth, prover or chain history calls. */
export class ZkLoginAccount extends Account<ZkLoginAccountSerialized, null> {
  readonly canSign = false;
  static async createNew(_input: {
    provider: ZkLoginProvider;
  }): Promise<Omit<ZkLoginAccountSerialized, "id">[]> {
    throw new Error(ZKLOGIN_UNSUPPORTED);
  }
  static isOfType(
    serialized: SerializedAccount,
  ): serialized is ZkLoginAccountSerialized {
    return serialized.type === "zkLogin";
  }
  constructor({
    id,
    cachedData,
  }: {
    id: string;
    cachedData?: ZkLoginAccountSerialized;
  }) {
    super({ type: "zkLogin", id, cachedData });
  }
  async lock(allowRead = false): Promise<void> {
    await this.clearEphemeralValue();
    await this.onLocked(allowRead);
  }
  async isLocked(): Promise<boolean> {
    return true;
  }
  async unlock(): Promise<void> {
    throw new Error(ZKLOGIN_UNSUPPORTED);
  }
  async signData(_data: Uint8Array): Promise<string> {
    throw new Error(ZKLOGIN_UNSUPPORTED);
  }
  async toUISerialized(): Promise<ZkLoginAccountSerializedUI> {
    const {
      address,
      publicKey,
      type,
      claims,
      selected,
      provider,
      nickname,
      warningAcknowledged,
    } = await this.getStoredData();
    const { email, picture } = await deobfuscate<JwtSerializedClaims>(claims);
    return {
      id: this.id,
      type,
      address,
      publicKey,
      isLocked: await this.isLocked(),
      lastUnlockedOn: await this.lastUnlockedOn,
      email,
      picture,
      selected,
      nickname,
      isPasswordUnlockable: false,
      provider,
      isKeyPairExportable: false,
      warningAcknowledged: !!warningAcknowledged,
    };
  }
}
