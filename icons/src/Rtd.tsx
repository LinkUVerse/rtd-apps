// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { SVGProps } from 'react';

const SvgRtd = (props: SVGProps<SVGSVGElement>) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="1em"
		height="1em"
		fill="none"
		viewBox="0 0 24 24"
		{...props}
	>
		<title>RTD 命运链结</title>
		<g transform="rotate(45 12 12)">
			<path
				d="M5.2 15.5v-7h2c1.8 0 2.8.9 2.8 2.2s-1 2.2-2.8 2.2h-2m2.3 0 3 2.6M9.8 8.5h5m-2.5 0v7m1.9-7v7h1.7c2.7 0 4.1-1.3 4.1-3.5s-1.4-3.5-4.1-3.5h-1.7"
				stroke="currentColor"
				strokeWidth="1.55"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</g>
	</svg>
);
export default SvgRtd;
