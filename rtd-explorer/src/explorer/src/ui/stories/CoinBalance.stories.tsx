// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RtdClientProvider } from "rtd-dapp-kit";
import { type Meta, type StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { CoinBalance, type CoinBalanceProps } from "../CoinBalance";
import { Network, NetworkConfigs, createRtdClient } from "~/utils/api/DefaultRpcClient";

export default {
	component: CoinBalance,
	decorators: [
		(Story) => (
			<QueryClientProvider client={new QueryClient()}>
				<RtdClientProvider
					networks={NetworkConfigs}
					defaultNetwork={Network.LOCAL}
					createClient={createRtdClient}
				>
					<Story />
				</RtdClientProvider>
			</QueryClientProvider>
		),
	],
} as Meta;

export const Default: StoryObj<CoinBalanceProps> = {
	args: {
		amount: 1000,
		coinType: "0x2::rtd::RTD",
	},
};

export const WithoutSymbol: StoryObj<CoinBalanceProps> = {
	args: {
		amount: 10000,
	},
};
