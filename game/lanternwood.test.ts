import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,createGame,getReachable,runBots} from './engine.ts';
import {GAME_MASTERS,HEROES,TALES} from './presets.ts';
import {LORE_EDITION} from './lore.ts';
import {LATER_PIECES,LATER_PIECES_EDITION,isRefuge,refugeEdges} from './set-pieces.ts';
import type {GameOptions,GameState,PlayerSpec} from './types.ts';

/* The Lantern Road's chapter II (the forest road) and chapter III (the lantern shrine), built from the approved
   World page boards, and the shrine's light in the Wolf's Lantern Hunt. */
const tale=TALES.find(t=>t.id==='lantern')!,hero=HEROES[0];
const player:PlayerSpec={id:'p1',name:hero.profile.name,heroClass:hero.profile.heroClass,color:hero.profile.color,bot:false};
const party=(n:number):PlayerSpec[]=>[player,...Array.from({length:n-1},(_,i)=>({...player,id:`p${i+2}`,name:`Friend ${i+2}`,bot:true}))];
const options=(seed='lanternwood'):GameOptions=>({rules:'simple',seed,narrator:'warm',biome:tale.story.biome,companions:0,duration:'standard',
 creation:{narrator:GAME_MASTERS[0].profile,story:tale.story,hero:hero.profile}});
const heroOf=(g:GameState)=>g.actors.find(a=>a.playerId===player.id)!;
const at=(g:GameState,x:number,y:number)=>g.tiles[y*g.width+x];

/** Clears chapters by the legal chest and gateway actions until the game reaches `scene`. */
function reach(game:GameState,scene:number){
 while(game.scene<scene){
  for(const a of game.actors.filter(a=>a.enemy)){a.hp=0;a.defeated=true;}
  const you=heroOf(game);game.activeActorId=you.id;
  const stand=(x:number,y:number)=>{const c=[[x-1,y],[x,y+1],[x,y-1],[x+1,y]].find(([cx,cy])=>['grass','path'].includes(at(game,cx,cy)?.kind));you.x=c![0];you.y=c![1];};
  stand(game.chest.x,game.chest.y);game=applyAction(game,player.id,{type:'interact'});
  const me=heroOf(game);game.activeActorId=me.id;
  const c=[[game.exit.x-1,game.exit.y],[game.exit.x,game.exit.y+1],[game.exit.x,game.exit.y-1]].find(([cx,cy])=>['grass','path'].includes(at(game,cx,cy)?.kind))!;me.x=c[0];me.y=c[1];
  game=applyAction(game,player.id,{type:'advance'});
 }
 return game;
}

/** Every open tile is connected, and every start, the chest's neighbour and the way on are reachable. */
function assertPlayable(game:GameState,label:string){
 const solo=structuredClone(game),me=solo.actors.find(a=>!a.enemy)!;solo.actors=[me];me.movement=1000;me.x=3;me.y=7;
 const open=new Set(game.tiles.filter(t=>t.kind==='grass'||t.kind==='path').map(t=>`${t.x},${t.y}`));
 const reached=new Set([...getReachable(solo,me).map(c=>`${c.x},${c.y}`),'3,7']);
 assert.equal(reached.size,open.size,`${label}: every open tile is connected`);
 for(const a of game.actors)assert.ok(reached.has(`${a.x},${a.y}`),`${label}: ${a.name} starts on open, reachable ground`);
 assert.ok([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>reached.has(`${game.chest.x+dx},${game.chest.y+dy}`)),`${label}: the chest can be reached`);
 assert.ok(reached.has(`${game.exit.x},${game.exit.y}`),`${label}: the way on can be reached`);
 return reached.size;
}

test('the forest road is laid out as approved: raised road, fence with a gap, two waymarks, low water, the way on',()=>{
 assert.ok(LORE_EDITION>=LATER_PIECES_EDITION);
 const game=reach(runBots(createGame([player],options())),1),piece=LATER_PIECES.lantern![1];
 assert.equal(game.sceneName,tale.story.locations[1]);
 assert.deepEqual(game.exit,piece.exit);assert.deepEqual({x:game.chest.x,y:game.chest.y},piece.chest);
 for(const p of piece.props)assert.equal(at(game,...p.at).decoration,p.prop,`${p.prop} at ${p.at}`);
 assert.equal(at(game,17,2).kind,'wall','the wolf watches from beyond the board: never a tile it stands on');
 assert.equal(at(game,9,5).decoration,'waymark-lit');assert.equal(at(game,16,5).decoration,'waymark-dark');
 assert.equal(at(game,12,5).kind,'grass','the fence gap is open');assert.equal(at(game,12,5).decoration,'trampled');
 for(let x=1;x<=18;x++)for(const y of [6,7,8])assert.equal(at(game,x,y).kind,'path',`road at ${x},${y}`);
 const hollows=game.tiles.filter(t=>t.decoration==='hollow');
 assert.equal(hollows.length,20);assert.ok(hollows.every(t=>t.kind==='water'),'low water blocks movement but not sight');
 assert.equal(assertPlayable(game,'forest road'),157);
});

