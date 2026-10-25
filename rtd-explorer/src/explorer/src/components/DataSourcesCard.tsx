// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import clsx from "clsx";

import { Card } from "~/ui/Card";
import { useNetworkContext } from "~/context";
import { useI18n } from "~/i18n";
import { Network } from "~/utils/api/DefaultRpcClient";

const SOURCES = [
	{
		name: "Fullnode gRPC",
		role: "Current state",
		detail: "Objects, balances, epochs and transaction submission.",
		tone: "bg-emerald-500",
	},
	{
		name: "Archive GraphQL",
		role: "Certified history",
		detail: "Checkpoints, transactions and events from the archive index.",
		tone: "bg-rtd",
	},
	{
		name: "Account GraphQL",
		role: "Wallet activity",
		detail: "Per-account transaction and balance history for connected wallets.",
		tone: "bg-amber-500",
	},
];

const NETWORK_LABEL: Record<string, string> = {
	[Network.MAINNET]: "Mainnet",
	[Network.TESTNET]: "Testnet",
	[Network.DEVNET]: "Devnet",
	[Network.LOCAL]: "Local",
};

export function DataSourcesCard() {
	const [network] = useNetworkContext();
	const { t } = useI18n();
	const label = t(
		NETWORK_LABEL[network] ??
			(network.toLowerCase().includes("127.0.0.1") ||
			network.toLowerCase().includes("localhost")
				? "Custom RPC"
				: "Custom RPC"),
	);

	return (
		<Card bg="white/80" spacing="lg" height="full" className="flex flex-col">
			<div className="flex items-start justify-between gap-4">
				<div>
					<div className="section-kicker">{t("Index topology")}</div>
					<h3 className="mt-2 text-[19px] font-semibold tracking-[-0.01em] text-ink">
						{t("Data sources")}
					</h3>
				</div>
				<span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-700">
					<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
					{label}
				</span>
			</div>

			<ul className="mt-5 flex flex-1 flex-col gap-2.5">
				{SOURCES.map(({ name, role, detail, tone }) => (
					<li
						key={name}
						className="flex items-start gap-3 rounded-2xl border border-line/70 bg-white/70 px-3.5 py-3"
					>
						<span
							className={clsx(
								"mt-1.5 h-2 w-2 shrink-0 rounded-full ring-4 ring-white",
								tone,
							)}
						/>
						<div className="min-w-0">
							<div className="flex flex-wrap items-baseline gap-x-2">
								<span className="text-[13px] font-semibold text-ink">{t(name)}</span>
								<span className="font-mono text-[9px] uppercase tracking-[0.12em] text-steel">
									{t(role)}
								</span>
							</div>
							<p className="mt-0.5 text-[12px] leading-relaxed text-steel-dark">
								{t(detail)}
							</p>
						</div>
					</li>
				))}
			</ul>

			{import.meta.env.DEV && (
				<div className="mt-4 flex items-center justify-between border-t border-line/70 pt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-steel">
					<span>{t("Explorer dev endpoint")}</span>
					<span className="text-rtd-dark">:5180</span>
				</div>
			)}
		</Card>
	);
}
