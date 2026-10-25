// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { CoinFormat, formatBalance } from "rtd-apps-core";

import { useI18n } from "~/i18n";
import { useExplorerQuery } from "~/rpc/explorer-client";
import { Card } from "~/ui/Card";

export function OnTheNetwork() {
	const { t } = useI18n();
	const { data: referenceGasPrice } = useExplorerQuery("getReferenceGasPrice");
	const { data: systemState } = useExplorerQuery("getLatestRtdSystemState");
	const gasPriceFormatted =
		typeof referenceGasPrice === "bigint"
			? formatBalance(referenceGasPrice, 0, CoinFormat.FULL)
			: null;
	const protocolVersion =
		systemState?.protocolVersion !== undefined
			? String(systemState.protocolVersion)
			: "—";

	return (
		<Card bg="white/80" spacing="lg" height="full" className="flex flex-col">
			<div className="flex items-start justify-between gap-3">
				<div>
					<div className="section-kicker">{t("Network pulse")}</div>
					<h3 className="mt-2 text-[15px] font-semibold text-ink">
						{t("Reference gas price")}
					</h3>
				</div>
				<span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-emerald-700">
					<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
					{t("Online")}
				</span>
			</div>

			<div className="mt-5 flex items-baseline gap-2">
				<span className="mono-num text-[36px] font-semibold leading-none tracking-[-0.03em] text-ink">
					{gasPriceFormatted ?? "—"}
				</span>
				<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-steel">
					MIST
				</span>
			</div>
			<p className="mt-2 text-[12px] leading-relaxed text-steel-dark">
				{t("The reference price applied to every transaction in the current epoch.")}
			</p>

			<dl className="mt-auto grid grid-cols-2 gap-3 border-t border-line/70 pt-4">
				<div>
					<dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-steel">
						{t("Protocol")}
					</dt>
					<dd className="mt-1 text-sm font-semibold text-ink">v{protocolVersion}</dd>
				</div>
				<div>
					<dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-steel">
						{t("Transport")}
					</dt>
					<dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ink">
						<span className="h-1.5 w-1.5 rounded-full bg-rtd" />
						gRPC
					</dd>
				</div>
			</dl>
		</Card>
	);
}
