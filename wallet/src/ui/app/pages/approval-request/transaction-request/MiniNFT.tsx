// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import st from './TransactionRequest.module.scss';
import { useI18n } from '_app/i18n';

export type MiniNFTProps = {
	size?: 'xs' | 'sm';
	url: string;
	name?: string | null;
};

export function MiniNFT({ size = 'sm', url, name }: MiniNFTProps) {
	const { t } = useI18n();
	const sizes = size === 'xs' ? st.nftImageTiny : st.nftImageSmall;
	return <img src={url} className={sizes} alt={name || t('nft.imageAlt')} />;
}
