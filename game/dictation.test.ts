import assert from 'node:assert/strict';
import test from 'node:test';
import {tidyDictation,wavDuration} from './dictation.ts';

function wav(seconds=1):Uint8Array {
 const bytes=new Uint8Array(44+Math.floor(seconds*16000)*2),v=new DataView(bytes.buffer);
 const tag=(at:number,text:string)=>{for(let i=0;i<text.length;i++)bytes[at+i]=text.charCodeAt(i);};
 tag(0,'RIFF');v.setUint32(4,bytes.length-8,true);tag(8,'WAVE');tag(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,16000,true);v.setUint32(28,32000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);tag(36,'data');v.setUint32(40,bytes.length-44,true);return bytes;
}

test('dictation accepts only positive-duration, at-most-60-second mono 16kHz PCM WAV',()=>{
 assert.equal(wavDuration(wav(.5)),.5);assert.equal(wavDuration(wav(60)),60);
 for(const bytes of [new Uint8Array(),new Uint8Array(43),wav(0),wav(60.001)])assert.equal(wavDuration(bytes),null);
 for(const [offset,width,value] of [[0,1,0],[8,1,0],[12,1,0],[36,1,0],[16,4,18],[20,2,3],[22,2,2],[24,4,48000],[28,4,64000],[32,2,4],[34,2,32],[40,4,2],[4,4,10]] as const){
  const bytes=wav(),v=new DataView(bytes.buffer);if(width===1)v.setUint8(offset,value);else if(width===2)v.setUint16(offset,value,true);else v.setUint32(offset,value,true);assert.equal(wavDuration(bytes),null,`header field ${offset} must be validated`);
 }
 const odd=new Uint8Array(32045);odd.set(wav());const v=new DataView(odd.buffer);v.setUint32(4,odd.length-8,true);v.setUint32(40,odd.length-44,true);assert.equal(wavDuration(odd),null);
});

test('WAV validation respects typed-array offsets and never rewrites recorded bytes',()=>{
 const source=wav(.25),container=new Uint8Array(source.length+13);container.set(source,7);const recording=container.subarray(7,7+source.length),before=recording.slice();
 assert.equal(wavDuration(recording),.25);assert.deepEqual(recording,before);
});

test('dictation removes isolated filler and pronoun stutters while preserving negation and intent',()=>{
 assert.equal(tidyDictation('Um, I I want a haunted coast, uh, but no spiders. Keep the lighthouse!'),'I want a haunted coast, but no spiders. Keep the lighthouse!');
 const direction="Don't make Fern a villain. No dragons; we should rescue Rowan first, then return home.";
 assert.equal(tidyDictation(direction),direction);
 assert.equal(tidyDictation('  A coast   with rain , friends , and a safe ending .  '),'A coast with rain, friends, and a safe ending.');
});

test('cleanup preserves repeated proper names and deliberate creative emphasis',()=>{
 assert.equal(tidyDictation('Sail to Bora Bora with Lulu and make the sea very very dark.'),'Sail to Bora Bora with Lulu and make the sea very very dark.');
 assert.equal(tidyDictation('A fairy named Um guards the river Umi.'),'A fairy named Um guards the river Umi.');
});
