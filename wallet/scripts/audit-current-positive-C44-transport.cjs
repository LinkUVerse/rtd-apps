// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Independent raw three-surface Chrome frames and current source/artifact verification.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { GrpcTypes } = require('rtd-typescript/grpc');
const [input, output] = process.argv.slice(2); assert(input && output && !fs.existsSync(output));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const read = f => JSON.parse(fs.readFileSync(f)), p = read(input);
assert(p.passed && p.networkIdentityAccepted && p.currentThreeQuerySurfacesAccepted);
assert.equal(p.extensionId, 'nbmpcfknfgjmecallhngcincnhklllpj');
assert.equal(p.origin, 'chrome-extension://' + p.extensionId);
assert(p.workerSource.matchesDisk && p.uiSource.matchesDisk);
assert(p.permissions.all && !p.permissions.unknownPort && p.permissions.each.length === 5 && p.permissions.each.every(r => r.contained));
assert(!p.chromeBusinessAccepted && !p.ordinaryChromeAccepted && !p.parentCompletion);
for (const k of ['simulations','signatures','executeRequests','certificateChanges','originalProfilesOpened']) assert.equal(p[k], 0);
for (const [f, h] of Object.entries(p.inputsSha256)) assert.equal(sha(f), h);
const buildFile = Object.keys(p.inputsSha256).find(f => f.endsWith('20261007-default-generation-positive-C44-build-02.json'));
const profileFile = Object.keys(p.inputsSha256).find(f => f.endsWith('/certified-positive-transport-release-20261006-01/profile.json'));
assert(buildFile && profileFile); const build = read(buildFile), profile = read(profileFile);
assert(build.passed); assert.deepEqual(p.source, build.sourceAfter);
assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), build.sourceAfter);
for (const [f, h] of Object.entries(build.artifacts)) assert.equal(sha(path.join(build.output, f)), h);
assert.equal(p.frames.length, 3); const [graph, archive, account] = p.frames;
for (const f of p.frames) assert.equal(f.status, 200);
assert.equal(graph.url, profile.endpoints.graphqlUrl);
assert.equal(archive.url, profile.endpoints.archiveGrpcWeb + '/rtd.rpc.v2.LedgerService/GetServiceInfo');
assert.equal(account.url, profile.endpoints.accountHistoryUrl);
const json = value => JSON.parse(Buffer.from(value, 'base64'));
const g = json(graph.responseBase64); assert(!g.errors);
assert.equal(g.data.chainIdentifier, profile.expectedGenesisDigest); assert.equal(g.data.walletGenesis.digest, profile.expectedGenesisDigest);
assert(json(graph.requestBase64).query.includes('checkpoint(sequenceNumber:0)'));
assert.equal(archive.requestBase64, 'AAAAAAA=');
const raw = Buffer.from(archive.responseBase64, 'base64'); assert(raw.length >= 10 && raw[0] === 0);
const size = raw.readUInt32BE(1); assert(5 + size + 5 <= raw.length && raw[5 + size] === 128);
const trailerSize = raw.readUInt32BE(6 + size); assert.equal(raw.length, 10 + size + trailerSize);
assert.match(raw.subarray(10 + size).toString(), /(^|\r\n)grpc-status:\s*0(\r\n|$)/);
const binary = raw.subarray(5, 5 + size), service = GrpcTypes.GetServiceInfoResponse.fromBinary(binary);
assert.equal(service.chainId, profile.expectedGenesisDigest); assert(service.checkpointHeight > 0n);
assert.equal(Buffer.from(GrpcTypes.GetServiceInfoResponse.toBinary(service)).toString('base64'), binary.toString('base64'));
const a = json(account.responseBase64); assert(!a.errors); const coverage = a.data.accountHistoryCoverage;
assert.equal(json(account.requestBase64).variables.chain, profile.expectedGenesisDigest);
assert.equal(coverage.chainId, profile.expectedGenesisDigest);
assert(Number.isSafeInteger(coverage.checkpointLo) && Number.isSafeInteger(coverage.checkpointHi) && coverage.checkpointLo >= 0 && coverage.checkpointLo <= coverage.checkpointHi);
assert.equal(typeof coverage.allAccountActivityCertified, 'boolean'); assert.deepEqual(coverage, p.accountCoverage);
const proof = { passed: true, observedAt: new Date().toISOString(), source: p.source, origin: p.origin,
  originalChromeThreeSurfacesRawFramesVerified: true, completeUnaryAndStatus0TrailerVerified: true,
  canonicalArchiveProtobufVerified: true, archiveCheckpoint: String(service.checkpointHeight), accountCoverage: coverage,
  allCandidateArtifactsAndInputsHeld: true, chromeBusinessAccepted: false, ordinaryChromeAccepted: false,
  simulations: 0, signatures: 0, executeRequests: 0, originalProfilesOpened: 0,
  inputsSha256: Object.fromEntries([__filename, path.resolve(input), buildFile, profileFile].map(f => [f, sha(f)])),
  scope: 'Independent actual current C44 empty Chrome renderer/worker/source/artifacts and permissions, captured GraphQL genesis, archive canonical unary protobuf+status0 trailer and account certified-coverage response. No new network, profiles, ordinary Chrome CA or funds/NFT/indexed acceptance.' };
fs.writeFileSync(output, JSON.stringify(proof, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ passed: true, surfaces: 3, archiveCheckpoint: proof.archiveCheckpoint }));
