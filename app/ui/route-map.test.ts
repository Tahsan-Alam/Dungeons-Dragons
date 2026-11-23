import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,createGame,runBots} from '../../game/engine.ts';
import {GAME_MASTERS,HEROES,TALES} from '../../game/presets.ts';
import type {GameOptions,GameState} from '../../game/types.ts';
import type {StoryBlueprint} from '../../game/creation.ts';
import {ROUTES,describeRoute,fitView,routeHeadline,routeView} from './route-map.ts';
import {ROADS} from './route-map-data.ts';

const hero=HEROES[0];
const player={id:'p1',name:hero.profile.name,heroClass:hero.profile.heroClass,color:hero.profile.color,bot:false};
const start=(story:StoryBlueprint,duration:GameOptions['duration']='standard')=>runBots(createGame([player],{rules:'simple',seed:'route-'+story.title,narrator:'warm',biome:story.biome,companions:0,duration,creation:{narrator:GAME_MASTERS[0].profile,story,hero:hero.profile}}));
const active=(g:GameState)=>g.actors.find(a=>a.id===g.activeActorId)!;
function clearChapter(game:GameState){
 for(const a of game.actors.filter(a=>a.enemy)){a.hp=0;a.defeated=true;}
 active(game).x=game.chest.x-1;active(game).y=game.chest.y;game=applyAction(game,player.id,{type:'interact'});
 active(game).x=game.exit.x-1;active(game).y=game.exit.y;return runBots(applyAction(game,player.id,{type:'advance'}));
}

test('the map follows a standard run: nothing lit, then each leg relights once, then the road home at victory',()=>{
 const tale=TALES[0],places=tale.story.locations;let game=start(tale.story);
 let v=routeView(game)!;
 assert.deepEqual({cleared:v.cleared,here:v.here,lit:v.lit,fresh:v.fresh,recovered:v.recovered},{cleared:0,here:0,lit:[],fresh:[],recovered:0});
 assert.equal(routeHeadline(v,places),'The west road is still dark');
 assert.equal(describeRoute(v,places),'The west road is still dark. Next: Starfall Market, chapter 1 of 3.');
 game=clearChapter(game);v=routeView(game)!;
 assert.deepEqual({cleared:v.cleared,here:v.here,lit:v.lit,fresh:v.fresh,recovered:v.recovered},{cleared:1,here:1,lit:['w1'],fresh:['w1'],recovered:1});
 assert.equal(routeHeadline(v,places),'The west road is lit to the forest road');
 assert.equal(describeRoute(v,places),'The west road is lit from Starfall Market to the forest road. Next: the forest road, chapter 2 of 3.');
 game=clearChapter(game);v=routeView(game)!;
 assert.deepEqual({here:v.here,lit:v.lit,fresh:v.fresh},{here:2,lit:['w1','shrine'],fresh:['shrine']});
 game=clearChapter(game);v=routeView(game)!;
 assert.equal(game.status,'victory');
 assert.deepEqual({here:v.here,lit:v.lit,fresh:v.fresh,victory:v.victory,recovered:v.recovered},{here:null,lit:['w1','shrine','w2'],fresh:['w2'],victory:true,recovered:3});
 assert.equal(routeHeadline(v,places),'The west road is lit to the Waylantern');
});

test('short and long runs keep to the tale’s three stops without relighting a leg twice',()=>{
 const tale=TALES[2];
 let short=start(tale.story,'short');assert.equal(routeView(short)!.total,1);
 short=clearChapter(short);const sv=routeView(short)!;
 assert.equal(sv.victory,true);assert.deepEqual(sv.fresh,['q1','q2','h1','h2','cw']);
 let long=start(tale.story,'long');const seen:{here:number|null;fresh:string[]}[]=[];
 for(let i=0;i<5;i++){const v=routeView(long)!;seen.push({here:v.here,fresh:v.fresh});long=clearChapter(long);}
 assert.deepEqual(seen.map(s=>s.here),[0,1,1,1,2]);
 assert.deepEqual(seen.map(s=>s.fresh.length),[0,1,0,0,1]);
 assert.equal(routeHeadline(routeView(start(tale.story,'long'))!,tale.story.locations),'The harbour road is still dark');
 // An older long save (before lore edition 6) circles back to the first two stops.
 let old=start(tale.story,'long');old.lore=5;const olds:(number|null)[]=[];
 for(let i=0;i<5;i++){olds.push(routeView(old)!.here);old=clearChapter(old);}
 assert.deepEqual(olds,[0,1,2,0,1]);
});

test('a long built-in tale walks its two middle places on the road to the third stop, then relights it',()=>{
 const tale=TALES[0],places=tale.story.locations;let game=start(tale.story,'long');const seen:{here:number|null;fresh:string[];place?:string}[]=[];
 for(let i=0;i<5;i++){const v=routeView(game)!;seen.push({here:v.here,fresh:v.fresh,place:v.place});if(i===2){
   assert.equal(routeHeadline(v,places),'On along the west road to Bramble Crossing');
   assert.equal(describeRoute(v,places),'The west road is lit from Starfall Market to the forest road. Next: Bramble Crossing, chapter 3 of 5.');}
  game=clearChapter(game);}
 assert.deepEqual(seen.map(s=>s.here),[0,1,1,1,2]);
 assert.deepEqual(seen.map(s=>s.fresh.length),[0,1,0,0,1]);
 assert.deepEqual(seen.map(s=>s.place),['Starfall Market','The forest road','Bramble Crossing','The Moonwell','The lantern shrine']);
 assert.equal(game.status,'victory');assert.deepEqual(routeView(game)!.fresh,['w2']);
});

test('custom tales get no map',()=>{
 const story:StoryBlueprint={title:'The Clockwork Orchard',synopsis:'Gears grow on the trees.',timeline:'Harvest',world:'Cogmere',locations:['The gear gate','The oil well','The spring tower'],biome:'woodland'};
 assert.equal(routeView(start(story)),null);
});

test('every route starts at its first stop, and the view keeps the focus box at any panel shape',()=>{
 for(const route of Object.values(ROUTES)){
  assert.deepEqual(route.stops[0],ROADS[route.legs[0]][0]);assert.deepEqual(route.stops[1],ROADS[route.legs[0]][3]);assert.deepEqual(route.stops[2],ROADS[route.legs[1]][3]);
  for(const aspect of [16/9,5/4,1,.6]){
   const v=fitView(route.focus,aspect);
   assert.ok(v.x<=route.focus.x+1e-9&&v.y<=route.focus.y+1e-9&&v.x+v.w>=route.focus.x+route.focus.w-1e-9&&v.y+v.h>=route.focus.y+route.focus.h-1e-9);
   assert.ok(Math.abs(v.w/v.h-aspect)<1e-9);
  }
 }
});
