import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../../game/engine.ts';
import {DEFAULT_OPTIONS} from '../../game/types.ts';
import {adventureRecap,fallenLine} from './recap.ts';
import {addExchange,THREAD_LIMIT} from './narrator-thread.ts';
import {normalizePartyCode,partyCodeComplete,openSeats} from './party.ts';

const player={id:'you',name:'Mira',heroClass:'ranger' as const,color:'#557766',bot:false};
const game=()=>createGame([player],{...DEFAULT_OPTIONS,seed:'recap'});

test('the recap totals damage by side and names who fell',()=>{
 const state=game(),hero=state.actors.find(actor=>!actor.enemy)!,enemy=state.actors.find(actor=>actor.enemy)!;
 state.round=4;state.scene=2;
 state.events=[
  {id:1,kind:'roll',text:'',actorId:hero.id,roll:20,attack:{targetId:enemy.id,action:'attack',hit:true,critical:true,damage:9}},
  {id:2,kind:'roll',text:'',actorId:hero.id,roll:3,attack:{targetId:enemy.id,action:'attack',hit:false,critical:false,damage:0}},
  {id:3,kind:'roll',text:'',actorId:enemy.id,roll:15,attack:{targetId:hero.id,action:'attack',hit:true,critical:false,damage:4}},
  {id:4,kind:'roll',text:'',actorId:'gone-enemy',roll:15,attack:{targetId:hero.id,action:'attack',hit:true,critical:false,damage:2}},
  {id:5,kind:'story',text:'A door opens.'},
 ];
 const recap=adventureRecap(state);
 assert.equal(recap.rounds,4);assert.equal(recap.chapters,3);
 assert.equal(recap.damageDealt,9);assert.equal(recap.damageTaken,6);assert.equal(recap.criticals,1);
 assert.equal(recap.partial,false);assert.deepEqual(recap.fallen,[]);
 hero.hp=0;hero.defeated=true;state.events[0].id=40;
 const after=adventureRecap(state);
 assert.deepEqual(after.fallen,['Mira']);assert.equal(after.heroes[0].fallen,true);assert.equal(after.partial,true);
});

test('the recap does not change the game',()=>{
 const state=game(),before=JSON.stringify(state);adventureRecap(state);assert.equal(JSON.stringify(state),before);
});

test('fallen heroes read as a sentence',()=>{
 assert.equal(fallenLine([]),'Everyone is still standing.');
 assert.equal(fallenLine(['Mira']),'Mira fell.');
 assert.equal(fallenLine(['Mira','Bram','Oko']),'Mira, Bram and Oko fell.');
});

test('the narrator thread keeps its newest exchanges in order',()=>{
 let thread=addExchange([],' What next? ',' Open the chest. ');
 assert.deepEqual(thread,[{id:1,question:'What next?',answer:'Open the chest.'}]);
 thread=addExchange(thread,'Why?','Local advice.',true);
 assert.equal(thread[1].id,2);assert.equal(thread[1].local,true);
 for(let i=0;i<THREAD_LIMIT+5;i++)thread=addExchange(thread,'q'+i,'a'+i);
 assert.equal(thread.length,THREAD_LIMIT);assert.equal(thread.at(-1)!.question,'q'+(THREAD_LIMIT+4));
 assert.equal(new Set(thread.map(entry=>entry.id)).size,THREAD_LIMIT);
});

test('party codes are six letters and seats never go negative',()=>{
 assert.equal(normalizePartyCode('ab-c1 defgh'),'ABCDEF');
 assert.equal(partyCodeComplete('ABCDEF'),true);assert.equal(partyCodeComplete('ABCDE'),false);
 assert.equal(openSeats(3),7);assert.equal(openSeats(10),0);assert.equal(openSeats(12),0);
});
