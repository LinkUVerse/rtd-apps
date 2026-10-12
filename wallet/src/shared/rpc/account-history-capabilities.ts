// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { createReadDeadline } from "./read-deadline";
import type { WalletHistoryCoverage } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { WalletAccountHistoryReader } from "./account-history-reader";
import {
  runAccountHistoryRead,
  WalletAccountHistoryTransportError,
  WalletAccountHistoryServiceError,
} from "./account-history-protocol";
import { walletAddress } from "./asset-address";
import { deploymentSha256 } from "./deployment-contract";
import { checkpointNumber, SnapshotReadError } from "./graphql-snapshot";
import { WalletHistoryError } from "./history-facts";
import { NetworkIdentityError } from "./identity";
import { WalletReadSession } from "./session";

type Window = Readonly<{
  checkpointLo: number;
  checkpointHi: number;
  checkpointDigest: string;
  allAccountActivityCertified: boolean;
}>;
type Assessment = Readonly<
  | { state: "unconfigured"; reason: "account-endpoint" | "native-endpoint" }
  | {
      state: "coverage-window-verified";
      window: Window;
      accountScope: "not-probed";
    }
  | {
      state: "scoped-window-verified";
      window: Window;
      accountSha256: string;
      snapshot: string;
      totalTransactions: number;
      coverage: WalletHistoryCoverage;
    }
  | { state: "syncing"; reason: "coverage" }
  | {
      state: "incomplete";
      reason: "response" | "changed" | "partial" | "budget";
    }
  | {
      state: "unavailable";
      reason: "transport" | "busy" | "dependency" | "upstream";
    }
>;
export type WalletAccountHistoryCapabilities = Assessment &
  Readonly<{
    bindingKey: string;
    readSessionKey: string;
    observedAt: number;
    protocol: "rtd-account-history-two-root";
    scope: "declared-fixed-window-union";
    snapshotVerification: "service-binding-only";
    cursorVerification: "service-authenticated-opaque";
    allAccountHistoryVerified: false;
  }>;
/** Coverage alone does not prove account pages. An explicit owner invokes the entire production paginated fact reader. */
export async function probeAccountHistoryCapabilities(
  session: WalletReadSession,
  options: {
    address?: string;
    minimumCheckpoint?: string;
    fetch?: typeof fetch;
    signal?: AbortSignal;
    timeoutMs?: number;
    pageSize?: number;
    maxPages?: number;
  } = {},
): Promise<WalletAccountHistoryCapabilities> {
  let disposeDeadline: (() => void) | undefined;
  return session
    .read(async (sessionSignal) => {
      const timeoutMs = options.timeoutMs ?? 30_000;
      if (
        !Number.isSafeInteger(timeoutMs) ||
        timeoutMs < 1 ||
        timeoutMs > 60_000
      )
        throw new RangeError("账户能力探测总期限必须在1–60000ms");
      const address =
        options.address === undefined
          ? undefined
          : walletAddress(options.address);
      const minimum =
        options.minimumCheckpoint === undefined
          ? undefined
          : checkpointNumber(options.minimumCheckpoint);
      const deadline = createReadDeadline(timeoutMs);
      disposeDeadline = deadline.dispose;
      const signal = AbortSignal.any([
        sessionSignal,
        deadline.signal,
        ...(options.signal ? [options.signal] : []),
      ]);
      const fence = () => {
        signal.throwIfAborted();
        session.assertActive();
      };
      const finish = (value: Assessment): WalletAccountHistoryCapabilities => {
        fence();
        return Object.freeze({
          ...value,
          bindingKey: session.bindingKey,
          readSessionKey: session.cacheKey,
          observedAt: Date.now(),
          protocol: "rtd-account-history-two-root",
          scope: "declared-fixed-window-union",
          snapshotVerification: "service-binding-only",
          cursorVerification: "service-authenticated-opaque",
          allAccountHistoryVerified: false,
        });
      };
      fence();
      if (!session.profile.endpoints.accountHistoryUrl)
        return finish({ state: "unconfigured", reason: "account-endpoint" });
      if (!session.profile.endpoints.graphqlUrl)
        return finish({ state: "unconfigured", reason: "native-endpoint" });
      try {
        if (address !== undefined) {
          const result = await new WalletAccountHistoryReader(session, {
            fetch: options.fetch,
            timeoutMs,
            pageSize: options.pageSize,
            maxPages: options.maxPages,
            minimumCheckpoint: options.minimumCheckpoint,
          }).read(address, signal);
          const accountSha256 = await deploymentSha256(
            new TextEncoder().encode(address),
          );
          fence();
          return finish({
            state: "scoped-window-verified",
            window: Object.freeze({
              checkpointLo: result.checkpointLo,
              checkpointHi: result.checkpointHi,
              checkpointDigest: result.checkpointDigest,
              allAccountActivityCertified:
                result.coverage.allAccountActivityCertified,
            }),
            accountSha256,
            snapshot: result.snapshot,
            totalTransactions: result.totalTransactions,
            coverage: result.coverage,
          });
        }
        const window = await runAccountHistoryRead(
          session,
          { fetch: options.fetch, timeoutMs, signal },
          (protocol) =>
            protocol.inWindow(
              async ({ coverage }) =>
                Object.freeze({
                  checkpointLo: coverage.lower,
                  checkpointHi: coverage.upper,
                  checkpointDigest: coverage.digest,
                  allAccountActivityCertified: coverage.certified,
                }),
              minimum,
            ),
        );
        return finish({
          state: "coverage-window-verified",
          window,
          accountScope: "not-probed",
        });
      } catch (error) {
        fence();
        if (error instanceof NetworkIdentityError) throw error;
        if (error instanceof RangeError) throw error;
        if (error instanceof SyntaxError)
          return finish({ state: "incomplete", reason: "response" });
        if (error instanceof WalletAccountHistoryTransportError)
          return finish({ state: "unavailable", reason: "transport" });
        if (error instanceof WalletAccountHistoryServiceError)
          return finish({ state: "unavailable", reason: error.reason });
        if (
          error instanceof WalletHistoryError ||
          error instanceof SnapshotReadError
        ) {
          if (error.reason === "coverage")
            return finish({ state: "syncing", reason: "coverage" });
          return finish({
            state: "incomplete",
            reason:
              error.reason === "changed"
                ? "changed"
                : error.reason === "partial"
                  ? "partial"
                  : error.reason === "budget"
                    ? "budget"
                    : "response",
          });
        }
        return finish({ state: "unavailable", reason: "transport" });
      }
    })
    .finally(() => disposeDeadline?.());
}
