import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MAX_PAINTINGS,addPainting,ownPortrait,parsePaintings} from './own-paintings.ts';

const id=(c:string)=>c.repeat(32);

test('a new painting goes first, a repeat moves up, and the list stops at the limit',()=>{
 assert.deepEqual(addPainting([id('a'),id('b')],id('c')),[id('c'),id('a'),id('b')]);
 assert.deepEqual(addPainting([id('a'),id('b')],id('b')),[id('b'),id('a')]);
 const full=Array.from({length:MAX_PAINTINGS},(_,i)=>i.toString(16).repeat(32));
 const next=addPainting(full,id('f'));
 assert.equal(next.length,MAX_PAINTINGS);assert.equal(next[0],id('f'));assert.ok(!next.includes(full.at(-1)!));
});

test('saved paintings keep only server ids, once each',()=>{
 assert.deepEqual(parsePaintings([id('a'),'https://example.com/x.png',id('a'),7,id('b')]),[id('a'),id('b')]);
 assert.deepEqual(parsePaintings('nope'),[]);
});

test('only a painted creation shows its chosen painting',()=>{
 assert.equal(ownPortrait({mode:'paint',portrait:id('a')}),id('a'));
 assert.equal(ownPortrait({mode:'draw',portrait:id('a')}),undefined);
 assert.equal(ownPortrait({mode:'paint',portrait:'nope'}),undefined);
});
