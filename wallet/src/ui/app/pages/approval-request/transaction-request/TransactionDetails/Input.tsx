// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import ExplorerLink from '_src/ui/app/components/explorer-link';
import { ExplorerLinkType } from '_src/ui/app/components/explorer-link/ExplorerLinkType';
import { Text } from '_src/ui/app/shared/text';
import { useI18n } from '_app/i18n';
import { type TransactionInput } from 'rtd-typescript/transactions';
import { formatAddress } from 'rtd-typescript/utils';

interface InputProps {
	input: TransactionInput;
}

export function Input({ input }: InputProps) {
	const { t } = useI18n();
	const { objectId } =
		input?.Object?.ImmOrOwnedObject ??
		input?.Object?.SharedObject ??
		input.Object?.Receiving! ??
		{};

	return (
		<div className="min-w-0 break-all">
			<Text variant="pBodySmall" weight="medium" color="steel-dark" mono>
				{input.Pure ? (
					`${input.Pure.bytes}`
				) : input.Object ? (
					<ExplorerLink type={ExplorerLinkType.object} objectID={objectId!}>
						{formatAddress(objectId)}
					</ExplorerLink>
				) : (
					t('transaction.unknownInput')
				)}
			</Text>
		</div>
	);
}
