import { expect, it } from 'vitest';
import { ConnectionRequests } from './connection-requests';
it('isolates equal request IDs on different content ports', () => {
  const a=new ConnectionRequests(), b=new ConnectionRequests();
  const first=a.begin('same'), second=b.begin('same');
  a.cancel('same');expect(first.signal.aborted).toBe(true);expect(second.signal.aborted).toBe(false);
  first.finish();a.cancel('same');expect(second.signal.aborted).toBe(false);
});
it('retains aborted requests until completion and bounds live requests', () => {
  const map=new ConnectionRequests();const pending=map.begin('one');map.cancel('one');
  expect(()=>map.begin('one')).toThrow('重复');pending.finish();expect(map.begin('one').signal.aborted).toBe(false);
  for(let i=0;i<63;i++) map.begin(String(i));expect(()=>map.begin('overflow')).toThrow('过多');
});
it('disconnect aborts every pending request and malformed IDs are rejected', () => {
  const map=new ConnectionRequests();const a=map.begin('a'),b=map.begin('b');map.disconnect();
  expect(a.signal.aborted).toBe(true);expect(b.signal.aborted).toBe(true);
  expect(()=>map.begin('')).toThrow();expect(()=>map.cancel({})).toThrow();
});
