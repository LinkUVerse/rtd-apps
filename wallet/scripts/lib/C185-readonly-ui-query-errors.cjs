// Inspect existing committed React Query error state; never request/refetch a query.
async function inspect(page){return page.evaluate(()=>{
 const seen=new Set(),clients=new Set(),stack=[];
 for(const n of document.querySelectorAll('*')){const k=Object.keys(n).find(k=>k.startsWith('__reactFiber$'));if(k){let f=n[k];while(f.return)f=f.return;if(f.stateNode?.current)stack.push(f.stateNode.current);}}
 const add=v=>{if(v&&typeof v.getQueryCache==='function')clients.add(v);};
 while(stack.length){const f=stack.pop();if(!f||seen.has(f))continue;seen.add(f);add(f.memoizedProps?.value);for(let d=f.dependencies?.firstContext;d;d=d.next)add(d.memoizedValue);stack.push(f.child,f.sibling);}
 const errors=[];for(const c of clients)for(const q of c.getQueryCache().getAll())if(q.state.status==='error')errors.push({queryKind:typeof q.queryKey?.[0]==='string'?q.queryKey[0]:null,status:q.state.status,errorType:q.state.error?.name,errorMessage:typeof q.state.error?.message==='string'?q.state.error.message.slice(0,1500):null});
 return{observedAt:new Date().toISOString(),clientsObserved:clients.size,errors,refetchCalls:0,mutationCalls:0,sourceEdited:false};
 });}
module.exports={inspect};
