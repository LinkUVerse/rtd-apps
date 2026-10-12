// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, expect, it, vi } from "vitest";

const analytics = vi.hoisted(() => ({
  load: vi.fn(),
  reset: vi.fn(),
  getDeviceId: vi.fn(() => "fixture-device"),
  setTransport: vi.fn(),
  flush: vi.fn(),
}));
vi.mock("webextension-polyfill", () => ({
  default: { runtime: { getManifest: () => ({ version: "test" }) } },
}));
vi.mock("./analytics/ampli", () => ({
  ampli: {
    load: analytics.load,
    isLoaded: true,
    client: { reset: analytics.reset, getDeviceId: analytics.getDeviceId },
  },
}));
vi.mock("@amplitude/analytics-browser", () => ({
  setTransport: analytics.setTransport,
  flush: analytics.flush,
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.clearAllMocks();
});

it("defaults to disabled when no build policy is supplied", async () => {
  const { walletExternalServicesEnabled } = await import("./external-services");
  expect(walletExternalServicesEnabled).toBe(false);
});
it("does not accept string or truthy runtime values as a build flag", async () => {
  vi.stubGlobal("__WALLET_EXTERNAL_SERVICES_ENABLED__", "true");
  expect(
    (await import("./external-services")).walletExternalServicesEnabled,
  ).toBe(false);
});
it("closed feature loading clears stale flags without SDK remote loading", async () => {
  vi.stubGlobal("__WALLET_EXTERNAL_SERVICES_ENABLED__", false);
  const { growthbook, loadWalletFeatures, FEATURES } =
    await import("./experimentation/features");
  growthbook.setFeatures({ [FEATURES.WALLET_QREDO]: { defaultValue: true } });
  const remote = vi.spyOn(growthbook, "loadFeatures");
  await loadWalletFeatures();
  await loadWalletFeatures();
  expect(remote).not.toHaveBeenCalled();
  expect(growthbook.isOff(FEATURES.WALLET_QREDO)).toBe(true);
  expect(growthbook.getFeatureValue("absent-refresh", 123)).toBe(123);
  expect(growthbook.getFeatures()).toEqual({});
});
it("explicit enabled feature loading calls the actual instance loader", async () => {
  vi.stubGlobal("__WALLET_EXTERNAL_SERVICES_ENABLED__", true);
  const { growthbook, loadWalletFeatures } =
    await import("./experimentation/features");
  const remote = vi
    .spyOn(growthbook, "loadFeatures")
    .mockResolvedValue(undefined);
  await loadWalletFeatures();
  expect(remote).toHaveBeenCalledOnce();
});
it("closed analytics has no initialization or sender lifecycle and preserves URLs", async () => {
  vi.stubGlobal("__WALLET_EXTERNAL_SERVICES_ENABLED__", false);
  const lifecycle = vi.spyOn(window, "addEventListener");
  const { initAmplitude, getUrlWithDeviceId, resetAnalytics } =
    await import("./analytics/amplitude");
  await initAmplitude();
  resetAnalytics();
  const url = new URL("https://example.test/path?existing=1");
  expect(getUrlWithDeviceId(url)).toBe(url);
  expect(url.search).toBe("?existing=1");
  expect(analytics.load).not.toHaveBeenCalled();
  expect(analytics.reset).not.toHaveBeenCalled();
  expect(analytics.getDeviceId).not.toHaveBeenCalled();
  expect(lifecycle.mock.calls.some(([type]) => type === "pagehide")).toBe(
    false,
  );
});
it("explicit enabled analytics retains loaded client reset and device URL behavior", async () => {
  vi.stubGlobal("__WALLET_EXTERNAL_SERVICES_ENABLED__", true);
  const { getUrlWithDeviceId, resetAnalytics } =
    await import("./analytics/amplitude");
  resetAnalytics();
  expect(analytics.reset).toHaveBeenCalledOnce();
  expect(
    getUrlWithDeviceId(new URL("https://example.test/")).searchParams.get(
      "deviceId",
    ),
  ).toBe("fixture-device");
});
it("closed policy also disables production Sentry", async () => {
  vi.stubGlobal("__WALLET_EXTERNAL_SERVICES_ENABLED__", false);
  const config = (await import("./sentry-config")).getSentryConfig({});
  expect(config.enabled).toBe(false);
});
