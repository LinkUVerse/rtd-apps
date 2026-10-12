// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { walletReadErrorMessage } from "_src/shared/rpc/read-error";
import { nftTransferEligible } from "_src/shared/rpc/nft-assets";
import { useActiveAddress } from "_app/hooks/useActiveAddress";
import Loading from "_components/loading";
import Alert from "_components/alert";
import { NFTDisplayCard } from "_components/nft-display";
import Overlay from "_components/overlay";
import { useOwnedNFT } from "_hooks";
import { useUnlockedGuard } from "_src/ui/app/hooks/useUnlockedGuard";
import { useI18n } from "_src/ui/app/i18n";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { walletReadAllowed } from "rtd-apps-core/src/rpc/read-admission";
import { useActiveAccount } from "_src/ui/app/hooks/useActiveAccount";

import { TransferNFTForm } from "./TransferNFTForm";

function NftTransferPage() {
  const rpc = useWalletRpc();
  const account = useActiveAccount();
  const { nftId } = useParams();
  return (
    <NftTransferPageSession
      key={JSON.stringify([
        rpc.bindingKey,
        rpc.readSessionKey,
        account?.id,
        account?.address,
        nftId,
      ])}
    />
  );
}

function NftTransferPageSession() {
  const rpc = useWalletRpc();
  const { t } = useI18n();
  const { nftId } = useParams();
  const address = useActiveAddress();
  // verify that the nft is owned by the user and is transferable
  const {
    data: ownedNFT,
    isPending: isNftLoading,
    kioskItem,
    isError,
    error,
  } = useOwnedNFT(nftId || "", address);
  const navigate = useNavigate();
  const isGuardLoading = useUnlockedGuard();
  const [preparationType, setPreparationType] = useState<string | null>(null);
  const [draftType, setDraftType] = useState<string | null>(null);
  const [dispatchedType, setDispatchedType] = useState<string | null>(null);
  const checkingAssets = rpc.state === "initializing" ||
    !walletReadAllowed(rpc, "assets") || !walletReadAllowed(rpc, "assetKiosks");
  // Keep the current preparation/preview through temporary snapshot loading.
  // A definite ownership error still retracts it before dispatch; an existing
  // dispatch retains only its outcome. The outer key retires changed authority.
  const admitted =
    !isError &&
    !checkingAssets &&
    !isNftLoading &&
    ownedNFT &&
    nftId &&
    nftTransferEligible(ownedNFT, kioskItem);
  const formType =
    dispatchedType ??
    (admitted
      ? ownedNFT.type
      : !isError && (isNftLoading || checkingAssets)
        ? preparationType ?? draftType
        : null);
  const onPreparationStateChange = useCallback(
    (active: boolean) => {
      setPreparationType(active ? formType : null);
    },
    [formType],
  );
  useEffect(() => {
    // Keep only the draft's render lifetime across temporary snapshot refreshes.
    // This remembered type does not grant preparation or approval authority.
    if (admitted) setDraftType(ownedNFT.type);
    // A render lifetime cannot retain a definite negative or a changed owner.
    if (isError || isGuardLoading || (!checkingAssets && !isNftLoading && !admitted)) {
      setPreparationType(null);
      setDraftType(null);
    }
  }, [isError, isGuardLoading, isNftLoading, checkingAssets, admitted, ownedNFT?.type]);
  const isPending = isGuardLoading || ((isNftLoading || checkingAssets) && !isError && !formType);
  return (
    <Overlay
      showModal={true}
      title={t("nft.send")}
      closeOverlay={() => navigate("/nfts")}
    >
      <div className="flex w-full flex-col h-full">
        <Loading loading={isPending}>
          {isError && !dispatchedType ? (
            <Alert>{walletReadErrorMessage(error)}</Alert>
          ) : formType && nftId ? (
            <>
              <div className="mb-7.5">
                <NFTDisplayCard objectId={nftId} wideView size="sm" />
              </div>
              <TransferNFTForm
                objectId={nftId}
                objectType={formType}
                ownershipReady={!!admitted}
                onPreparationStateChange={onPreparationStateChange}
                onDispatchStarted={() => setDispatchedType(formType)}
                onRecoveryChecked={(active) => {
                  if (!active) setDispatchedType(null);
                }}
              />
            </>
          ) : (
            <Navigate to="/" replace />
          )}
        </Loading>
      </div>
    </Overlay>
  );
}

export default NftTransferPage;
