// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useElementDimensions } from "rtd-apps-core";
import { LoadingIndicator } from "@linku/ui";
import clsx from "clsx";
import { type ReactNode, useRef } from "react";

import Footer from "../footer/Footer";
import Header from "../header/Header";
import { useNetworkContext } from "~/context";
import { Banner } from "~/ui/Banner";
import { Network } from "~/utils/api/DefaultRpcClient";

export type PageLayoutProps = {
	gradient?: {
		content: ReactNode;
		size: "lg" | "md";
	};
	isError?: boolean;
	content: ReactNode;
	loading?: boolean;
};

const DEFAULT_HEADER_HEIGHT = 76;

export function PageLayout({ gradient, content, loading, isError }: PageLayoutProps) {
	const [network] = useNetworkContext();
	const isGradientVisible = !!gradient;
	const renderNetworkDegradeBanner = false;
	const headerRef = useRef<HTMLElement | null>(null);
	const [headerHeight] = useElementDimensions(headerRef, DEFAULT_HEADER_HEIGHT);

	const networkDegradeBannerCopy =
		network === String(Network.TESTNET)
			? "Rtd Explorer (Testnet) is currently under-going maintenance. Some data may be incorrect or missing."
			: "The explorer is running slower than usual. We're working to fix the issue and appreciate your patience.";

	return (
		<div className="explorer-shell">
			<section ref={headerRef} className="fixed top-0 z-30 flex w-full flex-col">
				{renderNetworkDegradeBanner && (
					<Banner rounded="none" align="center" variant="warning" fullWidth>
						<div className="break-normal">{networkDegradeBannerCopy}</div>
					</Banner>
				)}
				<Header />
			</section>

			{loading && (
				<div className="fixed left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
					<LoadingIndicator variant="lg" />
				</div>
			)}

			<main
				className="relative z-10"
				style={!isGradientVisible ? { paddingTop: `${headerHeight}px` } : undefined}
			>
				{isGradientVisible ? (
					<section
						style={{ paddingTop: `${headerHeight}px` }}
						className={clsx(
							"relative overflow-hidden",
							isError && "bg-gradients-failure",
						)}
					>
						<div
							className={clsx(
								"relative mx-auto max-w-[1440px]",
								gradient.size === "lg"
									? "px-4 pb-2 pt-8 sm:px-6 lg:pt-12 xl:px-10"
									: "px-4 pb-2 pt-6 sm:px-6 xl:px-10",
							)}
						>
							{gradient.content}
						</div>
					</section>
				) : null}

				{!loading && (
					<section
						className={clsx(
							"mx-auto max-w-[1440px] px-4 pb-16 sm:px-6 xl:px-10",
							isGradientVisible ? "pt-8 md:pt-10" : "pt-10 md:pt-12",
						)}
					>
						{content}
					</section>
				)}
			</main>

			<Footer />
		</div>
	);
}
