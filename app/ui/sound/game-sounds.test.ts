import assert from 'node:assert/strict';
import test from 'node:test';
import {existsSync} from 'node:fs';
import {applyAction,createGame,getReachable,getValidTargets,runBots} from '../../../game/engine.ts';
import {ENEMIES,LONG_CREATURE} from '../../../game/engine.ts';
import {KEEPER_PROFILE,WIDER_ENEMIES} from '../../../game/keepers.ts';
import {ambienceForPlay,musicForPlay,soundsForChange,voiceOf} from './game-sounds.ts';
import {CUES,MUSIC_ONCE,ambienceUrl,cueUrl,musicUrl} from './catalog.ts';
import type {Actor,GameOptions,GameState,KeeperKind,PlayerSpec} from '../../../game/types';
import type {AmbienceName,CueName,MusicName} from './catalog';

const options:GameOptions={rules:'simple',seed:'sound-check',narrator:'warm',biome:'woodland',companions:0};
const player:PlayerSpec={id:'p1',name:'Clover',heroClass:'knight',color:'#ef997c',bot:false};
const mine=(a:Actor)=>!a.enemy&&a.playerId==='p1';
const cues=(prev:GameState,next:GameState)=>soundsForChange(prev,next,{tumble:.8,mine}).map(c=>c.cue);
const hero=(g:GameState)=>g.actors.find(a=>!a.enemy)!;
const pub=new URL('../../../public',import.meta.url);

test('every cue, theme and bed the game can ask for exists on disk',()=>{
 for(const [name,cue] of Object.entries(CUES))for(let v=1;v<=cue.variations;v++)assert.ok(existsSync(new URL(`.${cueUrl(name as CueName,v)}`,pub+'/')),`${name} ${v}`);
 const music:MusicName[]=['title','camp','lanternwood-day','lanternwood-dusk','reach-day','reach-dusk','saltreach-day','saltreach-dusk','peril','keeper','road','victory','defeat','replay'];
 for(const name of music)assert.ok(existsSync(new URL(`.${musicUrl(name)}`,pub+'/')),name);
 for(const name of ['birds','wind','wind-high','crickets','waves','cave','fire'] as AmbienceName[])assert.ok(existsSync(new URL(`.${ambienceUrl(name)}`,pub+'/')),name);
 assert.ok(MUSIC_ONCE.has('victory')&&!MUSIC_ONCE.has('keeper'));
});

test('music follows the region and the hour, a living Keeper, a fallen hero and the ending',()=>{
 const game=runBots(createGame([player],options));
 assert.equal(musicForPlay(game,false),'lanternwood-day');
 assert.equal(musicForPlay(game,true),'lanternwood-dusk');
 assert.equal(musicForPlay({...game,options:{...game.options,biome:'coast'}},true),'saltreach-dusk');
 const down=structuredClone(game);hero(down).hp=0;assert.equal(musicForPlay(down,false),'peril');
 const keeper=structuredClone(game);keeper.actors.find(a=>a.enemy)!.keeper='wolf';assert.equal(musicForPlay(keeper,false),'keeper');
 assert.equal(musicForPlay({...game,status:'victory'},true),'victory');
 assert.equal(musicForPlay({...game,status:'defeat'},false),'defeat');
});

test('beds: birds by day and crickets after dusk in Lanternwood, gulls only over Saltreach by day, vaults are indoors',()=>{
 const game=runBots(createGame([player],options));
 assert.ok(ambienceForPlay(game,false).beds.some(b=>b.name==='birds'));
 assert.ok(ambienceForPlay(game,true).beds.some(b=>b.name==='crickets'));
 const coast={...game,options:{...game.options,biome:'coast' as const}};
 assert.equal(ambienceForPlay(coast,false).gulls,true);assert.equal(ambienceForPlay(coast,true).gulls,false);
 assert.deepEqual(ambienceForPlay({...coast,sceneName:'The harbour vaults'},false).beds.map(b=>b.name),['cave','waves']);
});

test('every creature and Keeper has a voice of its own family',()=>{
 for(const biome of ['woodland','ruins','coast'] as const)for(const name of [...ENEMIES[biome],LONG_CREATURE[biome],...WIDER_ENEMIES[biome]])assert.notEqual(voiceOf({name}),'v-monster',name);
 for(const keeper of Object.keys(KEEPER_PROFILE) as KeeperKind[])assert.ok(voiceOf({name:'x',keeper}).startsWith('v-'));
 assert.equal(voiceOf({name:'Bramble imp'}),'v-imp');assert.equal(voiceOf({name:'Paper golem'}),'v-stone');assert.equal(voiceOf({name:'Salt wisp'}),'v-wisp');
});

