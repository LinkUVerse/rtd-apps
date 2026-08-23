// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import Overlay from '_components/overlay';
import { useI18n } from '_app/i18n';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { SelectValidatorCard } from '../validators/SelectValidatorCard';
import StakingCard from './StakingCard';

function StakePage() {
	const { t } = useI18n();
	const [searchParams] = useSearchParams();
	const validatorAddress = searchParams.get('address');
	const unstake = searchParams.get('unstake') === 'true';

	const navigate = useNavigate();
	const stakingTitle = unstake
		? t('staking.unstakeRtd')
		: t('staking.stakeRtd');

	return (
		<Overlay
			showModal={true}
			title={
				validatorAddress ? stakingTitle : t('staking.selectValidatorTitle')
			}
			closeOverlay={() => navigate('/')}
		>
			{validatorAddress ? <StakingCard /> : <SelectValidatorCard />}
		</Overlay>
	);
}

export default StakePage;
