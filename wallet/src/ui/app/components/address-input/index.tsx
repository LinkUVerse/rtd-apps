// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Text } from '_app/shared/text';
import { useI18n } from '_app/i18n';
import Alert from '_src/ui/app/components/alert';
import { useRtdClient } from 'rtd-dapp-kit';
import { QrCode, X12 } from 'rtd-apps-icons';
import { isValidRtdAddress } from 'rtd-typescript/utils';
import { useQuery } from '@tanstack/react-query';
import { cx } from 'class-variance-authority';
import { useField, useFormikContext } from 'formik';
import { useCallback, useMemo } from 'react';
import type { ChangeEventHandler } from 'react';
import TextareaAutosize from 'react-textarea-autosize';

import { useRtdAddressValidation } from './validation';

export interface AddressInputProps {
	disabled?: boolean;
	placeholder?: string;
	name: string;
}

enum RecipientWarningType {
	OBJECT = 'OBJECT',
	EMPTY = 'EMPTY',
}

export function AddressInput({
	disabled: forcedDisabled,
	placeholder = '0x...',
	name = 'to',
}: AddressInputProps) {
	const { t } = useI18n();
	const [field, meta] = useField(name);

	const client = useRtdClient();
	const { data: warningData } = useQuery({
		queryKey: ['address-input-warning', field.value],
		queryFn: async () => {
			// We assume this validation will happen elsewhere:
			if (!isValidRtdAddress(field.value)) {
				return null;
			}

			const object = await client.getObject({ id: field.value });

			if (object && 'data' in object) {
				return RecipientWarningType.OBJECT;
			}

			const [fromAddr, toAddr] = await Promise.all([
				client.queryTransactionBlocks({
					filter: { FromAddress: field.value },
					limit: 1,
				}),
				client.queryTransactionBlocks({
					filter: { ToAddress: field.value },
					limit: 1,
				}),
			]);

			if (fromAddr.data?.length === 0 && toAddr.data?.length === 0) {
				return RecipientWarningType.EMPTY;
			}

			return null;
		},
		enabled: !!field.value,
		gcTime: 10 * 1000,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		refetchInterval: false,
	});

	const { isSubmitting, setFieldValue, isValidating } = useFormikContext();
	const rtdAddressValidation = useRtdAddressValidation();

	const disabled = forcedDisabled !== undefined ? forcedDisabled : isSubmitting;
	const handleOnChange = useCallback<ChangeEventHandler<HTMLTextAreaElement>>(
		(e) => {
			const address = e.currentTarget.value;
			setFieldValue(name, rtdAddressValidation.cast(address));
		},
		[setFieldValue, name, rtdAddressValidation],
	);
	const formattedValue = useMemo(
		() => rtdAddressValidation.cast(field?.value),
		[field?.value, rtdAddressValidation],
	);

	const clearAddress = useCallback(() => {
		setFieldValue('to', '');
	}, [setFieldValue]);

	const hasWarningOrError = meta.touched && (meta.error || warningData) && !isValidating;

	return (
		<>
			<div
				className={cx(
					'theme-card flex h-max w-full overflow-hidden rounded-2lg border border-solid box-border transition-all focus-within:border-steel',
					hasWarningOrError ? 'border-issue' : 'border-gray-45',
				)}
			>
				<div className="min-h-[42px] w-full flex items-center pl-3 py-2">
					<TextareaAutosize
						data-testid="address-input"
						maxRows={3}
						minRows={1}
						disabled={disabled}
						placeholder={placeholder}
						value={formattedValue}
						onChange={handleOnChange}
						onBlur={field.onBlur}
						className={cx(
							'w-full resize-none border-none bg-transparent font-mono text-bodySmall font-medium leading-100 placeholder:font-mono placeholder:font-normal placeholder:text-steel-dark',
							hasWarningOrError ? 'text-issue' : 'text-gray-90',
						)}
						name={name}
					/>
				</div>

				<div
					onClick={clearAddress}
					className="flex bg-gray-40 items-center justify-center w-11 right-0 max-w-[20%] ml-4 cursor-pointer"
				>
					{meta.touched && field.value ? (
						<X12 className="h-3 w-3 text-steel-darker" />
					) : (
						<QrCode className="h-5 w-5 text-steel-darker" />
					)}
				</div>
			</div>

			{field.value && !isValidating ? (
				<div className="mt-2.5 w-full">
					<Alert noBorder rounded="lg" mode={meta.error || warningData ? 'issue' : 'success'}>
						{warningData === RecipientWarningType.OBJECT ? (
							<>
								<Text variant="pBody" weight="semibold">
									{t('address.objectTitle')}
								</Text>
								<Text variant="pBodySmall" weight="medium">
									{t('address.objectWarning')}
								</Text>
							</>
						) : warningData === RecipientWarningType.EMPTY ? (
							<>
								<Text variant="pBody" weight="semibold">
									{t('address.emptyTitle')}
								</Text>
								<Text variant="pBodySmall" weight="medium">
									{t('address.emptyWarning')}
								</Text>
							</>
						) : (
							<Text variant="pBodySmall" weight="medium">
								{meta.error || t('common.validAddress')}
							</Text>
						)}
					</Alert>
				</div>
			) : null}
		</>
	);
}
