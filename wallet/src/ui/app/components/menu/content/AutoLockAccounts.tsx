// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useNextMenuUrl } from '_components/menu/hooks';
import { useI18n } from '_app/i18n';
import {
	autoLockDataToMinutes,
	parseAutoLock,
	useAutoLockMinutes,
} from '_src/ui/app/hooks/useAutoLockMinutes';
import { useAutoLockMinutesMutation } from '_src/ui/app/hooks/useAutoLockMinutesMutation';
import { Button } from '_src/ui/app/shared/ButtonUI';
import { Form } from '_src/ui/app/shared/forms/Form';
import { useZodForm } from 'rtd-apps-core';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import {
	AutoLockSelector,
	createAutoLockSchema,
} from '../../accounts/AutoLockSelector';
import Loading from '../../loading';
import Overlay from '../../overlay';

export function AutoLockAccounts() {
	const { t } = useI18n();
	const mainMenuUrl = useNextMenuUrl(true, '/');
	const navigate = useNavigate();
	const autoLock = useAutoLockMinutes();
	const savedAutoLockData = parseAutoLock(autoLock.data || null);
	const form = useZodForm({
		mode: 'all',
		schema: createAutoLockSchema(t) as any,
		values: {
			autoLock: savedAutoLockData,
		},
	});
	const {
		formState: { isSubmitting, isValid, isDirty },
	} = form;
	const setAutoLockMutation = useAutoLockMinutesMutation();
	return (
		<Overlay
			showModal={true}
			title={t('settings.autoLock')}
			closeOverlay={() => navigate(mainMenuUrl)}
		>
			<Loading loading={autoLock.isPending}>
				<Form
					className="flex flex-col h-full pt-5"
					form={form}
					onSubmit={async (data) => {
						await setAutoLockMutation.mutateAsync(
							{ minutes: autoLockDataToMinutes(data.autoLock) },
							{
								onSuccess: () => {
									toast.success(t('common.saved'));
								},
								onError: (error) => {
									toast.error((error as Error)?.message || t('common.failed'));
								},
							},
						);
					}}
				>
					<AutoLockSelector disabled={isSubmitting} />
					<div className="flex-1" />
					<Button
						type="submit"
						variant="primary"
						size="tall"
						text={t('common.save')}
						disabled={!isValid || !isDirty}
						loading={isSubmitting}
					/>
				</Form>
			</Loading>
		</Overlay>
	);
}
