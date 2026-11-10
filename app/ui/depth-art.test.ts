import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createGame} from '../../game/engine.ts';
import {createBoardProjection} from './board-projection.ts';
import {ART_PALETTE,TREE_TONES,worldPigment} from './artPalette.ts';
import type {Biome,HeroClass,Tile} from '../../game/types';

// Render the actual TSX in Node without a browser or CSS loader. The theme is the
// sole mocked dependency, so every asset branch and generated game fixture runs.
const require=createRequire(import.meta.url);
let presentation={theme:'paint',viewMode:'2d'};
function load(file:string,overrides:Record<string,unknown>){
 const exports:Record<string,React.ElementType>={};
 const code=ts.transpileModule(fs.readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(code,{exports,require:(name:string)=>name.endsWith('.css')?{}:overrides[name]??require(name)});
 return exports;
}
const shared={'./Theme':{useTheme:()=>presentation},'./artPalette':{ART_PALETTE,TREE_TONES,worldPigment}};
const pixel=load('./PixelArt.tsx',shared),art=load('./Art.tsx',{...shared,'./PixelArt':pixel}),depth=load('./DepthArt.tsx',{...shared,'./Art':art});
function render(component:React.ElementType,props:Record<string,unknown>){const html=renderToStaticMarkup(React.createElement(component,props));assert.doesNotMatch(html,/NaN|Infinity|<image|<filter/);return html}
const player={id:'you',name:'Hero',heroClass:'knight' as const,color:'#ef997c',bot:false};

test('interface icons render identically when switching art style',()=>{
 for(const name of ['pin','dice','arrow','back','close','sword','shield','heart','move','spark','potion','book','sound','mute','people','plus','minus','fit','check','flag','gear','link','chest','leaf','music','eye']){
  presentation={theme:'paint',viewMode:'2d'};const paint=render(art.Icon,{name,size:24});
  presentation={theme:'pixel',viewMode:'2d'};const pixel=render(art.Icon,{name,size:24});
  for(const html of [paint,pixel]){assert.match(html,/width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"/);assert.doesNotMatch(html,/fill="currentColor"/);}
  assert.equal(pixel,paint,`${name} must keep identical geometry, strokes and styling`);
 }
});

test('generated wall decorations retain their identity in both dimensional art styles',()=>{
 for(const theme of ['paint','pixel'])for(const biome of ['woodland','ruins','coast'] as Biome[]){
  presentation={theme,viewMode:'2.5d'};
  const game=createGame([player],{rules:'simple',seed:'dimensional-art',narrator:'warm',biome,companions:0});
  const before=JSON.stringify(game),projection=createBoardProjection('2.5d',game.width,game.height);
  const ground=render(depth.DepthTerrain,{game,grid:true,projection});
  assert.ok(ground.includes('depth-terrain'));assert.ok(ground.includes(projection.groundTransform));
  for(const tile of game.tiles.filter(t=>t.kind==='wall'||t.decoration)){
   const html=render(depth.DepthProp,{tile,projection});assert.ok(html.includes('pointer-events="none"'));
   if(tile.decoration==='tree'){assert.ok(html.includes(ART_PALETTE.leafDark));assert.ok(!html.includes('depth-prism'),'trees must not turn into stone wall blocks');assert.ok(html.includes(TREE_TONES[(tile.x+tile.y)%3]),'tree color variant stays the same in either view');assert.ok(html.includes(`scale(${.75+(tile.x%3)*.08})`),'tree height keeps its canonical scale')}
  }
  assert.equal(JSON.stringify(game),before,'art must not change game state or its seed');
 }
});

test('all raised props, chest states and gateway states render through shared projection',()=>{
 const projection=createBoardProjection('2.5d',12,10);
 for(const theme of ['paint','pixel']){
  presentation={theme,viewMode:'2.5d'};
  const decorations:Tile['decoration'][]=['tree','rock','ruin','flower','mushroom',undefined];
  for(const decoration of decorations){const tile:Tile={x:3,y:4,kind:'wall',decoration};const html=render(depth.DepthProp,{tile,projection,faded:true});const center=projection.tileCenter(3,4);assert.ok(html.includes(`translate(${center.x} ${center.y})`));assert.ok(html.includes('opacity="0.46"'))}
  for(const active of [false,true]){assert.ok(render(depth.DepthChest,{x:4,y:5,opened:active,projection}).includes('depth-chest'));assert.ok(render(depth.DepthGateway,{x:8,y:7,active,projection}).includes('depth-gateway'))}
 }
 assert.match(fs.readFileSync(new URL('./depth-art.css',import.meta.url),'utf8'),/\.pixel-depth\{shape-rendering:crispEdges\}/);
});

test('portraits and chapter art gain side faces while keeping sizes, colors and identities',()=>{
 for(const theme of ['paint','pixel'])for(const heroClass of ['knight','ranger','mage','cleric'] as HeroClass[])for(const enemy of [false,true]){
  presentation={theme,viewMode:'2d'};const flat=render(art.HeroArt,{heroClass,enemy,color:player.color});
  presentation={theme,viewMode:'2.5d'};const dimensional=render(art.HeroArt,{heroClass,enemy,color:player.color});
  assert.ok(!flat.includes('hero-depth-faces'));assert.ok(dimensional.includes('hero-depth-faces'));
  assert.ok(flat.includes('width="80" height="90"'));assert.ok(dimensional.includes('width="80" height="90"'));assert.ok(dimensional.includes(player.color));
 }
 for(const theme of ['paint','pixel'])for(const biome of ['woodland','ruins','coast']){
  presentation={theme,viewMode:'2d'};const flat=render(art.Panorama,{biome});
  presentation={theme,viewMode:'2.5d'};const dimensional=render(art.Panorama,{biome});
  assert.notEqual(flat,dimensional);assert.ok(dimensional.includes('depth-art'));assert.ok(dimensional.includes('viewBox="0 0 800 480"'));
 }
});

test('chapter panoramas match the biome and actual party in either style and view',()=>{
 const characters=[{heroClass:'ranger' as const,color:'#ef997c'},{heroClass:'cleric' as const,color:'#87bdcf'},{heroClass:'mage' as const,color:'#edcf75'}];
 const original=JSON.stringify(characters);
 for(const theme of ['paint','pixel'])for(const viewMode of ['2d','2.5d'])for(const biome of ['woodland','ruins','coast']){
  presentation={theme,viewMode};
  const html=render(art.Panorama,{biome,characters});
  assert.match(html,new RegExp(biome==='coast'?'coast with an ocean and a lighthouse':biome==='ruins'?'ancient ruins with broken columns':'woodland with winding paths'));
  assert.match(html,new RegExp(`data-landmark="${biome==='coast'?'lighthouse':biome==='ruins'?'ruined-gateway':'woodland-tower'}"`));
  assert.equal((html.match(/data-panorama-hero=/g)??[]).length,characters.length);
  for(const hero of characters){assert.ok(html.includes(`data-panorama-hero="${hero.heroClass}"`));assert.ok(html.includes(hero.color));}
  assert.doesNotMatch(html,/data-panorama-hero="knight"/,'a generic knight must not replace the selected party');
  assert.equal(html.includes('depth-art'),viewMode==='2.5d');
  if(biome!=='woodland')assert.doesNotMatch(html,/woodland-tower/,'other biomes must not reuse the woodland landmark');
  assert.equal((render(art.Panorama,{biome,characters:[]}).match(/data-panorama-hero=/g)??[]).length,0);
  assert.equal((render(art.Panorama,{biome,characters:[...characters,...characters]}).match(/data-panorama-hero=/g)??[]).length,4);
 }
 assert.equal(JSON.stringify(characters),original,'rendering must not mutate party identities');
});
