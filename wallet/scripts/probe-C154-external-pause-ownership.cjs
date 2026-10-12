// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Actual two-debugger protocol diagnostic in an empty browser, without an extension.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('@playwright/test');
const output = path.resolve(__dirname, '../migrationToGRpcOrGraphQLDoc/workLog/20261009-C154-two-debugger-owned-pause-diagnostic-01.json');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
(async () => {
  assert(!fs.existsSync(output));
  let browser, context, owner, observer, result;
  const events = {};
  try {
    browser = await chromium.launch({ headless: true, executablePath: path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing') });
    context = await browser.newContext();
    const page = await context.newPage();
    owner = await context.newCDPSession(page); observer = await context.newCDPSession(page);
    const script = "globalThis.__pauseOwnershipFixture = function ownedProbe(){\n const answer = 41;\n return answer + 1;\n};\n//# sourceURL=owned-pause-fixture-C154.js";
    const parsed = {};
    for (const [name, session] of Object.entries({ owner, observer })) {
      parsed[name] = new Promise(resolve => session.on('Debugger.scriptParsed', event => {
        if (event.url === 'owned-pause-fixture-C154.js') resolve(event.scriptId);
      }));
      await session.send('Debugger.enable');
    }
    await page.addScriptTag({ content: script });
    const ids = { owner: await parsed.owner, observer: await parsed.observer };
    for (const [name, session] of Object.entries({ owner, observer })) assert.equal((await session.send('Debugger.getScriptSource', { scriptId: ids[name] })).scriptSource, script);
    const candidates = await owner.send('Debugger.getPossibleBreakpoints', { start: { scriptId: ids.owner, lineNumber: 1, columnNumber: 0 }, end: { scriptId: ids.owner, lineNumber: 2, columnNumber: 0 }, restrictToFunction: true });
    assert(candidates.locations.length > 0);
    const location = candidates.locations[0];
    const breakpoint = await owner.send('Debugger.setBreakpoint', { location });
    const pauses = {};
    for (const [name, session] of Object.entries({ owner, observer })) pauses[name] = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Actual peer pause absent')), 10000);
      session.once('Debugger.paused', event => {
        clearTimeout(timer); events[name] = { reason: event.reason, hitBreakpoints: event.hitBreakpoints, location: event.callFrames[0].location }; resolve();
      });
    });
    const evaluation = page.evaluate(() => globalThis.__pauseOwnershipFixture()); evaluation.catch(() => {});
    await Promise.all(Object.values(pauses));
    assert(events.owner.hitBreakpoints.includes(breakpoint.breakpointId));
    assert.equal(events.observer.location.lineNumber, breakpoint.actualLocation.lineNumber);
    assert.equal(events.observer.location.columnNumber, breakpoint.actualLocation.columnNumber);
    await owner.send('Debugger.removeBreakpoint', { breakpointId: breakpoint.breakpointId });
    await owner.send('Debugger.resume');
    assert.equal(await evaluation, 42);
    result = { passed: true, observedAt: new Date().toISOString(), actualTwoDebuggerPauses: events,
      scriptIds: ids, ownerBreakpoint: breakpoint, sourceSha256: hash(script),
      actualResult: 42, ownerOnlyResume: true, walletLoaded: false, signatures: 0, executeRequests: 0,
      scope: 'Empty page actual CDP peer ownership only; not wallet signing or business acceptance.' };
  } catch (error) {
    result = { passed: false, observedAt: new Date().toISOString(), errorType: error.name,
      message: String(error.message).slice(0, 1200), events }; process.exitCode = 1;
  } finally {
    await owner?.send('Debugger.resume').catch(() => {});
    await owner?.detach().catch(() => {}); await observer?.detach().catch(() => {});
    await context?.close().catch(() => {}); await browser?.close().catch(() => {});
    result.ownBrowserClosed = true;
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: result.passed, actualTwoDebuggerPauses: result.actualTwoDebuggerPauses, message: result.message }));
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
