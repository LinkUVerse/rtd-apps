// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Route, Routes } from "react-router-dom";
import { RTD_TYPE_ARG } from "rtd-typescript/utils";
import { useCoinMetadata } from "rtd-apps-core/src/rpc/coin";
import { WalletStakingViewProvider } from "rtd-apps-core/src/rpc/staking-hooks";

import { useActiveAddress } from "../../hooks/useActiveAddress";
import { useUnlockedGuard } from "../../hooks/useUnlockedGuard";
import { DelegationDetail } from "../delegation-detail";
import StakePage from "../stake";
import { Validators } from "../validators";

export function Staking() {
  if (useUnlockedGuard()) {
    return null;
  }
  return <StakingWorkflow />;
}

function StakingWorkflow() {
  const owner = useActiveAddress();
  // Retain a child-initiated read across subroutes without preloading or polling.
  useCoinMetadata(RTD_TYPE_ARG, { enabled: false });
  return (
    <WalletStakingViewProvider owner={owner}>
      <Routes>
        <Route path="/*" element={<Validators />} />
        <Route path="/delegation-detail" element={<DelegationDetail />} />
        <Route path="/new" element={<StakePage />} />
      </Routes>
    </WalletStakingViewProvider>
  );
}
