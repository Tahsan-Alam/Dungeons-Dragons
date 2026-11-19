import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,createGame,getReachable,getValidTargets,runBots} from './engine.ts';
import {GAME_MASTERS,HEROES,TALES,type TaleId} from './presets.ts';
import {LORE_EDITION} from './lore.ts';
import {LATER_PIECES,LATER_PIECES_SINCE} from './set-pieces.ts';
import type {Actor,GameOptions,GameState,PlayerSpec} from './types.ts';

/* Chapters II and III of the Hollow Reach (the ridge road, the hollow keep) and of Saltreach Harbour (glassmakers'
   row, the harbour vaults), built from the approved World page boards. The open-tile counts are the ones the boards
   were checked at; the encounter positions are the ones the boards' frames draw. */
const hero=HEROES[0],mira=HEROES.find(h=>h.id==='mira')!;
const player:PlayerSpec={id:'p1',name:hero.profile.name,heroClass:hero.profile.heroClass,color:hero.profile.color,bot:false};
const party=(n:number):PlayerSpec[]=>[player,...Array.from({length:n-1},(_,i)=>({...player,id:`p${i+2}`,name:`Friend ${i+2}`,bot:true}))];
const options=(id:TaleId,seed:string=id):GameOptions=>{const tale=TALES.find(t=>t.id===id)!;return {rules:'simple',seed,narrator:'warm',biome:tale.story.biome,companions:0,duration:'standard',
 creation:{narrator:GAME_MASTERS[0].profile,story:tale.story,hero:hero.profile}}};
const heroOf=(g:GameState)=>g.actors.find(a=>a.playerId===player.id)!;
const at=(g:GameState,x:number,y:number)=>g.tiles[y*g.width+x];
const open=(g:GameState,x:number,y:number)=>['grass','path'].includes(at(g,x,y)?.kind);

/** Clears chapters by the legal chest and gateway actions until the game reaches `scene`. */
function reach(game:GameState,scene:number){
 while(game.scene<scene){
  for(const a of game.actors.filter(a=>a.enemy)){a.hp=0;a.defeated=true;}
  const you=heroOf(game);game.activeActorId=you.id;
  const c=[[game.chest.x-1,game.chest.y],[game.chest.x,game.chest.y+1],[game.chest.x,game.chest.y-1],[game.chest.x+1,game.chest.y]].find(([x,y])=>open(game,x,y))!;you.x=c[0];you.y=c[1];
  game=applyAction(game,player.id,{type:'interact'});
  const me=heroOf(game);game.activeActorId=me.id;
  const e=[[game.exit.x-1,game.exit.y],[game.exit.x,game.exit.y+1],[game.exit.x,game.exit.y-1]].find(([x,y])=>open(game,x,y))!;me.x=e[0];me.y=e[1];
  game=applyAction(game,player.id,{type:'advance'});
 }
 return game;
}
function assertPlayable(game:GameState,label:string){
 const solo=structuredClone(game),me=solo.actors.find(a=>!a.enemy)!;solo.actors=[me];me.movement=1000;me.x=3;me.y=7;
 const all=new Set(game.tiles.filter(t=>t.kind==='grass'||t.kind==='path').map(t=>`${t.x},${t.y}`));
 const reached=new Set([...getReachable(solo,me).map(c=>`${c.x},${c.y}`),'3,7']);
 assert.equal(reached.size,all.size,`${label}: every open tile is connected`);
 for(const a of game.actors)assert.ok(reached.has(`${a.x},${a.y}`),`${label}: ${a.name} starts on open, reachable ground`);
 assert.ok([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>reached.has(`${game.chest.x+dx},${game.chest.y+dy}`)),`${label}: the chest can be reached`);
 assert.ok(reached.has(`${game.exit.x},${game.exit.y}`),`${label}: the way on can be reached`);
 return reached.size;
}
function assertLaidOut(game:GameState,id:TaleId,scene:number){
 const piece=LATER_PIECES[id]![scene];
 assert.equal(game.sceneName,TALES.find(t=>t.id===id)!.story.locations[scene]);
 assert.deepEqual(game.exit,piece.exit);assert.deepEqual({x:game.chest.x,y:game.chest.y},piece.chest);
 for(const p of piece.props)assert.equal(at(game,...p.at).decoration,p.prop,`${p.prop} at ${p.at}`);
}

