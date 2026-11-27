import {test} from 'node:test';
import assert from 'node:assert/strict';
import {OWN_HERO_DEFAULT,ownHero,ownHeroClassName,ownHeroRole,parseOwnHeroInput} from './own-hero.ts';
import {createGame} from './engine.ts';
import {DEFAULT_OPTIONS} from './types.ts';
import {TALES,GAME_MASTERS} from './presets.ts';

test('your own hero is an ordinary checked hero profile; the class sets every rule',()=>{
 assert.equal(ownHero(OWN_HERO_DEFAULT),null,'a hero needs a name');
 const hero=ownHero({name:'  Tamsin ',heroClass:'knight',color:'#b2c877',who:''})!;
 assert.equal(hero.name,'Tamsin');assert.equal(hero.heroClass,'knight');assert.match(hero.background,/a warrior the Lantern Marches/);
 assert.deepEqual(hero.personality,['Brave','Steady']);
 assert.equal(ownHeroClassName('knight'),'Warrior');assert.equal(ownHeroRole('druid'),'Control');
 assert.equal(ownHero({...OWN_HERO_DEFAULT,name:'Tamsin',mode:'paint',portrait:'nope'})!.portrait,undefined);
 assert.equal(ownHero({...OWN_HERO_DEFAULT,name:'Tamsin',mode:'paint',portrait:'c'.repeat(32)})!.portrait,'c'.repeat(32));
 assert.equal(ownHero({...OWN_HERO_DEFAULT,name:'Tamsin',mode:'draw',portrait:'c'.repeat(32)})!.portrait,undefined,'a drawn hero keeps their drawing');
});
test('saved choices restore, and bad ones fall back',()=>{
 // Saved before the two modes: a chosen painting opens in paint mode, with it in the list.
 assert.deepEqual(parseOwnHeroInput({name:'Rook',heroClass:'bard',color:'#ef997c',who:'A singer.',portrait:'d'.repeat(32)}),{name:'Rook',heroClass:'bard',color:'#ef997c',who:'A singer.',mode:'paint',paintings:['d'.repeat(32)],portrait:'d'.repeat(32)});
 assert.deepEqual(parseOwnHeroInput({...OWN_HERO_DEFAULT,mode:'draw',paintings:['e'.repeat(32),'bad','e'.repeat(32),'f'.repeat(32)]}).paintings,['e'.repeat(32),'f'.repeat(32)]);
 assert.deepEqual(parseOwnHeroInput({heroClass:'pirate',color:'#000000',portrait:'x'}),OWN_HERO_DEFAULT);
});
test('the painted portrait reaches only the player’s own hero on the board, and changes no rule',()=>{
 const hero=ownHero({name:'Tamsin',heroClass:'ranger',color:'#b2c877',who:'',mode:'paint',portrait:'e'.repeat(32)})!;
 const options={...DEFAULT_OPTIONS,seed:'own-hero',creation:{narrator:GAME_MASTERS[0].profile,story:TALES[0].story,hero}};
 const players=[{id:'me',name:'Tamsin',heroClass:'ranger' as const,color:'#b2c877',bot:false},{id:'bot',name:'Wren',heroClass:'cleric' as const,color:'#a3bbf0',bot:true}];
 const game=createGame(players,options);
 const me=game.actors.find(a=>a.id==='hero-me')!,bot=game.actors.find(a=>a.id==='hero-bot')!;
 assert.equal(me.portrait,'e'.repeat(32));assert.equal(bot.portrait,undefined);
 const plain=createGame(players,{...options,creation:{...options.creation,hero:{...hero,portrait:undefined}}});
 const {portrait:_,...rest}=me;assert.deepEqual(rest,plain.actors.find(a=>a.id==='hero-me'));
});
