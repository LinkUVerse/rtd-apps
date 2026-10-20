// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import "@fontsource-variable/inter";
import "@fontsource-variable/red-hat-mono";

import { ErrorBoundary } from "_components/error-boundary";
import { initAppType } from "_redux/slices/app";
import { WalletRpcProvider } from "_src/shared/rpc/WalletRpcProvider";
import {
  resolveNetworkProfile,
  type ProfileSelection,
} from "_src/shared/rpc/profile-registry";
import { networkBindingKey } from "_src/shared/rpc/profile";
import {
  shouldObserveReadCapabilities,
  shouldPreloadAssetSnapshot,
} from "_src/shared/rpc/read-capability-surface";
import { AppType, getFromLocationSearch } from "_redux/slices/app/AppType";
import { initAmplitude } from "_src/shared/analytics/amplitude";
import { setAttributes } from "_src/shared/experimentation/features";
import initSentry from "_src/ui/app/helpers/sentry";
import store from "_store";
import { thunkExtras } from "_store/thunk-extras";
import { GrowthBookProvider } from "@growthbook/growthbook-react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import cn from "clsx";
import {
  Fragment,
  StrictMode,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { HashRouter, useLocation } from "react-router-dom";

import App from "./app";
import { AccountsFormProvider } from "./app/components/accounts/AccountsFormContext";
import { UnlockAccountProvider } from "./app/components/accounts/UnlockAccountContext";
import { ZkLoginAccountWarningModal } from "./app/components/accounts/ZkLoginAccountWaringModal";
import { growthbook } from "./app/experimentation/feature-gating";
import { persister, queryClient } from "./app/helpers/queryClient";
import {
  QUERY_CACHE_BUSTER,
  queryDehydrateOptions,
} from "./app/helpers/queryPersistence";
import { useAppSelector } from "./app/hooks";
import { I18nProvider } from "./app/i18n";
import { ThemeProvider } from "./app/theme";

import "./styles/global.scss";
import "bootstrap-icons/font/bootstrap-icons.scss";

async function init() {
  if (process.env.NODE_ENV === "development") {
    Object.defineProperty(window, "store", { value: store });
  }
  store.dispatch(initAppType(getFromLocationSearch(window.location.search)));
  await thunkExtras.background.init(store.dispatch);
  const { apiEnv, customRPC } = store.getState().app;
  setAttributes({ apiEnv, customRPC });
}

function logPopupDebug(label: string) {
  console.info("[RTD Wallet UI Debug]", label, {
    href: window.location.href,
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    visibilityState: document.visibilityState,
  });
}

function renderApp() {
  logPopupDebug("popup page renderApp");
  for (const delayMs of [1000, 3000, 6000]) {
    window.setTimeout(
      () => logPopupDebug(`popup page still alive after ${delayMs}ms`),
      delayMs,
    );
  }
  window.addEventListener("click", () => logPopupDebug("popup page clicked"));
  const rootDom = document.getElementById("root");
  if (!rootDom) {
    throw new Error("Root element not found");
  }
  const root = createRoot(rootDom);
  root.render(
    <StrictMode>
      <Provider store={store}>
        <AppWrapper />
      </Provider>
    </StrictMode>,
  );
}

function WalletQuerySurface({
  selection,
  children,
}: {
  selection: ProfileSelection;
  children: ReactNode;
}) {
  const location = useLocation();
  const toolbarPopup = useAppSelector(
    (state) => state.app.appType === AppType.popup,
  );
  return (
    <WalletRpcProvider
      selection={selection}
      preloadAssets={shouldPreloadAssetSnapshot(location.pathname)}
      observeReadContracts={
        shouldObserveReadCapabilities(location.pathname, toolbarPopup)
          ? "recover"
          : false
      }
    >
      {children}
    </WalletRpcProvider>
  );
}

function AppWrapper() {
  const apiEnv = useAppSelector((state) => state.app.apiEnv);
  const customProfile = useAppSelector((state) => state.app.customProfile);
  const customRpcUrl = useAppSelector((state) => state.app.customRPC);
  // The local dev chain is discovered at runtime, so selection is asynchronous.
  // The previous selection stays until the next one resolves, which avoids
  // flashing an "unconfigured" surface on every network change or restart.
  const [selection, setSelection] = useState<ProfileSelection>({
    state: "unconfigured",
    message: "正在校验网络配置…",
  });
  useEffect(() => {
    let active = true;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let recheck: ReturnType<typeof setInterval> | undefined;
    const target =
      apiEnv === "customRPC"
        ? {
            env: apiEnv,
            customRpcUrl: customRpcUrl || "",
            profile: customProfile,
          }
        : { env: apiEnv, customRpcUrl: null };
    // `fresh` bypasses the discovery cache. The cache exists to keep one
    // authorization from probing every endpoint; re-checking an already
    // configured profile must not be answered from it, because a reset replaces
    // the chain while the previous digest is still cached.
    const load = (fresh = false) => {
      void resolveNetworkProfile(
        target,
        process.env.WALLET_NETWORK_PROFILES,
        fresh ? { fresh: true } : {},
      ).then((next) => {
        if (!active) return;
        // Keep the current selection when the chain binding is unchanged: the
        // selection owns the read session, and replacing an equal profile would
        // tear down every session on each poll.
        setSelection((current) =>
          current.state === "configured" &&
          next.state === "configured" &&
          networkBindingKey(current.profile) === networkBindingKey(next.profile)
            ? current
            : next,
        );
        // The local dev stack can start after the wallet does; keep probing until
        // it answers.
        if (next.state !== "configured" && apiEnv === "local") {
          if (retry) clearTimeout(retry);
          retry = setTimeout(() => load(), 3_000);
        }
      });
    };
    load();
    // A long-lived panel keeps the profile it resolved at mount, and a reset
    // does not change any dependency of this effect, so nothing would ever
    // re-read the chain. Poll the loopback endpoints and adopt a new binding as
    // soon as one appears; the binding keys on the genesis digest, so this is
    // also what invalidates the stored read observations of the old chain.
    if (apiEnv === "local") recheck = setInterval(() => load(true), 10_000);
    return () => {
      active = false;
      if (retry) clearTimeout(retry);
      if (recheck) clearInterval(recheck);
    };
  }, [apiEnv, customProfile, customRpcUrl]);
  const network = useAppSelector(
    ({ app: { apiEnv, customRPC } }) => `${apiEnv}_${customRPC}`,
  );
  const isFullscreen = useAppSelector(
    (state) => state.app.appType === AppType.fullscreen,
  );
  return (
    <I18nProvider>
      <ThemeProvider>
        <GrowthBookProvider growthbook={growthbook}>
          <HashRouter>
            <Fragment key={network}>
              <PersistQueryClientProvider
                client={queryClient}
                persistOptions={{
                  persister,
                  buster: QUERY_CACHE_BUSTER,
                  dehydrateOptions: queryDehydrateOptions,
                }}
              >
                <WalletQuerySurface selection={selection}>
                  <AccountsFormProvider>
                    <UnlockAccountProvider>
                      <div
                        className={cn(
                          "relative flex flex-col flex-nowrap items-center justify-center w-popup-width min-h-popup-minimum max-h-popup-height h-screen overflow-hidden",
                          isFullscreen && "shadow-lg rounded-xl",
                        )}
                      >
                        <ErrorBoundary>
                          <App />
                          <ZkLoginAccountWarningModal />
                        </ErrorBoundary>
                        <div id="overlay-portal-container"></div>
                        <div id="toaster-portal-container"></div>
                      </div>
                    </UnlockAccountProvider>
                  </AccountsFormProvider>
                </WalletQuerySurface>
              </PersistQueryClientProvider>
            </Fragment>
          </HashRouter>
        </GrowthBookProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

(async () => {
  await init();
  initSentry();
  initAmplitude();
  renderApp();
})();
