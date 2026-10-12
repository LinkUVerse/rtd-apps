// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { type NetworkIdentityReport } from './identity';
import { networkBindingKey, validateNetworkProfile, type ValidatedNetworkProfile } from './profile';

export interface CustomProfileReview {
  token: string;
  profile: ValidatedNetworkProfile;
  expiresAt: number;
  verifiedRoles: string[];
  /** These services do not participate in the three native identity probes. */
  additionalServices: string[];
}

export { profilePermissionOrigins } from './profile-permissions';

/** Background-owned, bounded, one-use confirmation of the exact reviewed configuration. */
export class CustomProfileReviews {
  #reviews = new Map<string, { review: CustomProfileReview; previous: string }>();
  constructor(
    private readonly inspect: (profile: ValidatedNetworkProfile) => Promise<NetworkIdentityReport>,
    private readonly now = Date.now,
    private readonly token: () => string = () => crypto.randomUUID(),
  ) {}

  async prepare(input: unknown, previous: string): Promise<CustomProfileReview> {
    const profile = validateNetworkProfile(input);
    const report = await this.inspect(profile);
    if (report.bindingKey !== networkBindingKey(profile)) throw new Error('网络预检绑定不一致');
    const required = ['fullnode', ...(profile.endpoints.graphqlUrl ? ['graphql'] : []),
      ...(profile.endpoints.archiveGrpcWeb ? ['archive'] : [])];
    for (const role of required) {
      const proof = report.endpoints.find((endpoint) => endpoint.role === role);
      if (!proof || proof.state !== 'verified' || proof.genesisDigest !== profile.expectedGenesisDigest) {
        throw new Error(`网络入口尚未通过身份预检：${role}`);
      }
    }
    const time = this.now();
    for (const [key, entry] of this.#reviews) if (entry.review.expiresAt <= time) this.#reviews.delete(key);
    if (this.#reviews.size >= 8) this.#reviews.delete(this.#reviews.keys().next().value!);
    const review: CustomProfileReview = {
      token: this.token(), profile, expiresAt: time + 300_000, verifiedRoles: required,
      additionalServices: [
        ...(profile.endpoints.accountHistoryUrl ? ['accountHistory: runtime coverage verification required'] : []),
        ...(profile.faucetUrl ? ['faucet: deployment binding required'] : []),
      ],
    };
    this.#reviews.set(review.token, { review, previous });
    // A message consumer cannot mutate the internal confirmation object.
    return structuredClone(review);
  }

  consume(token: string, previous: string): ValidatedNetworkProfile {
    const entry = this.#reviews.get(token);
    this.#reviews.delete(token);
    if (!entry || entry.review.expiresAt <= this.now() || entry.previous !== previous) {
      throw new Error('网络配置确认已失效，请重新预检');
    }
    return entry.review.profile;
  }
}
