// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { cva, type VariantProps } from "class-variance-authority";
import { useI18n } from "_app/i18n";

const appEmptyStyle = cva(
  ["flex flex-col justify-center gap-2 p-3.75 text-center"],
  {
    variants: {
      displayType: {
        full: "w-full min-h-28",
        card: "bg-white box-border w-full rounded-2xl min-h-32 border border-solid border-gray-40",
      },
    },
    defaultVariants: {
      displayType: "full",
    },
  },
);

export interface RtdAppEmptyProps extends VariantProps<typeof appEmptyStyle> {
  kind: "catalog" | "connections";
}

export function RtdAppEmpty({ kind, ...styleProps }: RtdAppEmptyProps) {
  const { t } = useI18n();
  const connected = kind === "connections";
  return (
    <div className={appEmptyStyle(styleProps)} role="status" aria-live="polite">
      <p className="m-0 text-pBody font-semibold text-gray-90">
        {t(connected ? "apps.noConnections" : "apps.noApps")}
      </p>
      <p className="m-0 text-pBodySmall text-gray-75">
        {t(
          connected
            ? "apps.noConnectionsDescription"
            : "apps.noAppsDescription",
        )}
      </p>
    </div>
  );
}
