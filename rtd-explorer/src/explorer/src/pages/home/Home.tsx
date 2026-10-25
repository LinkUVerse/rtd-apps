// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";

import { Activity } from "~/components/Activity";
import { DataSourcesCard } from "~/components/DataSourcesCard";
import { CurrentEpoch, OnTheNetwork } from "~/components/HomeMetrics";
import { PageLayout } from "~/components/Layout/PageLayout";
import { ErrorBoundary } from "~/components/error-boundary/ErrorBoundary";
import { TopValidatorsCard } from "~/components/top-validators-card/TopValidatorsCard";
import { useExplorerClient, useExplorerQuery } from "~/rpc/explorer-client";
import { useI18n } from "~/i18n";
import { TabHeader } from "~/ui/Tabs";
import { LinkWithQuery } from "~/ui/utils/LinkWithQuery";

const TRANSACTIONS_LIMIT = 25;

const countFormatter = new Intl.NumberFormat("en-US");

function formatCount(value: string | number | bigint | undefined | null) {
	if (value === undefined || value === null) return "—";
	try {
		return countFormatter.format(BigInt(value));
	} catch {
		return "—";
	}
}

function HeroStat({
	label,
	value,
	detail,
}: {
	label: string;
	value: string;
	detail: string;
}) {
	return (
		<div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-4 backdrop-blur-sm transition-colors duration-200 hover:bg-white/[0.09]">
			<div className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-white/45">
				{label}
			</div>
			<div className="mono-num mt-2 truncate text-[22px] font-semibold leading-none text-white">
				{value}
			</div>
			<div className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-white/30">
				{detail}
			</div>
		</div>
	);
}

function HomeHero() {
	const { t, locale } = useI18n();
	const client = useExplorerClient();
	const { data: checkpoint } = useExplorerQuery("getLatestCheckpointSequenceNumber");
	const { data: systemState } = useExplorerQuery("getLatestRtdSystemState");
	const { data: referenceGasPrice } = useExplorerQuery("getReferenceGasPrice");
	const { data: totalTransactions } = useQuery({
		queryKey: ["transactions", "count"],
		queryFn: () => client.getTotalTransactionBlocks(),
		gcTime: 24 * 60 * 60 * 1000,
		staleTime: Infinity,
		retry: false,
	});

	const epoch =
		systemState?.epoch !== undefined ? formatCount(systemState.epoch) : "—";

	return (
		<section className="relative isolate overflow-hidden rounded-4xl bg-hero-ink px-6 py-10 text-white shadow-glass sm:px-10 lg:px-14 lg:py-14">
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 bg-[radial-gradient(720px_360px_at_10%_0%,rgba(59,130,246,0.38),transparent_68%),radial-gradient(560px_320px_at_100%_100%,rgba(217,119,6,0.18),transparent_65%)]"
			/>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full border border-white/10"
			/>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute -bottom-40 right-24 h-96 w-96 rounded-full border border-white/[0.06]"
			/>

			<div className="relative grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-center lg:gap-14">
				<div>
					<div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">
						<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
						{t("RTD network · live index")}
					</div>
					<h1
						className={clsx(
							"mt-5 max-w-2xl font-semibold",
							locale === "zh"
								? "text-[30px] leading-[1.16] tracking-[-0.02em] sm:text-[38px] lg:text-[44px]"
								: "text-[34px] leading-[1.06] tracking-[-0.035em] sm:text-[44px] lg:text-[52px]",
						)}
					>
						{locale === "zh" ? (
							<>
								<span className="block">{t("Every block, object and transfer")}</span>
								<span className="block text-white/45">{t(" — in one clear view.")}</span>
							</>
						) : (
							<>
								{t("Every block, object and transfer")}
								<span className="text-white/45">{t(" — in one clear view.")}</span>
							</>
						)}
					</h1>
					<p className="mt-5 max-w-xl text-[14px] leading-relaxed text-white/60 sm:text-[15px]">
						{t(
							"Current state streams from Fullnode gRPC. Certified history is indexed by the RTD archive and served over GraphQL, so every checkpoint and transaction stays verifiable.",
						)}
					</p>
					<div className="mt-8 flex flex-wrap items-center gap-3">
						<LinkWithQuery to="/recent" className="hero-link-solid">
							{t("Browse activity")}
							<span aria-hidden="true">→</span>
						</LinkWithQuery>
						<LinkWithQuery to="/validators" className="hero-link">
							{t("Validator set")}
						</LinkWithQuery>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-3">
					<HeroStat
						label={t("Latest checkpoint")}
						value={formatCount(checkpoint)}
						detail={t("Certified height")}
					/>
					<HeroStat
						label={t("Current epoch")}
						value={epoch}
						detail={t("Live epoch")}
					/>
					<HeroStat
						label={t("Transactions")}
						value={formatCount(totalTransactions)}
						detail={t("Total executed")}
					/>
					<HeroStat
						label={t("Reference gas")}
						value={
							typeof referenceGasPrice === "bigint"
								? countFormatter.format(referenceGasPrice)
								: "—"
						}
						detail={t("MIST per unit")}
					/>
				</div>
			</div>
		</section>
	);
}

function Home() {
	const { t } = useI18n();
	const isRtdTokenCardEnabled = false;
	return (
		<PageLayout
			gradient={{
				content: (
					<div data-testid="home-page" className="space-y-6">
						<HomeHero />
						<div
							className={clsx(
								"home-page-grid-container-top",
								isRtdTokenCardEnabled && "with-token",
							)}
						>
							<div style={{ gridArea: "network" }} className="overflow-hidden">
								<OnTheNetwork />
							</div>
							<div style={{ gridArea: "epoch" }}>
								<CurrentEpoch />
							</div>
							<div style={{ gridArea: "polymedia" }}>
								<DataSourcesCard />
							</div>
						</div>
					</div>
				),
				size: "lg",
			}}
			content={
				<div className="home-page-grid-container-bottom">
					<div
						id="activity"
						style={{ gridArea: "activity" }}
						className="glass-panel scroll-mt-28 p-5 sm:p-7"
					>
						<ErrorBoundary>
							<Activity initialLimit={TRANSACTIONS_LIMIT} disablePagination />
						</ErrorBoundary>
					</div>
					<div
						data-testid="validators-table"
						id="validators"
						style={{ gridArea: "validators" }}
						className="glass-panel scroll-mt-28 p-5 sm:p-7"
					>
						<TabHeader title={t("Validators")}>
							<ErrorBoundary>
								<TopValidatorsCard limit={10} showIcon />
							</ErrorBoundary>
						</TabHeader>
					</div>
				</div>
			}
		/>
	);
}

export default Home;
