import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseBlueprint} from '../../game/creation.ts';
import {editCreatorDraft,emptyCreatorDraft} from '../../game/creator-state.ts';
import {quickStartDraft} from './quick-start.ts';

test('every ready-made adventure is a valid blueprint the creator accepts',()=>{
 const biomes=new Set<string>();
 for(const pick of [0,.34,.67,.999,1]){
  const quick=quickStartDraft(pick);
  assert.ok(parseBlueprint({narrator:quick.narrator,story:quick.story,hero:quick.hero}),quick.story.title);
  assert.ok(editCreatorDraft(emptyCreatorDraft(),{narrator:quick.narrator,story:quick.story,hero:quick.hero}));
  assert.equal(quick.heroes.length,3);assert.equal(quick.heroes[0],quick.hero);
  biomes.add(quick.story.biome);
 }
 assert.deepEqual([...biomes].sort(),['coast','ruins','woodland']);
});

test('drafts are independent copies',()=>{
 const first=quickStartDraft(0);first.story.title='Changed';first.narrator.name='Changed';
 const second=quickStartDraft(0);
 assert.notEqual(second.story.title,'Changed');assert.notEqual(second.narrator.name,'Changed');
});
