// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { walletReadErrorMessage } from "_src/shared/rpc/read-error";

import { useGetAllBalances } from "_app/hooks/useGetAllBalances";
import { moveType } from "_src/shared/rpc/asset-reader";
import { useIsWalletDefiEnabled } from "_app/hooks/useIsWalletDefiEnabled";
import { useI18n } from "_app/i18n";
import { LargeButton } from "_app/shared/LargeButton";
import { Text } from "_app/shared/text";
import { ButtonOrLink } from "_app/shared/utils/ButtonOrLink";
import Alert from "_components/alert";
import { CoinIcon } from "_components/coin-icon";
import Loading from "_components/loading";
import { filterAndSortTokenBalances } from "_helpers";
import { useAppSelector, useSortedCoinsByCategories } from "_hooks";
import { UsdcPromoBanner } from "_pages/home/usdc-promo/UsdcPromoBanner";
import { ampli } from "_src/shared/analytics/ampli";
import { API_ENV } from "_src/shared/api-env";
import { FEATURES } from "_src/shared/experimentation/features";
import { AccountsList } from "_src/ui/app/components/accounts/AccountsList";
import { UnlockAccountButton } from "_src/ui/app/components/accounts/UnlockAccountButton";
import { BuyNLargeHomePanel } from "_src/ui/app/components/buynlarge/HomePanel";
import { useActiveAccount } from "_src/ui/app/hooks/useActiveAccount";
import { useCoinMetadataOverrides } from "_src/ui/app/hooks/useCoinMetadataOverride";
import { usePinnedCoinTypes } from "_src/ui/app/hooks/usePinnedCoinTypes";
import FaucetRequestButton from "_src/ui/app/shared/faucet/FaucetRequestButton";
import PageTitle from "_src/ui/app/shared/PageTitle";
import { useFeature } from "@growthbook/growthbook-react";
import { useAppsBackend } from "rtd-apps-core/src/hooks/useAppsBackend";
import { useBalanceInUSD } from "rtd-apps-core/src/rpc/price";
import { useCoinMetadata, useFormatCoin } from "rtd-apps-core/src/rpc/coin";
import {
  Info12,
  Pin16,
  Unpin16,
  WalletActionSend24,
  WalletActionSwap24,
  WalletActionStake24,
  WalletActionBuy24,
} from "rtd-apps-icons";
import { type RtdClientTypes } from "rtd-typescript/client";
import {
  formatAddress,
  parseStructTag,
  RTD_TYPE_ARG,
} from "rtd-typescript/utils";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { useEffect, useState, type ReactNode } from "react";

import Interstitial, { type InterstitialConfig } from "../interstitial";
import { useOnrampProviders } from "../onramp/useOnrampProviders";
import { CoinBalance } from "./coin-balance";
import * as styles from "./Home.module.scss";
import { TokenLink } from "./TokenLink";
import { TokenList } from "./TokenList";

type TokenDetailsProps = {
  coinType?: string;
};

type CoinBalanceType = RtdClientTypes.Balance;

function PinButton({
  unpin,
  onClick,
}: {
  unpin?: boolean;
  onClick: () => void;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="border-none bg-transparent text-transparent group-hover/coin:text-steel hover:!text-hero cursor-pointer"
      aria-label={unpin ? t("tokens.unpin") : t("tokens.pin")}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
    >
      {unpin ? <Unpin16 /> : <Pin16 />}
    </button>
  );
}

function TokenRowButton({
  coinBalance,
  children,
  to,
  onClick,
}: {
  coinBalance: CoinBalanceType;
  children: ReactNode;
  to: string;
  onClick?: () => void;
}) {
  return (
    <ButtonOrLink
      to={to}
      key={coinBalance.coinType}
      onClick={onClick}
      className="no-underline text-subtitle font-medium text-steel hover:font-semibold hover:text-hero"
    >
      {children}
    </ButtonOrLink>
  );
}

