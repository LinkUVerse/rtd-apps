// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Bind reviewed installed static bytes to the already running owned browser.
// No browser profile files, account storage or credentials are inspected.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),a=require('node:assert/strict');
const {files,productSource}=require('./build-reviewed-generation-production-extension.cjs');
const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog');
const read=f=>JSON.parse(fs.readFileSync(f)),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),sha=f=>hash(fs.readFileSync(f));
const previous=path.join(logs,'20261010-C204-existing-ordinary-chrome-started-01.json'),installedFile=path.join(logs,'20261010-C207-ordinary-upgrade-installed-01.json'),preparedFile=path.join(logs,'20261010-C207-ordinary-upgrade-prepared-01.json');
const output=path.join(logs,'20261010-C207-installed-ordinary-browser-binding-01.json');a(!fs.existsSync(output));
const old=read(previous),installed=read(installedFile),prepared=read(preparedFile);
a(old.passed&&installed.passed&&prepared.passed);a.equal(installed.extensionId,prepared.expectedExtensionId);
a.deepEqual(files(installed.stable),prepared.newArtifacts);a.deepEqual(files(installed.archive),prepared.oldArtifacts);a.deepEqual(productSource(),installed.source);
for(const [f,h] of Object.entries(old.inputsSha256))a.equal(sha(f),h);
for(const [f,h] of Object.entries(installed.inputsSha256))a.equal(sha(f),h);
const command=cp.execFileSync('ps',['-ww','-p',String(old.browserPid),'-o','command='],{encoding:'utf8'}).trim();
a(command.startsWith('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome '));
a(command.includes('--user-data-dir='+old.profile+' '));a(command.includes('--remote-debugging-port=41996 '));
a(!/ignore-certificate|disable-web-security|load-extension|disable-extensions-except/.test(command));
const browserBirth=cp.execFileSync('ps',['-p',String(old.browserPid),'-o','lstart='],{encoding:'utf8'}).trim();a(browserBirth);
const inputsSha256=Object.fromEntries([__filename,previous,installedFile,preparedFile,...Object.keys(old.inputsSha256),...Object.keys(prepared.newArtifacts).map(f=>path.join(installed.stable,f))].map(f=>[f,sha(f)]));
const result={passed:true,observedAt:new Date().toISOString(),ordinaryChromeVersion:old.ordinaryChromeVersion,browserPid:old.browserPid,browserBirth,commandSha256:hash(command),expectedOrigin:'chrome-extension://'+installed.extensionId,extensionOutput:installed.stable,inputsSha256,installedVersion:installed.newVersion,oldArtifactsFullyPreserved:true,profileDatabaseReadOrEdited:false,credentialsRead:false,uiAcceptance:false};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,installedVersion:result.installedVersion,profileDatabaseReadOrEdited:false}));
