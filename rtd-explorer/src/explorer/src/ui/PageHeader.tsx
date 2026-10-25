// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Flag16, Info12 } from "rtd-apps-icons";
import { Heading, Placeholder, Text } from "@linku/ui";

import { ReactComponent as CallIcon } from "./icons/transactions/call.svg";
import { useI18n } from "~/i18n";
import { Banner } from "~/ui/Banner";
import { CopyToClipboard } from "~/ui/CopyToClipboard";

export type PageHeaderType = "Transaction" | "Checkpoint" | "Address" | "Object" | "Package";

export type PageHeaderProps = {
	title: string;
	subtitle?: string | null;
	type: PageHeaderType;
	status?: "success" | "failure";
	before?: React.ReactNode;
	after?: React.ReactNode;
	error?: string;
	loading?: boolean;
};

const TYPE_TO_COPY: Partial<Record<PageHeaderType, string>> = {
	Transaction: "Transaction Block",
};

const TYPE_TO_ICON: Record<PageHeaderType, typeof CallIcon | null> = {
	Transaction: null,
	Checkpoint: Flag16,
	Object: null,
	Package: CallIcon,
	Address: null,
};

export function PageHeader({
	title,
	subtitle,
	type,
	before,
	error,
	loading,
	after,
}: PageHeaderProps) {
	const Icon = TYPE_TO_ICON[type];
	const { t } = useI18n();

	return (
		<div data-testid="pageheader" className="group flex flex-col gap-4">
			<div className="flex w-full flex-col gap-5 sm:flex-row sm:items-start">
				{before && (
					<div className="shrink-0 self-start">
						<div className="grid h-14 w-14 min-w-14 place-items-center overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-card backdrop-blur-xl sm:h-16 sm:w-16 sm:min-w-16">
							{loading ? <Placeholder rounded="xl" width="100%" height="100%" /> : before}
						</div>
					</div>
				)}

				<div className="flex min-w-0 flex-1 flex-col justify-between gap-4 md:flex-row md:items-center">
					<div className="min-w-0">
						<div className="mb-2 flex flex-wrap items-center gap-2">
							<span className="inline-flex items-center gap-1.5 rounded-full border border-rtd-light bg-white/70 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-rtd-dark shadow-sm backdrop-blur">
								{Icon && <Icon className="text-rtd" />}
								{loading ? (
									<Placeholder rounded="lg" width="90px" height="10px" />
								) : (
									<>{t(type in TYPE_TO_COPY ? TYPE_TO_COPY[type]! : type)}</>
								)}
							</span>
						</div>
						<div className="min-w-0 break-words break-all">
							{loading ? (
								<Placeholder rounded="lg" width="540px" height="22px" />
							) : (
								<>
									{title && (
										<div className="flex items-start gap-2">
											<Heading
												as="h3"
												variant="heading3/semibold"
												color="gray-90"
												mono
											>
												{title}
											</Heading>
											<div className="mt-1 h-4 w-4 self-start md:h-5 md:w-5">
												<CopyToClipboard size="lg" color="steel" copyText={title} />
											</div>
										</div>
									)}
								</>
							)}
						</div>
						{subtitle && (
							<div className="mt-2 break-words">
								{loading ? (
									<Placeholder rounded="lg" width="540px" height="20px" />
								) : (
									<Text variant="body/medium" color="gray-75">
										{subtitle}
									</Text>
								)}
							</div>
						)}
					</div>

					{error && (
						<div className="mt-1">
							<Banner variant="neutralWhite" icon={<Info12 className="text-issue-dark" />}>
								<Text variant="pBody/medium" color="issue-dark">
									{error}
								</Text>
							</Banner>
						</div>
					)}
					{after && <div className="md:ml-auto">{after}</div>}
				</div>
			</div>
		</div>
	);
}
