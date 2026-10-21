// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { normalizeRtdAddress as address, toBase64 } from "rtd-typescript/utils";
import { stakingFixture } from "../../../tests/unit/rpc/staking-fixture";
import { WalletAssetReader } from "./asset-reader";
import { WalletStakingSnapshotReader } from "./staking-snapshot-reader";
import {
  STAKING_RATE_BCS,
  SYSTEM_V1_BCS,
  SYSTEM_V2_BCS,
  stakingBcs,
} from "./staking-bcs";

describe.each([WalletAssetReader, WalletStakingSnapshotReader])(
  "%s same-snapshot system and complete staking portfolio",
  (Reader) => {
    async function reader(f: ReturnType<typeof stakingFixture>) {
      return Reader.open(f.session, { fetch: f.fetch });
    }
    it.each(["1", "2"] as const)(
      "version %s composes active/inactive/pending positions and exact rewards",
      async (version) => {
        const f = stakingFixture(version);
        const view = (await (await reader(f)).staking(f.owner)).value;
        expect(view.epoch).toBe("2");
        expect(view.validators).toHaveLength(2);
        expect(view.positions).toHaveLength(3);
        expect(view.positions?.[0]).toMatchObject({
          status: "active",
          poolState: "active",
          principal: "9007199254740993",
          reward: { state: "estimated", amount: "4503599627370497" },
        });
        expect(view.positions?.[1]).toMatchObject({
          poolState: "inactive",
          validatorAddress: address("0xb2"),
          reward: { amount: "2" },
        });
        expect(view.positions?.[2]).toMatchObject({
          status: "pending",
          reward: { state: "unknown", reason: "pending" },
        });
        expect(view.validators[0].atRiskEpochs).toBe("2");
        expect(view.validators[1].apy).toEqual({
          state: "unknown",
          reason: "inactive-pool",
        });
        expect(
          f.requests
            .filter((x) => x.query.includes("WalletSnapshotRead"))
            .every((x) => x.query.includes("checkpoint(sequenceNumber: 10)")),
        ).toBe(true);
        expect(f.requests.some((x) => x.query.includes("systemState"))).toBe(
          false,
        );
      },
    );
    it("system-only request returns positions null and does not query owned objects", async () => {
      const f = stakingFixture();
      const view = (await (await reader(f)).staking()).value;
      expect(view.positions).toBeNull();
      expect(f.requests.some((x) => x.query.includes("objects(first:"))).toBe(
        false,
      );
    });
    it("unresolved pool is explicit unknown, not zero rewards or a fabricated validator", async () => {
      const f = stakingFixture();
      f.stakes[0].pool_id = address("0xffff");
      expect(
        (await (await reader(f)).staking(f.owner)).value.positions?.[0],
      ).toMatchObject({
        poolState: "unresolved",
        validatorAddress: null,
        reward: { state: "unknown", reason: "pool-unresolved" },
      });
    });
    it("request epoch saturates at zero and safe mode remains visible", async () => {
      const f = stakingFixture();
      f.system.safe_mode = true;
      f.stakes[0].stake_activation_epoch = "0";
      const view = (await (await reader(f)).staking(f.owner)).value;
      expect(view.safeMode).toBe(true);
      expect(view.positions?.[0].requestEpoch).toBe("0");
    });
    it.each([
      "state-version",
      "inactive-count",
      "rate-count",
      "commission",
      "duplicate-pool",
      "unknown-risk",
      "deactivated-active",
    ])(
      "rejects inconsistent %s before returning a partial portfolio",
      async (failure) => {
        const f = stakingFixture();
        if (failure === "state-version") f.system.system_state_version = "1";
        if (failure === "inactive-count")
          f.system.validators.inactive_validators.size = "2";
        if (failure === "rate-count")
          f.validator.staking_pool.exchange_rates.size = "1";
        if (failure === "commission") f.validator.commission_rate = "10001";
        if (failure === "duplicate-pool")
          f.inactive.staking_pool.id = f.validator.staking_pool.id;
        if (failure === "unknown-risk")
          f.system.validators.at_risk_validators.contents[0].key =
            address("0xffff");
        if (failure === "deactivated-active")
          f.validator.staking_pool.deactivation_epoch = "1";
        await expect((await reader(f)).staking(f.owner)).rejects.toThrow();
      },
    );
    it("missing or malformed rate value is not an empty-rate estimate", async () => {
      const f = stakingFixture();
      f.override((result, request) => {
        if (
          request.query.includes("dynamicFields(first:") &&
          request.variables.parent === address("0xd")
        ) {
          const data = result as any;
          data.address.dynamicFields.nodes[0].value.bcs = toBase64(
            new Uint8Array([1]),
          );
        }
        return result;
      });
      await expect((await reader(f)).staking(f.owner)).rejects.toThrow();
    });
    it("all rate pages including an empty advancing page must complete before commit", async () => {
      const f = stakingFixture();
      f.override((result, request) => {
        if (
          request.query.includes("dynamicFields(first:") &&
          request.variables.parent === address("0xd")
        ) {
          const data = result as any,
            nodes = data.address.dynamicFields.nodes;
          data.address.dynamicFields =
            request.variables.cursor === null
              ? {
                  nodes: [nodes[0]],
                  pageInfo: { hasNextPage: true, endCursor: "empty" },
                }
              : request.variables.cursor === "empty"
                ? {
                    nodes: [],
                    pageInfo: { hasNextPage: true, endCursor: "last" },
                  }
                : {
                    nodes: [nodes[1]],
                    pageInfo: { hasNextPage: false, endCursor: null },
                  };
        }
        return result;
      });
      const result = await (await reader(f)).staking(f.owner);
      expect(result.value.positions?.[0].reward).toMatchObject({
        amount: "4503599627370497",
      });
      expect(
        f.requests.filter(
          (x) =>
            x.query.includes("dynamicFields(first:") &&
            x.variables.parent === address("0xd"),
        ),
      ).toHaveLength(3);
    });
    it("a changed final checkpoint digest refuses the complete view", async () => {
      const f = stakingFixture();
      let readPositions = false;
      const fetch: typeof globalThis.fetch = async (input, init) => {
        const response = await f.fetch(input, init),
          body = await response.json();
        const request = JSON.parse(String(init?.body));
        if (request.query.includes("objects(first:")) readPositions = true;
        else if (readPositions && body.data.walletSnapshot)
          body.data.walletSnapshot.digest = f.profile.expectedGenesisDigest;
        return Response.json(body);
      };
      const r = await Reader.open(f.session, { fetch });
      await expect(r.staking(f.owner)).rejects.toThrow();
    });
    it("BCS rejects trailing bytes and incompatible version layout", () => {
      const f = stakingFixture();
      const bytes = SYSTEM_V2_BCS.serialize(f.system).toBytes();
      expect(() =>
        stakingBcs(SYSTEM_V2_BCS, new Uint8Array([...bytes, 0])),
      ).toThrow();
      expect(() => stakingBcs(SYSTEM_V1_BCS, bytes)).toThrow();
      expect(
        stakingBcs(
          STAKING_RATE_BCS,
          STAKING_RATE_BCS.serialize({
            rtd_amount: "0",
            pool_token_amount: "0",
          }).toBytes(),
        ),
      ).toEqual({ rtd_amount: "0", pool_token_amount: "0" });
    });
    it("cancelled or closed sessions cannot return an already built view", async () => {
      const f = stakingFixture();
      const r = await reader(f);
      f.session.close();
      await expect(r.staking(f.owner)).rejects.toThrow();
      const g = stakingFixture();
      await expect(
        (await reader(g)).staking(g.owner, AbortSignal.abort()),
      ).rejects.toThrow();
    });
    it.each(["complete", "duplicate", "malformed-last"] as const)(
      "owned stake pagination admits whole portfolio or rejects: %s",
      async (scenario) => {
        const f = stakingFixture();
        f.override((result, request) => {
          if (request.query.includes("objects(first:")) {
            const data = result as any;
            const nodes = data.address.objects.nodes;
            const cursor = request.variables.cursor;
            if (cursor === null)
              data.address.objects = {
                nodes: [nodes[0]],
                pageInfo: { hasNextPage: true, endCursor: "stake-empty" },
              };
            else if (cursor === "stake-empty")
              data.address.objects = {
                nodes: [],
                pageInfo: { hasNextPage: true, endCursor: "stake-last" },
              };
            else {
              const last =
                scenario === "duplicate"
                  ? [nodes[0], nodes[1], nodes[2]]
                  : [nodes[1], nodes[2]];
              if (scenario === "malformed-last")
                last[1].contents.bcs = toBase64(new Uint8Array([1]));
              data.address.objects = {
                nodes: last,
                pageInfo: { hasNextPage: false, endCursor: null },
              };
            }
          }
          return result;
        });
        const result = (await reader(f)).staking(f.owner);
        if (scenario !== "complete") await expect(result).rejects.toThrow();
        else {
          const positions = (await result).value.positions!;
          expect(positions.map((position) => position.objectId)).toEqual(
            f.stakes.map((stake) => stake.id),
          );
          expect(
            positions.reduce(
              (sum, position) => sum + BigInt(position.principal),
              0n,
            ),
          ).toBe(9007199254741096n);
          expect(positions.map((position) => position.poolState)).toEqual([
            "active",
            "inactive",
            "active",
          ]);
        }
        expect(
          f.requests.filter((request) =>
            request.query.includes("objects(first:"),
          ),
        ).toHaveLength(3);
      },
    );
  },
);
