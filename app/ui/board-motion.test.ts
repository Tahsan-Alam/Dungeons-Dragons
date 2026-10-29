import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyAction,getReachable} from '../../game/engine.ts';
import {DEFAULT_OPTIONS} from '../../game/types.ts';
import {findBoardPath,planActorMotions,sampleBoardPath,isBoardDiscontinuity,boardPathKeyframes,initialBoardFrame,followBoardTarget,anchoredBoardPan} from './board-motion.ts';

function fixture(){
 const game=createGame([{id:'you',name:'Tester',heroClass:'ranger',color:'#abc',bot:false}],{...DEFAULT_OPTIONS,companions:0});
 game.width=5;game.height=5;game.tiles=Array.from({length:25},(_,i)=>({x:i%5,y:Math.floor(i/5),kind:'grass'}));
 game.actors=game.actors.slice(0,2);Object.assign(game.actors[0],{x:0,y:1,movement:6});Object.assign(game.actors[1],{x:4,y:4});
 game.activeActorId=game.actors[0].id;game.events=[];game.eventSequence=0;
 return game;
}
test('movement paths follow cardinal squares around walls rather than crossing them diagonally',()=>{
 const game=fixture();game.tiles[6].kind='wall';const path=findBoardPath(game,game.actors[0],{x:2,y:1});
 assert.deepEqual(path,[{x:0,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:2,y:1}]);
 assert.equal(findBoardPath(game,game.actors[0],{x:2,y:1},3),null);
});
test('water and living or downed actors block routes, defeated actors do not',()=>{
 const game=fixture();game.tiles[6].kind='water';Object.assign(game.actors[1],{x:0,y:2,hp:0,defeated:false});
 const path=findBoardPath(game,game.actors[0],{x:2,y:1})!;
 assert.ok(!path.some(p=>p.x===1&&p.y===1));assert.ok(!path.some(p=>p.x===0&&p.y===2));assert.deepEqual(path[1],{x:0,y:0});
 game.actors[1].defeated=true;assert.deepEqual(findBoardPath(game,game.actors[0],{x:2,y:1})![1],{x:0,y:2});
});
test('preview routes match the engine movement budget and reject invalid or blocked destinations',()=>{
 const game=fixture(),actor=game.actors[0];game.tiles[6].kind='wall';actor.movement=3;
 for(const tile of getReachable(game,actor)){const path=findBoardPath(game,actor,tile)!;assert.ok(path);assert.ok(path.length-1<=3);for(let i=1;i<path.length;i++)assert.equal(Math.abs(path[i].x-path[i-1].x)+Math.abs(path[i].y-path[i-1].y),1);}
 for(const target of [{x:-1,y:0},{x:1,y:1},{x:2.5,y:2},{x:4,y:4},{x:5,y:0}])assert.equal(findBoardPath(game,actor,target),null);
});
test('accepted movement creates exact path keyframes without changing validated game state',()=>{
 const before=fixture();before.tiles[6].kind='wall';const after=applyAction(before,'you',{type:'move',x:2,y:1}),saved=JSON.stringify([before,after]);
 const plans=planActorMotions(before,after);assert.equal(plans.length,1);assert.equal(plans[0].path.length,5);assert.equal(plans[0].duration,460);
 const frames=boardPathKeyframes(plans[0].path);assert.equal(frames[0].transform,'translate(25px, 75px)');assert.equal(frames.at(-1)!.transform,'translate(125px, 75px)');assert.deepEqual(frames.map(f=>f.offset),[0,.25,.5,.75,1]);
 assert.equal(JSON.stringify([before,after]),saved);
});
test('interrupted, reduced-motion, and explicitly scrubbed moves snap without queued animation',()=>{
 const before=fixture(),after=applyAction(before,'you',{type:'move',x:2,y:1});
 assert.deepEqual(planActorMotions(before,after,{interruptedIds:new Set([before.actors[0].id])}),[]);
 assert.deepEqual(planActorMotions(before,after,{reducedMotion:true}),[]);assert.deepEqual(planActorMotions(before,after,{enabled:false}),[]);
});
test('chapter, adventure, backwards timeline and changed maps are discontinuities',()=>{
 const before=fixture(),after=applyAction(before,'you',{type:'move',x:2,y:1});
 const changes=[{...after,scene:after.scene+1},{...after,options:{...after.options,seed:'other'}},{...after,tiles:after.tiles.map((t,i)=>i===0?{...t,kind:'wall' as const}:t)}];
 for(const next of changes){assert.equal(isBoardDiscontinuity(before,next),true);assert.deepEqual(planActorMotions(before,next),[]);}
 assert.equal(isBoardDiscontinuity(after,before),true);assert.deepEqual(planActorMotions(after,before),[]);
});
test('missing events and several unseen moves by one actor are not fabricated into a single route',()=>{
 const before=fixture(),one=applyAction(before,'you',{type:'move',x:1,y:1}),two=applyAction(one,'you',{type:'move',x:2,y:1});
 assert.deepEqual(planActorMotions(before,two),[]);
 assert.deepEqual(planActorMotions(before,{...one,events:one.events.map(e=>({...e,id:e.id+2})),eventSequence:one.eventSequence+2}),[]);
});

