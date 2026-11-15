import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {GAME_MASTERS,TALES,HEROES,HERO_ART_RATIO,portraitCrop} from './presets.ts';
import {parseHero,parseNarrator,parseStory} from './creation.ts';

const art=(path:string)=>new URL('../public'+path,import.meta.url);

test('every built-in Game Master, tale and hero passes the same validation as AI-made content',()=>{
 for(const g of GAME_MASTERS)assert.deepEqual(parseNarrator(g.profile),g.profile,g.id);
 for(const t of TALES){assert.deepEqual(parseStory(t.story),t.story,t.id);assert.equal(t.story.biome,t.biome);}
 for(const h of HEROES)assert.deepEqual(parseHero(h.profile),h.profile,h.id);
});

test('the roster has sixteen heroes, two for each of the eight classes, with unique ids',()=>{
 assert.equal(HEROES.length,16);
 assert.equal(new Set(HEROES.map(h=>h.id)).size,16);
 const counts=new Map<string,number>();
 for(const h of HEROES)counts.set(h.className,(counts.get(h.className)??0)+1);
 assert.equal(counts.size,8);
 for(const [name,count] of counts)assert.equal(count,2,name);
 assert.equal(new Set(GAME_MASTERS.map(g=>g.id)).size,GAME_MASTERS.length);
 assert.equal(new Set(TALES.map(t=>t.id)).size,TALES.length);
});

test('every preset points at existing, script-free SVG art and a face inside the drawing',()=>{
 for(const item of [...HEROES,...GAME_MASTERS]){
  assert.ok(existsSync(art(item.art)),item.art);
  const svg=readFileSync(art(item.art),'utf8');
  assert.ok(svg.startsWith('<svg'),item.art);
  assert.doesNotMatch(svg,/<script|foreignObject|on\w+=|href="http/i,item.art);
  assert.ok(item.face.x>0&&item.face.x<1&&item.face.y>0&&item.face.y<1,item.id);
 }
});

test('portrait crops place the face centre at the same spot in every box',()=>{
 for(const h of HEROES){
  const box={w:120,h:72},c=portraitCrop(h.face,box,HERO_ART_RATIO);
  assert.ok(Math.abs(c.left+h.face.x*c.width-box.w/2)<=1,h.id);
  assert.ok(Math.abs(c.top+h.face.y*c.height-box.h*0.36)<=1,h.id);
  assert.ok(c.width>box.w,'the art is larger than the box so the crop shows head to chest');
 }
});
