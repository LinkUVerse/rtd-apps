// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { useI18n } from '_app/i18n';

import { CheckboxField } from '../../shared/forms/CheckboxField';
import { Input } from '../../shared/forms/controls/Input';
import FormField from '../../shared/forms/FormField';
import { SelectField } from '../../shared/forms/SelectField';

export const zodSchema = z.object({
	autoLock: z
		.object({
			enabled: z.boolean(),
			timer: z.coerce.number().int('Only integer numbers allowed'),
			interval: z.enum(['day', 'hour', 'minute']),
		})
		.refine(({ enabled, timer }) => !enabled || timer > 0, {
			message: 'Minimum of 1 minute is allowed',
			path: ['timer'],
		}),
});

type AutoLockSelectorProps = {
	disabled?: boolean;
};

export function AutoLockSelector({ disabled }: AutoLockSelectorProps) {
	const { t } = useI18n();
	const { register, watch, trigger } = useFormContext();
	const timer = watch('autoLock.timer');
	const timerEnabled = watch('autoLock.enabled');
	const isSingular = Number(timer) === 1;
	const lockIntervals = [
		{ id: 'day', label: t(isSingular ? 'autoLock.unitDay' : 'autoLock.unitDays') },
		{ id: 'hour', label: t(isSingular ? 'autoLock.unitHour' : 'autoLock.unitHours') },
		{ id: 'minute', label: t(isSingular ? 'autoLock.unitMinute' : 'autoLock.unitMinutes') },
	];
	useEffect(() => {
		const { unsubscribe } = watch((_, { name, type }) => {
			if (name === 'autoLock.enabled' && type === 'change') {
				trigger('autoLock.timer');
			}
		});
		return unsubscribe;
	}, [watch, trigger]);
	return (
		<div className="flex flex-col gap-4">
			<CheckboxField
				name="autoLock.enabled"
				label={t('autoLock.inactiveLabel')}
				disabled={disabled}
			/>
			<FormField name="autoLock.timer">
				<div className="flex items-start justify-between gap-2">
					<Input
						disabled={disabled || !timerEnabled}
						type="number"
						{...register('autoLock.timer')}
						data-testid="auto-lock-timer"
					/>
					<SelectField
						disabled={disabled || !timerEnabled}
						name="autoLock.interval"
						options={lockIntervals}
					/>
				</div>
			</FormField>
		</div>
	);
}
