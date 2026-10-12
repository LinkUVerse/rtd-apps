// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { walletReadErrorMessage } from "_src/shared/rpc/read-error";

import LoadingIndicator from "_components/loading/LoadingIndicator";
import Overlay from "_components/overlay";
import Alert from "_components/alert";
import { useI18n } from "_app/i18n";
import { useStakingView } from "rtd-apps-core/src/rpc/staking-hooks";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { useActiveAddress } from "../../hooks/useActiveAddress";
import { ValidatorLogo } from "../validators/ValidatorLogo";
import { DelegationDetailCard } from "./DelegationDetailCard";

export function DelegationDetail() {
  const [searchParams] = useSearchParams();
  const stakeIdParams = searchParams.get("staked");
  const navigate = useNavigate();
  const accountAddress = useActiveAddress();
  const { t } = useI18n();
  const { data, isPending, isError, error } = useStakingView(accountAddress, {
    enabled: !!accountAddress,
  });

  if (!stakeIdParams) {
    return <Navigate to={"/stake"} replace={true} />;
  }

  if (isPending) {
    return (
      <div className="p-2 w-full flex justify-center items-center h-full">
        <LoadingIndicator />
      </div>
    );
  }

  const delegationData = data?.positions?.find(
    (position) => position.objectId === stakeIdParams,
  );
  if (isError || !delegationData)
    return <Alert>{walletReadErrorMessage(error)}</Alert>;
  const validatorAddressParams = delegationData.validatorAddress;
  return (
    <Overlay
      showModal
      title={
        <div className="flex items-center max-w-full px-4">
          {validatorAddressParams ? (
            <ValidatorLogo
              validatorAddress={validatorAddressParams}
              isTitle
              iconSize="sm"
              size="body"
              activeEpoch={delegationData.requestEpoch}
            />
          ) : (
            <span>{delegationData.poolId}</span>
          )}
        </div>
      }
      closeOverlay={() => navigate("/")}
    >
      <DelegationDetailCard
        validatorAddress={validatorAddressParams}
        stakedId={stakeIdParams}
      />
    </Overlay>
  );
}
