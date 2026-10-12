// Preload for the real, uncovered C114 CLI only. Refuse every protected side effect.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), child = require('node:child_process');
const { chromium } = require('@playwright/test');
const output = process.env.C114_PREFLIGHT_GUARD_OUTPUT;
assert(output && path.isAbsolute(output) && !fs.existsSync(output));
const driver = path.resolve(process.argv[1]);
assert.equal(path.basename(driver), 'test-C114-current-nft-validity-ui.cjs');
const argumentsPassed = process.argv.slice(2);
assert.equal(argumentsPassed.length, 7);
const counters = { networkAttempts:0, browserLaunchAttempts:0, childProcessAttempts:0,
  directoryCreationAttempts:0, privateKeyReadAttempts:0, originalProfileReadAttempts:0 };
const originalRead = fs.readFileSync, originalWrite = fs.writeFileSync;
const sha = file => crypto.createHash('sha256').update(originalRead(file)).digest('hex');
function deny(kind) { counters[kind]++; throw Error('C114 preflight guard rejected ' + kind); }
globalThis.fetch = () => deny('networkAttempts');
for (const module of [require('node:http'),require('node:https')]) {
  module.request = module.get = () => deny('networkAttempts');
}
require('node:net').Socket.prototype.connect = () => deny('networkAttempts');
require('node:net').Server.prototype.listen = () => deny('networkAttempts');
for (const method of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork']) child[method] = () => deny('childProcessAttempts');
for (const method of ['launch','launchPersistentContext','connect','connectOverCDP']) chromium[method] = () => deny('browserLaunchAttempts');
fs.mkdirSync = () => deny('directoryCreationAttempts');
fs.promises.mkdir = async () => deny('directoryCreationAttempts');
const classifyRead = file => {
  if (typeof file !== 'string') return;
  if (path.basename(file) === 'keys.json' || /recovery-private\.json$/.test(file)) deny('privateKeyReadAttempts');
  if (/\/Library\/Application Support\/(Google\/Chrome|Chromium)\//.test(file) || /current-C51-ordinary-chrome-.*\/profile\//.test(file)) deny('originalProfileReadAttempts');
};
fs.readFileSync = function(file,...args) {classifyRead(file); return originalRead.call(fs,file,...args)};
const asynchronousRead = fs.promises.readFile;
fs.promises.readFile = function(file,...args) {classifyRead(file); return asynchronousRead.call(fs.promises,file,...args)};
process.once('exit',code => {
  const [inventoryFile, inventoryAuditFile, readinessFile, previousFile, previousAuditFile, proofFile, owned] = argumentsPassed;
  const proofExists = fs.existsSync(proofFile), proof = proofExists ? JSON.parse(originalRead(proofFile,'utf8')) : null;
  const passed = code === 0 && Object.values(counters).every(n => n === 0) && !fs.existsSync(owned)
    && proof?.passed === true && proof.mode === 'uncovered-nft-validity-ui-preflight-denied';
  originalWrite(output,JSON.stringify({passed,observedAt:new Date().toISOString(),exitCode:code,
    guardScope:'Actual CLI negative preflight only; no production browser or network monkey patch',
    argumentsPassed,counters,ownedDirectoryExists:fs.existsSync(owned),actualDriverProofExists:proofExists,
    driverSha256:sha(driver),guardSha256:sha(__filename),
    inputsSha256:Object.fromEntries([driver,__filename,inventoryFile,inventoryAuditFile,readinessFile,...(proofExists?[proofFile]:[])].map(f => [path.resolve(f),sha(f)]))},null,2)+'\n',{flag:'wx',mode:0o600});
  if (!passed) process.exitCode = 1;
});
