// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * This is an App UI Component, which is responsible for network selection.
 * It's as context un-aware as it reasonably can be, being a controlled component.
 * In the future, this should move outside of the base `~/ui/` directory, but for
 * now we are including App UI Components in the base UI component directory.
 */

import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react";
import { Popover } from "@headlessui/react";
import { useZodForm } from "rtd-apps-core";
import { HamburgerRest16 } from "rtd-apps-icons";
import { Text } from "@linku/ui";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { z } from "zod";

import { NavItem } from "./NavItem";
import { ReactComponent as CheckIcon } from "../icons/check_16x16.svg";
import { ReactComponent as MenuIcon } from "../icons/menu.svg";
import { useI18n } from "~/i18n";

import type { ComponentProps, ReactNode } from "react";

export type NetworkOption = {
  id: string;
  label: string;
};

export type NetworkSelectProps = {
  networks: NetworkOption[];
  value: string;
  version?: number | string;
  binaryVersion?: string;
  onChange(networkId: string): void;
};

enum NetworkState {
  UNSELECTED = "UNSELECTED",
  PENDING = "PENDING",
  SELECTED = "SELECTED",
}

type SelectableNetworkProps = {
  state: NetworkState;
  children: ReactNode;
  onClick(): void;
} & ComponentProps<"div">;

function SelectableNetwork({
  state,
  children,
  onClick,
  ...props
}: SelectableNetworkProps) {
  return (
    <div
      role="button"
      onClick={onClick}
      className={clsx(
        "flex cursor-pointer items-start gap-3 rounded-xl px-2.5 py-2.5 text-body font-semibold transition-colors hover:bg-rtd-lightest ui-active:bg-rtd-lightest",
        state !== NetworkState.UNSELECTED
          ? "text-ink"
          : "text-steel-dark",
      )}
      {...props}
    >
      <CheckIcon
        className={clsx("flex-shrink-0", {
          "text-success": state === NetworkState.SELECTED,
          "text-steel": state === NetworkState.PENDING,
          "text-gray-45": state === NetworkState.UNSELECTED,
        })}
      />
      <div className="mt-px">
        <Text
          variant="body/semibold"
          color={
            state === NetworkState.SELECTED ? "steel-darker" : "steel-dark"
          }
        >
          {children}
        </Text>
      </div>
    </div>
  );
}

const CustomRPCSchema = z.object({
  url: z.string().url(),
});

function CustomRPCInput({
  value,
  onChange,
}: {
  value: string;
  onChange(networkUrl: string): void;
}) {
  const { t } = useI18n();
  const { register, handleSubmit, formState } = useZodForm({
    schema: CustomRPCSchema,
    mode: "all",
    defaultValues: {
      url: value,
    },
  });

  const { errors, isDirty, isValid } = formState;

  return (
    <form
      onSubmit={handleSubmit((values) => {
        onChange(values.url);
      })}
      className="relative flex items-center rounded-xl"
    >
      <input
        {...register("url")}
        type="text"
        className={clsx(
          "block w-full rounded-xl border p-3 pr-16 text-[12px] shadow-sm outline-none transition-colors focus:border-rtd focus:ring-2 focus:ring-rtd/20",
          errors.url
            ? "border-issue-dark text-issue-dark"
            : "border-line bg-white text-ink",
        )}
      />

      <div className="absolute inset-y-0 right-0 flex flex-col justify-center px-3">
        <button
          disabled={!isDirty || !isValid}
          type="submit"
          className="flex items-center justify-center rounded-full bg-gray-90 px-2 py-1 text-captionSmall font-semibold uppercase text-white transition disabled:bg-gray-45 disabled:text-gray-65"
        >
          {t("Save")}
        </button>
      </div>
    </form>
  );
}

function NetworkVersion({
  label,
  version,
  binaryVersion,
}: {
  label: string;
  version: number | string;
  binaryVersion: string;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col justify-between gap-1 px-4 py-3">
      <Text variant="subtitleSmall/medium" color="steel-dark">
        {t("RTD {label}", { label })}
      </Text>
      <Text variant="subtitleSmall/medium" color="steel-dark">
        {t("v{binary} (Protocol {version})", { binary: binaryVersion, version })}
      </Text>
    </div>
  );
}

function NetworkSelectPanel({
  networks,
  onChange,
  value,
}: Omit<NetworkSelectProps, "version">) {
  const { t } = useI18n();
  const isCustomNetwork = !networks.find(({ id }) => id === value);
  const [customOpen, setCustomOpen] = useState(isCustomNetwork);

  useEffect(() => {
    setCustomOpen(isCustomNetwork);
  }, [isCustomNetwork]);

  return (
    <>
      {networks.map((network) => (
        <SelectableNetwork
          key={network.id}
          state={
            !customOpen && value === network.id
              ? NetworkState.SELECTED
              : NetworkState.UNSELECTED
          }
          onClick={() => {
            onChange(network.id);
          }}
        >
          {network.label}
        </SelectableNetwork>
      ))}

      <SelectableNetwork
        state={
          isCustomNetwork
            ? NetworkState.SELECTED
            : customOpen
              ? NetworkState.PENDING
              : NetworkState.UNSELECTED
        }
        onClick={() => setCustomOpen(true)}
      >
        {t("Custom RPC URL")}
        {customOpen && (
          <div className="mt-3">
            <CustomRPCInput
              value={isCustomNetwork ? value : ""}
              onChange={onChange}
            />
          </div>
        )}
      </SelectableNetwork>
    </>
  );
}

function ResponsiveIcon() {
  return (
    <div>
      <HamburgerRest16 className="hidden md:block" />
      <MenuIcon className="block md:hidden" />
    </div>
  );
}

export function NetworkSelect({
  networks,
  value,
  version,
  binaryVersion,
  onChange,
}: NetworkSelectProps) {
  const { t } = useI18n();
  const { x, y, refs, strategy } = useFloating({
    placement: "bottom-end",
    middleware: [offset(5), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  const selected = networks.find(({ id }) => id === value);

  return (
    <Popover>
      {({ open, close }) => (
        <>
          <Popover.Button
            ref={refs.setReference}
            as={NavItem}
            afterIcon={<ResponsiveIcon />}
          >
            <div className="hidden md:block">
              <Text variant="body/semibold" color="hero-darkest">
                {selected?.label || t("Custom")}
              </Text>
            </div>
          </Popover.Button>
          <FloatingPortal>
            <AnimatePresence>
              {open && (
                <motion.div
                  ref={refs.setFloating}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  style={{ position: strategy, top: y ?? 0, left: x ?? 0 }}
                  className="z-20"
                >
                  <Popover.Panel
                    static
                    className="z-20 flex w-60 flex-col gap-1.5 rounded-2xl border border-white/70 bg-white/90 px-3 py-3.5 shadow-glass backdrop-blur-2xl focus:outline-none"
                  >
                    <NetworkSelectPanel
                      networks={networks}
                      value={value}
                      onChange={(network) => {
                        onChange(network);
                        close();
                      }}
                    />
                    {!!value && version && binaryVersion ? (
                      <div className="-mx-3 -mb-3.5 mt-1.5 rounded-b-2xl bg-rtd-lightest/70">
                        <NetworkVersion
                          label={selected?.label ?? t("Custom RPC URL")}
                          binaryVersion={binaryVersion}
                          version={version}
                        />
                      </div>
                    ) : null}
                  </Popover.Panel>
                </motion.div>
              )}
            </AnimatePresence>
          </FloatingPortal>
        </>
      )}
    </Popover>
  );
}
