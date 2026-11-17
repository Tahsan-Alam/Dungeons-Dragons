import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,createGame,runBots} from './engine.ts';
import {GAME_MASTERS,HEROES,TALES} from './presets.ts';
import {LORE_EDITION} from './lore.ts';
import {BOSS_POOL,CUSTOM_BOSS_EDITION,KEEPER_EDITION,KEEPER_PROFILE,WIDER_ENEMIES,planBreath,type KeeperBoard} from './keepers.ts';
import {ENEMIES} from './engine.ts';
import {enemyArtKey} from '../app/ui/actor-art.ts';
import type {Actor,GameOptions,GameState} from './types.ts';
import type {StoryBlueprint} from './creation.ts';

const hero=HEROES[0];
const player={id:'p1',name:hero.profile.name,heroClass:hero.profile.heroClass,color:hero.profile.color,bot:false};
const optionsFor=(story:StoryBlueprint,duration:GameOptions['duration']='short'):GameOptions=>({rules:'simple',seed:'keeper-'+story.title,narrator:'warm',biome:story.biome,companions:0,duration,
 creation:{narrator:GAME_MASTERS[0].profile,story,hero:hero.profile}});
const custom:StoryBlueprint={title:'The Clockwork Orchard',synopsis:'Gears grow on the apple trees.',timeline:'Harvest',world:'Cogmere',locations:['The gear gate','The oil well','The spring tower'],biome:'woodland'};
const keeperOf=(g:GameState)=>g.actors.find(a=>a.keeper)!;
const heroOf=(g:GameState)=>g.actors.find(a=>!a.enemy)!;

/** A one-chapter tale reduced to an open field: the hero, the Keeper, nothing else; the Keeper is about to act. */
function arena(tale:number|StoryBlueprint,at:{x:number;y:number},keeperAt={x:14,y:7},seed?:string):GameState{
 const options=optionsFor(typeof tale==='number'?TALES[tale].story:tale);
 const game=structuredClone(createGame([player],seed?{...options,seed}:options));
 for(const t of game.tiles)if(t.x>0&&t.y>0&&t.x<game.width-1&&t.y<game.height-1){t.kind='grass';delete t.decoration;}
 game.actors=game.actors.filter(a=>!a.enemy||a.keeper);
 const keeper=keeperOf(game),you=heroOf(game);
 Object.assign(keeper,keeperAt);Object.assign(you,at);
 game.turnOrder=[keeper.id,you.id];return keeperActs(game);
}
function keeperActs(game:GameState):GameState{
 const keeper=keeperOf(game);game.activeActorId=keeper.id;keeper.actionUsed=false;keeper.movement=keeper.speed;
 for(const a of game.actors)a.guarding=false;
 return game;
}
const move=(game:GameState,to:{x:number;y:number})=>{Object.assign(heroOf(game),to);return game;};

test('each built-in tale ends with its own named Keeper; a custom tale draws a named boss from its pool',()=>{
 assert.ok(LORE_EDITION>=KEEPER_EDITION);
 const expected=['The Wolf at the Last Light','The Crown’s Dragon','The Tideglass Warden'];
 TALES.forEach((tale,i)=>{
  const game=createGame([player],optionsFor(tale.story)),keeper=keeperOf(game);
  assert.equal(keeper.name,expected[i]);assert.equal(keeper.keeper,(['wolf','dragon','warden'] as const)[i]);
  const ordinary=game.actors.find(a=>a.enemy&&!a.keeper)!;
  assert.equal(keeper.maxHp-ordinary.maxHp,16);assert.equal(keeper.ac-ordinary.ac,2);
  assert.equal(keeper.speed,KEEPER_PROFILE[keeper.keeper!].speed);
  assert.equal(game.actors.filter(a=>a.keeper).length,1);
 });
 const boss=keeperOf(createGame([player],optionsFor(custom)));
 assert.ok(BOSS_POOL.woodland.includes(boss.keeper!));assert.match(boss.name,/^The (Thornhound|Grey Wolf) of Cogmere$/);
 // Earlier chapters have no Keeper.
 assert.ok(!createGame([player],optionsFor(TALES[0].story,'standard')).actors.some(a=>a.keeper));
});

