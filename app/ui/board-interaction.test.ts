import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../../game/engine.ts';
import {DEFAULT_OPTIONS} from '../../game/types.ts';
import {createBoardProjection} from './board-projection.ts';
import {sameBoardTerrain,rovingBoardTile,nextBoardTile,resizedBoardPan,revealedBoardPan} from './board-interaction.ts';

test('terrain comparison skips actor-only changes but invalidates every map field',()=>{
 const game=createGame([{id:'you',name:'Tester',heroClass:'ranger',color:'#abc',bot:false}],DEFAULT_OPTIONS),moved=structuredClone(game);
 moved.actors[0].x++;moved.round++;assert.equal(sameBoardTerrain(game,moved),true);
 for(const change of [(next:typeof game)=>{next.width++},(next:typeof game)=>{next.height++},(next:typeof game)=>{next.options.biome='ruins'},(next:typeof game)=>{next.tiles.pop()},(next:typeof game)=>{next.tiles[0].x++},(next:typeof game)=>{next.tiles[0].y++},(next:typeof game)=>{next.tiles[0].kind=next.tiles[0].kind==='water'?'grass':'water'},(next:typeof game)=>{next.tiles[0].decoration=next.tiles[0].decoration==='tree'?'rock':'tree'}]){
  const next=structuredClone(game);change(next);assert.equal(sameBoardTerrain(game,next),false);
 }
});

test('roving tile retains a legal preview and recovers near the hero when destinations change',()=>{
 const tiles=[{x:4,y:0},{x:1,y:1},{x:2,y:1}];
 assert.deepEqual(rovingBoardTile(tiles,{x:2,y:1},{x:0,y:1}),{x:2,y:1});
 assert.deepEqual(rovingBoardTile(tiles,{x:9,y:9},{x:0,y:1}),{x:1,y:1});
 assert.equal(rovingBoardTile([],null,{x:0,y:1}),null);
});

test('keyboard preview follows screen directions, skips unavailable destinations, and stops at edges',()=>{
 const tiles=[{x:0,y:0},{x:2,y:0},{x:3,y:1},{x:2,y:2}];
 assert.deepEqual(nextBoardTile(tiles,{x:0,y:0},'ArrowRight'),{x:2,y:0});
 assert.deepEqual(nextBoardTile(tiles,{x:2,y:0},'ArrowDown'),{x:2,y:2});
 assert.deepEqual(nextBoardTile(tiles,{x:0,y:0},'ArrowLeft'),{x:0,y:0});
 const projection=createBoardProjection('2.5d',5,5),depthTiles=[{x:2,y:2},{x:1,y:1},{x:3,y:1},{x:3,y:3},{x:1,y:3}];
 for(const[direction,target]of [['ArrowUp',{x:1,y:1}],['ArrowRight',{x:3,y:1}],['ArrowDown',{x:3,y:3}],['ArrowLeft',{x:1,y:3}]] as const)assert.deepEqual(nextBoardTile(depthTiles,{x:2,y:2},direction,projection.tileCenter),target);
});

test('resize keeps a valid manual frame and clamps exposed edges without changing zoom',()=>{
 const world={width:1000,height:700},pan={x:200,y:100};
 assert.deepEqual(resizedBoardPan({width:360,height:400},world,2,pan),pan);
 assert.deepEqual(resizedBoardPan({width:900,height:300},world,2,pan),{x:0,y:100});
 assert.deepEqual(resizedBoardPan({width:1000,height:700},world,1,pan),{x:0,y:0});
 assert.equal(resizedBoardPan({width:0,height:0},world,2,pan),pan);
});

test('keyboard previews remain visible on manually zoomed desktop and mobile boards',()=>{
 const world=createBoardProjection('2d',20,14),camera={zoom:2,pan:{x:0,y:0}};
 for(const viewport of [{width:1000,height:700},{width:360,height:500}]){
  assert.equal(revealedBoardPan(viewport,world,camera,{x:10,y:7},world.tileCenter),null);
  const pan=revealedBoardPan(viewport,world,camera,{x:19,y:7},world.tileCenter)!;assert.ok(pan);
  const scale=Math.min(viewport.width/world.width,viewport.height/world.height),screenX=viewport.width/2+(pan.x+(world.tileCenter(19,7).x-world.width/2)*camera.zoom)*scale;
  assert.ok(screenX>0&&screenX<viewport.width);
 }
});