test('the ridge road: the drop behind a parapet with two gaps, the retaining wall, cart ruts to the way on',()=>{
 assert.ok(LORE_EDITION>=LATER_PIECES_SINCE.crown);
 const game=reach(runBots(createGame([player],options('crown'))),1);
 assertLaidOut(game,'crown',1);
 for(const x of [8,10])assert.equal(at(game,x,5).kind,'water','a gap in the parapet looks down into the drop');
 const drop=game.tiles.filter(t=>t.decoration==='drop');
 assert.equal(drop.length,52);assert.ok(drop.every(t=>t.kind==='water'),'the drop blocks movement but not sight');
 for(let x=1;x<=18;x++)assert.equal(at(game,x,7).decoration,'rut',`cart ruts at ${x},7`);
 assert.equal(assertPlayable(game,'ridge road'),115);
});

test('the hollow keep: four pillars frame the aisle, the treasury and the crown behind the dragon on its tile',()=>{
 for(const size of [1,2,4,7]){
  const game=reach(runBots(createGame(party(size),options('crown',`keep-${size}`))),2),label=`keep, party of ${size}`;
  assertLaidOut(game,'crown',2);
  assert.deepEqual([13,14,15].map(x=>at(game,x,1).decoration),['treasury','span','span']);
  const dragon=game.actors.find(a=>a.keeper);
  assert.equal(dragon?.keeper,'dragon',label);assert.deepEqual({x:dragon!.x,y:dragon!.y},{x:14,y:8},`${label}: the dragon starts on its tile`);
  assert.equal(new Set(game.actors.map(a=>`${a.x},${a.y}`)).size,game.actors.length,`${label}: no two figures share a tile`);
  assert.equal(assertPlayable(game,label),165);
 }
});

test('glassmakers’ row: six workshops, three with their own fronts, the mark chalked toward the stairs down',()=>{
 assert.ok(LORE_EDITION>=LATER_PIECES_SINCE.salt);
 const game=reach(runBots(createGame([player],options('salt'))),1);
 assertLaidOut(game,'salt',1);
 assert.deepEqual([1,4,7,10,13,16].map(x=>at(game,x,2).decoration),['workshop','workshop-wide','workshop','workshop-narrow','workshop-counter','workshop']);
 assert.deepEqual(keys(game.tiles.filter(t=>t.decoration==='tally')),keys([{x:8,y:7},{x:11,y:7},{x:14,y:8},{x:17,y:7}]));
 assert.ok(game.tiles.filter(t=>t.y>=11&&t.kind==='water').length>=30,'the harbour blocks movement along the front');
 assert.equal(assertPlayable(game,'glassmakers’ row'),141);
});

test('the harbour vaults: piers and side exits, the barred door, the Warden on her tile for any party',()=>{
 for(const size of [1,2,4,7]){
  const game=reach(runBots(createGame(party(size),options('salt',`vault-${size}`))),2),label=`vaults, party of ${size}`;
  assertLaidOut(game,'salt',2);
  for(const x of [7,9,11,13])assert.ok(open(game,x,5)&&open(game,x,9),`${label}: side exits beside the piers at ${x}`);
  const warden=game.actors.find(a=>a.keeper);
  assert.equal(warden?.keeper,'warden',label);assert.deepEqual({x:warden!.x,y:warden!.y},{x:13,y:7},`${label}: the Warden starts on her tile`);
  assert.equal(new Set(game.actors.map(a=>`${a.x},${a.y}`)).size,game.actors.length,`${label}: no two figures share a tile`);
  assert.equal(assertPlayable(game,label),165);
 }
});

test('games stamped before these chapters keep their generated maps',()=>{
 for(const id of ['crown','salt'] as TaleId[]){
  let game=createGame([player],options(id));game.lore=4;
  game=reach(game,2);
  assert.ok(!game.tiles.some(t=>t.decoration==='treasury'||t.decoration==='vault-door'),id);
 }
});

