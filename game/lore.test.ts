import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,createGame,runBots} from './engine.ts';
import {newReplay,appendReplay,reconstructReplay} from './replay.ts';
import {GAME_MASTERS,HEROES,TALES,SETTING} from './presets.ts';
import {LORE_EDITION,builtInTale,settingLine} from './lore.ts';
import {storyGoal} from './campaign.ts';
import type {GameOptions,GameState,Narrator} from './types.ts';
import type {StoryBlueprint} from './creation.ts';

const hero=HEROES[0];
const player={id:'p1',name:hero.profile.name,heroClass:hero.profile.heroClass,color:hero.profile.color,bot:false};
const optionsFor=(story:StoryBlueprint,duration:GameOptions['duration'],narrator:Narrator='warm'):GameOptions=>({rules:'simple',seed:'lore-'+story.title,narrator,biome:story.biome,companions:0,duration,
 creation:{narrator:GAME_MASTERS[0].profile,story,hero:hero.profile}});
const active=(g:GameState)=>g.actors.find(a=>a.id===g.activeActorId)!;
const stories=(g:GameState,from=0)=>g.events.slice(from).filter(e=>e.kind==='story').map(e=>e.text);

/** Clears each chapter by the legal chest and gateway actions; returns what each chapter showed. */
function playThrough(game:GameState){
 const chapters:{place:string;relicsBefore:number;opening:string}[]=[{place:game.sceneName,relicsBefore:game.relics,opening:stories(game)[0]}];
 for(let guard=0;guard<10&&game.status==='playing';guard++){
  for(const a of game.actors.filter(a=>a.enemy)){a.hp=0;a.defeated=true;}
  active(game).x=game.chest.x-1;active(game).y=game.chest.y;
  game=applyAction(game,player.id,{type:'interact'});
  active(game).x=game.exit.x-1;active(game).y=game.exit.y;
  const before=game.events.length;
  game=runBots(applyAction(game,player.id,{type:'advance'}));
  if(game.status==='playing')chapters.push({place:game.sceneName,relicsBefore:game.relics,opening:stories(game,before)[0]});
  else chapters.push({place:'',relicsBefore:game.relics,opening:stories(game,before).join(' ')});
 }
 return {game,chapters};
}

const CLUE:Record<string,RegExp>={lantern:/salt stall/,crown:/chisel/,salt:/clips bent back/};

test('every built-in tale plays its chapters in order at every length, one shard per chapter, ending at the last gateway',()=>{
 for(const tale of TALES)for(const duration of ['short','standard','long'] as const)for(const narrator of ['warm','wry','dramatic'] as const){
  const start=runBots(createGame([player],optionsFor(tale.story,duration,narrator)));
  assert.equal(start.lore,LORE_EDITION);
  const goal=storyGoal(start),{game,chapters}=playThrough(start),label=`${tale.id} ${duration} ${narrator}`;
  assert.equal(goal,duration==='short'?1:duration==='long'?5:3,label);
  assert.equal(game.status,'victory',label);assert.equal(game.relics,goal,label);
  const played=chapters.slice(0,-1);
  assert.deepEqual(played.map(c=>c.place),played.map((_,i)=>tale.story.locations[i%3]),label);
  assert.deepEqual(played.map(c=>c.relicsBefore),played.map((_,i)=>i),label);
  // The first chapter leads with the region's visible clue.
  assert.match(played[0].opening,CLUE[tale.id],label);
  for(const c of played)assert.ok(c.opening&&c.opening.length<=400,label);
  if(duration!=='standard')played.forEach((c,i)=>assert.ok(c.opening.includes(`${i} of ${goal} lantern shards recovered`),label));
  // Victory relights the tale's branch toward the Waylantern, following Aether.
  assert.match(chapters.at(-1)!.opening,/waymarks relight along the (west|north|harbour) road.*Aether’s light runs home to the Waylantern at Threeway Crossing/,label);
 }
});

test('a custom tale keeps its own world and the classic openings and ending',()=>{
 const story:StoryBlueprint={title:'The Clockwork Orchard',synopsis:'Gears grow on the apple trees.',timeline:'Harvest',world:'Cogmere',locations:['The gear gate','The oil well','The spring tower'],biome:'woodland'};
 assert.equal(builtInTale(story),undefined);
 // A custom tale that borrows a built-in title is still custom.
 assert.equal(builtInTale({...TALES[0].story,world:'Elsewhere'}),undefined);
 const {game,chapters}=playThrough(runBots(createGame([player],optionsFor(story,'standard'))));
 assert.equal(game.status,'victory');assert.equal(game.relics,3);
 assert.match(chapters[0].opening,/^A crooked little path leads into The gear gate\./);
 assert.match(chapters.at(-1)!.opening,/light the gateway of Cogmere/);
 assert.equal(settingLine(story),'Cogmere');
});

