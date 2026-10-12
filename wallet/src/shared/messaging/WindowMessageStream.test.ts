import { describe, expect, it } from 'vitest';
import { WindowMessageStream } from './WindowMessageStream';

describe('page message admission', () => {
 it('ignores malformed unrelated messages and keeps receiving valid requests and errors', () => {
  const stream = new WindowMessageStream('rtd_content-script', 'rtd_in-page');
  const messages: unknown[] = [], errors: unknown[] = [];
  const subscription = stream.messages.subscribe({ next: value => messages.push(value), error: value => errors.push(value) });
  const emit = (data: unknown) => window.dispatchEvent(new MessageEvent('message', { source: window, data }));
  try {
   for (const data of [null, undefined, 0, 'unrelated', [], {}, { target: 'rtd_content-script' }, ...[null, [], {}, {id:'r'}, {id:'r',payload:null}, {id:'r',payload:[]}, {id:'r',payload:7}, {id:'r',payload:{error:true}}, {id:7,payload:{type:'get-network'}}].map(payload => ({target:'rtd_content-script',payload}))]) emit(data);
   const request = {id:'request',payload:{type:'get-network'}};
   const error = {id:'error',payload:{error:true,code:-1,message:'denied'}};
   emit({target:'rtd_content-script',payload:request});
   emit({target:'rtd_content-script',payload:error});
   expect(errors).toEqual([]);expect(messages).toEqual([request,error]);
  } finally { subscription.unsubscribe(); }
 });
 it('ignores messages from child windows and the other target', () => {
  const frame=document.createElement('iframe');document.body.append(frame);
  const stream=new WindowMessageStream('rtd_content-script','rtd_in-page');
  const messages: unknown[]=[];const subscription=stream.messages.subscribe(value=>messages.push(value));
  const payload={id:'r',payload:{type:'get-network'}};
  try {
   window.dispatchEvent(new MessageEvent('message',{source:frame.contentWindow,data:{target:'rtd_content-script',payload}}));
   window.dispatchEvent(new MessageEvent('message',{source:window,data:{target:'rtd_in-page',payload}}));
   expect(messages).toEqual([]);
  } finally {subscription.unsubscribe();frame.remove();}
 });
});
