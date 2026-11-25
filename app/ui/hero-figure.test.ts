import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HERO_CLASSES,HERO_COLORS} from '../../game/types.ts';
import {customHeroArt,customHeroSvg,heroLook} from './hero-figure.ts';

const NAMES=['Juniper','Pip','Orla','Wren','Clover','Bramble','Moss','Cricket','Rue','Rowan 2','Fern 3','Ada'];

test('a drawn hero keeps one look for one name and class',()=>{
 for(const heroClass of HERO_CLASSES){
  const a=customHeroSvg({name:'Juniper',heroClass,color:HERO_COLORS[1]});
  assert.equal(customHeroSvg({name:' juniper ',heroClass,color:HERO_COLORS[1]}),a,'name case and spacing do not change the face');
  assert.deepEqual(heroLook({name:'Juniper',heroClass,color:HERO_COLORS[3]}).hairStyle,heroLook({name:'Juniper',heroClass,color:HERO_COLORS[1]}).hairStyle);
 }
});
test('drawn heroes share the roster art box and are well-formed',()=>{
 for(const heroClass of HERO_CLASSES)for(const name of NAMES){
  const svg=customHeroSvg({name,heroClass,color:HERO_COLORS[NAMES.indexOf(name)%HERO_COLORS.length]});
  assert.match(svg,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="12 20 376 488"/);
  assert.doesNotMatch(svg,/NaN|undefined|null/);
  const opens=(svg.match(/<g[ >]/g)??[]).length,closes=(svg.match(/<\/g>/g)??[]).length;assert.equal(opens,closes,`${name} ${heroClass}: groups balance`);
  assert.ok(svg.length<20000,`${name} ${heroClass}: stays small (${svg.length})`);
 }
});
test('a party of companions does not look like copies',()=>{
 for(const heroClass of HERO_CLASSES){
  const looks=new Set(NAMES.map(name=>customHeroSvg({name,heroClass,color:HERO_COLORS[0]})));
  assert.equal(looks.size,NAMES.length,heroClass);
 }
 const faces=new Set(NAMES.map(name=>{const l=heroLook({name,heroClass:'cleric',color:HERO_COLORS[0]});return `${l.skin}${l.hair}${l.hairStyle}`}));
 assert.ok(faces.size>=8,'skin, hair and hairstyle vary across the usual companion names');
});
test('the drawing is served as an image URL',()=>{
 const url=customHeroArt({name:'Wren',heroClass:'ranger',color:HERO_COLORS[4]});
 assert.match(url,/^data:image\/svg\+xml;charset=utf-8,%3Csvg/);
 assert.equal(customHeroArt({name:'Wren',heroClass:'ranger',color:HERO_COLORS[4]}),url);
});
