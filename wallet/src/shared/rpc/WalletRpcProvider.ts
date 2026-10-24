// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
  createElement,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useSyncExternalStore,
} from "react";
import {
  WalletRpcContext,
  type WalletRpc,
} from "rtd-apps-core/src/rpc/WalletRpcContext";
import {
  useIsFetching,
  useQuery,
  useQueryClient,
  type Query,
  notifyManager,
} from "@tanstack/react-query";

import { withPreparationGuard } from "./preparation-guard";
import { probeEntryAccess } from "./entry-access";
import { WalletIndexedLists } from "./indexed-lists";
import { WalletAssetReader } from "./asset-reader";
import { WalletStakingSnapshotReader } from "./staking-snapshot-reader";
import { WalletCoinMetadataReader } from "./coin-metadata-reader";
import { WalletBalanceReader } from "./balance-reader";
import { WalletNameReader } from "./name-reader";
import { WalletFullnodeReader } from "./fullnode-reader";
import { networkBindingKey } from "./profile";
import { type ProfileSelection } from "./profile-registry";
import { WalletReadSession } from "./session";
import { WalletLedgerReader } from "./ledger-reader";
import { WalletAccountHistoryReader } from "./account-history-reader";
import { WalletTransactionReader } from "./transaction-reader";
import { WalletArchiveObjectReader } from "./archive-object-reader";
import {
  WalletReadAdmission,
  guardWalletRpc,
  admissionQueryAffected,
  type ReadAdmissionSnapshot,
} from "./read-admission";
import type { WalletReadCapabilities } from "rtd-apps-core/src/rpc/capability-types";
import { observeReadCapabilities } from "./read-capability-observation";
import {
  validatingReadCapabilities,
  unavailableReadCapabilities,
} from "./read-capability-view";

