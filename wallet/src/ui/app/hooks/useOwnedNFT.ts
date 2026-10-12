// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useGetObject } from "rtd-apps-core/src/rpc/asset-hooks";
import { useGetKioskContents } from "rtd-apps-core/src/rpc/kiosk-hooks";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { toBase64 } from "rtd-typescript/utils";
import { directlyOwnedAsset } from "../../../shared/rpc/nft-assets";

/** Asset-screen ownership at S. Execution must resolve current inputs again at Fullnode. */
export function useOwnedNFT(
  nftObjectId: string | null,
  address: string | null,
) {
  const object = useGetObject(nftObjectId);
  const rpc = useWalletRpc();
  const hasKiosk = !!(rpc.packages.kiosk || rpc.packages.originByte);
  const needsKiosk =
    !!object.data &&
    !object.isError &&
    object.data.owner.$kind === "ObjectOwner";
  const kiosk = useGetKioskContents(address, {
    enabled: needsKiosk && hasKiosk,
  });
  const direct =
    !!object.data && !!address && directlyOwnedAsset(object.data, address);
  const item =
    needsKiosk && !kiosk.isError
      ? kiosk.data?.list.find((item) => item.objectId === object.data!.objectId)
      : undefined;
  const unprovedKiosk =
    needsKiosk && !kiosk.isPending && !kiosk.isError && !item;
  const inconsistentItem =
    !!item &&
    !!object.data &&
    (item.digest !== object.data.digest ||
      item.version !== object.data.version ||
      item.type !== object.data.type ||
      item.owner.$kind !== "ObjectOwner" ||
      object.data.owner.$kind !== "ObjectOwner" ||
      item.owner.ObjectOwner !== object.data.owner.ObjectOwner ||
      toBase64(item.content) !== toBase64(object.data.content));
  const ownershipError =
    needsKiosk && !hasKiosk
      ? new Error("当前网络未配置受支持的 Kiosk 合约，无法证明对象持有关系")
      : inconsistentItem
        ? new Error("Kiosk 内容与对象点查在同一快照内不一致")
        : unprovedKiosk
          ? new Error(
              "当前配置及快照未证明该对象的 Kiosk 持有关系，请核对合约配置并刷新",
            )
          : null;
  const error =
    object.error ?? (needsKiosk ? kiosk.error : null) ?? ownershipError;
  const data =
    !error && object.data ? (direct ? object.data : (item ?? null)) : null;
  return {
    ...object,
    data,
    kioskItem: item,
    error,
    isError: !!error,
    isPending:
      !!nftObjectId &&
      (object.isPending ||
        (needsKiosk && hasKiosk && kiosk.isPending)),
  };
}
