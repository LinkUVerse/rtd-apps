// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Inspect compile-time literals without running bundle code.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const ts = require('typescript');
module.exports = function verify({extension,registryFile,profileProof}) {
  const registry = fs.readFileSync(registryFile,'utf8');
  // The webpack ts-node hook also compiles CJS with target ES5 and no downlevelIteration.
  const files = Array.from(new Set(profileProof.uiBundles.concat(['background.js'])));
  const bundles = {};
  for(const name of files){
    const bytes = fs.readFileSync(path.join(extension,name));
    const tree = ts.createSourceFile(name,bytes.toString('utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
    assert.equal(tree.parseDiagnostics.length,0);
    let matches=0;
    function visit(node){if(ts.isStringLiteral(node)&&node.text===registry)matches++;ts.forEachChild(node,visit);}
    visit(tree);bundles[name]={sha256:crypto.createHash('sha256').update(bytes).digest('hex'),registryMatches:matches};
  }
  assert(bundles['background.js'].registryMatches>0,'Independent release registry missing from background');
  assert(profileProof.uiBundles.some(name=>bundles[name].registryMatches>0),'Independent release registry missing from UI');
  return {passed:true,registrySha256:crypto.createHash('sha256').update(registry).digest('hex'),bundles,scope:'Exact AST literals in actual compiled UI and background; service/runtime acceptance remains separate'};
};