test('opening a save is silent; moving sounds steps on the ground walked',()=>{
 const game=runBots(createGame([player],options));
 assert.deepEqual(soundsForChange(undefined,game,{tumble:.8,mine}),[]);
 const me=hero(game),to=getReachable(game,me).find(c=>Math.abs(c.x-me.x)+Math.abs(c.y-me.y)>=2)!;
 const moved=applyAction(game,'p1',{type:'move',x:to.x,y:to.y});
 const steps=soundsForChange(game,moved,{tumble:.8,mine});
 assert.ok(steps.length>=2&&steps.every(c=>c.cue.startsWith('step-')));
 assert.ok(steps.every((c,i)=>i===0||c.at>steps[i-1].at),'steps fall one after another');
});

test('an attack rolls the dice, then the blow lands when the die stops',()=>{
 let game=runBots(createGame([player],options));
 const me=hero(game);
 // Put the first foe beside the hero so a blow is legal.
 const foe=game.actors.find(a=>a.enemy)!;game=structuredClone(game);const f=game.actors.find(a=>a.id===foe.id)!;const h=hero(game);
 const spot=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:h.x+dx,y:h.y+dy})).find(c=>game.tiles.find(t=>t.x===c.x&&t.y===c.y)?.kind!=='wall'&&!game.actors.some(a=>a.x===c.x&&a.y===c.y))!;
 f.x=spot.x;f.y=spot.y;
 assert.ok(getValidTargets(game,hero(game)).some(a=>a.id===foe.id),'foe in reach');
 const after=applyAction(game,'p1',{type:'attack',targetId:foe.id});
 const list=soundsForChange(game,after,{tumble:.8,mine});
 assert.equal(list[0].cue,'dice-throw');assert.equal(list[0].at,0);
 const blow=list.find(c=>c.cue==='swing');assert.ok(blow&&blow.at>0&&blow.at<.8,'the knight swings as the die settles');
 const event=after.events.at(-1)!;
 if(event.attack?.hit)assert.ok(list.some(c=>(c.cue==='hit'||c.cue==='hit-heavy')&&Math.abs(c.at-.8)<.01));
 void me;
});

test('a potion, a guard, the shard and the gateway each have their sound; the turn coming back chimes',()=>{
 const game=runBots(createGame([player],options));
 const hurt=structuredClone(game);hero(hurt).hp=hero(hurt).maxHp-8;
 assert.deepEqual(cues(hurt,applyAction(hurt,'p1',{type:'potion'})),['uncork','drink']);
 assert.deepEqual(cues(game,applyAction(game,'p1',{type:'guard'})),['guard']);
 const shard=structuredClone(game);shard.events.push({id:++shard.eventSequence,kind:'story',text:'Clover lifts a lantern shard from the chest. 1 of 3 recovered!',actorId:hero(shard).id});
 assert.deepEqual(cues(game,shard),['chest-unlock','chest-open','shard','shard-bell']);
 assert.deepEqual(cues(game,{...game,scene:game.scene+1}),['gateway']);
 const ended=runBots(applyAction(game,'p1',{type:'end'}));
 if(ended.activeActorId===hero(ended).id)assert.ok(cues(game,ended).includes('turn-yours')||cues(applyAction(game,'p1',{type:'end'}),ended).includes('turn-yours'));
});

test('a Keeper warns as it marks its attack and roars as it falls',()=>{
 const game=runBots(createGame([player],options));
 const before=structuredClone(game),keeper=before.actors.find(a=>a.enemy)!;keeper.keeper='dragon';
 const warned=structuredClone(before);warned.actors.find(a=>a.id===keeper.id)!.plan={move:'breath',tiles:[],round:1};
 assert.ok(cues(before,warned).includes('keeper-breath'));
 const released=structuredClone(warned);delete released.actors.find(a=>a.id===keeper.id)!.plan;
 assert.equal(cues(warned,released)[0],'release-fire');
 const fallen=structuredClone(before);const k=fallen.actors.find(a=>a.id===keeper.id)!;k.hp=0;k.defeated=true;
 fallen.events.push({id:++fallen.eventSequence,kind:'action',text:'The dragon folds its wings beside the crown and lets the party pass.',actorId:k.id});
 assert.ok(cues(before,fallen).includes('keeper-fall'));
});
