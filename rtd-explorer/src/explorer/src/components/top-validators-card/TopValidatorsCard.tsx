// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useExplorerQuery } from "~/rpc/explorer-client";
import { ArrowRight12 } from "rtd-apps-icons";
import type { RtdValidatorSummary } from "~/types/explorerViewModels";
import { Text } from "@linku/ui";
import { useMemo } from "react";

import { StakeColumn } from "./StakeColumn";
import { HighlightedTableCol } from "~/components/Table/HighlightedTableCol";
import { useI18n, type Translate } from "~/i18n";
import { Banner } from "~/ui/Banner";
import { ImageIcon } from "~/ui/ImageIcon";
import { AddressLink, ValidatorLink } from "~/ui/InternalLink";
import { Link } from "~/ui/Link";
import { PlaceholderTable } from "~/ui/PlaceholderTable";
import { TableCard } from "~/ui/TableCard";

const NUMBER_OF_VALIDATORS = 10;
const identity: Translate = (source) => source;

export function processValidators(set: RtdValidatorSummary[]) {
	return set.map((av) => ({
		name: av.name,
		address: av.rtdAddress,
		stake: av.stakingPoolRtdBalance,
		logo: av.imageUrl,
	}));
}

const validatorsTable = (
	validatorsData: RtdValidatorSummary[],
	limit?: number,
	showIcon?: boolean,
	t: Translate = identity,
) => {
	const validators = processValidators(validatorsData).sort((_a, _b) =>
		Math.random() > 0.5 ? -1 : 1,
	);

	const validatorsItems = limit ? validators.splice(0, limit) : validators;

	return {
		data: validatorsItems.map(({ name, stake, address, logo }) => ({
			name: (
				<HighlightedTableCol first>
					<div className="flex items-center gap-2.5">
						{showIcon && <ImageIcon src={logo} size="sm" fallback={name} label={name} circle />}

						<ValidatorLink
							address={address}
							label={name}
						/>
					</div>
				</HighlightedTableCol>
			),
			stake: <StakeColumn stake={stake} />,
			delegation: (
				<Text variant="bodySmall/medium" color="steel-darker">
					{stake.toString()}
				</Text>
			),
			address: (
				<HighlightedTableCol>
					<AddressLink
						address={address}
						noTruncate={!limit}
					/>
				</HighlightedTableCol>
			),
		})),
		columns: [
			{
				header: t("Name"),
				accessorKey: "name",
			},
			{
				header: t("Address"),
				accessorKey: "address",
			},
			{
				header: t("Stake"),
				accessorKey: "stake",
			},
		],
	};
};

type TopValidatorsCardProps = {
	limit?: number;
	showIcon?: boolean;
};

export function TopValidatorsCard({ limit, showIcon }: TopValidatorsCardProps) {
	const { t } = useI18n();
	const { data, isPending, isSuccess, isError } = useExplorerQuery("getLatestRtdSystemState");

	const tableData = useMemo(
		() => (data ? validatorsTable(data.activeValidators, limit, showIcon, t) : null),
		[data, limit, showIcon, t],
	);

	if (isError || (!isPending && !tableData?.data.length)) {
		return (
			<Banner variant="error" fullWidth>
				{t("Validator data could not be loaded")}
			</Banner>
		);
	}

	return (
		<>
			{isPending && (
				<PlaceholderTable
					rowCount={limit || NUMBER_OF_VALIDATORS}
					rowHeight="13px"
					colHeadings={[t("Name"), t("Address"), t("Stake")]}
					colWidths={["220px", "220px", "220px"]}
				/>
			)}

			{isSuccess && tableData && (
				<>
					<TableCard data={tableData.data} columns={tableData.columns} />
					<div className="mt-3 flex justify-between">
						<Link to="/validators">
							<div className="flex items-center gap-2">
								{t("View all")}
								<ArrowRight12 fill="currentColor" className="h-3 w-3 -rotate-45" />
							</div>
						</Link>
						<Text variant="body/medium" color="steel-dark">
							{data ? data.activeValidators.length : "-"}
							{` ${t("Total")}`}
						</Text>
					</div>
				</>
			)}
		</>
	);
}
