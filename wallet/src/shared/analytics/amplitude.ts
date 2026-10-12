// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as amplitude from "@amplitude/analytics-browser";
import {
  LogLevel,
  TransportType,
  type UserSession,
} from "@amplitude/analytics-types";
import { PersistableStorage } from "rtd-apps-core/src/utils/persistableStorage";

import { ampli } from "./ampli";
import { walletExternalServicesEnabled } from "../external-services";

const IS_PROD_ENV = process.env.NODE_ENV === "production";

export const persistableStorage = new PersistableStorage<UserSession>();

export async function initAmplitude() {
  if (!walletExternalServicesEnabled) return;
  ampli.load({
    environment: IS_PROD_ENV ? "production" : "development",
    // Flip this if you'd like to test Amplitude locally
    disabled: !IS_PROD_ENV,
    client: {
      configuration: {
        logLevel: IS_PROD_ENV ? LogLevel.Warn : LogLevel.Debug,
      },
    },
  });

  window.addEventListener("pagehide", () => {
    amplitude.setTransport("beacon");
    amplitude.flush();
  });
}

export function getUrlWithDeviceId(url: URL) {
  if (!walletExternalServicesEnabled || !ampli.isLoaded) return url;
  const amplitudeDeviceId = ampli.client.getDeviceId();
  if (amplitudeDeviceId) {
    url.searchParams.append("deviceId", amplitudeDeviceId);
  }
  return url;
}

export function resetAnalytics() {
  if (walletExternalServicesEnabled && ampli.isLoaded) ampli.client.reset();
}
