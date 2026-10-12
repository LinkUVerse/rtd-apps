#!/usr/bin/env node
// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Enumerate actual emitted application networking for manual SDK-boundary review.
// This inventory complements the production closure audit; it is not a general
// JavaScript data-flow proof and does not stand in for live traffic acceptance.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const ts = require('typescript');
const { audit } = require('./audit-generation-production-extension.cjs');

function inventory(output, buildFile) {
  const closure = audit(output, buildFile);
  const sources = new Map();
  for (const chunk of closure.chunks) {
    const map = JSON.parse(fs.readFileSync(path.join(output, chunk.file + '.map')));
    map.sources.forEach((name, index) => {
      if (name.startsWith('webpack:///./') || name.startsWith('webpack:///../../core/src/'))
        sources.set(name, map.sourcesContent[index]);
    });
  }
  assert(sources.size > 0, 'No emitted application source found');
  const records = [];
  for (const [source, content] of sources) {
    const kind = /\.[jt]sx$/.test(source) ? ts.ScriptKind.TSX : /\.ts$/.test(source) ? ts.ScriptKind.TS : ts.ScriptKind.JS;
    const tree = ts.createSourceFile(source, content, ts.ScriptTarget.Latest, true, kind);
    assert.equal(tree.parseDiagnostics.length, 0, `Cannot parse ${source}`);
    const imports = [], constructors = [], transportCalls = [], serviceCalls = [];
    const record = node => ({
      line: tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1,
      expression: node.expression.getText(tree).length <= 180
        ? node.expression.getText(tree).replace(/\s+/g, ' ')
        : `<chained>.${node.expression.name?.getText(tree) ?? '<call>'}`,
    });
    function visit(node) {
      if (ts.isImportDeclaration(node)) imports.push(node.moduleSpecifier.text);
      if (ts.isNewExpression(node) && /(?:Client|Transport|XMLHttpRequest|WebSocket|EventSource)/.test(node.expression.getText(tree)))
        constructors.push(record(node));
      if (ts.isCallExpression(node)) {
        const expression = node.expression.getText(tree);
        const callee = ts.isPropertyAccessExpression(node.expression)
          ? node.expression.name.text : ts.isIdentifier(node.expression) ? node.expression.text : '';
        if (/(?:fetch|transport|sendBeacon|axios|^unary$|^request$)/i.test(callee)) transportCalls.push(record(node));
        if (/Service\.[a-zA-Z]+$|\.query$/.test(expression) && expression.length <= 180) serviceCalls.push(record(node));
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
    if (constructors.length || transportCalls.length || serviceCalls.length)
      records.push({ source, sha256: crypto.createHash('sha256').update(content).digest('hex'),
        imports, constructors, transportCalls, serviceCalls });
  }
  return { observedAt: new Date().toISOString(), closurePassed: closure.passed,
    modules: closure.moduleCount, uniqueSources: closure.uniqueSourceCount,
    applicationSources: sources.size, chunks: closure.chunks, records,
    scope: 'AST networking candidate inventory of the exact reviewed production output. Requires manual call-chain classification; dynamic aliasing is not exhaustively proven.' };
}
module.exports = { inventory };
if (require.main === module) {
  const [output, buildFile, resultFile] = process.argv.slice(2);
  assert(output && buildFile && resultFile, 'output, build proof and private result path required');
  const result = inventory(path.resolve(output), path.resolve(buildFile));
  fs.writeFileSync(resultFile, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ closurePassed: result.closurePassed,
    applicationSources: result.applicationSources, networkingCandidateModules: result.records.length }));
}