export function TokenRow({
  coinBalance,
  renderActions,
  onClick,
}: {
  coinBalance: CoinBalanceType;
  renderActions?: boolean;
  onClick?: () => void;
}) {
  const { locale, t } = useI18n();
  const coinType = coinBalance.coinType;
  const balance = BigInt(coinBalance.balance);
  const [formatted, symbol, { data: coinMeta }] = useFormatCoin(
    balance,
    coinType,
  );
  const Tag = onClick ? "button" : "div";
  const params = new URLSearchParams({
    type: coinBalance.coinType,
  });

  const balanceInUsd = useBalanceInUSD(
    coinBalance.coinType,
    coinBalance.balance,
  );

  const coinMetadataOverrides = useCoinMetadataOverrides();
  return (
    <Tag
      className={clsx(
        "group flex py-3 pl-1.5 pr-2 rounded hover:bg-rtd/10 items-center bg-transparent border-transparent",
        onClick && "hover:cursor-pointer",
      )}
      onClick={onClick}
    >
      <div className="flex gap-2.5">
        <CoinIcon coinType={coinType} size="md" />
        <div className="flex flex-col gap-1 items-start">
          <Text variant="body" color="gray-90" weight="semibold" truncate>
            {coinMetadataOverrides[coinBalance.coinType]?.name ||
              coinMeta?.name ||
              symbol}
          </Text>

          {renderActions && (
            <div className="group-hover:hidden">
              <Text variant="subtitle" color="steel-dark" weight="medium">
                {symbol}
              </Text>
            </div>
          )}

          {renderActions ? (
            <div className="group-hover:flex hidden gap-2.5 items-center">
              <TokenRowButton
                coinBalance={coinBalance}
                to={`/send?${params.toString()}`}
                onClick={() =>
                  ampli.selectedCoin({
                    coinType: coinBalance.coinType,
                    totalBalance: Number(formatted),
                    sourceFlow: "TokenDetails",
                  })
                }
              >
                {t("tokens.send")}
              </TokenRowButton>
              <TokenRowButton
                coinBalance={coinBalance}
                to={`/swap?${params.toString()}`}
                onClick={() => {
                  ampli.clickedSwapCoin({
                    coinType: coinBalance.coinType,
                    totalBalance: Number(formatted),
                    sourceFlow: "TokenRow",
                  });
                }}
              >
                {t("tokens.swap")}
              </TokenRowButton>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1 items-start">
              <Text variant="subtitleSmall" weight="semibold" color="gray-90">
                {symbol}
              </Text>
              <Text variant="subtitleSmall" weight="medium" color="steel-dark">
                {formatAddress(coinType)}
              </Text>
            </div>
          )}
        </div>
      </div>

      <div className="ml-auto flex flex-col items-end gap-1">
        {balance > 0n && (
          <Text
            variant="body"
            color="gray-90"
            weight="medium"
            className="text-end"
          >
            {formatted} {symbol}
          </Text>
        )}

        {balanceInUsd && balanceInUsd > 0 ? (
          <Text variant="subtitle" color="steel-dark" weight="medium">
            {Number(balanceInUsd).toLocaleString(locale, {
              style: "currency",
              currency: "USD",
            })}
          </Text>
        ) : null}
      </div>
    </Tag>
  );
}

export function MyTokens({
  coinBalances,
  isLoading,
  isFetched,
}: {
  coinBalances: CoinBalanceType[];
  isLoading: boolean;
  isFetched: boolean;
}) {
  const { t } = useI18n();
  const isDefiWalletEnabled = useIsWalletDefiEnabled();
  const apiEnv = useAppSelector(({ app }) => app.apiEnv);

  const [_, { pinCoinType, unpinCoinType }] = usePinnedCoinTypes();

  const { recognized, pinned, unrecognized } =
    useSortedCoinsByCategories(coinBalances);

  // Avoid perpetual loading state when fetching and retry keeps failing; add isFetched check.
  const isFirstTimeLoading = isLoading && !isFetched;

  return (
    <Loading loading={isFirstTimeLoading}>
      {recognized.length > 0 && (
        <TokenList title={t("tokens.myCoins")} defaultOpen>
          {recognized.map((coinBalance) =>
            isDefiWalletEnabled ? (
              <TokenRow
                renderActions
                key={coinBalance.coinType}
                coinBalance={coinBalance}
              />
            ) : (
              <TokenLink key={coinBalance.coinType} coinBalance={coinBalance} />
            ),
          )}
        </TokenList>
      )}

      {pinned.length > 0 && (
        <TokenList title={t("tokens.pinnedCoins")} defaultOpen>
          {pinned.map((coinBalance) => (
            <TokenLink
              key={coinBalance.coinType}
              coinBalance={coinBalance}
              centerAction={
                <PinButton
                  unpin
                  onClick={() => {
                    ampli.unpinnedCoin({ coinType: coinBalance.coinType });
                    unpinCoinType(coinBalance.coinType);
                  }}
                />
              }
            />
          ))}
        </TokenList>
      )}

      {unrecognized.length > 0 && (
        <TokenList
          title={
            unrecognized.length === 1
              ? t("tokens.unrecognizedCoin", { count: unrecognized.length })
              : t("tokens.unrecognizedCoins", { count: unrecognized.length })
          }
          defaultOpen={apiEnv !== API_ENV.mainnet}
        >
          {unrecognized.map((coinBalance) => (
            <TokenLink
              key={coinBalance.coinType}
              coinBalance={coinBalance}
              subtitle={t("tokens.send")}
              centerAction={
                <PinButton
                  onClick={() => {
                    ampli.pinnedCoin({ coinType: coinBalance.coinType });
                    pinCoinType(coinBalance.coinType);
                  }}
                />
              }
            />
          ))}
        </TokenList>
      )}
    </Loading>
  );
}

