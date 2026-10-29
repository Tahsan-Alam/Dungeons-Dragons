import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MemoryRoomStore} from './room-store.ts';
import {RoomService} from './rooms.ts';
import {DEFAULT_OPTIONS} from '../game/types.ts';
import type {RoomView,Session} from '../game/types.ts';
import {reconstructReplay} from '../game/replay.ts';
const request=(service:RoomService,s:Session,r:RoomView,value:unknown,id=crypto.randomUUID())=>service.command(s.code,s.token,{requestId:id,version:r.version,command:value});

test('room replay persists accepted actions and bot turns across disconnected clients and service restart',async()=>{
 const store=new MemoryRoomStore(),service=new RoomService(store);
 const {session,room}=await service.create({name:'Rowan',heroClass:'ranger',options:{...DEFAULT_OPTIONS,companions:2}});
 let response=await request(service,session,room,{type:'start'});assert.ok('room'in response);let latest=response.room;
 const guardId=crypto.randomUUID();response=await request(service,session,latest,{type:'action',action:{type:'guard'}},guardId);assert.ok('room'in response);latest=response.room;
 const duplicate=await request(service,session,room,{type:'action',action:{type:'guard'}},guardId);assert.ok('room'in duplicate);assert.equal(duplicate.room.replay!.commands.length,1);
 response=await request(service,session,latest,{type:'action',action:{type:'end'}});assert.ok('room'in response);latest=response.room;
 const restored=await new RoomService(store).get(session.code,session.token);assert.ok('room'in restored);
 assert.equal(restored.room.replay!.commands.length,2);const frames=reconstructReplay(restored.room.replay!);assert.ok(frames.length>3);assert.deepEqual(frames.at(-1),latest.game);
 const before=JSON.stringify(restored.room.replay);await assert.rejects(()=>request(service,session,latest,{type:'action',action:{type:'move',x:99,y:99}}));
 const after=await service.get(session.code,session.token);assert.ok('room'in after);assert.equal(JSON.stringify(after.room.replay),before);
});
test('passive background refresh never falsely reports the player at a table',async()=>{
 let now=1000;const store=new MemoryRoomStore(),service=new RoomService(store,()=>now);
 const created=await service.create({name:'Rowan',heroClass:'ranger',options:DEFAULT_OPTIONS});now+=60_000;
 await service.get(created.session.code,created.session.token,undefined,true);
 let stored=await store.read(created.session.code);assert.equal(stored!.room.players[0].lastSeen,1000);
 await service.get(created.session.code,created.session.token);stored=await store.read(created.session.code);assert.equal(stored!.room.players[0].lastSeen,61_000);
});
test('leaving records conversion to a companion so remaining players can replay it exactly',async()=>{
 const store=new MemoryRoomStore(),service=new RoomService(store),host=await service.create({name:'Host',heroClass:'ranger',options:{...DEFAULT_OPTIONS,companions:0}});
 const guest=await service.join({code:host.session.code,name:'Guest',heroClass:'mage'});
 let result=await request(service,guest.session,guest.room,{type:'ready',ready:true});assert.ok('room'in result);
 result=await request(service,host.session,result.room,{type:'start'});assert.ok('room'in result);
 await request(service,host.session,result.room,{type:'leave'});
 const fresh=await service.get(guest.session.code,guest.session.token);assert.ok('room'in fresh);
 assert.equal(fresh.room.replay!.commands.at(-1)!.type,'depart');assert.deepEqual(reconstructReplay(fresh.room.replay!).at(-1),fresh.room.game);
});
test('rooms from earlier builds start a partial replay at the preserved game position',async()=>{
 const store=new MemoryRoomStore(),service=new RoomService(store),host=await service.create({name:'Host',heroClass:'ranger',options:{...DEFAULT_OPTIONS,companions:0}});
 const started=await request(service,host.session,host.room,{type:'start'});assert.ok('room'in started);
 const record=(await store.read(host.session.code))!;delete record.room.replay;await store.compareAndSwap(host.session.code,record.revision,record);
 const result=await request(service,host.session,record.room,{type:'action',action:{type:'guard'}});assert.ok('room'in result);
 assert.equal(result.room.replay!.complete,false);assert.deepEqual(reconstructReplay(result.room.replay!).at(-1),result.room.game);
});
