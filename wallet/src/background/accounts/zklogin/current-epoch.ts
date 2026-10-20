// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import networkEnv from "_src/background/NetworkEnv";
import { WalletFullnodeReader } from "_src/shared/rpc/fullnode-reader";
import { networkBindingKey } from "_src/shared/rpc/profile";
import { resolveNetworkProfile } from "_src/shared/rpc/profile-registry";
import { WalletReadSession } from "_src/shared/rpc/session";

/** Always obtain the currently executed epoch from the configured, H0-verified Fullnode. */
export async function getCurrentEpoch() {
  const selected = await resolveNetworkProfile(
    await networkEnv.getActiveNetwork(),
    process.env.WALLET_NETWORK_PROFILES,
  );
  if (selected.state !== "configured") throw new Error(selected.message);
  const session = new WalletReadSession(selected.profile);
  const close = () => session.close();
  networkEnv.on("changed", close);
  try {
    const epoch = await new WalletFullnodeReader(session).currentEpoch();
    const current = await resolveNetworkProfile(
      await networkEnv.getActiveNetwork(),
      process.env.WALLET_NETWORK_PROFILES,
    );
    if (
      current.state !== "configured" ||
      networkBindingKey(current.profile) !== session.bindingKey
    )
      throw new Error("zkLogin 网络配置已改变，请重试");
    session.assertActive();
    return epoch;
  } finally {
    session.close();
    networkEnv.off("changed", close);
  }
}
