// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { ZkLoginProvider } from "_src/background/accounts/zklogin/providers";
import { useI18n } from "_app/i18n";
export type ZkLoginButtonsProps = {
  layout: "column" | "row";
  showLabel?: boolean;
  buttonsDisabled?: boolean;
  onButtonClick?: (provider: ZkLoginProvider) => Promise<void> | void;
  sourceFlow: string;
  forcedZkLoginProvider?: ZkLoginProvider | null;
};

export function ZkLoginButtons(_props: ZkLoginButtonsProps) {
  const { t } = useI18n();
  return (
    <div role="note" className="text-sm text-steel-dark">
      {t("accounts.zkUnsupported")}
    </div>
  );
}
