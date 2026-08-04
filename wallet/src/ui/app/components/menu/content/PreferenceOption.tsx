// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { CheckStroke16 } from 'rtd-apps-icons';
import clsx from 'clsx';
import type { ReactNode } from 'react';

type PreferenceOptionProps = {
	title: string;
	description: string;
	selected: boolean;
	onSelect: () => void;
	preview?: ReactNode;
};

export function PreferenceOption({
	title,
	description,
	selected,
	onSelect,
	preview,
}: PreferenceOptionProps) {
	return (
		<button
			type="button"
			role="radio"
			aria-checked={selected}
			className={clsx('preference-option', selected && 'preference-option--selected')}
			onClick={onSelect}
		>
			{preview ? <span className="preference-option__preview">{preview}</span> : null}
			<span className="min-w-0 flex-1 text-left">
				<span className="preference-option__title">{title}</span>
				<span className="preference-option__description">{description}</span>
			</span>
			<span className="preference-option__check" aria-hidden="true">
				{selected ? <CheckStroke16 className="h-4 w-4" /> : null}
			</span>
		</button>
	);
}
