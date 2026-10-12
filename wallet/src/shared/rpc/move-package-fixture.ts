// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Binary protocol fault fixtures only; never execution or real bytecode evidence.
import { bcs } from "rtd-typescript/bcs";
import { GrpcTypes } from "rtd-typescript/grpc";
import { toBase58 } from "rtd-typescript/utils";
import { freshObjectDigest } from "./fresh-object";
import { walletMoveContracts } from "./wallet-move-contracts";
import type { ValidatedNetworkProfile } from "./profile";
export function movePackageFixtures(profile: ValidatedNetworkProfile) {
  const contracts = Object.values(walletMoveContracts(profile)).flatMap((g) =>
    g.state === "configured" ? g.contracts : [],
  );
  const packages = new Map<string, GrpcTypes.Package>();
  for (const contract of contracts) {
    const pkg = packages.get(contract.packageId) ?? {
      storageId: contract.packageId,
      originalId: contract.packageId,
      version: 1n,
      modules: [],
      typeOrigins: [],
      linkage: [],
    };
    for (const d of contract.datatypes) {
      const m = pkg.modules.find((v) => v.name === d.module) ?? {
        name: d.module,
        datatypes: [],
        functions: [],
      };
      if (!pkg.modules.includes(m)) pkg.modules.push(m);
      if (!m.datatypes.some((v) => v.name === d.name))
        m.datatypes.push(structuredClone(d));
    }
    for (const f of contract.functions) {
      const m = pkg.modules.find((v) => v.name === f.module) ?? {
        name: f.module,
        datatypes: [],
        functions: [],
      };
      if (!pkg.modules.includes(m)) pkg.modules.push(m);
      if (!m.functions.some((v) => v.name === f.descriptor.name))
        m.functions.push(structuredClone(f.descriptor));
    }
    packages.set(contract.packageId, pkg);
  }
  const objects = new Map<string, GrpcTypes.Object>();
  for (const [id, pkg] of packages) objects.set(id, packageObject(pkg));
  return { packages, objects };
}
export function packageObject(pkg: GrpcTypes.Package): GrpcTypes.Object {
  const id = pkg.storageId!,
    previousTransaction = toBase58(new Uint8Array(32).fill(2));
  const bytes = bcs.Object.serialize({
    data: {
      Package: {
        id,
        version: pkg.version!.toString(),
        moduleMap: new Map(
          pkg.modules.map((m) => [m.name!, new Uint8Array([1, 2, 3])]),
        ),
        typeOriginTable: pkg.modules.flatMap((m) =>
          m.datatypes.map((d) => ({
            moduleName: m.name!,
            datatypeName: d.name!,
            package: d.definingId!,
          })),
        ),
        linkageTable: new Map(),
      },
    },
    owner: { Immutable: null },
    previousTransaction,
    storageRebate: "0",
  }).toBytes();
  return {
    objectId: id,
    version: pkg.version,
    objectType: "package",
    bcs: { value: bytes },
    digest: freshObjectDigest(bytes),
    owner: { kind: GrpcTypes.Owner_OwnerKind.IMMUTABLE },
    previousTransaction,
  };
}
export function grpcPacket(bytes: Uint8Array, status = 0) {
  const frame = (payload: Uint8Array, flag: number) => {
    const data = new Uint8Array(payload.length + 5);
    data[0] = flag;
    new DataView(data.buffer).setUint32(1, payload.length, false);
    data.set(payload, 5);
    return data;
  };
  const msg = frame(bytes, 0),
    trailer = frame(
      new TextEncoder().encode(`grpc-status: ${status}\r\n`),
      128,
    );
  const out = new Uint8Array(msg.length + trailer.length);
  out.set(msg);
  out.set(trailer, msg.length);
  return new Response(out, {
    headers: { "content-type": "application/grpc-web+proto" },
  });
}
