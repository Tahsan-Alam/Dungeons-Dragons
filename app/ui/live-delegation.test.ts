import test from 'node:test';
import assert from 'node:assert/strict';
import {coalesceLiveTranscript,createLiveDelegationQueue} from './live-delegation.ts';
import type {LiveDelegation} from './live-delegation.ts';

const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));};
function fixture(){
 const scheduled:(()=>void)[]=[],requests:LiveDelegation[]=[],replies:{id:string;text:string}[]=[],complete:((value:{reply:string}|null)=>void)[]=[];
 let session=1;
 const queue=createLiveDelegationQueue({
  request:task=>{requests.push(task);return new Promise(resolve=>complete.push(resolve));},
  respond:(task,text)=>replies.push({id:task.id,text}),
  isActive:task=>task.session===session,
  schedule:run=>{scheduled.push(run);},
 });
 return {queue,requests,replies,complete,next:()=>{scheduled.shift()?.();},setSession:(value:number)=>{session=value;}};
}

test('live transcript coalescing preserves corrections without repeating cumulative snapshots',()=>{
 assert.equal(coalesceLiveTranscript('A sarcastic cat.','A sarcastic cat. Please show the proposed changes.'),'A sarcastic cat. Please show the proposed changes.');
 assert.equal(coalesceLiveTranscript('A sarcastic cat with glasses.','Actually, without glasses.'),'A sarcastic cat with glasses.\nActually, without glasses.');
 assert.equal(coalesceLiveTranscript('A sarcastic cat with glasses and a soft spoken voice.','with glasses and a soft spoken voice. Please show the changes.'),'A sarcastic cat with glasses and a soft spoken voice. Please show the changes.');
 assert.ok(coalesceLiveTranscript('a'.repeat(350),'b'.repeat(350)).length<=400);
});

test('speech received while guide work is pending is coalesced and processed after it',async()=>{
 const f=fixture(),first='A sarcastic cat named Nyx with glasses and a soft spoken voice.';
 f.queue.enqueue({id:'first',text:first,session:1});f.next();assert.equal(f.requests.length,1);
 f.queue.enqueue({id:'second',text:first+' Please show the proposed changes.',session:1});
 f.queue.enqueue({id:'third',text:first+' Please show the proposed changes. Actually, no glasses.',session:1});
 assert.equal(f.requests.length,1,'no concurrent paid guide request');
 f.complete[0]({reply:'Should I draft that?'});await flush();
 assert.equal(f.requests.length,1,'next request yields until the UI releases pending state');
 assert.equal(f.replies[0].text,'I have the added details and am updating the proposal.');
 f.next();assert.equal(f.requests.length,2);assert.equal(f.requests[1].id,'third');
 assert.equal(f.requests[1].text,first+' Please show the proposed changes. Actually, no glasses.');
 f.complete[1]({reply:'Review Nyx without glasses.'});await flush();assert.deepEqual(f.replies[1],{id:'third',text:'Review Nyx without glasses.'});
});

test('a separate correction remains attached to an unfinished requested character',async()=>{
 const f=fixture();f.queue.enqueue({id:'first',text:'Make Nyx a sarcastic cat with glasses.',session:1});f.next();
 f.queue.enqueue({id:'second',text:'Actually, no glasses.',session:1});f.complete[0](null);await flush();f.next();
 assert.equal(f.requests[1].text,'Make Nyx a sarcastic cat with glasses.\nActually, no glasses.');
 f.complete[1]({reply:'Review the corrected cat.'});await flush();
});

test('disconnect cancels queued work and late speech cannot leak into a replacement session',async()=>{
 const f=fixture();f.queue.enqueue({id:'old',text:'Make a cat.',session:1});f.next();
 f.queue.enqueue({id:'cancelled',text:'Make a cat with glasses.',session:1});f.queue.cancel();f.setSession(2);
 f.queue.enqueue({id:'new',text:'Make an owl.',session:2});f.complete[0]({reply:'Old cat proposal.'});await flush();f.next();
 assert.equal(f.replies.length,0);assert.equal(f.requests.length,2);assert.equal(f.requests[1].text,'Make an owl.');
 f.complete[1]({reply:'Review the owl.'});await flush();assert.deepEqual(f.replies,[{id:'new',text:'Review the owl.'}]);
});
