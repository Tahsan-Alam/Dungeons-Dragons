import {test} from 'node:test';
import assert from 'node:assert/strict';
import {narratorTone,parseNarrator} from './creation.ts';
import {OWN_ACCESSORIES,OWN_DEFAULT,OWN_FORMS,OWN_TONES,ownGameMaster,parseOwnInput} from './own-game-master.ts';
import {HERO_COLORS} from './types.ts';

/* "Create your own Game Master": the player's choices become an ordinary narrator profile that passes the same
   validation as an AI-made Game Master. */
test('a named Game Master becomes a valid narrator profile in every tone, shape and accessory',()=>{
 for(const tone of OWN_TONES)for(const form of OWN_FORMS)for(const accessory of OWN_ACCESSORIES){
  const profile=ownGameMaster({...OWN_DEFAULT,name:'Mother Ash',tone:tone.id,form:form.id,accessory:accessory.id});
  assert.ok(profile,`${tone.id} ${form.id} ${accessory.id}`);
  assert.deepEqual(parseNarrator(profile),profile,'passes the narrator validation unchanged');
  assert.equal(narratorTone(profile!),{hopeful:'warm',wry:'wry',grave:'dramatic'}[tone.id],'the game narrates in the chosen tone');
  assert.deepEqual(profile!.avatar,{form:form.id,accessory:accessory.id});
 }
});

test('a Game Master needs a name; unsafe or overlong text is cleaned, never passed through',()=>{
 assert.equal(ownGameMaster({...OWN_DEFAULT,name:'   '}),null);
 assert.equal(ownGameMaster({...OWN_DEFAULT,name:'the wanderer'}),null,'the built-in Game Masters keep their names');
 assert.equal(ownGameMaster({...OWN_DEFAULT,name:'Liora Thorne'}),null);
 const p=ownGameMaster({...OWN_DEFAULT,name:'<b>Bramble</b>\n of the   Reeds and a very long name indeed',who:'Keeps <script> bees.\t'})!;
 assert.ok(p.name.length<=28&&!/[<>]/.test(p.name));
 assert.doesNotMatch(p.persona,/[<>\t]/);
 assert.match(ownGameMaster({...OWN_DEFAULT,name:'Bramble'})!.persona,/^Bramble, who/,'a short default when they leave "who are they" empty');
});

test('saved choices restore safely, and anything no longer offered falls back to the defaults',()=>{
 assert.deepEqual(parseOwnInput(null),OWN_DEFAULT);
 assert.deepEqual(parseOwnInput({name:'Wren',tone:'loud',form:'whale',accessory:'cape',color:'red'}),{...OWN_DEFAULT,name:'Wren'});
 assert.deepEqual(parseOwnInput({name:'Wren',who:'x',tone:'grave',form:'fox',accessory:'crown',color:HERO_COLORS[0]}),{name:'Wren',who:'x',tone:'grave',form:'fox',accessory:'crown',color:HERO_COLORS[0]});
});
