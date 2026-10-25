// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ChevronUp12 } from "rtd-apps-icons";
import { Text } from "@linku/ui";
import clsx from "clsx";
import { type ReactNode, useMemo, useState, createContext, useContext } from "react";

import { useI18n } from "~/i18n";
import { Link } from "./Link";

type ExpandableListContextType = {
	handleShowAllClick: () => void;
	showAll: boolean;
	items: ReactNode[];
	defaultItemsToShow: number;
	itemsLabel?: string;
};

const ExpandableListContext = createContext<ExpandableListContextType | null>(null);

export function ExpandableListItems() {
	const listContext = useContext(ExpandableListContext);

	if (!listContext) {
		throw new Error("ExpandableListItems must be used within an ExpandableList");
	}

	const { showAll, items, defaultItemsToShow } = listContext;

	const itemsDisplayed = useMemo(
		() => (showAll ? items : items?.slice(0, defaultItemsToShow)),
		[showAll, items, defaultItemsToShow],
	);

	return <>{itemsDisplayed}</>;
}

export function ExpandableListControl() {
	const listContext = useContext(ExpandableListContext);

	if (!listContext) {
		throw new Error("ExpandableListControl must be used within an ExpandableList");
	}

	const { t } = useI18n();
	const { handleShowAllClick, showAll, items, itemsLabel, defaultItemsToShow } = listContext;

	let showAllText = "";
	if (showAll) {
		showAllText = t("Show Less");
	} else {
		showAllText = itemsLabel
			? t("Show All {count} {label}", { count: items.length, label: itemsLabel })
			: t("Show All");
	}

	if (items.length <= defaultItemsToShow) {
		return null;
	}

	return (
		<div className="flex cursor-pointer items-center gap-1 text-steel hover:text-steel-dark">
			<Link variant="text" onClick={handleShowAllClick}>
				<div className="flex items-center gap-0.5">
					<Text variant="bodySmall/medium">{showAllText}</Text>
					<ChevronUp12 className={clsx("h-3 w-3", !showAll ? "rotate-90" : "")} />
				</div>
			</Link>
		</div>
	);
}

type ExpandableListProps = {
	items: ReactNode[];
	defaultItemsToShow: number;
	itemsLabel?: string;
	children?: ReactNode;
};

export function ExpandableList({
	items,
	defaultItemsToShow,
	itemsLabel,
	children,
}: ExpandableListProps) {
	const [showAll, setShowAll] = useState(false);

	const handleShowAllClick = () => setShowAll((prevShowAll: boolean) => !prevShowAll);

	return (
		<ExpandableListContext.Provider
			value={{
				handleShowAllClick,
				showAll,
				items,
				defaultItemsToShow,
				itemsLabel,
			}}
		>
			{children || (
				<>
					<ExpandableListItems />
					<ExpandableListControl />
				</>
			)}
		</ExpandableListContext.Provider>
	);
}
