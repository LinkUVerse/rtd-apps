// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// CDP peers see an empty hitBreakpoints list for another agent's actual breakpoint.
function authorizedPeerPause(binding, event) {
  if (!binding || !event || event.reason !== 'other') return false;
  if (typeof binding.breakpointId !== 'string' || !binding.breakpointId) return false;
  if (!Array.isArray(event.hitBreakpoints) || !event.hitBreakpoints.every(id => id === binding.breakpointId)) return false;
  const actual = event.location, registered = binding.actualLocation;
  if (!actual || !registered) return false;
  return ['scriptId', 'lineNumber', 'columnNumber'].every(key => actual[key] === registered[key]);
}
module.exports = { authorizedPeerPause };
