// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { BrandMark } from "../BrandMark";
import { footerLinks } from "./footerLinks";
import { useI18n } from "~/i18n";
import { Link } from "~/ui/Link";

const SOURCES = ["Fullnode gRPC", "Archive GraphQL", "Account GraphQL"];

function Footer() {
	const { t } = useI18n();

	return (
		<footer className="relative z-10 mt-20 overflow-hidden bg-ink text-white">
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 bg-[radial-gradient(720px_320px_at_8%_0%,rgba(37,99,235,0.28),transparent_70%),radial-gradient(520px_280px_at_92%_10%,rgba(217,119,6,0.16),transparent_70%)]"
			/>
			<div className="relative mx-auto flex max-w-[1440px] flex-col gap-10 px-6 py-14 md:px-10">
				<div className="flex flex-col justify-between gap-10 md:flex-row md:items-start">
					<div className="max-w-md">
						<BrandMark tone="light" />
						<p className="mt-5 text-sm leading-relaxed text-white/60">
							{t(
								"A fast, transparent explorer for the RTD network. Current state is read from Fullnode gRPC; certified history comes from the RTD archive index.",
							)}
						</p>
						<div className="mt-5 flex flex-wrap gap-2">
							{SOURCES.map((source) => (
								<span
									key={source}
									className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-white/60"
								>
									<span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
									{t(source)}
								</span>
							))}
						</div>
					</div>
					<nav aria-label="Footer" className="md:pt-2">
						<div className="section-kicker !text-white/35">{t("Explore")}</div>
						<ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
							{footerLinks.map(({ title, href }) => (
								<li key={href}>
									<Link
										variant="text"
										href={href}
										className="focus-ring rounded text-sm font-medium text-white/65 transition-colors hover:text-white"
									>
										{t(title)}
									</Link>
								</li>
							))}
						</ul>
					</nav>
				</div>
				<div className="flex flex-col gap-3 border-t border-white/10 pt-6 text-[11px] text-white/40 sm:flex-row sm:items-center sm:justify-between">
					<span>{t("RTD Explorer · Real-time chain intelligence")}</span>
					<span className="font-mono uppercase tracking-[0.14em]">
						{t("gRPC + GraphQL transport · no JSON-RPC")}
					</span>
				</div>
			</div>
		</footer>
	);
}

export default Footer;
