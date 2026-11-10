import {test} from 'node:test';
import assert from 'node:assert/strict';
import {creationLandscape,portraitHueShift} from './creation-scene-model.ts';
import type {StoryBlueprint} from '../../game/creation.ts';

const story:StoryBlueprint={title:'A quiet kingdom',synopsis:'The forest keeps an old promise.',timeline:'An age of magic',world:'Evermere',locations:['Aster Hollow'],biome:'woodland'};
test('an unformed world stays cosmic; terrain identity follows the approved story',()=>{
 assert.equal(creationLandscape(null),'space');
 for(const biome of ['woodland','coast','ruins'] as const)assert.equal(creationLandscape({...story,biome}),biome);
});
test('a sky setting gets floating islands without changing the campaign biome',()=>{
 const sky={...story,synopsis:'A floating city keeps a dragon asleep above the clouds.'};
 assert.equal(creationLandscape(sky),'sky');assert.equal(sky.biome,'woodland');
 assert.equal(creationLandscape({...story,synopsis:'A cloudy forest hides the old tower.'}),'woodland');
});
test('palette shifts remain finite and invalid colors cannot enter an SVG/CSS filter',()=>{
 assert.equal(portraitHueShift('#ffffff'),0);
 assert.equal(portraitHueShift('url(https://example.com)'),0);
 assert.equal(portraitHueShift('#ff0000'),-273);
 assert.equal(portraitHueShift('#00ff00'),-153);
});
