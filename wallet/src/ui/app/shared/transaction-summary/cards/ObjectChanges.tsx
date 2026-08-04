// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import ExplorerLink from '_src/ui/app/components/explorer-link';
import { ExplorerLinkType } from '_src/ui/app/components/explorer-link/ExplorerLinkType';
import { useI18n, type MessageKey } from '_src/ui/app/i18n';
import { Text } from '_src/ui/app/shared/text';
import { Disclosure } from '@headlessui/react';
import {
	type ObjectChangesByOwner,
	type ObjectChangeSummary,
	type RtdObjectChangeTypes,
	type RtdObjectChangeWithDisplay,
} from 'rtd-apps-core';
import { ChevronDown12, ChevronRight12 } from 'rtd-apps-icons';
import { formatAddress } from 'rtd-typescript/utils';
import cx from 'clsx';

import { ExpandableList } from '../../ExpandableList';
import { Card } from '../Card';
import { OwnerFooter } from '../OwnerFooter';
import { ObjectChangeDisplay } from './objectSummary/ObjectChangeDisplay';

const objectChangeLabelKeys: Record<RtdObjectChangeTypes, MessageKey> = {
	created: 'transaction.changeCreated',
	mutated: 'transaction.changeMutated',
	transferred: 'transaction.changeTransferred',
	published: 'transaction.changePublished',
	deleted: 'transaction.changeDeleted',
	wrapped: 'transaction.changeWrapped',
};

function ChevronDown({ expanded }: { expanded: boolean }) {
	return expanded ? (
		<ChevronDown12 className="text-gray-45" />
	) : (
		<ChevronRight12 className="text-gray-45" />
	);
}

export function ObjectDetail({
	change,
	display,
}: {
	change: RtdObjectChangeWithDisplay;
	ownerKey: string;
	display?: boolean;
}) {
	const { t } = useI18n();

	if (change.type === 'transferred' || change.type === 'published') {
		return null;
	}

	const [packageId, moduleName, typeName] = change.objectType?.split('<')[0]?.split('::') || [];

	return (
		<Disclosure>
			{({ open }) => (
				<div className="flex flex-col gap-1">
					<div className="grid grid-cols-2 overflow-auto cursor-pointer">
						<Disclosure.Button className="flex items-center cursor-pointer border-none bg-transparent ouline-none p-0 gap-1 text-steel-dark hover:text-steel-darker select-none">
							<Text variant="pBody" weight="medium">
								{t('transaction.object')}
							</Text>
							{open ? (
								<ChevronDown12 className="text-gray-45" />
							) : (
								<ChevronRight12 className="text-gray-45" />
							)}
						</Disclosure.Button>
						{change.objectId && (
							<div className="justify-self-end">
								<ExplorerLink
									type={ExplorerLinkType.object}
									objectID={change.objectId}
									className="text-hero-dark no-underline"
								>
									<Text variant="body" weight="medium" truncate mono>
										{formatAddress(change.objectId)}
									</Text>
								</ExplorerLink>
							</div>
						)}
					</div>
					<Disclosure.Panel>
						<div className="flex flex-col gap-1">
							<div className="grid grid-cols-2 overflow-auto relative">
								<Text variant="pBody" weight="medium" color="steel-dark">
									{t('transaction.package')}
								</Text>
								<div className="flex justify-end">
									<ExplorerLink
										type={ExplorerLinkType.object}
										objectID={packageId}
										className="text-hero-dark text-captionSmall no-underline justify-self-end overflow-auto"
									>
										<Text variant="pBody" weight="medium" truncate mono>
											{packageId}
										</Text>
									</ExplorerLink>
								</div>
							</div>
							<div className="grid grid-cols-2 overflow-auto">
								<Text variant="pBody" weight="medium" color="steel-dark">
									{t('transaction.module')}
								</Text>
								<div className="flex justify-end">
									<ExplorerLink
										type={ExplorerLinkType.object}
										objectID={packageId}
										moduleName={moduleName}
										className="text-hero-dark no-underline justify-self-end overflow-auto"
									>
										<Text variant="pBody" weight="medium" truncate mono>
											{moduleName}
										</Text>
									</ExplorerLink>
								</div>
							</div>
							<div className="grid grid-cols-2 overflow-auto">
								<Text variant="pBody" weight="medium" color="steel-dark">
									{t('transaction.type')}
								</Text>
								<div className="flex justify-end">
									<ExplorerLink
										type={ExplorerLinkType.object}
										objectID={packageId}
										moduleName={moduleName}
										className="text-hero-dark no-underline justify-self-end overflow-auto"
									>
										<Text variant="pBody" weight="medium" truncate mono>
											{typeName}
										</Text>
									</ExplorerLink>
								</div>
							</div>
						</div>
					</Disclosure.Panel>
				</div>
			)}
		</Disclosure>
	);
}

interface ObjectChangeEntryProps {
	type: RtdObjectChangeTypes;
	changes: ObjectChangesByOwner;
}

export function ObjectChangeEntry({ changes, type }: ObjectChangeEntryProps) {
	const { t } = useI18n();

	return (
		<>
			{Object.entries(changes).map(([owner, changes]) => {
				return (
					<Card
						footer={<OwnerFooter owner={owner} ownerType={changes.ownerType} />}
						key={`${type}-${owner}`}
						heading={t('transaction.changes')}
					>
						<Disclosure defaultOpen>
							{({ open }) => (
								<div className={cx({ 'gap-4': open }, 'flex flex-col pb-3')}>
									<Disclosure.Button as="div" className="flex w-full flex-col gap-2 cursor-pointer">
										<div className="flex w-full items-center gap-2">
											<Text
												variant="body"
												weight="semibold"
												color={type === 'created' ? 'success-dark' : 'steel-darker'}
											>
												{t(objectChangeLabelKeys[type])}
											</Text>
											<div className="h-px bg-gray-40 w-full" />
											<ChevronDown expanded={open} />
										</div>
									</Disclosure.Button>
									<Disclosure.Panel as="div" className="gap-4 flex flex-col">
										<>
											{!!changes.changesWithDisplay.length && (
												<div className="flex gap-2 overflow-y-auto">
													<ExpandableList
														defaultItemsToShow={5}
														items={
															open
																? changes.changesWithDisplay.map((change) => (
																		<ObjectChangeDisplay change={change} />
																	))
																: []
														}
													/>
												</div>
											)}

											<div className="flex w-full flex-col gap-2">
												<ExpandableList
													defaultItemsToShow={5}
													items={
														open
															? changes.changes.map((change) => (
																	<ObjectDetail ownerKey={owner} change={change} />
																))
															: []
													}
												/>
											</div>
										</>
									</Disclosure.Panel>
								</div>
							)}
						</Disclosure>
					</Card>
				);
			})}
		</>
	);
}

export function ObjectChanges({ changes }: { changes?: ObjectChangeSummary | null }) {
	if (!changes) return null;

	return (
		<>
			{Object.entries(changes).map(([type, changes]) => {
				return (
					<ObjectChangeEntry
						key={type}
						type={type as keyof ObjectChangeSummary}
						changes={changes}
					/>
				);
			})}
		</>
	);
}
