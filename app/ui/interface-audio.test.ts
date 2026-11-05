import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {INTERFACE_SOUNDS,soundAllowed} from './interface-audio.ts';
test('hover feedback throttles traversal, while clicks have priority and suppress duplicate activation',()=>{
 assert.equal(soundAllowed('hover',100,50,-Infinity),false);
 assert.equal(soundAllowed('hover',140,50,-Infinity),true);
 assert.equal(soundAllowed('click',55,50,-Infinity),true);
 assert.equal(soundAllowed('click',70,50,55),false);
 assert.equal(soundAllowed('hover',160,50,55),false);
 assert.equal(soundAllowed('hover',180,50,55),true);
});
test('both local interaction samples are small valid WAV files',()=>{
 for(const path of Object.values(INTERFACE_SOUNDS)){
  const bytes=readFileSync(new URL(`../../public${path}`,import.meta.url));
  assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WAVE');
  assert.ok(bytes.length>44&&bytes.length<5000);
 }
});
