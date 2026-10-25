// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import clsx from "clsx";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { LinkWithQuery } from "~/ui/utils/LinkWithQuery";
import { useI18n } from "~/i18n";
import { BrandMark } from "../BrandMark";
import NetworkSelect from "../network/Network";
import Search from "../search/Search";
import { LanguageToggle } from "./LanguageToggle";

const NAV_ITEMS = [
	{ label: "Overview", to: "/" },
	{ label: "Activity", to: "/recent", tab: "transactions" },
	{ label: "Checkpoints", to: "/recent?tab=checkpoints", tab: "checkpoints" },
	{ label: "Epochs", to: "/recent?tab=epochs", tab: "epochs" },
	{ label: "Validators", to: "/validators" },
];

function Header() {
	const [isScrolled, setIsScrolled] = useState(window.scrollY > 0);
	const { pathname, search } = useLocation();
	const { t } = useI18n();
	const currentTab = new URLSearchParams(search).get("tab");

	const isActive = (to: string, tab?: string) => {
		if (to === "/") return pathname === "/";
		if (to.startsWith("/recent"))
			return (
				pathname === "/recent" &&
				(tab === "transactions"
					? !currentTab || currentTab === "transactions"
					: currentTab === tab)
			);
		if (to === "/validators")
			return pathname.startsWith("/validators") || pathname.startsWith("/validator/");
		return pathname.startsWith(to);
	};

	useEffect(() => {
		const callback = () => setIsScrolled(window.scrollY > 0);
		document.addEventListener("scroll", callback, { passive: true });
		return () => document.removeEventListener("scroll", callback);
	}, []);

	return (
		<header
			className={clsx(
				"flex h-header justify-center border-b transition-all duration-300",
				isScrolled
					? "border-line/80 bg-white/80 shadow-nav backdrop-blur-2xl"
					: "border-white/50 bg-white/55 backdrop-blur-xl",
			)}
		>
			<div className="flex h-full w-full max-w-[1440px] items-center gap-4 px-4 sm:px-6 xl:px-10">
				<LinkWithQuery
					data-testid="nav-logo-button"
					to="/"
					className="focus-ring flex shrink-0 items-center rounded-2xl"
				>
					<BrandMark />
				</LinkWithQuery>

				<nav aria-label="Primary" className="ml-4 hidden items-center gap-1 lg:flex">
					{NAV_ITEMS.map(({ label, to, tab }) => {
						const active = isActive(to, tab);
						return (
							<LinkWithQuery
								key={to}
								to={to}
								className={clsx(
									"focus-ring relative rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors duration-150",
									active
										? "bg-rtd-lightest text-rtd-dark"
										: "text-steel-dark hover:bg-white/70 hover:text-ink",
								)}
							>
								{t(label)}
								{active && (
									<span className="absolute inset-x-3.5 -bottom-px h-0.5 rounded-full bg-rtd" />
								)}
							</LinkWithQuery>
						);
					})}
				</nav>

				<div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2">
					<div className="min-w-0 flex-1 sm:max-w-[420px]">
						<Search />
					</div>
					<LanguageToggle />
					<NetworkSelect />
				</div>
			</div>
		</header>
	);
}

export default Header;
