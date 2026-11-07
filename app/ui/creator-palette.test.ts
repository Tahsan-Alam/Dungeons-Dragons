import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AETHER} from '../../game/creation.ts';
import {creatorPalette} from './creator-palette.ts';
test('unformed Ether is neutral and the first personality choice changes its palette',()=>{
 assert.equal(creatorPalette(structuredClone(AETHER)).neutral,true);
 const bubbly=creatorPalette({...AETHER,personality:['Bubbly']});
 assert.equal(bubbly.label,'rose');assert.equal(bubbly.neutral,false);
 assert.equal(creatorPalette({...AETHER,personality:['Mysterious']}).label,'violet');
});
test('personality dominates supporting delivery; order and custom traits remain stable',()=>{
 const profile={...AETHER,personality:['Bubbly','Gentle'],speakingStyle:['Soft-spoken']};
 assert.deepEqual(creatorPalette(profile),creatorPalette({...profile,personality:[...profile.personality].reverse()}));
 assert.equal(creatorPalette({...AETHER,personality:['Bubbly'],speakingStyle:['Measured']}).label,'rose');
 assert.deepEqual(creatorPalette({...AETHER,personality:['Moonwise']}),creatorPalette({...AETHER,personality:['Moonwise']}));
});
