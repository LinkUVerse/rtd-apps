// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { isZkLoginAccountSerializedUI } from "_src/background/accounts/zklogin/ZkLoginAccount";
import { type MethodPayload } from "_src/shared/messaging/messages/payloads/MethodPayload";
import { useI18n } from "_src/ui/app/i18n";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "_src/ui/app/shared/Dialog";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { useActiveAccount } from "../../hooks/useActiveAccount";
import { useBackgroundClient } from "../../hooks/useBackgroundClient";
import { Button } from "../../shared/ButtonUI";

export function ZkLoginAccountWarningModal() {
  const { t } = useI18n();
  const activeAccount = useActiveAccount();
  const backgroundClient = useBackgroundClient();
  const warningMutation = useMutation({
    mutationKey: ["acknowledge-zk-login-warning"],
    mutationFn: (args: MethodPayload<"acknowledgeZkLoginWarning">["args"]) =>
      backgroundClient.acknowledgeZkLoginWarning(args),
  });
  if (
    activeAccount &&
    isZkLoginAccountSerializedUI(activeAccount) &&
    !activeAccount.warningAcknowledged
  ) {
    return (
      <Dialog open>
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          background="avocado"
        >
          <DialogHeader>
            <DialogTitle className="text-hero-darkest">
              <div>{t("accounts.zkUnsupported")}</div>
            </DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button
              text={t("accounts.understand")}
              loading={warningMutation.isPending}
              onClick={() =>
                warningMutation.mutate(
                  { accountID: activeAccount.id },
                  {
                    onError: (e) => {
                      toast.error(
                        (e as Error)?.message || t("common.somethingWrong"),
                      );
                    },
                  },
                )
              }
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  return null;
}
