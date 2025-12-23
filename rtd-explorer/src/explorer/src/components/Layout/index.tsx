// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RtdClientProvider, WalletProvider } from "rtd-dapp-kit";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Fragment } from "react";
import { resolveValue, Toaster, type ToastType } from "react-hot-toast";
import { Outlet, ScrollRestoration } from "react-router-dom";

import { NetworkContext, useNetwork } from "~/context";
import { Banner, type BannerProps } from "~/ui/Banner";
import { type Network, NetworkConfigs, createRtdClient } from "~/utils/api/DefaultRpcClient";
import { KioskClientProvider } from "rtd-apps-core/src/components/KioskClientProvider";

const toastVariants: Partial<Record<ToastType, BannerProps["variant"]>> = {
	success: "positive",
	error: "error",
};

export function Layout() {
	const [network, setNetwork] = useNetwork();

	return (
		// NOTE: We set a top-level key here to force the entire react tree to be re-created when the network changes:
		<Fragment key={network}>
			<ScrollRestoration />
			<RtdClientProvider
				networks={NetworkConfigs}
				createClient={createRtdClient}
				network={network as Network}
				onNetworkChange={setNetwork}
			>
				<WalletProvider autoConnect enableUnsafeBurner={import.meta.env.DEV}>
					<KioskClientProvider>
						<NetworkContext.Provider value={[network, setNetwork]}>
							<Outlet />
							<Toaster
								position="bottom-center"
								gutter={8}
								containerStyle={{
									top: 40,
									left: 40,
									bottom: 40,
									right: 40,
								}}
								toastOptions={{
									duration: 4000,
								}}
							>
								{(toast) => (
									<Banner shadow border variant={toastVariants[toast.type]}>
										{resolveValue(toast.message, toast)}
									</Banner>
								)}
							</Toaster>
							<ReactQueryDevtools />
						</NetworkContext.Provider>
					</KioskClientProvider>
				</WalletProvider>
			</RtdClientProvider>
		</Fragment>
	);
}
