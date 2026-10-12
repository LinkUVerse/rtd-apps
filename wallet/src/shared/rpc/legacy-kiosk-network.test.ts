// Explorer-only legacy DTO helpers must consume the current Kiosk SDK contract.
import { expect, it } from "vitest";
import { KIOSK_OWNER_CAP, PERSONAL_KIOSK_RULE_ADDRESS } from "rtd-kiosk";
import { isKioskOwnerToken, ORIGINBYTE_KIOSK_OWNER_TOKEN } from "rtd-apps-core/src/utils/kiosk";
const object = (type: string) => ({ objectId: "0x1", version: "1", digest: "digest", type });
it("supports current SDK string networks and the existing token families", () => {
  expect(isKioskOwnerToken("mainnet", object(KIOSK_OWNER_CAP))).toBe(true);
  expect(isKioskOwnerToken("testnet", object(`${PERSONAL_KIOSK_RULE_ADDRESS.testnet}::personal_kiosk::PersonalKioskCap`))).toBe(true);
  expect(isKioskOwnerToken("custom", object(ORIGINBYTE_KIOSK_OWNER_TOKEN))).toBe(true);
});
it("does not manufacture a personal package for an unconfigured network", () => {
  expect(isKioskOwnerToken("custom", object("undefined::personal_kiosk::PersonalKioskCap"))).toBe(false);
  expect(isKioskOwnerToken("custom", object(`${PERSONAL_KIOSK_RULE_ADDRESS.mainnet}::personal_kiosk::PersonalKioskCap`))).toBe(false);
  expect(isKioskOwnerToken("custom", null)).toBe(false);
});