test('the lantern shrine is laid out as approved: six lit tiles with the chest inside, four stones, the Wolf on its tile',()=>{
 for(const size of [1,2,4,7]){
  const game=reach(runBots(createGame(party(size),options(`shrine-${size}`))),2),piece=LATER_PIECES.lantern![2];
  const label=`shrine, party of ${size}`;
  assert.deepEqual(game.exit,piece.exit,label);assert.deepEqual({x:game.chest.x,y:game.chest.y},{x:16,y:2},label);
  const lit=game.tiles.filter(t=>t.decoration==='refuge');
  assert.deepEqual(lit.map(t=>`${t.x},${t.y}`).sort(),['15,2','15,3','16,2','16,3','17,2','17,3'],label);
  assert.ok(isRefuge(game,game.chest.x,game.chest.y),'the chest is inside the light');
  assert.equal(game.tiles.filter(t=>t.decoration==='standing-stone').length,4);
  assert.deepEqual([15,16,17].map(x=>at(game,x,1).decoration),['shrine','span','span']);
  // The light's edge: three tiles along the bottom, two up each side; the shrine closes the top.
  assert.equal(refugeEdges(game).length,7);
  const wolf=game.actors.find(a=>a.keeper);
  assert.equal(wolf?.keeper,'wolf',label);assert.deepEqual({x:wolf!.x,y:wolf!.y},{x:13,y:5},`${label}: the Wolf starts on its tile`);
  assert.equal(new Set(game.actors.map(a=>`${a.x},${a.y}`)).size,game.actors.length,`${label}: no two figures share a tile`);
  assert.equal(assertPlayable(game,label),174);
 }
});

test('games stamped before the authored chapters keep their generated forest road and shrine',()=>{
 let game=createGame([player],options());game.lore=3;
 game=reach(game,2);
 assert.ok(!game.tiles.some(t=>t.decoration==='refuge'||t.decoration==='shrine'));
 assert.deepEqual(game.exit,{x:18,y:7});
 assert.notDeepEqual((({x,y})=>({x,y}))(game.actors.find(a=>a.keeper)!),{x:13,y:5});
});

/** The shrine with only the hero and the Wolf, the Wolf about to act. */
function shrineDuel(heroAt:{x:number;y:number},wolfAt:{x:number;y:number}){
 const game=structuredClone(reach(runBots(createGame([player],options('duel'))),2));
 game.actors=game.actors.filter(a=>!a.enemy||a.keeper);
 const wolf=game.actors.find(a=>a.keeper)!,me=heroOf(game);
 Object.assign(wolf,wolfAt);Object.assign(me,heroAt);
 game.turnOrder=[wolf.id,me.id];game.activeActorId=wolf.id;wolf.actionUsed=false;wolf.movement=wolf.speed;
 return game;
}
const wolfActs=(game:GameState)=>{const w=game.actors.find(a=>a.keeper)!;game.activeActorId=w.id;w.actionUsed=false;w.movement=w.speed;return runBots(game);};

test('the shrine’s light: the hunt never enters it and never marks a hero standing in it',()=>{
 const sheltered=runBots(shrineDuel({x:16,y:3},{x:11,y:4}));
 assert.equal(sheltered.actors.find(a=>a.keeper)!.plan,undefined,'a hero in the light is not marked');
 const marked=runBots(shrineDuel({x:16,y:4},{x:11,y:4})),plan=marked.actors.find(a=>a.keeper)!.plan!;
 assert.equal(plan.move,'hunt');assert.equal(plan.targetId,heroOf(marked).id);
 assert.ok(!plan.tiles.some(c=>isRefuge(marked,c.x,c.y)),'no marked tile is lit');
 assert.deepEqual(plan.landing,{x:15,y:4});
});

test('a marked hero who steps into the light stops the pounce at its edge and leaves the Wolf exposed',()=>{
 let game=runBots(shrineDuel({x:16,y:4},{x:11,y:4}));
 Object.assign(heroOf(game),{x:16,y:3});
 game=wolfActs(game);
 const wolf=game.actors.find(a=>a.keeper)!;
 assert.equal(heroOf(game).hp,heroOf(game).maxHp,'the pounce does not land');
 assert.deepEqual({x:wolf.x,y:wolf.y},{x:15,y:4},'the Wolf halts on the dark side of the edge');
 assert.equal(isRefuge(game,wolf.x,wolf.y),false);
 assert.equal(wolf.exposed,true);
 assert.ok(game.events.some(e=>/reaches the shrine’s light.*skids to a halt at its edge/.test(e.text)));
 // Staying on the marked route still means being caught.
 let stay=runBots(shrineDuel({x:16,y:4},{x:11,y:4}));stay=wolfActs(stay);
 assert.ok(stay.events.some(e=>/pounces on/.test(e.text)));
});
