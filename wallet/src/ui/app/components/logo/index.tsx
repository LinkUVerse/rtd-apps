// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { API_ENV } from '_src/shared/api-env';
import { RtdCustomRpc, RtdDevnet, RtdLocal, RtdMainnet, RtdTestnet } from 'rtd-apps-icons';

type LogoProps = {
	networkName?: API_ENV;
};

const networkLogos = {
	[API_ENV.mainnet]: RtdMainnet,
	[API_ENV.devNet]: RtdDevnet,
	[API_ENV.testNet]: RtdTestnet,
	[API_ENV.local]: RtdLocal,
	[API_ENV.customRPC]: RtdCustomRpc,
};

const Logo = ({ networkName }: LogoProps) => {
	const LogoComponent = networkName ? networkLogos[networkName] : networkLogos[API_ENV.mainnet];

	return <LogoComponent className="h-7 w-walletLogo text-gray-90" />;
};

export default Logo;
