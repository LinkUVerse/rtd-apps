import { expect, it, vi } from 'vitest';
import { Subject } from 'rxjs';
import { cancellableRequest } from './cancellable-request';
function setup() { const messages=new Subject<any>();return {messages,send:vi.fn()}; }
it('rejects pre-aborted input without serialization or messages', async () => {
  const stream=setup(),controller=new AbortController(),prepare=vi.fn();controller.abort();
  await expect(cancellableRequest(stream as any,prepare,controller.signal)).rejects.toMatchObject({name:'AbortError'});
  expect(prepare).not.toHaveBeenCalled();expect(stream.send).not.toHaveBeenCalled();
});
it('aborts during unresolved serialization and never sends late transaction', async () => {
  const stream=setup(),controller=new AbortController();let release!:(value:any)=>void;
  const result=cancellableRequest(stream as any,()=>new Promise(resolve=>{release=resolve;}),controller.signal);
  await Promise.resolve();controller.abort();await expect(result).rejects.toMatchObject({name:'AbortError'});
  release({type:'sign-transaction-request'});await Promise.resolve();expect(stream.send).not.toHaveBeenCalled();
});
it('sends cancellation only for its original ID and unsubscribes from late responses', async () => {
  const stream=setup(),controller=new AbortController();
  const result=cancellableRequest(stream as any,async()=>({type:'sign-transaction-request'}),controller.signal);
  await vi.waitFor(()=>expect(stream.send).toHaveBeenCalledTimes(1));const sent=stream.send.mock.calls[0][0];
  controller.abort();await expect(result).rejects.toMatchObject({name:'AbortError'});
  expect(stream.send.mock.calls[1][0].payload).toEqual({type:'cancel-transaction-request',requestId:sent.id});
  expect(stream.messages.observed).toBe(false);
});
it('subscribes before sending and removes abort listener after a synchronous result', async () => {
  const stream=setup(),controller=new AbortController();stream.send.mockImplementation(message=>stream.messages.next({id:message.id,payload:{type:'done'}}));
  await expect(cancellableRequest(stream as any,async()=>({type:'sign-transaction-request'}),controller.signal)).resolves.toEqual({type:'done'});
  controller.abort();expect(stream.send).toHaveBeenCalledTimes(1);expect(stream.messages.observed).toBe(false);
});
it('cleans up on a remote error or failed message send', async () => {
  const stream=setup();stream.send.mockImplementation(()=>{throw new Error('port gone');});
  await expect(cancellableRequest(stream as any,async()=>({type:'sign-transaction-request'}))).rejects.toThrow('port gone');
  expect(stream.messages.observed).toBe(false);
});
