// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Spinner16 } from 'rtd-apps-icons';
import { cva, type VariantProps } from 'class-variance-authority';

const styles = cva('', {
	variants: {
		color: {
			inherit: 'text-inherit',
			rtd: 'text-rtd',
		},
	},
});

export type LoadingIndicatorProps = VariantProps<typeof styles>;

const LoadingIndicator = ({ color = 'rtd' }: LoadingIndicatorProps) => {
	return <Spinner16 className={styles({ className: 'animate-spin', color })} />;
};

export default LoadingIndicator;
