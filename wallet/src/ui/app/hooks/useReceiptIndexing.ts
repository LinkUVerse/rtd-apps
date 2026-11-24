import {
  walletReadAllowed,
  walletReadKeyParts,
} from "rtd-apps-core/src/rpc/read-admission";
import { useQuery } from "@tanstack/react-query";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { receiptIndexCovered } from "_src/shared/rpc/receipt-indexing";

export function useReceiptIndexing(
  digest: string | null,
  checkpoint: string | null | undefined,
) {
  const rpc = useWalletRpc();
  // The provider observes pending receipt coverage and advances its shared
  // snapshot. Reuse that admission; a second unconditional refresh duplicates it.
  const query = useQuery({
    queryKey: [
      "wallet-receipt-indexing",
      rpc.bindingKey,
      rpc.readSessionKey,
      ...walletReadKeyParts(rpc, "assets"),
      rpc.assetSnapshotKey,
      digest,
      checkpoint,
    ],
    enabled:
      walletReadAllowed(rpc, "assets") &&
      rpc.hasFullnodeSession &&
      !!digest &&
      checkpoint != null,
    queryFn: async ({ signal }) => {
      const snapshot = await rpc.openAssetSnapshot(signal);
      signal.throwIfAborted();
      return receiptIndexCovered(snapshot.proof, rpc.bindingKey, checkpoint!);
    },
    retry: false,
    gcTime: 0,
    // The receipt page refreshes progress only on explicit user action; an
    // unbounded 3s poll kept an unrelated asset snapshot alive forever.
    refetchInterval: false,
    meta: { skipPersistedCache: true, walletReadOperation: "assets" },
  });
  return {
    ...query,
    data:
      !walletReadAllowed(rpc, "assets") || query.isError
        ? undefined
        : query.data,
  };
}
