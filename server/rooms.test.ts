import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RoomService, RoomError, ROOM_LIFETIME } from './rooms.ts';
import { MemoryRoomStore, D1RoomStore } from './room-store.ts';
import { DEFAULT_OPTIONS } from '../game/types.ts';
import type { Session, RoomView } from '../game/types.ts';

const options={...DEFAULT_OPTIONS,companions:0};
const make=(s:RoomService)=>s.create({name:'Rowan',heroClass:'knight',options});
const command=(s:RoomService,session:Session,room:RoomView,value:unknown,id=crypto.randomUUID())=>s.command(session.code,session.token,{requestId:id,version:room.version,command:value});
const roomOf=async(s:RoomService,session:Session)=>(await s.get(session.code,session.token) as {room:RoomView}).room;

test('ten concurrent human joins fill ten seats without lost updates; eleventh is rejected',async()=>{
  const store=new MemoryRoomStore(),s=new RoomService(store),host=await make(s);
  const guests=await Promise.all(Array.from({length:9},(_,i)=>s.join({code:host.session.code,name:`Friend ${i}`,heroClass:'mage'})));
  const room=await roomOf(s,host.session);
  assert.equal(room.players.length,10);
  assert.equal(new Set(room.players.map(p=>p.id)).size,10);
  assert.equal(new Set(room.players.map(p=>p.color)).size,10);
  await assert.rejects(()=>s.join({code:host.session.code,name:'Overflow',heroClass:'ranger'}),(e:unknown)=>e instanceof RoomError&&e.code==='ROOM_FULL');
  for(const guest of guests)assert.equal((await roomOf(s,guest.session)).code,host.session.code);
});

test('room responses exclude token hashes and require a real saved token',async()=>{
  const store=new MemoryRoomStore(),s=new RoomService(store),host=await make(s);
  await assert.rejects(()=>s.get(host.session.code,'forged-token'),(e:unknown)=>e instanceof RoomError&&e.status===401);
  const stored=await store.read(host.session.code);
  assert.ok(stored?.tokenHashes[host.session.playerId]);
  assert.ok(!JSON.stringify(stored).includes(host.session.token));
  assert.ok(!JSON.stringify(host.room).includes('tokenHashes'));
  const freshService=new RoomService(store);
  assert.equal((await roomOf(freshService,host.session)).hostId,host.session.playerId);
});

test('companions consume party slots and host can replace one with a friend',async()=>{
  const s=new RoomService(new MemoryRoomStore());
  const host=await s.create({name:'Rowan',heroClass:'knight',options:{...options,companions:9}});
  assert.equal(host.room.players.length,10);
  const bot=host.room.players.find(p=>p.bot)!;
  const result=await command(s,host.session,host.room,{type:'remove',playerId:bot.id});
  assert.ok('room' in result);
  const guest=await s.join({code:host.session.code,name:'Friend',heroClass:'ranger'});
  assert.equal(guest.room.players.length,10);
});

test('host-only commands and everyone-ready gate are enforced on server',async()=>{
  const s=new RoomService(new MemoryRoomStore()),host=await make(s);
  const guest=await s.join({code:host.session.code,name:'Friend',heroClass:'ranger'});
  await assert.rejects(()=>command(s,guest.session,guest.room,{type:'start'}),(e:unknown)=>e instanceof RoomError&&e.code==='HOST_ONLY');
  await assert.rejects(()=>command(s,host.session,guest.room,{type:'start'}),(e:unknown)=>e instanceof RoomError&&e.code==='NOT_READY');
  const ready=await command(s,guest.session,guest.room,{type:'ready',ready:true});assert.ok('room' in ready);
  const started=await command(s,host.session,ready.room,{type:'start'});assert.ok('room' in started);
  assert.ok(started.room.game);
  assert.equal(started.room.game.actors.filter(a=>!a.enemy).length,2);
  await assert.rejects(()=>s.join({code:host.session.code,name:'Late',heroClass:'mage'}),(e:unknown)=>e instanceof RoomError&&e.code==='ALREADY_STARTED');
  await assert.rejects(()=>command(s,host.session,started.room,{type:'addBot'}),(e:unknown)=>e instanceof RoomError&&e.code==='ALREADY_STARTED');
});

