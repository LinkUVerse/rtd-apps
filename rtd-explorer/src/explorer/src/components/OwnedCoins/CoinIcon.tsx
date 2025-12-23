// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useCoinMetadata } from "rtd-apps-core";
import { Rtd, Unstaked } from "rtd-apps-icons";
import { RTD_TYPE_ARG } from "rtd-typescript/utils";
import { cva, type VariantProps } from "class-variance-authority";

import { ImageIcon } from "~/ui/ImageIcon";

const imageStyle = cva(["flex rounded-2xl"], {
	variants: {
		size: {
			sm: "w-6 h-6",
			md: "w-7.5 h-7.5",
			lg: "md:w-10 md:h-10 w-8 h-8",
			xl: "md:w-31.5 md:h-31.5 w-16 h-16 ",
		},
	},
	defaultVariants: {
		size: "md",
	},
});

function RtdCoin() {
	return (
		<Rtd className="flex h-full w-full items-center justify-center rounded-2xl bg-rtd p-1.5 text-body text-white" />
	);
}

type NonRtdCoinProps = {
	coinType: string;
};

function NonRtdCoin({ coinType }: NonRtdCoinProps) {
	const { data: coinMeta } = useCoinMetadata(coinType);
	return (
		<div className="flex h-full w-full items-center justify-center rounded-2xl bg-gray-40 text-hero-darkest text-opacity-30">
			{coinMeta?.iconUrl ? (
				<ImageIcon
					size="sm"
					src={coinMeta.iconUrl}
					label={coinMeta.name || coinType}
					fallback={coinMeta.name || coinType}
					circle
				/>
			) : (
				<div className="flex h-full w-full items-center justify-center rounded-2xl border-2 border-hero-darkest border-opacity-10">
					<Unstaked className="h-2.5 w-2.5" />
				</div>
			)}
		</div>
	);
}

export type CoinIconProps = {
	coinType: string;
} & VariantProps<typeof imageStyle>;

export function CoinIcon({ coinType, ...styleProps }: CoinIconProps) {
	return (
		<div className={imageStyle(styleProps)}>
			{coinType === RTD_TYPE_ARG ? <RtdCoin /> : <NonRtdCoin coinType={coinType} />}
		</div>
	);
}
