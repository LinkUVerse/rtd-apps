// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useI18n } from '_app/i18n';
import cl from 'clsx';

export type ActivityStatus = 'confirming' | 'complete';

export function ActivityStatusTag({ status }: { status: ActivityStatus }) {
  const { t } = useI18n();
  const confirming = status === 'confirming';
  return (
    <span
      data-testid={`activity-${status}-tag`}
      className={cl(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-subtitleSmall font-semibold leading-none',
        confirming
          ? 'bg-warning-light text-warning-dark'
          : 'bg-success-light text-success-dark',
      )}
    >
      <span
        aria-hidden
        className={cl(
          'h-1 w-1 rounded-full',
          confirming
            ? 'animate-pulse bg-warning motion-reduce:animate-none'
            : 'bg-success-dark',
        )}
      />
      {t(confirming ? 'activity.confirming' : 'activity.complete')}
    </span>
  );
}
