// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Actual TypeScript diagnostics for a probe and all its production imports.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const ts = require('typescript');
const wallet = path.resolve(__dirname, '..');
const [targetArg, outputArg] = process.argv.slice(2);
assert(targetArg && outputArg);
const target = path.resolve(targetArg), output = path.resolve(outputArg);
assert(target.startsWith(path.join(wallet, 'scripts') + path.sep) && !fs.existsSync(output));
const config = path.join(wallet, 'configs/ts/tsconfig.prod.json');
const read = ts.readConfigFile(config, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, path.dirname(config));
const program = ts.createProgram([target], { ...parsed.options, noEmit: true });
const diagnostics = [ ...(read.error ? [read.error] : []), ...parsed.errors,
  ...ts.getPreEmitDiagnostics(program) ].map(d => ({
    code: d.code, file: d.file?.fileName,
    line: d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start).line + 1 : undefined,
    message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
  }));
const inputs = [__filename, target, config, path.join(wallet, 'configs/ts/tsconfig.common.json')];
const proof = { passed: diagnostics.length === 0, observedAt: new Date().toISOString(), target, diagnostics,
  inputsSha256: Object.fromEntries(inputs.map(f => [f, crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')])),
  positiveBranchExecuted: false,
  scope: 'Actual production TypeScript options: probe and all imported production modules. No runtime/indexed inventory or browser/chain acceptance.' };
fs.writeFileSync(output, JSON.stringify(proof, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ passed: proof.passed, diagnostics: diagnostics.length }));
if (!proof.passed) process.exitCode = 1;
