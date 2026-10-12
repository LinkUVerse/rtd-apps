// Precise, audit-only parameter fault at the actual production simulation call.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

module.exports = async (context, page, extension) => {
  const cdp = await context.newCDPSession(page), scripts = new Map();
  let paused, breakpoint, notify, timer;
  cdp.on('Debugger.scriptParsed', row => scripts.set(row.url, row.scriptId));
  cdp.on('Debugger.paused', row => { paused = row; notify?.(row); });
  cdp.on('Debugger.resumed', () => { paused = undefined; });
  try {
    await cdp.send('Debugger.enable');
    const sourceFile = path.resolve(__dirname, '../../src/shared/rpc/coin-transfer-preparation.ts');
    const source = fs.readFileSync(sourceFile, 'utf8'), matches = [];
    for (const file of fs.readdirSync(extension).filter(f => f.endsWith('.js.map'))) {
      const raw = fs.readFileSync(path.join(extension, file)), map = JSON.parse(raw);
      const index = map.sources.findIndex(s => s.endsWith('/shared/rpc/coin-transfer-preparation.ts'));
      if (index >= 0) matches.push({ file, raw, map, index });
    }
    assert.equal(matches.length, 1); const selected = matches[0];
    assert.equal(selected.map.sourcesContent[selected.index], source);
    const bundle = selected.file.slice(0, -4), url = new URL(bundle, page.url()).href, scriptId = scripts.get(url);
    assert(scriptId, 'Actual loaded coin bundle required');
    const { scriptSource } = await cdp.send('Debugger.getScriptSource', { scriptId });
    assert.equal(scriptSource, fs.readFileSync(path.join(extension, bundle), 'utf8'));
    const dependency = path.resolve(__dirname, '../../../node_modules/.pnpm/source-map@0.6.1/node_modules/source-map');
    const { SourceMapConsumer } = require(dependency), consumer = new SourceMapConsumer(selected.map);
    const mapSource = consumer.sources.find(s => s.endsWith('/shared/rpc/coin-transfer-preparation.ts'));
    const locate = needle => {
      const offset = source.indexOf(needle, source.indexOf('export async function revalidateCoinTransfer('));
      assert(offset >= 0); const before = source.slice(0, offset);
      const original = { source: mapSource, line: before.split('\n').length, column: before.split('\n').at(-1).length };
      const generated = consumer.generatedPositionFor(original), reverse = consumer.originalPositionFor(generated);
      assert.equal(reverse.source, original.source); assert.equal(reverse.line, original.line); assert.equal(reverse.column, original.column);
      assert(generated.line && Number.isInteger(generated.column));
      return { original, generated, reverse };
    };
    const receiver = locate('rpc.simulateTransaction('), prepared = locate('prepared.bytesBase64,');
    assert.equal(receiver.reverse.name, 'rpc'); assert.equal(prepared.reverse.name, 'prepared');
    const receiverText = scriptSource.split('\n')[receiver.generated.line - 1].slice(receiver.generated.column);
    const receiverName = /^([A-Za-z_$][\w$]*)\.simulateTransaction\(/.exec(receiverText)?.[1]; assert(receiverName);
    const parameterText = scriptSource.split('\n')[prepared.generated.line - 1].slice(prepared.generated.column);
    const parameter = /^([A-Za-z_$][\w$]*)\.bytesBase64/.exec(parameterText)?.[1]; assert(parameter);
    const location = { scriptId, lineNumber: receiver.generated.line - 1, columnNumber: receiver.generated.column + receiverName.length + 1 };
    const result = await cdp.send('Debugger.setBreakpoint', { location }); breakpoint = result.breakpointId;
    assert.deepEqual(result.actualLocation, location);
    const evidence = { bundle, bundleSha256: sha(scriptSource), mapSha256: sha(selected.raw), producerSha256: sha(source),
      dependencySha256: sha(fs.readFileSync(require.resolve(dependency))), receiver, prepared, actualLocation: result.actualLocation,
      generatedParameter: parameter, loadedBundleEqualsDisk: true, mappedProducerEqualsDisk: true };
    return {
      evidence,
      wait: () => new Promise((resolve, reject) => { if (paused) return resolve(paused); notify = resolve; timer = setTimeout(() => reject(Error('Actual production coin simulation call did not pause')), 60000); }),
      inject: async (pause, expected, changedBytes) => {
        clearTimeout(timer); assert(pause.hitBreakpoints.includes(breakpoint));
        const frameId = pause.callFrames[0].callFrameId;
        const projection = variable => `({bytesBase64:${variable}.bytesBase64,digest:${variable}.digest,gasBudget:${variable}.gasBudget,sender:${variable}.sender,bindingKey:${variable}.bindingKey,readSessionKey:${variable}.readSessionKey,input:${variable}.input})`;
        const before = await cdp.send('Debugger.evaluateOnCallFrame', { callFrameId: frameId, expression: projection(parameter), returnByValue: true });
        assert(!before.exceptionDetails);
        const exact = Object.fromEntries(['bytesBase64', 'digest', 'gasBudget', 'sender', 'bindingKey', 'readSessionKey', 'input'].map(k => [k, expected[k]]));
        assert.deepEqual(before.result.value, exact);
        const after = await cdp.send('Debugger.evaluateOnCallFrame', { callFrameId: frameId,
          expression: `(${parameter}={...${parameter},bytesBase64:${JSON.stringify(changedBytes)}},${projection(parameter)})`, returnByValue: true });
        assert(!after.exceptionDetails); assert.deepEqual(after.result.value, { ...exact, bytesBase64: changedBytes });
        await cdp.send('Debugger.removeBreakpoint', { breakpointId: breakpoint }); breakpoint = undefined;
        await cdp.send('Debugger.resume');
        return { before: before.result.value, after: after.result.value, actualCallFrameLocation: pause.callFrames[0].location, injectedOnlyClonedParameterBytes: true };
      },
      close: async () => { clearTimeout(timer); if (breakpoint) await cdp.send('Debugger.removeBreakpoint', { breakpointId: breakpoint }).catch(() => {}); if (paused) await cdp.send('Debugger.resume').catch(() => {}); await cdp.send('Debugger.disable').catch(() => {}); await cdp.detach(); },
    };
  } catch (error) {
    clearTimeout(timer); if (breakpoint) await cdp.send('Debugger.removeBreakpoint', { breakpointId: breakpoint }).catch(() => {});
    if (paused) await cdp.send('Debugger.resume').catch(() => {}); await cdp.send('Debugger.disable').catch(() => {}); await cdp.detach(); throw error;
  }
};
