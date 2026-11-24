// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useI18n } from '_app/i18n';
import cl from 'clsx';

export type ActivityStatus = 'confirming' | 'complete' | 'failed';

export function GenesisTag() {
  const { t } = useI18n();
  return (
    <span
      data-testid="activity-genesis-tag"
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gray-45 px-2 py-0.5 text-subtitleSmall font-semibold leading-none text-steel-darker"
    >
      <span aria-hidden className="h-1 w-1 rounded-full bg-steel" />
      {t("activity.genesisTransaction")}
    </span>
  );
}

export function ActivityStatusTag({ status }: { status: ActivityStatus }) {
  const { t } = useI18n();
  const confirming = status === 'confirming';
  const failed = status === 'failed';
  return (
    <span
      data-testid={`activity-${status}-tag`}
      className={cl(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-subtitleSmall font-semibold leading-none',
        confirming
          ? 'bg-warning-light text-warning-dark'
          : failed
            ? 'bg-issue-light text-issue-dark'
            : 'bg-success-light text-success-dark',
      )}
    >
      <span
        aria-hidden
        className={cl(
          'h-1 w-1 rounded-full',
          confirming
            ? 'animate-pulse bg-warning motion-reduce:animate-none'
            : failed
              ? 'bg-issue-dark'
              : 'bg-success-dark',
        )}
      />
      {t(
        confirming
          ? 'activity.confirming'
          : failed
            ? 'activity.failed'
            : 'activity.complete',
      )}
    </span>
  );
}
