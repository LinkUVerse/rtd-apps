// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { walletReadErrorMessage } from "_src/shared/rpc/read-error";

import Alert from "_components/alert";
import Loading from "_components/loading";
import Overlay from "_components/overlay";
import { useI18n } from "_app/i18n";
import { useStakingView } from "rtd-apps-core/src/rpc/staking-hooks";
import { useNavigate } from "react-router-dom";

import { useActiveAddress } from "../../hooks/useActiveAddress";
import { SelectValidatorCard } from "./SelectValidatorCard";
import { ValidatorsCard } from "./ValidatorsCard";
import * as styles from "../Staking.module.scss";

export function Validators() {
  const { t } = useI18n();
  const accountAddress = useActiveAddress();
  const {
    data: stakedValidators,
    snapshot,
    isPending,
    isError,
    error,
  } = useStakingView(accountAddress, { enabled: !!accountAddress });

  const navigate = useNavigate();

  const pageTitle = stakedValidators?.positions?.length
    ? t("staking.stakeAndEarnTitle")
    : t("staking.selectValidatorTitle");

  return (
    <Overlay
      showModal
      className={styles.overlay}
      closeLabel={t("common.close")}
      title={isPending ? t("common.loading") : pageTitle}
      closeOverlay={() => navigate("/")}
    >
      <div className={styles.page}>
        <Loading loading={isPending}>
          {isError ? (
            <div className={styles.notice} role="alert">
              <Alert>
                <strong>{walletReadErrorMessage(error)}</strong>
              </Alert>
            </div>
          ) : null}

          {!isError && stakedValidators ? (
            stakedValidators.positions?.length ? (
              <ValidatorsCard />
            ) : (
              <SelectValidatorCard
                view={stakedValidators}
                snapshotKey={snapshot?.cacheKey}
              />
            )
          ) : null}
        </Loading>
      </div>
    </Overlay>
  );
}