test('a save made before the Lantern Marches text keeps its openings, live and in replay',()=>{
 const fresh=runBots(createGame([player],optionsFor(TALES[0].story,'standard')));
 const old=structuredClone(fresh);delete old.lore;
 for(const a of old.actors.filter(a=>a.enemy)){a.hp=0;a.defeated=true;}
 active(old).x=old.chest.x-1;active(old).y=old.chest.y;
 let archive=newReplay(old);
 let game=applyAction(old,player.id,{type:'interact'});archive=appendReplay(archive,{type:'action',playerId:player.id,action:{type:'interact'}});
 // Walk to the gateway the legal way is not needed for this check: place the hero, then record the advance.
 const atGate=structuredClone(game);active(atGate).x=atGate.exit.x-1;active(atGate).y=atGate.exit.y;
 game=runBots(applyAction(atGate,player.id,{type:'advance'}));
 assert.equal(game.lore,undefined);
 assert.ok(stories(game).some(t=>t==='Your lantern glows a little brighter. Ahead, The forest road rustles with secrets—and a few rather unfriendly guardians.'));
 assert.ok(!stories(game).some(t=>/Aether/.test(t)));
 // Replays rebuild from the stored seed state, which has no edition, so they stay as played.
 const frames=reconstructReplay(archive);
 assert.equal(frames.at(-1)!.lore,undefined);
});

test('the built-in tales share the Lantern Marches as their setting and keep their region names',()=>{
 assert.equal(SETTING,'The Lantern Marches');
 assert.deepEqual(TALES.map(t=>t.story.world),['Lanternwood','The Hollow Reach','Saltreach Harbour']);
 assert.deepEqual(TALES.map(t=>t.region),['Lanternwood','The Hollow Reach','Saltreach Harbour']);
 assert.deepEqual(TALES.map(t=>settingLine(t.story)),['The Lantern Marches · Lanternwood','The Lantern Marches · The Hollow Reach','The Lantern Marches · Saltreach Harbour']);
 const facts=runBots(createGame([player],optionsFor(TALES[2].story,'standard'))).story!.campaign.facts.join(' ');
 assert.match(facts,/The Lantern Marches.*Waylantern.*Aether/);
});

test('chapter I of each built-in tale is its authored landmark scene, legal and connected; later chapters follow their own layouts',async()=>{
 const {SET_PIECES,isSetPieceProp}=await import('./set-pieces.ts');
 const {getReachable}=await import('./engine.ts');
 for(const tale of TALES){
  const game=runBots(createGame([player],optionsFor(tale.story,'standard')));const piece=SET_PIECES[tale.id];
  assert.deepEqual(game.exit,piece.exit,tale.id);assert.deepEqual({x:game.chest.x,y:game.chest.y},piece.chest,tale.id);
  for(const p of piece.props){const t=game.tiles[p.at[1]*game.width+p.at[0]];assert.equal(t.kind,'wall');assert.equal(t.decoration,p.prop,`${tale.id} ${p.prop}`);}
  // Every open tile is reachable, and every spawn, the chest and the exit stand on open ground.
  const solo=structuredClone(game);solo.actors=[solo.actors.find(a=>!a.enemy)!];solo.actors[0].movement=1000;solo.status='playing';
  const open=game.tiles.filter(t=>t.kind==='grass'||t.kind==='path');
  assert.equal(getReachable(solo,solo.actors[0]).length+1,open.length,tale.id);
  for(const at of [...game.actors,game.chest,game.exit])assert.ok(open.some(t=>t.x===at.x&&t.y===at.y),`${tale.id} ${JSON.stringify(at)}`);
  // The next chapter is generated as before.
  const {chapters}=playThrough(structuredClone(game));assert.equal(chapters.length,4);
  const later=structuredClone(game);for(const a of later.actors.filter(a=>a.enemy)){a.hp=0;a.defeated=true;}
  active(later).x=later.chest.x-1;active(later).y=later.chest.y;let next=applyAction(later,player.id,{type:'interact'});
  active(next).x=next.exit.x-1;active(next).y=next.exit.y;if(next.tiles[next.exit.y*next.width+next.exit.x-1].kind==='wall'){active(next).x=next.exit.x;active(next).y=next.exit.y+1;}
  next=runBots(applyAction(next,player.id,{type:'advance'}));
  // Every built-in tale's chapter II is authored too (game/lanternwood.test.ts, game/reach-saltreach.test.ts).
  assert.equal(next.scene,1);assert.ok(next.tiles.some(t=>isSetPieceProp(t.decoration)),tale.id);
 }
 // A custom tale keeps its generated map.
 const custom:StoryBlueprint={title:'The Clockwork Orchard',synopsis:'Gears grow on the trees.',timeline:'Harvest',world:'Cogmere',locations:['The gear gate','The oil well','The spring tower'],biome:'woodland'};
 const generated=createGame([player],optionsFor(custom,'standard'));assert.ok(!generated.tiles.some(t=>isSetPieceProp(t.decoration)));assert.deepEqual(generated.exit,{x:18,y:7});
});
