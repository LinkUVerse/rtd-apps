// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Read all existing journal stores without creating or upgrading the database.
module.exports=page=>page.evaluate(async()=>{
 const name='RtdWallet TransactionJournal';
 if(!(await indexedDB.databases()).some(db=>db.name===name&&db.version===2))throw new Error('Existing v2 journal required');
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open(name,2);
  request.onerror=request.onblocked=()=>reject(new Error('Journal unavailable'));
  request.onupgradeneeded=()=>{request.transaction.abort();reject(new Error('Journal audit forbids upgrade'));};
  request.onsuccess=()=>{
   const db=request.result,names=['journal-v2','pending-scopes-v2','metadata-v2'],rows={};
   if(!names.every(n=>db.objectStoreNames.contains(n))){db.close();reject(new Error('Journal stores absent'));return;}
   const tx=db.transaction(names,'readonly');
   tx.onerror=tx.onabort=()=>{db.close();reject(new Error('Journal audit failed'));};
   tx.oncomplete=()=>{db.close();resolve(rows);};
   for(const n of names){const r=tx.objectStore(n).getAll();r.onsuccess=()=>{rows[n]=r.result;};}
  };
 });
});