test('Lantern Hunt marks a route and pounces along it if the hero stays',()=>{
 let game=runBots(arena(0,{x:9,y:7}));
 const wolf=keeperOf(game),plan=wolf.plan!;
 assert.equal(plan.move,'hunt');assert.equal(plan.targetId,heroOf(game).id);
 assert.deepEqual({x:wolf.x,y:wolf.y},{x:14,y:7},'announcing does not move the wolf');
 assert.deepEqual(plan.landing,{x:10,y:7});assert.equal(heroOf(game).hp,heroOf(game).maxHp);
 const before=heroOf(game).hp;
 game=runBots(keeperActs(game));
 assert.deepEqual({x:keeperOf(game).x,y:keeperOf(game).y},{x:10,y:7});
 assert.ok(heroOf(game).hp<before,'the pounce lands');
 assert.equal(keeperOf(game).plan,undefined);assert.equal(keeperOf(game).keeperRest,true);
 assert.ok(game.events.some(e=>/pounces on/.test(e.text)));
});

test('a hero who leaves the hunted route escapes, and the wolf is left exposed',()=>{
 let game=runBots(arena(0,{x:9,y:7}));
 const route=keeperOf(game).plan!.route!;
 game=runBots(keeperActs(move(game,{x:9,y:11})));
 const wolf=keeperOf(game);
 assert.equal(heroOf(game).hp,heroOf(game).maxHp);
 assert.deepEqual({x:wolf.x,y:wolf.y},route.at(-1),'the wolf runs the stored route; it never retargets');
 assert.equal(wolf.exposed,true);
 // Exposed: −3 Armor Class against the party until the wolf's next turn.
 Object.assign(heroOf(game),{x:wolf.x-1,y:wolf.y,actionUsed:false});game.activeActorId=heroOf(game).id;
 const struck=applyAction(game,player.id,{type:'attack',targetId:wolf.id});
 assert.equal(struck.events.findLast(e=>e.attack)!.attack!.ac,wolf.ac-3);
 // The wolf's next turn clears the exposure and is an ordinary one.
 const after=runBots(applyAction(struck,player.id,{type:'end'}));
 assert.equal(keeperOf(after).exposed,undefined);assert.equal(keeperOf(after).plan,undefined);
});

test('Lanternfire Breath burns the marked lane; leaving it or guarding helps',()=>{
 let game=runBots(arena(1,{x:11,y:7}));
 const plan=keeperOf(game).plan!;
 assert.equal(plan.move,'breath');assert.ok(plan.tiles.some(t=>t.x===11&&t.y===7));
 const stay=runBots(keeperActs(structuredClone(game)));
 const burned=heroOf(stay).maxHp-heroOf(stay).hp;
 assert.ok(burned>=5&&burned<=15,`2d6 + 3, got ${burned}`);
 const away=runBots(keeperActs(move(structuredClone(game),{x:11,y:2})));
 assert.equal(heroOf(away).hp,heroOf(away).maxHp);
 const guarded=keeperActs(structuredClone(game));heroOf(guarded).guarding=true;
 const halved=runBots(guarded);
 assert.equal(heroOf(halved).maxHp-heroOf(halved).hp,Math.max(1,Math.floor(burned/2)));
 game=stay;
 assert.equal(keeperOf(game).keeperRest,true);
});

test('walls give cover from Lanternfire Breath',()=>{
 const open:KeeperBoard={inside:c=>c.x>=0&&c.y>=0&&c.x<20&&c.y<14,wall:()=>false,free:()=>true};
 const walled:KeeperBoard={...open,wall:c=>c.x===12&&c.y===7};
 const dragon={x:14,y:7,hp:30,maxHp:30} as Actor,heroes=[{x:11,y:7,hp:20} as Actor];
 assert.ok(planBreath(dragon,heroes,open,1)!.tiles.some(t=>t.x===11&&t.y===7));
 assert.equal(planBreath(dragon,heroes,walled,1),null,'no lane reaches the hero behind the wall');
});

test('Breaking Tide breaks its arcs in order and stops where the way is blocked',()=>{
 const game=runBots(arena(2,{x:11,y:7}));
 const plan=keeperOf(game).plan!;
 assert.equal(plan.move,'tide');assert.equal(plan.arcs!.length,2);assert.deepEqual(plan.landing,{x:12,y:7});
 const stay=runBots(keeperActs(structuredClone(game)));
 assert.deepEqual({x:keeperOf(stay).x,y:keeperOf(stay).y},{x:12,y:7});
 assert.ok(heroOf(stay).hp<heroOf(stay).maxHp);assert.ok(stay.events.some(e=>/second wave catches/.test(e.text)));
 const away=runBots(keeperActs(move(structuredClone(game),{x:11,y:3})));
 assert.equal(heroOf(away).hp,heroOf(away).maxHp);
 // A hero stepping into the Warden's path stops the tide after the first arc.
 const blocked=runBots(keeperActs(move(structuredClone(game),{x:12,y:7})));
 assert.deepEqual({x:keeperOf(blocked).x,y:keeperOf(blocked).y},{x:14,y:7});
});