test('mobile framing keeps tiles readable and clamps the view to map edges',()=>{
 const viewport={width:360,height:500},world={width:1000,height:700};
 const frame=initialBoardFrame(viewport,world,{x:1,y:1}),scale=Math.min(viewport.width/world.width,viewport.height/world.height);
 assert.equal(Math.round(50*frame.zoom*scale),32);
 const mapLeft=viewport.width/2+(frame.pan.x-world.width*frame.zoom/2)*scale;
 const mapTop=viewport.height/2+(frame.pan.y-world.height*frame.zoom/2)*scale;
 assert.ok(Math.abs(mapLeft)<.001);assert.ok(Math.abs(mapTop-Math.max(0,(viewport.height-world.height*frame.zoom*scale)/2))<.001);
 const opposite=initialBoardFrame(viewport,world,{x:19,y:13});assert.ok(Math.abs(opposite.pan.x+frame.pan.x)<.001);assert.ok(Math.abs(opposite.pan.y+frame.pan.y)<.001);
});
test('landscape mobile framing uses readable tiles while desktop and hidden boards keep fit',()=>{
 const world={width:1000,height:700},viewport={width:760,height:180},frame=initialBoardFrame(viewport,world,{x:10,y:7});
 assert.equal(Math.round(50*frame.zoom*Math.min(viewport.width/world.width,viewport.height/world.height)),30);
 assert.deepEqual(initialBoardFrame({width:1000,height:700},world,{x:1,y:1}),{zoom:1,pan:{x:0,y:0}});
 assert.deepEqual(initialBoardFrame({width:0,height:0},world,{x:1,y:1}),{zoom:1,pan:{x:0,y:0}});
 assert.ok(initialBoardFrame({width:200,height:100},world,{x:1,y:1}).zoom<=2.5);
});

test('mobile camera follows a long move near the view edge but leaves comfortable moves stable',()=>{
 const viewport={width:360,height:500},world={width:1000,height:700},camera=initialBoardFrame(viewport,world,{x:3,y:7});
 assert.equal(followBoardTarget(viewport,world,camera,{x:4,y:7}),null);
 const next=followBoardTarget(viewport,world,camera,{x:9,y:7});assert.ok(next);assert.equal(next.y,camera.pan.y);
 const scale=Math.min(viewport.width/world.width,viewport.height/world.height);
 const projectedX=viewport.width/2+(next.x+((9+.5)*50-world.width/2)*camera.zoom)*scale;
 assert.ok(Math.abs(projectedX-viewport.width/2)<.001);
 assert.equal(followBoardTarget(viewport,world,{...camera,pan:next},{x:10,y:7}),null);
});
test('mobile following respects map boundaries and does not move desktop or whole-map views',()=>{
 const viewport={width:360,height:500},world={width:1000,height:700},camera=initialBoardFrame(viewport,world,{x:10,y:7});
 const edge=followBoardTarget(viewport,world,camera,{x:19,y:7});assert.ok(edge);
 const scale=Math.min(viewport.width/world.width,viewport.height/world.height);
 const mapRight=viewport.width/2+(edge.x+world.width*camera.zoom/2)*scale;
 assert.ok(Math.abs(mapRight-viewport.width)<.001);
 assert.equal(followBoardTarget(viewport,world,{zoom:1,pan:{x:0,y:0}},{x:19,y:7}),null);
 assert.equal(followBoardTarget({width:1000,height:700},world,camera,{x:19,y:7}),null);
});

test('depth sampling follows each route segment without cutting diagonally across a corner',()=>{
 const path=[{x:1,y:1},{x:2,y:1},{x:2,y:2}];
 assert.deepEqual(sampleBoardPath(path,.25),{x:1.5,y:1});assert.deepEqual(sampleBoardPath(path,.5),{x:2,y:1});assert.deepEqual(sampleBoardPath(path,.75),{x:2,y:1.5});
 assert.deepEqual(sampleBoardPath(path,-1),path[0]);assert.deepEqual(sampleBoardPath(path,2),path[2]);assert.deepEqual(sampleBoardPath([{x:3,y:4}],.5),{x:3,y:4});
});

test('pinch zoom preserves the world point under an off-center moving midpoint',()=>{
 const pan={x:80,y:-40},initial={x:260,y:130},moved={x:290,y:110},fromZoom=1.5,toZoom=2.4;
 const world={x:(initial.x-pan.x)/fromZoom,y:(initial.y-pan.y)/fromZoom};
 const next=anchoredBoardPan(pan,fromZoom,toZoom,initial,moved);
 assert.ok(Math.abs(next.x+world.x*toZoom-moved.x)<.001);assert.ok(Math.abs(next.y+world.y*toZoom-moved.y)<.001);
 const stationary=anchoredBoardPan(pan,fromZoom,toZoom,initial);
 assert.ok(Math.abs(stationary.x+world.x*toZoom-initial.x)<.001);assert.ok(Math.abs(stationary.y+world.y*toZoom-initial.y)<.001);
 assert.deepEqual(anchoredBoardPan(pan,fromZoom,fromZoom,initial,moved),{x:110,y:-60});
});
