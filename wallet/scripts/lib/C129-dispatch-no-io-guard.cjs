// CLI replay tripwires: record counts without reading keys or allowing network IO.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const key=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261006-03/config/rtd.keystore');
const original=fs.readFileSync;let fetchCalls=0,keyReads=0;
fs.readFileSync=function(f,...args){if(typeof f==='string'&&path.resolve(f)===key){keyReads++;throw Error('Replay private key tripwire');}return original.call(this,f,...args);};
globalThis.fetch=async()=>{fetchCalls++;throw Error('Replay network tripwire');};
process.once('exit',()=>process.stdout.write(JSON.stringify({replayIoTripwire:true,fetchCalls,keyReads})+'\n'));
