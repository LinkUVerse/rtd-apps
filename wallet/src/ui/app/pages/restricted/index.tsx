// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useInitializedGuard } from '../../hooks';
import { useI18n } from '../../i18n';
import { Text } from '../../shared/text';
import SadCapy from './SadCapy.svg';

export function RestrictedPage() {
	const { t } = useI18n();
	useInitializedGuard(true);

	return (
		<div className="bg-rtd/10 rounded-20 py-15 px-10 max-w-[400px] w-full text-center flex flex-col items-center gap-10">
			<SadCapy role="presentation" />
			<Text variant="pBody" color="steel-darker" weight="medium">
				{t('restricted.message')}
			</Text>
		</div>
	);
}
