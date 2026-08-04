// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react';
import { useI18n } from '_app/i18n';

import { Button, type ButtonProps } from './ButtonUI';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './Dialog';
import { Text } from './text';

export type ConfirmationModalProps = {
	isOpen: boolean;
	title?: string;
	hint?: string;
	confirmText?: string;
	confirmStyle?: ButtonProps['variant'];
	cancelText?: string;
	cancelStyle?: ButtonProps['variant'];
	onResponse: (confirmed: boolean) => void;
};

export function ConfirmationModal({
	isOpen,
	title,
	hint,
	confirmText,
	confirmStyle = 'primary',
	cancelText,
	cancelStyle = 'outline',
	onResponse,
}: ConfirmationModalProps) {
	const { t } = useI18n();
	const resolvedTitle = title || t('common.areYouSure');
	const resolvedConfirmText = confirmText || t('common.confirm');
	const resolvedCancelText = cancelText || t('common.cancel');
	const [isConfirmLoading, setIsConfirmLoading] = useState(false);
	const [isCancelLoading, setIsCancelLoading] = useState(false);
	return (
		<Dialog
			open={isOpen}
			onOpenChange={async (open) => {
				if (open || isCancelLoading || isConfirmLoading) {
					return;
				}
				setIsCancelLoading(true);
				await onResponse(false);
				setIsCancelLoading(false);
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{resolvedTitle}</DialogTitle>
				</DialogHeader>
				{hint ? (
					<div className="break-words text-center">
						<Text variant="pBodySmall" color="steel-dark" weight="normal">
							{hint}
						</Text>
					</div>
				) : null}
				<DialogFooter>
					<div className="flex flex-row self-stretch gap-3">
						<Button
							variant={cancelStyle}
							size="tall"
							text={resolvedCancelText}
							loading={isCancelLoading}
							disabled={isConfirmLoading}
							onClick={async () => {
								setIsCancelLoading(true);
								await onResponse(false);
								setIsCancelLoading(false);
							}}
						/>
						<Button
							variant={confirmStyle}
							size="tall"
							text={resolvedConfirmText}
							loading={isConfirmLoading}
							disabled={isCancelLoading}
							onClick={async () => {
								setIsConfirmLoading(true);
								await onResponse(true);
								setIsConfirmLoading(false);
							}}
						/>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
