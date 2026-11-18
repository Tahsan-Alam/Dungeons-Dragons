import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {ENEMIES} from '../../game/engine.ts';
import {HEROES} from '../../game/presets.ts';
import {ENEMY_ART} from './enemy-art-data.ts';
import {enemyArtKey,heroArtFor,heroPlacement,enemyPlacement,KEEPER_NAME,KEEPER_BY_BIOME,TILE} from './actor-art.ts';

const publicFile=(src:string)=>fileURLToPath(new URL(`../../public${src}`,import.meta.url));

test('every enemy the game can spawn has artwork, numbered or not',()=>{
 for(const[biome,names]of Object.entries(ENEMIES) as [keyof typeof ENEMIES,string[]][])for(const name of names){
  const key=enemyArtKey({name},biome);assert.ok(key,`${name} needs art`);
  assert.equal(enemyArtKey({name:`${name} 3`},biome),key);
 }
});
test('each tale’s Hollow Keeper uses its own boss art',()=>{
 assert.deepEqual(Object.fromEntries((['woodland','ruins','coast'] as const).map(b=>[b,enemyArtKey({name:KEEPER_NAME},b)])),{woodland:'wolf',ruins:'dragon',coast:'warden'});
 for(const key of Object.values(KEEPER_BY_BIOME))assert.ok(ENEMY_ART[key]);
 assert.equal(enemyArtKey({name:'A creature from a custom tale'},'woodland'),undefined);
});
test('named Keepers take their pose while a signature attack is announced; the Warden yields',()=>{
 const plan={move:'hunt' as const,tiles:[],round:1};
 assert.equal(enemyArtKey({name:'The Wolf at the Last Light',keeper:'wolf'},'woodland'),'wolf');
 assert.equal(enemyArtKey({name:'The Wolf at the Last Light',keeper:'wolf',plan},'woodland'),'wolf-pounce');
 assert.equal(enemyArtKey({name:'The Crown’s Dragon',keeper:'dragon',plan:{...plan,move:'breath'}},'ruins'),'dragon-warn');
 // The turn after the attack resolves: the dragon's jaw open and head forward, the Warden where she landed.
 assert.equal(enemyArtKey({name:'The Crown’s Dragon',keeper:'dragon',keeperRest:true},'ruins'),'dragon-roar');
 assert.equal(enemyArtKey({name:'The Tideglass Warden',keeper:'warden',keeperRest:true},'coast'),'warden-landing');
 assert.equal(enemyArtKey({name:'The Wolf at the Last Light',keeper:'wolf',keeperRest:true},'woodland'),'wolf');
 assert.equal(enemyArtKey({name:'The Tideglass Warden',keeper:'warden',plan:{...plan,move:'tide'}},'coast'),'warden-windup');
 assert.equal(enemyArtKey({name:'The Tideglass Warden',keeper:'warden',defeated:true},'coast'),'warden-yield');
 // A custom tale's Keeper borrows its biome's painting.
 assert.equal(enemyArtKey({name:KEEPER_NAME,keeper:'hollow'},'ruins'),'dragon');
});
test('every art file named in the placement table ships with the game',()=>{
 for(const[key,art]of Object.entries(ENEMY_ART))assert.ok(existsSync(publicFile(art.src)),`${key}: ${art.src}`);
 for(const hero of HEROES)assert.ok(existsSync(publicFile(hero.art)),hero.art);
});
test('heroes resolve by name or short name, then by class',()=>{
 for(const hero of HEROES){assert.equal(heroArtFor({name:hero.name,heroClass:hero.profile.heroClass})?.id,hero.id);assert.equal(heroArtFor({name:hero.short,heroClass:hero.profile.heroClass})?.id,hero.id)}
 assert.equal(heroArtFor({name:'Someone new',heroClass:'cleric'})?.profile.heroClass,'cleric');
});
test('figures stand on their tile at the shared hero scale',()=>{
 const corin=heroPlacement(HEROES[0]);
 assert.ok(Math.abs(corin.y+corin.height*.955)<1e-9,'boots on the tile point');
 assert.ok(corin.height>1.7*TILE&&corin.height<1.9*TILE);
 for(const key of Object.keys(ENEMY_ART) as (keyof typeof ENEMY_ART)[]){
  const p=enemyPlacement(key);
  assert.ok(p.y<0&&p.y+p.height>0,`${key} spans its tile point`);
  assert.ok(p.top>=p.y-1e-9&&p.top<0,`${key} figure top lies inside the art`);
 }
});