export function WalletRpcProvider({
  selection,
  children,
  observeReadContracts = true,
  preloadAssets = true,
}: {
  selection: ProfileSelection;
  children: ReactNode;
  observeReadContracts?: boolean | "recover";
  /** Balance-only surfaces do not need the complete NFT/Display snapshot. */
  preloadAssets?: boolean;
}) {
  const client = useQueryClient();
  const [owned, setOwned] = useState<{
    session: WalletReadSession;
    gate: WalletReadAdmission;
    snapshot: ReadAdmissionSnapshot;
    capabilities: WalletReadCapabilities;
    capabilityBinding: WalletReadCapabilities;
  } | null>(null);
  const session = owned?.session ?? null;
  const profile = selection.state === "configured" ? selection.profile : null;
  const bindingKey = profile
    ? networkBindingKey(profile)
    : `wallet-rpc:${selection.state}`;
  useEffect(() => {
    if (!profile) {
      setOwned(null);
      return;
    }
    // Own the session in the effect so React StrictMode's cleanup cannot reuse a closed session.
    const next = new WalletReadSession(profile);
    const gate = new WalletReadAdmission(next);
    const capabilities = observeReadContracts
      ? validatingReadCapabilities(next)
      : unavailableReadCapabilities(next, "policy");
    const observation = new AbortController();
    let active = true;
    const retract = (all = false) => {
      const affected = new Set(
        client
          .getQueryCache()
          .getAll()
          .filter((query) => admissionQueryAffected(query, gate, all)),
      );
      const predicate = (query: Query) => affected.has(query);
      // Cancel and remove the captured exact set; a later gate transition cannot
      // widen this cleanup to other sessions/bindings or non-chain queries.
      void client.cancelQueries({ predicate });
      client.removeQueries({ predicate });
    };
    const unsubscribe = gate.subscribe(() => {
      if (!active) return;
      retract();
      setOwned((current) => {
        if (current?.session !== next) return current;
        const snapshot = gate.getSnapshot();
        // Once retracted, this observation cannot reappear merely because a later
        // empty storage capture succeeds. A new session needs a new observation.
        const capabilities =
          current.capabilities.phase === "read-contracts-assessed" &&
          (snapshot.view.phase !== "observed" || snapshot.view.blocked.length)
            ? Object.freeze<WalletReadCapabilities>({
                ...current.capabilityBinding,
                phase: "unavailable",
                reason:
                  snapshot.view.phase === "unavailable"
                    ? "transport"
                    : "policy",
              })
            : current.capabilities;
        return { ...current, snapshot, capabilities };
      });
    });
    setOwned({
      session: next,
      gate,
      snapshot: gate.getSnapshot(),
      capabilities,
      capabilityBinding: capabilities,
    });
    const stop = gate.start();
    // This observer owns its ticket independently of ordinary query cache retraction.
    if (observeReadContracts)
      void observeReadCapabilities(next, {
        signal: observation.signal,
        recoverOnly: observeReadContracts === "recover",
      }).then((result) => {
        if (!active) return;
        setOwned((current) =>
          current?.session === next
            ? { ...current, capabilities: result }
            : current,
        );
      });
    return () => {
      active = false;
      unsubscribe();
      stop();
      observation.abort();
      next.close();
      retract(true);
    };
  }, [profile, client, observeReadContracts]);
  const validSession =
    !!profile && !!session && session.bindingKey === bindingKey;
  const gate = validSession ? owned!.gate : null;
  const assetAllowed =
    !!gate && !owned!.snapshot.view.blocked.includes("assets");
  // Rotating the snapshot changes every asset query key. Let the current
  // bounded collection finish before background refresh can cancel its pages.
  const assetReads = useIsFetching({
    queryKey: [
      "wallet-assets",
      bindingKey,
      session?.cacheKey ?? "initializing",
    ],
  });
  // NFT views need continuing snapshots. Receipt coverage needs them only until
  // the receipt's checkpoint is covered; completed receipts must not keep an
  // unrelated NFT/Display snapshot polling in the background.
  const assetObservers = useSyncExternalStore(
    useCallback(
      (changed) =>
        client.getQueryCache().subscribe(notifyManager.batchCalls(changed)),
      [client],
    ),
    () =>
      client
        .getQueryCache()
        .findAll({
          queryKey: [
            "wallet-assets",
            bindingKey,
            session?.cacheKey ?? "initializing",
          ],
        })
        .filter((query) => query.isActive()).length +
      client
        .getQueryCache()
        .findAll({
          queryKey: [
            "wallet-receipt-indexing",
            bindingKey,
            session?.cacheKey ?? "initializing",
          ],
        })
        .filter((query) => query.isActive() && query.state.data !== true)
        .length,
  );
  const needsAssets = preloadAssets || assetObservers > 0;
  const fullnode = useMemo(
    () => (validSession ? new WalletFullnodeReader(session!) : null),
    [validSession, session],
  );
  const archiveObjects = useMemo(
    () =>
      validSession && session!.profile.endpoints.archiveGrpcWeb
        ? new WalletArchiveObjectReader(session!)
        : null,
    [validSession, session],
  );
  const indexed = useMemo(
    () =>
      validSession && session!.profile.endpoints.graphqlUrl
        ? new WalletIndexedLists(session!)
        : null,
    [validSession, session],
  );
  const transactions = useMemo(
    () => (validSession ? new WalletTransactionReader(session!) : null),
    [validSession, session],
  );
  const receipts = useMemo(
    () => (validSession ? new WalletLedgerReader(session!) : null),
    [validSession, session],
  );
  const names = useMemo(
    () => (validSession ? new WalletNameReader(session!) : null),
    [validSession, session],
  );
  const history = useMemo(
    () => (validSession ? new WalletAccountHistoryReader(session!) : null),
    [validSession, session],
  );
  const snapshotQuery = useQuery({
    queryKey: [
      "wallet-snapshot-admission",
      bindingKey,
      session?.cacheKey ?? "initializing",
      gate?.getSnapshot().view.keys.assets ?? "initializing",
    ],
    queryFn: ({ signal }) =>
      gate!.run(
        "assets",
        () => WalletAssetReader.open(session!, { signal }),
        signal,
      ),
    enabled: validSession && assetAllowed && needsAssets,
    retry: false,
    staleTime: 5_000,
    gcTime: 0,
    refetchInterval:
      needsAssets && validSession && assetReads === 0 ? 20_000 : false,
    refetchOnWindowFocus: needsAssets && assetReads === 0,
    refetchOnReconnect: needsAssets && assetReads === 0,
    meta: { skipPersistedCache: true, walletReadOperation: "assets" },
  });
  const reader =
    validSession && assetAllowed && !snapshotQuery.isError
      ? snapshotQuery.data
      : undefined;
  const value = useMemo<WalletRpc>(() => {
    if (selection.state !== "configured")
      return {
        state: selection.state,
        bindingKey,
        readSessionKey: bindingKey,
        assetSnapshotKey: `${bindingKey}:unadmitted`,
        hasFullnodeSession: false,
        probeEntryAccess: async () => {
          throw new Error(selection.message);
        },
        packages: {},
        message: selection.message,
        resolveRecipientName: async () => {
          throw new Error(selection.message);
        },
        readDefaultName: async () => {
          throw new Error(selection.message);
        },
        prepareTransaction: async () => {
          throw new Error(selection.message);
        },
        simulateTransaction: async () => {
          throw new Error(selection.message);
        },
        readTransactionDetails: async () => {
          throw new Error(selection.message);
        },
        readAccountHistory: async () => {
          throw new Error(selection.message);
        },
        readFreshObject: async () => {
          throw new Error(selection.message);
        },
        readFreshCoins: async () => {
          throw new Error(selection.message);
        },
        readFreshBalance: async () => {
          throw new Error(selection.message);
        },
        readFreshBalances: async () => {
          throw new Error(selection.message);
        },
        readStakingView: async () => {
          throw new Error(selection.message);
        },
        readCoinMetadata: async () => {
          throw new Error(selection.message);
        },
        readBalances: async () => {
          throw new Error(selection.message);
        },
        openAssetSnapshot: async () => {
          throw new Error(selection.message);
        },
        refreshAssets: async () => {
          throw new Error(selection.message);
        },
      };
    if (!validSession || (preloadAssets && snapshotQuery.isPending))
      return {
        state: "initializing",
        assetPreferenceScope: JSON.stringify([
          selection.profile.expectedGenesisDigest,
          selection.profile.generation,
        ]),
        bindingKey,
        readSessionKey: validSession
          ? session!.cacheKey
          : `${bindingKey}:initializing`,
        assetSnapshotKey: `${bindingKey}:initializing`,
        hasFullnodeSession: validSession,
        probeEntryAccess: async (signal) => {
          if (!validSession) throw new Error("钱包查询会话正在初始化");
          return probeEntryAccess(session!, signal);
        },
        readSentTransactions: indexed?.sentTransactions.bind(indexed),
        readIndexedEvents: indexed?.events.bind(indexed),
        packages: selection.profile.packages,
        faucetUrl: selection.profile.faucetUrl,
        resolveRecipientName: async (name, signal) => {
          if (!names) throw new Error("钱包查询会话正在初始化");
          return names.resolve(name, signal);
        },
        readDefaultName: async (address, signal) => {
          if (!names) throw new Error("钱包查询会话正在初始化");
          return names.defaultName(address, signal);
        },
        prepareTransaction: async (tx, owner, signal) => {
          if (!transactions) throw new Error("钱包查询会话正在初始化");
          return withPreparationGuard(
            session!,
            owner,
            () => transactions.prepare(tx, owner, signal),
            { signal },
          );
        },
        simulateTransaction: async (bytes, owner, signal) => {
          if (!transactions) throw new Error("钱包查询会话正在初始化");
          return withPreparationGuard(
            session!,
            owner,
            () => transactions.simulate(bytes, owner, signal),
            { signal },
          );
        },
        readTransactionDetails: async (digest, signal) => {
          if (!receipts) throw new Error("钱包查询会话正在初始化");
          return receipts.details(digest, signal);
        },
        readAccountHistory: async (address, signal, page) => {
          if (!history) throw new Error("钱包查询会话正在初始化");
          return page
            ? history.readPage(address, page.continuation, signal)
            : history.read(address, signal);
        },
        readHistoricalObjects: archiveObjects
          ? (selectors, signal) => archiveObjects.objects(selectors, signal)
          : undefined,
        readFreshObject: async (id, signal) => {
          if (!fullnode) throw new Error("钱包查询会话正在初始化");
          return fullnode.object(id, signal);
        },
        readFreshCoins: async (owner, type, signal) => {
          if (!fullnode) throw new Error("钱包查询会话正在初始化");
          return fullnode.coins(owner, type, signal);
        },
        readFreshBalance: async (owner, type, signal) => {
          if (!fullnode) throw new Error("钱包查询会话正在初始化");
          return fullnode.balance(owner, type, signal);
        },
        readFreshBalances: async (owner, signal) => {
          if (!fullnode) throw new Error("钱包查询会话正在初始化");
          return fullnode.balances(owner, signal);
        },
        readStakingView: async (owner, signal) => {
          if (!validSession) throw new Error("钱包查询会话正在初始化");
          return WalletStakingSnapshotReader.read(session!, owner, signal);
        },
        readCoinMetadata: async (type, signal) => {
          if (!validSession) throw new Error("钱包查询会话正在初始化");
          return WalletCoinMetadataReader.read(session!, type, signal);
        },
        readBalances: async (owner, signal) => {
          if (!validSession) throw new Error("钱包查询会话正在初始化");
          return WalletBalanceReader.read(session!, owner, signal);
        },
        openAssetSnapshot: async () => {
          throw new Error("钱包查询会话正在初始化");
        },
        refreshAssets: async () => {
          throw new Error("钱包查询会话正在初始化");
        },
      };
    return {
      // "configured" does not claim identity/schema/package/execution readiness.
      state: "configured",
      assetPreferenceScope: JSON.stringify([
        selection.profile.expectedGenesisDigest,
        selection.profile.generation,
      ]),
      bindingKey,
      readSessionKey: session!.cacheKey,
      hasFullnodeSession: true,
      probeEntryAccess: (signal) => probeEntryAccess(session!, signal),
      assetSnapshotKey:
        reader?.proof.cacheKey ??
        `${session!.cacheKey}:unadmitted:${snapshotQuery.errorUpdatedAt}`,
      readSentTransactions: indexed?.sentTransactions.bind(indexed),
      readIndexedEvents: indexed?.events.bind(indexed),
      packages: selection.profile.packages,
      faucetUrl: selection.profile.faucetUrl,
      resolveRecipientName: (name, signal) => names!.resolve(name, signal),
      readDefaultName: (address, signal) => names!.defaultName(address, signal),
      prepareTransaction: (tx, owner, signal) =>
        withPreparationGuard(
          session!,
          owner,
          () => transactions!.prepare(tx, owner, signal),
          { signal },
        ),
      simulateTransaction: (bytes, owner, signal) =>
        withPreparationGuard(
          session!,
          owner,
          () => transactions!.simulate(bytes, owner, signal),
          { signal },
        ),
      readTransactionDetails: (digest, signal) =>
        receipts!.details(digest, signal),
      readAccountHistory: (address, signal, page) =>
        page
          ? history!.readPage(address, page.continuation, signal)
          : history!.read(address, signal),
      readHistoricalObjects: archiveObjects
        ? (selectors, signal) => archiveObjects.objects(selectors, signal)
        : undefined,
      readFreshObject: (id, signal) => fullnode!.object(id, signal),
      readFreshCoins: (owner, type, signal) =>
        fullnode!.coins(owner, type, signal),
      readFreshBalance: (owner, type, signal) =>
        fullnode!.balance(owner, type, signal),
      readFreshBalances: (owner, signal) => fullnode!.balances(owner, signal),
      readStakingView: (owner, signal) =>
        WalletStakingSnapshotReader.read(session!, owner, signal),
      readCoinMetadata: (type, signal) =>
        WalletCoinMetadataReader.read(session!, type, signal),
      readBalances: (owner, signal) =>
        WalletBalanceReader.read(session!, owner, signal),
      openAssetSnapshot: async (signal) => {
        signal?.throwIfAborted();
        session!.assertActive();
        if (reader) return reader;
        if (snapshotQuery.error) throw snapshotQuery.error;
        // On-demand callers share React Query's existing in-flight admission.
        const result = await snapshotQuery.refetch({
          cancelRefetch: false,
          throwOnError: true,
        });
        signal?.throwIfAborted();
        session!.assertActive();
        if (!result.data) throw new Error("资产快照尚未准入");
        return result.data;
      },
      refreshAssets: async () => {
        await snapshotQuery.refetch({
          cancelRefetch: false,
          throwOnError: true,
        });
        session!.assertActive();
      },
    };
  }, [
    selection,
    archiveObjects,
    indexed,
    session,
    bindingKey,
    validSession,
    preloadAssets,
    reader,
    fullnode,
    transactions,
    receipts,
    names,
    history,
    snapshotQuery.isPending,
    snapshotQuery.error,
    snapshotQuery.errorUpdatedAt,
    snapshotQuery.refetch,
  ]);
  const guarded = useMemo(() => {
    if (!gate || !owned) return value;
    const { capabilities, snapshot } = owned;
    const readCapabilities = Object.freeze<WalletReadCapabilities>(
      snapshot.identityFault
        ? {
            ...owned.capabilityBinding,
            phase: "quarantined",
            role: snapshot.identityFault.role,
            reason: snapshot.identityFault.reason,
          }
        : snapshot.view.phase === "checking"
          ? {
              ...owned.capabilityBinding,
              phase: "validating",
            }
          : snapshot.view.phase === "unavailable" ||
              snapshot.view.blocked.length
            ? {
                ...owned.capabilityBinding,
                phase: "unavailable",
                reason:
                  snapshot.view.phase === "unavailable"
                    ? "transport"
                    : "policy",
              }
            : capabilities,
    );
    return guardWalletRpc({ ...value, readCapabilities }, gate);
  }, [value, gate, owned]);
  return createElement(WalletRpcContext.Provider, { value: guarded }, children);
}