test('concurrent commands cannot clobber game versions; stale response includes newest room',async()=>{
  const s=new RoomService(new MemoryRoomStore()),host=await make(s);
  const results=await Promise.allSettled([
    command(s,host.session,host.room,{type:'addBot',heroClass:'mage'}),
    command(s,host.session,host.room,{type:'addBot',heroClass:'cleric'}),
  ]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const rejected=results.find(r=>r.status==='rejected');assert.ok(rejected?.status==='rejected');
  assert.equal(rejected.reason.code,'STALE_VERSION');
  assert.equal(rejected.reason.room.players.length,2);
  assert.equal((await roomOf(s,host.session)).players.length,2);
});

test('retrying a command after unknown result applies it exactly once',async()=>{
  const s=new RoomService(new MemoryRoomStore()),host=await make(s),id=crypto.randomUUID();
  const first=await command(s,host.session,host.room,{type:'addBot'},id);assert.ok('room' in first);
  const retry=await command(s,host.session,host.room,{type:'addBot'},id);assert.ok('room' in retry);
  assert.equal(retry.room.version,first.room.version);
  assert.equal(retry.room.players.length,2);
});

test('concurrent create retries recover one room and the same secret without plaintext storage',async()=>{
  const store=new MemoryRoomStore(),s=new RoomService(store),requestId=crypto.randomUUID();
  const input={name:'Rowan',heroClass:'knight',options,requestId};
  const results=await Promise.all(Array.from({length:5},()=>s.create(input)));
  assert.equal(new Set(results.map(r=>r.room.code)).size,1);
  assert.equal(new Set(results.map(r=>r.session.token)).size,1);
  const replay=await new RoomService(store).create(input);
  assert.deepEqual(replay.session,results[0].session);
  const stored=JSON.stringify(await store.read(replay.room.code));
  assert.ok(!stored.includes(requestId));
  assert.ok(!stored.includes(replay.session.token));
  await assert.rejects(()=>s.create({...input,name:'Changed'}),(e:unknown)=>e instanceof RoomError&&e.code==='IDEMPOTENCY_CONFLICT');
});

test('concurrent join retries claim one seat; a removed seat cannot be resurrected by replay',async()=>{
  const store=new MemoryRoomStore(),s=new RoomService(store),host=await make(s),requestId=crypto.randomUUID();
  const input={code:host.session.code,name:'Friend',heroClass:'ranger',requestId};
  const results=await Promise.all(Array.from({length:5},()=>s.join(input)));
  assert.equal(new Set(results.map(r=>r.session.playerId)).size,1);
  assert.equal(new Set(results.map(r=>r.session.token)).size,1);
  const room=await roomOf(s,host.session);assert.equal(room.players.length,2);
  const ready=await command(s,results[0].session,room,{type:'ready',ready:true});assert.ok('room'in ready);
  const removed=await command(s,host.session,ready.room,{type:'remove',playerId:results[0].session.playerId});assert.ok('room'in removed);
  await assert.rejects(()=>s.join(input),(e:unknown)=>e instanceof RoomError&&e.code==='SEAT_LEFT');
  assert.equal((await roomOf(s,host.session)).players.length,1);
});

test('join recovery works after the adventure starts and create recovery never revives a departed host',async()=>{
  const s=new RoomService(new MemoryRoomStore()),createId=crypto.randomUUID();
  const createInput={name:'Rowan',heroClass:'knight',options,requestId:createId};
  const host=await s.create(createInput),joinInput={code:host.session.code,name:'Friend',heroClass:'ranger',requestId:crypto.randomUUID()};
  const guest=await s.join(joinInput);
  const ready=await command(s,guest.session,guest.room,{type:'ready',ready:true});assert.ok('room'in ready);
  const started=await command(s,host.session,ready.room,{type:'start'});assert.ok('room'in started);
  assert.deepEqual((await s.join(joinInput)).session,guest.session);
  await command(s,host.session,started.room,{type:'leave'});
  await assert.rejects(()=>s.create(createInput),(e:unknown)=>e instanceof RoomError&&e.code==='SEAT_LEFT');
});

test('player cannot submit another actor, replace game state, or perform an out-of-turn action',async()=>{
  const s=new RoomService(new MemoryRoomStore()),host=await make(s);
  const guest=await s.join({code:host.session.code,name:'Friend',heroClass:'ranger'});
  const ready=await command(s,guest.session,guest.room,{type:'ready',ready:true});assert.ok('room'in ready);
  const started=await command(s,host.session,ready.room,{type:'start'});assert.ok('room'in started);
  const current=started.room.game!.actors.find(a=>a.id===started.room.game!.activeActorId)!;
  const wrong=current.playerId===host.session.playerId?guest.session:host.session;
  await assert.rejects(()=>command(s,wrong,started.room,{type:'action',action:{type:'end'},playerId:current.playerId}),RoomError);
  await assert.rejects(()=>command(s,host.session,started.room,{type:'replace',game:{status:'victory'}}),RoomError);
  assert.equal((await roomOf(s,host.session)).version,started.room.version);
});

test('presence updates return lightweight state and never roll back a concurrent command',async()=>{
  let now=100_000;const s=new RoomService(new MemoryRoomStore(),()=>now),host=await make(s);
  now+=16_000;
  const [poll,update]=await Promise.all([s.get(host.session.code,host.session.token,host.room.version),command(s,host.session,host.room,{type:'addBot'})]);
  assert.ok('room'in update);
  assert.equal((await roomOf(s,host.session)).players.length,2);
  const unchanged=await s.get(host.session.code,host.session.token,update.room.version);
  assert.ok('unchanged'in unchanged);
  assert.equal(unchanged.players[0].lastSeen,now);
  assert.ok(!('game'in unchanged));
});

test('host transfers after 90 seconds offline and saved seats still reconnect',async()=>{
  let now=100_000;const s=new RoomService(new MemoryRoomStore(),()=>now),host=await make(s);
  const guest=await s.join({code:host.session.code,name:'Friend',heroClass:'mage'});
  now+=91_000;
  const state=await roomOf(s,guest.session);
  assert.equal(state.hostId,guest.session.playerId);
  const reconnect=await roomOf(s,host.session);
  assert.equal(reconnect.hostId,guest.session.playerId);
  assert.equal(reconnect.players.length,2);
});

test('host cannot skip a connected player and may skip after 45 seconds offline',async()=>{
  let now=100_000;const store=new MemoryRoomStore(),s=new RoomService(store,()=>now),host=await make(s);
  const guest=await s.join({code:host.session.code,name:'Friend',heroClass:'mage'});
  const ready=await command(s,guest.session,guest.room,{type:'ready',ready:true});assert.ok('room'in ready);
  const started=await command(s,host.session,ready.room,{type:'start'});assert.ok('room'in started);
  // Put the guest's otherwise legitimate initial turn first to isolate skip authorization.
  const record=(await store.read(host.session.code))!;
  const actor=record.room.game!.actors.find(a=>a.playerId===guest.session.playerId)!;
  record.room.game!.activeActorId=actor.id;
  record.room.game!.turnOrder=[actor.id,...record.room.game!.turnOrder.filter(id=>id!==actor.id)];
  const revision=record.revision;record.revision++;
  await store.compareAndSwap(host.session.code,revision,record);
  await assert.rejects(()=>command(s,host.session,record.room,{type:'skip'}),(e:unknown)=>e instanceof RoomError&&e.code==='PLAYER_ONLINE');
  now+=46_000;
  const result=await command(s,host.session,record.room,{type:'skip'});assert.ok('room'in result);
  assert.notEqual(result.room.game!.activeActorId,actor.id);
});

test('leaving transfers host, revokes the seat and retrying leave is safe',async()=>{
  const s=new RoomService(new MemoryRoomStore()),host=await make(s);
  const guest=await s.join({code:host.session.code,name:'Friend',heroClass:'mage'});
  const id=crypto.randomUUID();
  assert.deepEqual(await command(s,host.session,guest.room,{type:'leave'},id),{left:true});
  assert.deepEqual(await command(s,host.session,guest.room,{type:'leave'},id),{left:true});
  const room=await roomOf(s,guest.session);assert.equal(room.hostId,guest.session.playerId);
  await assert.rejects(()=>roomOf(s,host.session),(e:unknown)=>e instanceof RoomError&&e.status===401);
});

test('invalid and oversized input cannot mutate room state',async()=>{
  const s=new RoomService(new MemoryRoomStore()),host=await make(s);
  await assert.rejects(()=>s.join({code:host.session.code,name:'a'.repeat(29),heroClass:'mage'}),RoomError);
  await assert.rejects(()=>command(s,host.session,host.room,{type:'options',options:{...options,seed:'a'.repeat(65)}}),RoomError);
  await assert.rejects(()=>command(s,host.session,host.room,{type:'ready',ready:'yes'}),RoomError);
  assert.equal((await roomOf(s,host.session)).version,host.room.version);
});

test('expired rooms cannot be rejoined or resumed',async()=>{
  let now=100_000;const s=new RoomService(new MemoryRoomStore(),()=>now),host=await make(s);now+=ROOM_LIFETIME+1;
  await assert.rejects(()=>roomOf(s,host.session),(e:unknown)=>e instanceof RoomError&&e.code==='ROOM_NOT_FOUND');
  await assert.rejects(()=>s.join({code:host.session.code,name:'Friend',heroClass:'mage'}),(e:unknown)=>e instanceof RoomError&&e.code==='ROOM_NOT_FOUND');
});

test('D1 SQL adapter persists across service restart and rejects stale compare-and-swap',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'painted-rooms-'));
  const file=join(dir,'rooms.sqlite');let db=new DatabaseSync(file);
  db.exec('CREATE TABLE rooms (code TEXT PRIMARY KEY, revision INTEGER NOT NULL, payload TEXT NOT NULL, expires_at INTEGER NOT NULL)');
  const binding=()=>({prepare(sql:string){return {bind(...values:(string|number)[]){return {
    async first(){return db.prepare(sql).get(...values)??null;},
    async run(){const result=db.prepare(sql).run(...values);return {meta:{changes:Number(result.changes)}};},
  };}};}}) as unknown as D1Database;
  try {
    const store=new D1RoomStore(binding()),s=new RoomService(store),host=await make(s);
    db.close();db=new DatabaseSync(file);
    const resumed=new RoomService(new D1RoomStore(binding()));
    assert.equal((await roomOf(resumed,host.session)).code,host.session.code);
    const record=(await store.read(host.session.code))!;
    const newer=structuredClone(record);newer.revision++;newer.room.version++;
    assert.equal(await store.compareAndSwap(host.session.code,record.revision,newer),true);
    assert.equal(await store.compareAndSwap(host.session.code,record.revision,record),false);
    assert.equal((await roomOf(resumed,host.session)).version,newer.room.version);
  }finally{db.close();rmSync(dir,{recursive:true,force:true});}
});
