// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Text } from '_src/ui/app/shared/text';
import { useI18n } from '_src/ui/app/i18n';

export function PortfolioName({ name }: { name: string }) {
	const { t } = useI18n();

	return (
		<div className="flex gap-4 truncate w-full justify-center items-center">
			<div className="h-px bg-gray-45 flex-1" />
			<div className="truncate">
				<Text variant="caption" weight="semibold" color="steel-darker" truncate>
					{t('portfolio.named', { name })}
				</Text>
			</div>
			<div className="h-px bg-gray-45 flex-1" />
		</div>
	);
}
