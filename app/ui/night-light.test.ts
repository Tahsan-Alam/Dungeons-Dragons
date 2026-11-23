import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {GameState,Tile} from '../../game/types.ts';
import {NIGHT_SOURCES,nightGlints,nightLights,nightLitTiles,nightRim,nightSpill} from './night-light.ts';

/* The board at night: only the lights already on the board light it, and night never hides a rule. */
const board=(props:[number,number,string][],water:[number,number][]=[]):GameState=>{
 const tiles:Tile[]=[];
 for(let y=0;y<14;y++)for(let x=0;x<20;x++){
  const prop=props.find(p=>p[0]===x&&p[1]===y),wet=water.some(([wx,wy])=>wx===x&&wy===y);
  tiles.push({x,y,kind:prop?'wall':wet?'water':'grass',decoration:prop?.[2]} as Tile);
 }
 return {width:20,height:14,tiles,options:{biome:'forest'}} as unknown as GameState;
};
const read=(f:string)=>readFileSync(new URL(f,import.meta.url),'utf8');

test('every light the day board draws has a night light of the same colour',()=>{
 const glow:Record<string,string>={'LAMP_GLOW':'warm','LENS':'teal','TEAL':'teal','SEA':'sea'};let seen=0;
 for(const file of ['./SetPieceArt.tsx','./PlaceArt.tsx','./LongPlaceArt.tsx']){
  const src=read(file),body=src.slice(src.search(/export function (GroundLight|PlaceLight|LongLight)/));
  for(const m of body.matchAll(/prop==='([a-z-]+)'\)return <[^;]*?fill=\{(LAMP_GLOW|LENS|TEAL|SEA)\}/g)){
   const source=NIGHT_SOURCES[m[1] as keyof typeof NIGHT_SOURCES];
   assert.ok(source,`${m[1]} has a night light`);seen++;
   if(m[1]!=='sea-door')assert.equal(source.tone,glow[m[2]],`${m[1]} keeps its colour at night`);
  }
 }
 assert.equal(seen,Object.keys(NIGHT_SOURCES).length,'every lit prop is checked');
});

test('a lamp throws a warm pool; a figure beside it takes a rim on the side facing it, one far away does not',()=>{
 const g=board([[15,3,'lamp']]),lights=nightLights(g);
 assert.equal(lights.length,1);
 assert.deepEqual(nightRim(lights,14,4),{tone:'warm',side:1});
 assert.equal(nightRim(lights,17,4)?.side,-1);
 assert.equal(nightRim(lights,3,10),undefined);
 assert.ok(nightLitTiles(g,lights).has('15,3'),'the lamp itself stands in its light');
 assert.ok(nightSpill(lights[0])>=140);
});

test('the sea door is one tall doorway of light, not three blobs',()=>{
 const g=board([[19,6,'sea-door'],[19,7,'sea-door'],[19,8,'sea-door'],[16,1,'vault-door'],[17,1,'span']]),lights=nightLights(g);
 const sea=lights.filter(l=>l.tone==='sea');
 assert.equal(sea.length,1);
 assert.deepEqual([sea[0].y0,sea[0].y1],[6*50+25,8*50+25]);
 assert.equal(nightRim(lights,18,8)?.tone,'sea');
 assert.ok(lights.some(l=>l.tone==='warm'),'the barred vault door keeps the chest\'s warm pool');
});

test('a board with no lights is all moonlight, and water gets glints',()=>{
 const g=board([],[[2,2],[3,2],[4,2],[5,2]]);
 assert.equal(nightLights(g).length,0);
 assert.equal(nightRim([],5,5),undefined);
 assert.equal(nightGlints(g).length,2);
});

test('night draws under every rule mark and leaves light mode alone',()=>{
 const depth=read('./DepthArt.tsx'),flat=read('./Board.tsx'),css=read('./night.css');
 assert.ok(depth.indexOf('<NightVeil')>0&&depth.indexOf('<NightVeil')<depth.indexOf('<RefugeEdges edges'),'2.5D: the veil is under the refuge edge');
 const terrain=flat.slice(flat.indexOf('const Terrain='));
 assert.ok(terrain.indexOf('<NightVeil')>0&&terrain.indexOf('<NightVeil')<terrain.indexOf('<RefugeEdges'),'tactical map: the veil is under the refuge edge');
 assert.ok(flat.indexOf('<BoardTerrain')<flat.indexOf('<KeeperMarks')&&flat.indexOf('<BoardTerrain')<flat.indexOf('className={`tile-hit'),'Keeper marks and move range are drawn above the night');
 const rules=css.replace(/\/\*[\s\S]*?\*\//g,'').split('}').map(r=>r.trim()).filter(r=>r.includes('{')&&!r.startsWith('@'));
 for(const rule of rules){
  const selector=rule.slice(0,rule.indexOf('{')).trim();
  if(selector==='.night-veil')continue;
  assert.ok(selector.split(/,(?![^(]*\))/).every(s=>s.includes('html[data-color-mode="dark"]')||s.trim().startsWith('@')||s.includes('forced-colors')),`${selector} only applies at night`);
 }
});
