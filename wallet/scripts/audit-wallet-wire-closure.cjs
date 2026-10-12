#!/usr/bin/env node
// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Current emitted-module audit. This does not replace live network acceptance.
const ts = require('typescript');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { createHash } = require('node:crypto');
const sha = value => createHash('sha256').update(value).digest('hex');

function inspectSource(source, content, methods) {
  const tree = ts.createSourceFile(source, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  assert.equal(tree.parseDiagnostics.length, 0, `Cannot inspect ${source}`);
  const literals = [], envelopes = [], imports = [];
  function visit(node) {
    if ((ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node)) && methods.has(node.text))
      literals.push({ method: node.text, line: tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1 });
    if (ts.isPropertyAssignment(node) && node.name &&
        ((ts.isIdentifier(node.name) || ts.isStringLiteralLike(node.name)) && node.name.text === 'jsonrpc'))
      envelopes.push(tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1);
    if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text);
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return { literals, envelopes, imports };
}

function run(root) {
  const document = readFileSync(resolve(root, 'migrationToGRpcOrGraphQLDoc/08-JSON-RPC全量迁移对照表.md'), 'utf8');
  const section = n => document.split(`## ${n}.`)[1].split(`## ${n + 1}.`)[0];
  const names = text => [...text.matchAll(/`((?:rtdx?_[a-zA-Z]+|rpc\.discover))`/g)].map(match => match[1]);
  const used = names(section(2)), unused = names(section(5));
  assert.equal(used.length, 21); assert.equal(unused.length, 18);
  assert.equal(new Set([...used, ...unused]).size, 39);
  const methods = new Set([...used, ...unused]);
  // Also reject upstream spelling; the migration must not silently route to Sui JSON-RPC.
  for (const name of [...methods]) methods.add(name.replace(/^rtd/, 'sui').replace('Rtd', 'Sui'));
  const entries = [];
  for (const entry of ['ui', 'background', 'content-script', 'dapp-interface']) {
    const raw = readFileSync(resolve(root, `dist/${entry}.js.map`));
    const map = JSON.parse(raw); assert.equal(map.sources.length, map.sourcesContent.length);
    const validatorModules = [], sdkModules = [], applicationModules = [];
    for (let i = 0; i < map.sources.length; i++) {
      const source = map.sources[i], content = map.sourcesContent[i];
      assert.equal(typeof content, 'string', `Missing source content: ${source}`);
      const result = inspectSource(source, content, methods);
      assert.deepEqual(result.literals, [], `Old wire method in ${source}`);
      assert(!/\/(?:jsonRpc|json-rpc-client)\//.test(source), `Old transport module: ${source}`);
      assert(!result.imports.some(name => /(?:rtd-typescript|@mysten\/sui)\/jsonRpc/.test(name)), `Old transport import: ${source}`);
      if (result.envelopes.length) {
        // This dependency defines validators for several protocols. It sends no request.
        assert(source.endsWith('/@metamask/utils/dist/json.cjs'), `JSON-RPC envelope candidate: ${source}`);
        assert(!/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/.test(content), 'Validator acquired network behavior');
        validatorModules.push({ source, sha256: sha(content), propertyLines: result.envelopes,
          classification: 'Structural validation schemas; no RTD wire method or network sender' });
      }
      if (/rtd-ts-sdk\/packages\/(?:typescript|kiosk)\//.test(source)) sdkModules.push(source);
      if (/webpack:\/\/\/\.\//.test(source) || source.includes('/core/src/')) applicationModules.push(source);
    }
    entries.push({ entry, sourceCount: map.sources.length, methodLiteralHits: 0, validatorModules,
      sdkModules, applicationModules, mapSha256: sha(raw), javascriptSha256: sha(readFileSync(resolve(root, `dist/${entry}.js`))) });
  }
  return { passed: true, usedMethods: used, unusedMethods: unused, entries,
    scope: 'AST literal/envelope and emitted-module inventory for current four source maps. No claim of exhaustive dynamic-string analysis, fresh build or live traffic.' };
}
module.exports = { inspectSource, run };
if (require.main === module) console.log(JSON.stringify(run(resolve(__dirname, '..')), null, 2));
