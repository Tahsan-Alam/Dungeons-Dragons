import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,runBots,applyAction} from './engine.ts';
import {DEFAULT_OPTIONS} from './types.ts';
import type {RoomView,Session} from './types.ts';
import {newReplay,appendReplay,reconstructReplay,reconstructReplayAsync} from './replay.ts';
import {soloRecord,roomRecord,updateSoloRecord,legacyRecords,sortedLibrary,isSavedGame,isSession} from './library.ts';
const initial=()=>createGame([{id:'you',name:'Rowan',heroClass:'ranger',color:'#abc',bot:false}],{...DEFAULT_OPTIONS,companions:0});
const auth:Session={code:'ABCDEF',playerId:'you',token:'a'.repeat(64)};

test('multiple solo records remain independent through progress and metadata changes',()=>{
 const one=soloRecord(initial(),newReplay(initial()),'one',10),two=soloRecord(initial(),newReplay(initial()),'two',20);
 one.meta.title='My renamed campaign';one.meta.pinned=true;one.meta.archived=true;
 const action={type:'guard'} as const,game=runBots(applyAction(one.game!,'you',action));
 const next=updateSoloRecord(one,game,appendReplay(one.replay!,{type:'action',playerId:'you',action}),30);
 assert.equal(one.game!.actors[0].actionUsed,false);assert.equal(two.game!.actors[0].actionUsed,false);
 assert.equal(next.game!.actors[0].actionUsed,true);assert.equal(next.meta.id,'one');assert.equal(next.meta.title,'My renamed campaign');assert.equal(next.meta.pinned,true);assert.equal(next.meta.archived,true);assert.equal(next.revision,2);assert.equal(next.meta.recordedActions,1);
 assert.deepEqual(reconstructReplay(next.replay!).at(-1),game);
});
test('legacy imports preserve exact saved state and label historical coverage honestly',()=>{
 const game=runBots(applyAction(initial(),'you',{type:'guard'}));
 const records=legacyRecords(game,auth,100);
 assert.equal(records.length,2);assert.equal(records[0].replay!.complete,false);assert.deepEqual(records[0].game,game);assert.deepEqual(reconstructReplay(records[0].replay!).at(-1),game);
 assert.equal(records[1].session?.token,auth.token);assert.equal(records[1].meta.status,'lobby');assert.equal(records[1].meta.id,'room-ABCDEF-you');
 assert.deepEqual(legacyRecords({schemaVersion:1},'no'),[]);assert.equal(isSavedGame(null),false);assert.equal(isSession({...auth,token:'invalid'}),false);
});
test('library pins sort before recency with stable identity',()=>{
 const first=soloRecord(initial(),newReplay(initial()),'a',10),second=soloRecord(initial(),newReplay(initial()),'b',20),third=soloRecord(initial(),newReplay(initial()),'c',30);
 first.meta.pinned=true;assert.deepEqual(sortedLibrary([second,first,third]).map(m=>m.id),['a','c','b']);
});
test('online updates preserve renamed title, archive, pin, and full stored replay',()=>{
 const game=initial();const room:RoomView={code:auth.code,hostId:'you',version:3,players:[{id:'you',name:'Rowan',heroClass:'ranger',color:'#abc',bot:false,ready:true,lastSeen:10}],options:game.options,game,createdAt:1,replay:newReplay(game)};
 const old=roomRecord(room,auth,undefined,10);old.meta.title='Friday party';old.meta.archived=true;old.meta.pinned=true;
 const advanced=roomRecord({...room,version:4},auth,old,20);
 assert.equal(advanced.meta.title,'Friday party');assert.equal(advanced.meta.archived,true);assert.equal(advanced.meta.pinned,true);assert.equal(advanced.meta.createdAt,1);assert.equal(advanced.meta.yourTurn,true);assert.equal(advanced.revision,2);assert.equal(advanced.replay!.complete,true);
 const cached=roomRecord(null,auth,advanced,30);assert.equal(cached.replay!.complete,true);assert.deepEqual(cached.game,game);
});
test('asynchronous replay matches snapshots and supports cancellation without mutating its archive',async()=>{
 const archive=appendReplay(newReplay(initial()),{type:'action',playerId:'you',action:{type:'guard'}}),before=JSON.stringify(archive);
 assert.deepEqual(await reconstructReplayAsync(archive),reconstructReplay(archive));
 const controller=new AbortController();controller.abort();await assert.rejects(()=>reconstructReplayAsync(archive,controller.signal),{name:'AbortError'});
 assert.equal(JSON.stringify(archive),before);
});