test('a Keeper never stalls by guarding',()=>{
 for(const tale of [0,1,2]){
  const game=arena(tale,{x:2,y:2});keeperOf(game).keeperRest=true;
  const after=runBots(game),keeper=keeperOf(after);
  assert.equal(keeper.guarding,false,TALES[tale].id);assert.notDeepEqual({x:keeper.x,y:keeper.y},{x:14,y:7});
 }
});

test('a defeated Keeper speaks its own line; the Warden yields',()=>{
 const game=arena(2,{x:13,y:7});const warden=keeperOf(game);
 warden.hp=1;delete warden.plan;
 Object.assign(heroOf(game),{actionUsed:false});game.activeActorId=heroOf(game).id;
 let after=game;
 for(let i=0;i<5&&keeperOf(after).hp>0;i++){after=applyAction(after,player.id,{type:'attack',targetId:warden.id});heroOf(after).actionUsed=false;}
 assert.equal(keeperOf(after).defeated,true);
 assert.ok(after.events.some(e=>/lowers her glass blade and yields/.test(e.text)));
});

test('games stamped before the Keepers keep the untitled Keeper',()=>{
 let game=createGame([player],optionsFor(TALES[0].story,'standard'));
 game.lore=1;
 for(let chapter=0;chapter<2;chapter++){
  for(const a of game.actors.filter(a=>a.enemy)){a.hp=0;a.defeated=true;}
  const you=heroOf(game);game.activeActorId=you.id;you.x=game.chest.x-1;you.y=game.chest.y;
  game=applyAction(game,player.id,{type:'interact'});
  heroOf(game).x=game.exit.x-1;heroOf(game).y=game.exit.y;
  game=applyAction(game,player.id,{type:'advance'});
 }
 assert.equal(game.scene,2);
 const boss=game.actors.find(a=>a.name==='The Hollow Keeper')!;
 assert.ok(boss);assert.equal(boss.keeper,undefined);
 assert.equal(boss.maxHp-game.actors.find(a=>a.enemy&&a!==boss)!.maxHp,8);
});

test('Keeper fights are deterministic',()=>{
 const run=()=>JSON.stringify(runBots(createGame([{...player,bot:true}],optionsFor(TALES[0].story))));
 assert.equal(run(),run());
});

const party=[player,{...player,id:'p2',name:'Second',bot:true},{...player,id:'p3',name:'Third',bot:true},{...player,id:'p4',name:'Fourth',bot:true}];
const baseName=(a:Actor)=>a.name.replace(/\s+\d+$/,'');

/** For each boss in a landscape's pool, a seed whose custom tale draws it. */
function bossesBySeed(biome:StoryBlueprint['biome']){
 const seen=new Map<string,string>();
 for(let i=0;i<40&&seen.size<BOSS_POOL[biome].length;i++){
  const seed='pool-'+i,kind=keeperOf(createGame([player],{...optionsFor({...custom,biome}),seed})).keeper!;
  if(!seen.has(kind))seen.set(kind,seed);
 }
 return seen;
}

test('every landscape’s boss pool is reachable by seed, and each boss has its painting and a signature attack',()=>{
 assert.ok(LORE_EDITION>=CUSTOM_BOSS_EDITION);
 for(const biome of ['woodland','ruins','coast'] as const){
  assert.deepEqual([...bossesBySeed(biome).keys()].sort(),[...BOSS_POOL[biome]].sort(),biome);
  for(const kind of BOSS_POOL[biome]){
   const profile=KEEPER_PROFILE[kind];
   assert.ok(profile.move&&profile.moveName&&profile.announce&&profile.release,kind);
   const rest=enemyArtKey({name:'x',keeper:kind},biome),attack=enemyArtKey({name:'x',keeper:kind,plan:{move:profile.move!,tiles:[],round:1}},biome);
   assert.ok(rest&&attack&&rest!==attack,`${kind}: ${rest} / ${attack}`);
  }
 }
 const again=()=>keeperOf(createGame([player],optionsFor({...custom,biome:'ruins'}))).keeper;
 assert.equal(again(),again(),'the same seed always draws the same boss');
});

test('a pool boss takes the world’s name only when it is short enough',()=>{
 const long=keeperOf(createGame([player],optionsFor({...custom,world:'The Very Long and Winding Clockwork Realm'})));
 assert.match(long.name,/^The (Thornhound|Grey Wolf)$/);
});

