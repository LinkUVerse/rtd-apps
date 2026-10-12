// Preserve every C85 object/history/detail/contents check and add complete outer summary validation.
const base = require('./C85-post-write-bytes.cjs');
const { fullSummary } = require('./C88-full-summary.cjs');
const { GrpcTypes } = require('rtd-typescript/grpc');

function checkpoint(frames, snapshot) {
  const result = base.checkpoint(frames, snapshot);
  const frame = frames.find(f => f.url.endsWith('/GetCheckpoint'));
  const value = GrpcTypes.GetCheckpointResponse.fromBinary(base.grpcBody(frame.responseBase64, true)).checkpoint;
  return { ...result, ...fullSummary(value), fullOuterSummaryCanonical: true };
}

module.exports = { ...base, checkpoint };
