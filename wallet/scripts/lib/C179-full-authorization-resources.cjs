// Immutable complete local test data, delivered through ordinary HTTP with bounded page URLs.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const variants=require('./C114-nft-validity-variants-v2.cjs'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function prepare(forms,approvals,directory){
 assert(!fs.existsSync(directory));fs.mkdirSync(directory,{mode:0o700});const rows=[],byKey=new Map();
 for(const item of forms){const base=approvals.find(r=>r.name===item.name)?.prepared;assert(base);for(const variant of await variants.build(base)){const name='authorization-'+String(rows.length).padStart(2,'0')+'.json',file=path.join(directory,name),body=Buffer.from(variant.json,'utf8');assert(body.length<=48000);fs.writeFileSync(file,body,{flag:'wx',mode:0o600});const row={name,file,scenario:item.name,variant:variant.name,sha256:sha(body),bytes:body.length};rows.push(row);byKey.set(item.name+'\0'+variant.name,row);}}
 return{rows,artifacts:Object.fromEntries(rows.map(r=>[r.name,r.sha256])),get(item,variant){const r=byKey.get(item.name+'\0'+variant.name);assert(r);return r;},read(name){const r=rows.find(r=>r.name===name);if(!r)return null;const b=fs.readFileSync(r.file);assert.equal(sha(b),r.sha256);return b;}};
}
module.exports={prepare};