test('the classic opening and victory name the custom tale’s boss',()=>{
 let game=createGame([player],{...optionsFor(custom,'short'),narrator:'dramatic'});
 const boss=keeperOf(game),opening=game.events.find(e=>e.kind==='story')!.text;
 assert.ok(!/Hollow Keeper/.test(opening),opening);assert.ok(opening.includes(boss.name.replace(/^The /,'the ')),opening);
 for(const a of game.actors.filter(a=>a.enemy)){a.hp=0;a.defeated=true;}
 heroOf(game).x=game.chest.x-1;heroOf(game).y=game.chest.y;game.activeActorId=heroOf(game).id;
 game=applyAction(game,player.id,{type:'interact'});
 heroOf(game).x=game.exit.x-1;heroOf(game).y=game.exit.y;
 game=applyAction(game,player.id,{type:'advance'});
 assert.equal(game.status,'victory');
 const ending=game.events.filter(e=>e.kind==='story').map(e=>e.text).join(' ');
 assert.ok(!/Hollow Keeper/.test(ending));assert.ok(ending.includes(boss.name),ending);
});

test('pool bosses use their attacks: the ridge giant’s rockfall and the glass eye’s gaze',()=>{
 const giantSeed=bossesBySeed('ruins').get('giant')!,eyeSeed=bossesBySeed('coast').get('eye')!;
 let game=runBots(arena({...custom,biome:'ruins'},{x:11,y:7},undefined,giantSeed));
 assert.equal(keeperOf(game).plan?.move,'tide');assert.ok(game.events.some(e=>/Rockfall/.test(e.text)));
 game=runBots(keeperActs(game));
 assert.ok(heroOf(game).hp<heroOf(game).maxHp);assert.ok(game.events.some(e=>/blow catches/.test(e.text)));
 game=runBots(arena({...custom,biome:'coast'},{x:11,y:7},undefined,eyeSeed));
 assert.equal(keeperOf(game).plan?.move,'breath');
 game=runBots(keeperActs(game));
 assert.ok(game.events.some(e=>/The glare catches/.test(e.text)));
 // Defeat uses the boss's own line.
 const eye=keeperOf(game);eye.hp=1;delete eye.plan;
 Object.assign(heroOf(game),{x:eye.x-1,y:eye.y,actionUsed:false});game.activeActorId=heroOf(game).id;
 for(let i=0;i<5&&keeperOf(game).hp>0;i++){game=applyAction(game,player.id,{type:'attack',targetId:eye.id});heroOf(game).actionUsed=false;}
 assert.ok(game.events.some(e=>/cracks and goes dark/.test(e.text)));
});

test('custom tale chapters draw from the wider enemy groups; built-in tales keep theirs',()=>{
 for(const biome of ['woodland','ruins','coast'] as const){
  const names=new Set<string>();
  for(let i=0;i<12;i++){
   const options={...optionsFor({...custom,biome},'standard'),seed:'wide-'+i},game=createGame(party,options);
   const boss=KEEPER_PROFILE[keeperOf(createGame([player],{...options,duration:'short'})).keeper!].creature.toLowerCase();
   for(const a of game.actors.filter(a=>a.enemy)){
    names.add(baseName(a));
    assert.notEqual(baseName(a).toLowerCase(),boss,'the boss creature is never an ordinary enemy');
    assert.ok(enemyArtKey(a,biome),`${a.name} has art`);
   }
  }
  for(const extra of WIDER_ENEMIES[biome])assert.ok(names.has(extra),`${biome}: ${extra} appears`);
 }
 for(const tale of TALES){
  const game=createGame(party,optionsFor(tale.story,'standard'));
  assert.deepEqual(game.actors.filter(a=>a.enemy).map(baseName),ENEMIES[tale.story.biome].slice(0,3),tale.id);
 }
});

test('custom tales stamped before the boss pool keep the Hollow Keeper and the four guardians',()=>{
 let game=createGame([player],optionsFor(custom,'standard'));game.lore=2;
 for(let chapter=0;chapter<2;chapter++){
  for(const a of game.actors.filter(a=>a.enemy)){a.hp=0;a.defeated=true;}
  const you=heroOf(game);game.activeActorId=you.id;you.x=game.chest.x-1;you.y=game.chest.y;
  game=applyAction(game,player.id,{type:'interact'});
  heroOf(game).x=game.exit.x-1;heroOf(game).y=game.exit.y;
  game=applyAction(game,player.id,{type:'advance'});
 }
 const boss=keeperOf(game);
 assert.equal(boss.keeper,'hollow');assert.equal(boss.name,'The Hollow Keeper');
 assert.ok(game.actors.filter(a=>a.enemy&&!a.keeper).every(a=>(ENEMIES.woodland as readonly string[]).includes(baseName(a))));
});
