// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Keep strict comparison semantics while bounding assertion failure representation.
const strict = require('node:assert/strict');
const { isDeepStrictEqual } = require('node:util');
function fail(kind, message) {
  const error = new Error('Strict ' + kind + ' failed' + (typeof message === 'string' ? ': ' + message.slice(0, 160) : ''));
  error.name = 'AssertionError';
  error.code = 'ERR_ASSERTION';
  Error.captureStackTrace(error, fail);
  throw error;
}
module.exports = Object.assign((value, message) => strict(value, message), strict, {
  equal(actual, expected, message) { if (!Object.is(actual, expected)) fail('equality', message); },
  deepEqual(actual, expected, message) { if (!isDeepStrictEqual(actual, expected)) fail('deep equality', message); },
  notDeepEqual(actual, expected, message) { if (isDeepStrictEqual(actual, expected)) fail('deep inequality', message); },
});
