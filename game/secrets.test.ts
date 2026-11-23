import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from './engine.ts';
import {GAME_MASTERS,HEROES,TALES} from './presets.ts';
import {SECRETS,sealedNote,sealedNoteFor} from './secrets.ts';
import type {GameOptions,PlayerSpec} from './types.ts';

/* The sealed note (Story Bible, section 6): every built-in hero has one secret per built-in Game Master; only the chosen
   Game Master's secret is used, and only that hero's own player gets it. */
const corin=HEROES.find(h=>h.id==='corin')!,mira=HEROES.find(h=>h.id==='mira')!;
const spec=(id:string,hero:typeof corin,bot=false):PlayerSpec=>({id,name:hero.profile.name,heroClass:hero.profile.heroClass,color:hero.profile.color,bot});
const options=(gm=GAME_MASTERS[1]):GameOptions=>{const tale=TALES[0];return {rules:'simple',seed:'sealed',narrator:'wry',biome:tale.story.biome,companions:0,duration:'standard',
 creation:{narrator:gm.profile,story:tale.story,hero:corin.profile}}};

test('every built-in hero has a secret for each built-in Game Master',()=>{
 assert.deepEqual(Object.keys(SECRETS).sort(),HEROES.map(h=>h.id).sort());
 for(const hero of HEROES)for(const gm of GAME_MASTERS){
  const note=sealedNote(hero.id,gm.id);
  assert.ok(note&&note.length>60,`${hero.id} has a ${gm.id} secret`);
  assert.doesNotMatch(note!,/'/,'typographic apostrophes, like the rest of the presets');
 }
 assert.equal(sealedNote('corin','someone-new'),undefined,'a custom Game Master has no sealed notes');
 assert.equal(sealedNote('a-custom-hero','wanderer'),undefined);
});

test('a player gets their own hero’s note under the chosen Game Master, and nobody else’s',()=>{
 const game=createGame([spec("p1",corin),spec("p2",mira),spec("p3",mira,true)],options());
 const mine=sealedNoteFor(game,'p1');
 assert.equal(mine?.hero.id,'corin');
 assert.equal(mine?.gm.id,'survivor');
 assert.equal(mine?.secret,SECRETS.corin.survivor);
 assert.equal(sealedNoteFor(game,'p2')?.hero.id,'mira');
 assert.equal(sealedNoteFor(game,'p3'),undefined,'companions have no sealed note');
 assert.equal(sealedNoteFor(game,'nobody'),undefined);
 const custom=createGame([spec("p1",corin)],{...options(),creation:{...options().creation!,narrator:{...GAME_MASTERS[0].profile,name:"Mother Ash"}}});
 assert.equal(sealedNoteFor(custom,'p1'),undefined,'a custom Game Master has no sealed note');
});
