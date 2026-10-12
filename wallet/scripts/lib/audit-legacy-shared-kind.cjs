// Audit-only compatibility for the v2 Input legacy bool and matching new enum.
// Preserve every other field; unknown/non-exclusive/conflicting semantics fail closed.
const assert = require('node:assert/strict');

function comparableLegacySharedKind(data) {
  assert.equal(data.oneofKind, 'programmableTransaction');
  const pt = data.programmableTransaction;
  return { ...data, programmableTransaction: { ...pt, inputs: pt.inputs.map(input => {
    if (input.kind !== 3) return input;
    assert.equal(typeof input.mutable, 'boolean', 'legacy shared mutability must be explicit');
    const expected = input.mutable ? 2 : 1;
    if (input.mutability !== undefined) assert.equal(input.mutability, expected, 'shared enum must exactly agree with legacy bool');
    return { ...input, mutability: expected };
  }) } };
}

function assertLegacySharedKindEqual(left, right) {
  assert.deepEqual(comparableLegacySharedKind(left), comparableLegacySharedKind(right));
}

module.exports = { assertLegacySharedKindEqual };
