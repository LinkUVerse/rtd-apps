// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RtdClientProvider } from "rtd-dapp-kit";
import { type Meta, type StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { CoinsStack, type CoinsStackProps } from "~/ui/CoinsStack";

export default {
	component: CoinsStack,
	decorators: [
		(Story) => (
			<QueryClientProvider client={new QueryClient()}>
				<RtdClientProvider>
					<Story />
				</RtdClientProvider>
			</QueryClientProvider>
		),
	],
} as Meta;

export const Default: StoryObj<CoinsStackProps> = {
	args: {
		coinTypes: [
			"0x2::rtd::RTD",
			"0xc0d761079b1e7fa4dbd8a881b7464cf8c400c0de72460fdf8ca44e3f1842715e::rtd_inu::RTD_INU",
			"random",
		],
	},
};