function getMostNestedName(parsed: ReturnType<typeof parseStructTag>) {
  if (parsed.typeParams.length === 0) {
    return parsed.name;
  }

  if (typeof parsed.typeParams[0] === "string") {
    return parsed.typeParams[0];
  }

  return getMostNestedName(parsed.typeParams[0]);
}

function getFallbackSymbol(coinType: string) {
  const parsed = parseStructTag(coinType);
  return getMostNestedName(parsed);
}

function TokenDetails({ coinType }: TokenDetailsProps) {
  const { t } = useI18n();
  const isDefiWalletEnabled = useIsWalletDefiEnabled();
  const [interstitialDismissed, setInterstitialDismissed] =
    useState<boolean>(false);
  const activeCoinType = moveType(coinType || RTD_TYPE_ARG);
  const activeAccount = useActiveAccount();
  const activeAccountAddress = activeAccount?.address;

  const {
    data: allBalances,
    isError,
    error: balanceError,
    readBlocked: balancesReadBlocked,
    readChecking: balancesReadChecking,
    isFetching,
    refetch,
    isPending,
    isFetched,
  } = useGetAllBalances(activeAccountAddress || "");
  // A zero is justified only by the complete, admitted balance set.
  const coinBalance = allBalances
    ? (allBalances.find((balance) => balance.coinType === activeCoinType) ?? {
        coinType: activeCoinType,
        balance: "0",
        coinBalance: "0",
        addressBalance: "0",
      })
    : undefined;

  const { apiEnv } = useAppSelector((state) => state.app);
  const isMainnet = apiEnv === API_ENV.mainnet;
  const { request } = useAppsBackend();
  const { data } = useQuery({
    queryKey: ["apps-backend", "monitor-network"],
    queryFn: () =>
      request<{ degraded: boolean }>("monitor-network", {
        project: "WALLET",
      }),
    // Keep cached for 2 minutes:
    staleTime: 2 * 60 * 1000,
    retry: false,
    enabled: false, // Temporarily disabled due to API endpoint issues
  });

  const coinBalances = allBalances
    ? filterAndSortTokenBalances(allBalances)
    : undefined;
  const coinBalancesLoading = isPending;
  const coinBalancesFetched = isFetched;

  const walletInterstitialConfig = useFeature<InterstitialConfig>(
    FEATURES.WALLET_INTERSTITIAL_CONFIG,
  ).value;

  const { providers } = useOnrampProviders();

  const tokenBalance = BigInt(coinBalance?.balance ?? 0);
  const [formatted] = useFormatCoin(tokenBalance, activeCoinType);

  const { data: coinMetadata } = useCoinMetadata(activeCoinType);
  const coinSymbol = coinMetadata
    ? coinMetadata.symbol
    : getFallbackSymbol(activeCoinType);

  // Avoid perpetual loading state when fetching and retry keeps failing add isFetched check
  const isFirstTimeLoading = isPending && !isFetched;

  useEffect(() => {
    const dismissed =
      walletInterstitialConfig?.dismissKey &&
      localStorage.getItem(walletInterstitialConfig.dismissKey);
    setInterstitialDismissed(dismissed === "true");
  }, [walletInterstitialConfig?.dismissKey]);

  if (
    navigator.userAgent !== "Playwright" &&
    walletInterstitialConfig?.enabled &&
    !interstitialDismissed
  ) {
    return (
      <Interstitial
        {...walletInterstitialConfig}
        onClose={() => {
          setInterstitialDismissed(true);
        }}
      />
    );
  }
  const accountHasRtd = coinBalances?.some(
    ({ coinType, balance }) =>
      moveType(coinType) === moveType(RTD_TYPE_ARG) && BigInt(balance) > 0n,
  );

  if (!activeAccountAddress) {
    return null;
  }
  // Unlocking is local. A slow, blocked or failed balance read must never hide
  // this action behind network loading (including focus-triggered revalidation).
  if (activeAccount.isLocked)
    return (
      <div className={styles.page}>
        <AccountsList />
        <UnlockAccountButton account={activeAccount} />
      </div>
    );
  if (balancesReadBlocked)
    return (
      <div className={styles.page}>
        <AccountsList />
        {balancesReadChecking ? (
          <div className={styles.notice} role="status" aria-live="polite">
            {t("tokens.balanceChecking")}
          </div>
        ) : (
          <Alert>{t("tokens.balanceAdmissionBlocked")}</Alert>
        )}
      </div>
    );
  if (isError)
    return (
      <div className={styles.page}>
        <AccountsList />
        <Alert>{walletReadErrorMessage(balanceError)}</Alert>
        <button
          type="button"
          className={styles.retry}
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          {t("tokens.balanceRetry")}
        </button>
      </div>
    );
  return (
    <div className={styles.page}>
      {isMainnet && data?.degraded && (
        <div className="rounded-2xl bg-warning-light border border-solid border-warning-dark/20 text-warning-dark flex items-center py-2 px-3 mb-4">
          <Info12 className="shrink-0" />
          <div className="ml-2">
            <Text variant="pBodySmall" weight="medium">
              {t("tokens.degraded")}
            </Text>
          </div>
        </div>
      )}

      <AccountsList />
      {isFetching && allBalances && (
        <div className={styles.notice} role="status" aria-live="polite">
          {t("tokens.balanceRefreshing")}
        </div>
      )}
      <Loading loading={isFirstTimeLoading}>
        {coinType && <PageTitle title={coinSymbol} back="/tokens" />}

        <div className={styles.content} data-testid="coin-page">
          <BuyNLargeHomePanel />
          <UsdcPromoBanner />

          <div className="flex flex-col w-full">
            {activeAccount.isLocked ? null : (
              <>
                <div data-testid="coin-balance" className={styles.balanceCard}>
                  <div className={styles.balanceHeading}>
                    <span className={styles.eyebrow}>
                      {t("tokens.balanceLabel")}
                    </span>
                    <CoinBalance amount={tokenBalance} type={activeCoinType} />
                  </div>

                  {!accountHasRtd ? (
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col flex-nowrap justify-center items-center text-center px-2.5">
                        <Text
                          variant="pBodySmall"
                          color="gray-80"
                          weight="normal"
                        >
                          {isMainnet ? t("tokens.buyRtd") : t("tokens.needRtd")}
                        </Text>
                      </div>
                      <FaucetRequestButton />
                    </div>
                  ) : null}
                  {isError ? (
                    <Alert>
                      <div>
                        <strong>{t("tokens.balanceError")}</strong>
                      </div>
                    </Alert>
                  ) : null}
                  <div className={styles.actions}>
                    {isMainnet ? (
                      <LargeButton
                        spacing="sm"
                        before={<WalletActionBuy24 aria-hidden="true" />}
                        className={
                          !accountHasRtd && isMainnet
                            ? "col-span-3 !bg-hero-dark !text-white"
                            : ""
                        }
                        primary={!accountHasRtd}
                        center
                        to="/onramp"
                        disabled={
                          (coinType && coinType !== RTD_TYPE_ARG) ||
                          !providers?.length
                        }
                      >
                        {t("tokens.buy")}
                      </LargeButton>
                    ) : null}

                    <LargeButton
                      center
                      data-testid="send-coin-button"
                      className={styles.sendAction}
                      before={<WalletActionSend24 aria-hidden="true" />}
                      to={`/send${
                        coinBalance?.coinType
                          ? `?${new URLSearchParams({
                              type: coinBalance.coinType,
                            }).toString()}`
                          : ""
                      }`}
                      disabled={!tokenBalance}
                    >
                      {t("tokens.send")}
                    </LargeButton>

                    <LargeButton
                      center
                      before={<WalletActionSwap24 aria-hidden="true" />}
                      disabled={!isDefiWalletEnabled || !tokenBalance}
                      to={`/swap${
                        coinBalance?.coinType
                          ? `?${new URLSearchParams({
                              type: coinBalance.coinType,
                            }).toString()}`
                          : ""
                      }`}
                      onClick={() => {
                        if (!coinBalance) {
                          return;
                        }

                        ampli.clickedSwapCoin({
                          coinType: coinBalance.coinType,
                          totalBalance: Number(formatted),
                          sourceFlow: "LargeButton-TokenDetails",
                        });
                      }}
                    >
                      {t("tokens.swap")}
                    </LargeButton>
                    <LargeButton
                      to="/stake"
                      center
                      data-testid="stake-management-button"
                      before={<WalletActionStake24 aria-hidden="true" />}
                    >
                      {t("tokens.stake")}
                    </LargeButton>
                  </div>
                  <div
                    className={styles.availability}
                    data-testid="action-availability"
                  >
                    {!tokenBalance && <p>{t("tokens.sendNeedsBalance")}</p>}
                    {!isDefiWalletEnabled && (
                      <p>{t("tokens.swapUnavailable")}</p>
                    )}
                    <p>{t("tokens.stakeManagementHint")}</p>
                  </div>
                </div>
              </>
            )}
          </div>
          {activeAccount.isLocked ? (
            <UnlockAccountButton account={activeAccount} />
          ) : (
            <MyTokens
              coinBalances={coinBalances ?? []}
              isLoading={coinBalancesLoading}
              isFetched={coinBalancesFetched}
            />
          )}
        </div>
      </Loading>
    </div>
  );
}

export default TokenDetails;
