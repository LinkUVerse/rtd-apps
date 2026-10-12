// A current complete snapshot at S >= placement; historical placement need not remain queryable.
// This pure policy cannot supply restoration/ownership evidence or issue any network request.
const dependencies = [
  ['Query','checkpoints'],['Address','balances'],['Address','objects'],['Address','dynamicFields'],
  ['Address','dynamicField'],['Address','dynamicObjectField'],['Query','object'],['Query','coinMetadata'],
  ['MoveObject','contents'],['MoveValue','display'],
];
const dependencyKey = value => JSON.stringify({type:value.type,field:value.field,...(value.filters?{filters:value.filters}:{})});
const required = dependencies.map(([type,field])=>dependencyKey({type,field})).sort();
const safe = value => Number.isSafeInteger(value) && value >= 0;
const unsigned = value => typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value) && safe(Number(value));
const contains = (range, height) => range && safe(range.minCheckpoint) && safe(range.maxCheckpoint)
  && range.minCheckpoint <= height && height <= range.maxCheckpoint;

module.exports = function admit(proof, facts) {
  const refuse = reason => ({ready:false,reason});
  if (!proof || !proof.passed || proof.finiteReadonlyObservation !== false
      || proof.catchupAccepted !== true || proof.ownershipSuccessorAccepted !== true)
    return refuse('completed-restoration-proof-required');
  const age = facts.now - Date.parse(proof.observedAt);
  if (!Number.isFinite(age) || age < 0 || age > 180000) return refuse('snapshot-proof-expired');
  if (proof.h0 !== facts.h0 || proof.generation !== facts.generation)
    return refuse('snapshot-identity-differs');
  const snapshot = proof.snapshot, height = Number(snapshot?.checkpoint);
  if (!snapshot || !unsigned(snapshot.checkpoint) || !safe(facts.target) || height < facts.target || !snapshot.digest)
    return refuse('target-not-indexed');
  if (!Array.isArray(snapshot.dependencies) || snapshot.dependencies.length !== 10
      || JSON.stringify(snapshot.dependencies.map(dependencyKey).sort()) !== JSON.stringify(required))
    return refuse('complete-ten-dependencies-required');
  if (!safe(facts.commonLo) || !safe(facts.commonHi) || facts.commonLo > height || facts.commonHi < height
      || !contains(facts.nativeRange,height) || !contains(proof.nativeRangeBefore,height)
      || !contains(proof.nativeRangeAfter,height))
    return refuse('snapshot-outside-current-window');
  const display = snapshot.displayHistory?.coverage;
  if (!display || display.genesisDigest !== facts.h0 || display.generation !== facts.generation
      || display.snapshotCheckpoint !== snapshot.checkpoint || display.snapshotCheckpointDigest !== snapshot.digest
      || !unsigned(display.firstCheckpoint) || !unsigned(display.lastCheckpoint)
      || Number(display.firstCheckpoint) > height || Number(display.lastCheckpoint) < height)
    return refuse('complete-display-coverage-required');
  if (proof.actualProductionFrameworkNonemptyRead !== true || proof.kioskId !== facts.kioskId
      || proof.capId !== facts.capId || proof.itemCount !== 1 || !Array.isArray(proof.objects)
      || proof.objects.length !== 2 || proof.chromeStarted !== false || proof.keystoreRead !== false
      || proof.simulations !== 0 || proof.signatures !== 0 || proof.executeRequests !== 0)
    return refuse('actual-readonly-framework-proof-required');
  const rows = new Map(proof.objects.map(row=>[row.role,row]));
  if (rows.size !== 2 || !rows.has('fullnode') || !rows.has('archive'))
    return refuse('both-object-roles-required');
  for (const row of rows.values()) {
    if (row.objectId !== facts.item.objectId || row.version !== facts.item.version
        || row.digest !== facts.item.digest || row.owner !== facts.item.owner
        || !/^[0-9a-f]{64}$/.test(row.contentSha256) || row.previousTransaction !== facts.placementDigest)
      return refuse('fresh-item-identity-differs');
  }
  if (rows.get('fullnode').contentSha256 !== rows.get('archive').contentSha256)
    return refuse('object-bodies-differ');
  return {ready:true,snapshotCheckpoint:height,snapshotDigest:snapshot.digest,
    placementCheckpoint:facts.target,placementInsideHistoricalRangeRequired:false};
};