/** A chapter III board with only the Keeper and the given heroes, the Keeper about to act. */
function duel(id:TaleId,heroes:Record<'corin'|'mira',[number,number]>){
 const two:PlayerSpec[]=[player,{id:'p2',name:mira.profile.name,heroClass:mira.profile.heroClass,color:mira.profile.color,bot:true}];
 const game=structuredClone(reach(runBots(createGame(two,options(id,`${id}-duel`))),2));
 game.actors=game.actors.filter(a=>!a.enemy||a.keeper);
 const keeper=game.actors.find(a=>a.keeper)!,[corin,ash]=game.actors.filter(a=>!a.enemy) as [Actor,Actor];
 Object.assign(corin,{x:heroes.corin[0],y:heroes.corin[1]});Object.assign(ash,{x:heroes.mira[0],y:heroes.mira[1]});
 game.turnOrder=[keeper.id,corin.id,ash.id];game.activeActorId=keeper.id;keeper.actionUsed=false;keeper.movement=keeper.speed;
 return {game,keeper,corin,mira:ash};
}
const keys=(cells:readonly {x:number;y:number}[])=>cells.map(c=>`${c.x},${c.y}`).sort();

test('the keep encounter as drawn: the lane stops at the pillars, and both safe answers are in reach',()=>{
 const d=duel('crown',{corin:[10,8],mira:[9,6]}),game=runBots(d.game),plan=game.actors.find(a=>a.keeper)!.plan!;
 assert.equal(plan.move,'breath');
 assert.deepEqual(keys(plan.tiles),keys([13,12,11,10,9,8].map(x=>({x,y:8})).concat([{x:13,y:7},{x:12,y:7},{x:13,y:9},{x:12,y:9}])));
 const corin=game.actors.find(a=>a.id===d.corin.id)!;game.activeActorId=corin.id;corin.movement=corin.speed;
 const reach=keys(getReachable(game,corin));
 for(const safe of [{x:10,y:6},{x:10,y:9}]){assert.ok(reach.includes(`${safe.x},${safe.y}`));assert.ok(!keys(plan.tiles).includes(`${safe.x},${safe.y}`));}
 assert.equal(at(game,11,9).kind,'wall','the pillar stands between the dragon and the tile behind it');
});

test('the vault encounter as drawn: two arcs in order, a third at half health, the side exit and the counter',()=>{
 const full=runBots(duel('salt',{corin:[8,6],mira:[10,7]}).game),plan=full.actors.find(a=>a.keeper)!.plan!;
 assert.equal(plan.move,'tide');
 assert.deepEqual(plan.arcs!.map(keys),[keys([{x:12,y:6},{x:12,y:7},{x:12,y:8}]),keys([{x:10,y:6},{x:10,y:7},{x:10,y:8}])]);
 assert.deepEqual(plan.landing,{x:11,y:7});
 const hurt=duel('salt',{corin:[7,6],mira:[8,7]});hurt.keeper.hp=Math.floor(hurt.keeper.maxHp/2);
 const plan3=runBots(hurt.game).actors.find(a=>a.keeper)!.plan!;
 assert.equal(plan3.arcs!.length,3);assert.deepEqual(plan3.landing,{x:9,y:7});
 // Mira steps out by the side exit, Corin to the tile beside the landing; the tide breaks on empty ground.
 const game=structuredClone(full),warden=game.actors.find(a=>a.keeper)!,heroes=game.actors.filter(a=>!a.enemy);
 Object.assign(heroes.find(h=>h.x===10)!,{x:9,y:5});Object.assign(heroes.find(h=>h.x===8)!,{x:11,y:8});
 const hp=heroes.map(h=>h.hp);
 game.turnOrder=[warden.id,...heroes.map(h=>h.id)];game.activeActorId=warden.id;warden.actionUsed=false;warden.movement=warden.speed;
 const after=runBots(game),w=after.actors.find(a=>a.keeper)!;
 assert.deepEqual({x:w.x,y:w.y},{x:11,y:7});
 assert.deepEqual(after.actors.filter(a=>!a.enemy).map(h=>h.hp),hp,'nobody was caught');
 const corin=after.actors.find(a=>!a.enemy&&a.x===11&&a.y===8)!;corin.actionUsed=false;
 assert.ok(getValidTargets(after,corin).some(a=>a.keeper),'Corin can strike back beside the landing');
});

test('no chapter here leaves a sealed pocket for the engine to fill: every tile is as authored',()=>{
 for(const [id,scene] of [['crown',1],['crown',2],['salt',1],['salt',2]] as [TaleId,number][]){
  const game=reach(runBots(createGame([player],options(id,`pocket-${id}`))),scene);
  const stray=game.tiles.filter(t=>t.x>0&&t.x<19&&t.y>0&&t.y<13&&(t.decoration==='rock'||t.decoration==='ruin'||t.decoration==='tree'));
  assert.deepEqual(stray.map(t=>`${t.x},${t.y}`),[],`${id} ${scene}`);
 }
});
