import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyLiveTranscript,liveTranscriptReducer,TRANSCRIPT_CHARACTERS,TRANSCRIPT_LINES} from './live-transcript.ts';
import type {LiveTranscriptState,TranscriptLine} from './live-transcript.ts';

const delta=(state:LiveTranscriptState,text:string,role:TranscriptLine['role']='assistant',name=role==='user'?'You':'Aether')=>liveTranscriptReducer(state,{type:'delta',role,name,text});

test('streamed deltas append verbatim to one stable caption, including whitespace',()=>{
 let state=delta(emptyLiveTranscript(),'A world');const id=state.lines[0].id;
 state=delta(state,' ');state=delta(state,'above the clouds.');
 assert.equal(state.lines.length,1);assert.equal(state.lines[0].id,id);
 assert.equal(state.lines[0].text,'A world above the clouds.');assert.equal(state.lines[0].complete,false);
 assert.equal(delta(state,''),state);
});

test('an interruption closes the narrator turn and preserves user corrections in order',()=>{
 let state=delta(emptyLiveTranscript(),'The dragon lives in');
 state=delta(state,'Actually, a fox.','user');state=delta(state,'A fox it is.');
 assert.deepEqual(state.lines.map(({name,text,complete})=>({name,text,complete})),[
  {name:'Aether',text:'The dragon lives in',complete:true},
  {name:'You',text:'Actually, a fox.',complete:true},
  {name:'Aether',text:'A fox it is.',complete:false},
 ]);
});

test('ending/muting/replacing a session retains received text and separates the next short comment',()=>{
 let state=delta(emptyLiveTranscript(),'Ready when you are.');
 state=liveTranscriptReducer(state,{type:'finish'});
 assert.equal(liveTranscriptReducer(state,{type:'finish'}),state);
 state=delta(state,'Let us begin.');state=delta(state,' Welcome.','assistant','Nyx');
 assert.deepEqual(state.lines.map(line=>[line.name,line.text]),[['Aether','Ready when you are.'],['Aether','Let us begin.'],['Nyx',' Welcome.']]);
 assert.equal(state.lines[1].complete,true);
});

test('clearing mid-stream removes history without resurrecting it on subsequent deltas',()=>{
 let state=delta(emptyLiveTranscript(),'Old speech');const id=state.lines[0].id;
 state=liveTranscriptReducer(state,{type:'clear'});assert.deepEqual(state.lines,[]);
 assert.equal(liveTranscriptReducer(state,{type:'finish'}),state);
 state=delta(state,'New speech');assert.equal(state.lines.length,1);
 assert.equal(state.lines[0].text,'New speech');assert.ok(state.lines[0].id>id);
});

test('both continuous speech and repeated sessions have bounded storage',()=>{
 let state=delta(emptyLiveTranscript(),'a'.repeat(TRANSCRIPT_CHARACTERS));
 state=delta(state,'b'.repeat(TRANSCRIPT_CHARACTERS));
 assert.equal(state.lines[0].text,'b'.repeat(TRANSCRIPT_CHARACTERS));
 for(let i=0;i<100;i++){state=liveTranscriptReducer(state,{type:'finish'});state=delta(state,String(i));}
 assert.equal(state.lines.length,TRANSCRIPT_LINES);assert.equal(state.lines.at(-1)?.text,'99');
 assert.ok(state.lines.every(line=>line.text.length<=TRANSCRIPT_CHARACTERS));
});
