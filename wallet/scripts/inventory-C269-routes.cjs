// Read-only TypeScript AST inventory. A declared route is not browser acceptance.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../src/ui');
const rows = [];
function scan(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { scan(file); continue; }
    if (!file.endsWith('.tsx') || file.endsWith('.test.tsx')) continue;
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    if (source.parseDiagnostics.length) throw new Error(`Parse diagnostics: ${file}`);
    function visit(node) {
      if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(source) === 'Route') {
        const attrs = Object.fromEntries(node.attributes.properties.map(a => {
          if (!ts.isJsxAttribute(a)) throw new Error(`Dynamic route spread: ${file}`);
          return [a.name.getText(source), a.initializer ? a.initializer.getText(source) : true];
        }));
        rows.push({file, line: source.getLineAndCharacterOfPosition(node.getStart()).line+1, attributes: attrs});
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}
scan(root);
if (!rows.length) throw new Error('No routes');
process.stdout.write(JSON.stringify(rows));
