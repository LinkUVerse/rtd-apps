// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useExplorerClient } from "~/rpc/explorer-client";
import { Text, LoadingIndicator } from "@linku/ui";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { CheckpointTransactionBlocks } from "./CheckpointTransactionBlocks";
import { PageLayout } from "~/components/Layout/PageLayout";
import { RtdAmount } from "~/components/Table/RtdAmount";
import { Banner } from "~/ui/Banner";
import { DescriptionList, DescriptionItem } from "~/ui/DescriptionList";
import { EpochLink } from "~/ui/InternalLink";
import { useI18n } from "~/i18n";
import { PageHeader } from "~/ui/PageHeader";
import { TabHeader, Tabs, TabsContent, TabsList, TabsTrigger } from "~/ui/Tabs";

export default function CheckpointDetail() {
	const { id } = useParams<{ id: string }>();
	const { t } = useI18n();
	const digestOrSequenceNumber = /^\d+$/.test(id!) ? parseInt(id!, 10) : id;

	const client = useExplorerClient();
	const { data, isError, isPending } = useQuery({
		queryKey: ["checkpoints", digestOrSequenceNumber],
		queryFn: () => client.getCheckpoint({ id: String(digestOrSequenceNumber!) }),
	});
	return (
		<PageLayout
			content={
				isError ? (
					<Banner variant="error" fullWidth>
						{t("There was an issue retrieving data for checkpoint: {id}", { id: id ?? "" })}
					</Banner>
				) : isPending ? (
					<LoadingIndicator />
				) : (
					<div className="flex flex-col space-y-12">
						<PageHeader title={data.digest} type="Checkpoint" />
						<div className="space-y-8">
							<Tabs size="lg" defaultValue="details">
								<TabsList>
									<TabsTrigger value="details">{t("Details")}</TabsTrigger>
									<TabsTrigger value="signatures">{t("Signatures")}</TabsTrigger>
								</TabsList>
								<TabsContent value="details">
									<DescriptionList>
										<DescriptionItem title={t("Checkpoint Sequence No.")}>
											<Text variant="pBody/medium" color="steel-darker">
												{data.sequenceNumber}
											</Text>
										</DescriptionItem>
										<DescriptionItem title={t("Epoch")}>
											<EpochLink epoch={data.epoch} />
										</DescriptionItem>
										<DescriptionItem title={t("Checkpoint Timestamp")}>
											<Text variant="pBody/medium" color="steel-darker">
												{data.timestampMs
													? new Date(Number(data.timestampMs)).toLocaleString(undefined, {
															month: "short",
															day: "numeric",
															year: "numeric",
															hour: "numeric",
															minute: "2-digit",
															second: "2-digit",
															hour12: false,
															timeZone: "UTC",
															timeZoneName: "short",
													  })
													: "--"}
											</Text>
										</DescriptionItem>
									</DescriptionList>
								</TabsContent>
								<TabsContent value="signatures">
									<Tabs defaultValue="aggregated">
										<TabsList>
											<TabsTrigger value="aggregated">{t("Aggregated Validator Signature")}</TabsTrigger>
										</TabsList>
										<TabsContent value="aggregated">
											<DescriptionList>
												<DescriptionItem key={data.validatorSignature} title={t("Signature")}>
													<Text variant="pBody/medium" color="steel-darker">
														{data.validatorSignature}
													</Text>
												</DescriptionItem>
											</DescriptionList>
										</TabsContent>
									</Tabs>
								</TabsContent>
							</Tabs>

							<TabHeader title={t("Gas & Storage Fees")}>
								<DescriptionList>
									<DescriptionItem title={t("Computation Fee")}>
										<RtdAmount full amount={data.epochRollingGasCostSummary.computationCost} />
									</DescriptionItem>
									<DescriptionItem title={t("Storage Fee")}>
										<RtdAmount full amount={data.epochRollingGasCostSummary.storageCost} />
									</DescriptionItem>
									<DescriptionItem title={t("Storage Rebate")}>
										<RtdAmount full amount={data.epochRollingGasCostSummary.storageRebate} />
									</DescriptionItem>
								</DescriptionList>
							</TabHeader>

							<TabHeader title={t("Checkpoint Transaction Blocks")}>
								<div className="mt-4">
									<CheckpointTransactionBlocks id={data.sequenceNumber} />
								</div>
							</TabHeader>
						</div>
					</div>
				)
			}
		/>
	);
}
