import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RoomService, RoomError } from './rooms.ts';
import { MemoryRoomStore } from './room-store.ts';
import { DEFAULT_OPTIONS } from '../game/types.ts';
import type { RoomView, Session } from '../game/types.ts';

const options={...DEFAULT_OPTIONS,companions:0};
const roomOf=async(s:RoomService,session:Session)=>(await s.get(session.code,session.token) as {room:RoomView}).room;
const code=(name:string)=>(e:unknown)=>e instanceof RoomError&&e.code===name;

test('players can bring a roster hero; each hero joins a party only once',async()=>{
  const s=new RoomService(new MemoryRoomStore());
  const host=await s.create({name:'Corin Vale',heroClass:'knight',heroId:'corin',options});
  assert.equal(host.room.players[0].heroId,'corin');
  const guest=await s.join({code:host.session.code,name:'Vess',heroClass:'rogue',heroId:'vess'});
  assert.equal((await roomOf(s,guest.session)).players.find(p=>p.name==='Vess')?.heroId,'vess');
  await assert.rejects(()=>s.join({code:host.session.code,name:'Another Vess',heroClass:'rogue',heroId:'vess'}),code('HERO_TAKEN'));
  // Choosing a class without a roster hero still works.
  const plain=await s.join({code:host.session.code,name:'Rowan',heroClass:'mage'});
  assert.equal((await roomOf(s,plain.session)).players.find(p=>p.name==='Rowan')?.heroId,undefined);
});

test('a roster hero must exist and match the class the player sends',async()=>{
  const s=new RoomService(new MemoryRoomStore());
  await assert.rejects(()=>s.create({name:'Corin Vale',heroClass:'mage',heroId:'corin',options}),(e:unknown)=>e instanceof RoomError&&e.status===400);
  await assert.rejects(()=>s.create({name:'Nobody',heroClass:'knight',heroId:'nobody',options}),(e:unknown)=>e instanceof RoomError&&e.status===400);
});

test('the invitation preview needs only the code and shows no secrets',async()=>{
  const s=new RoomService(new MemoryRoomStore());
  const host=await s.create({name:'Corin Vale',heroClass:'knight',heroId:'corin',options:{...options,companions:2}});
  const preview=await s.preview(host.session.code);
  assert.equal(preview.code,host.session.code);
  assert.equal(preview.host,'Corin Vale');
  assert.equal(preview.players.length,3);
  assert.equal(preview.capacity,10);
  assert.equal(preview.started,false);
  const text=JSON.stringify(preview);
  assert.doesNotMatch(text,new RegExp(host.session.token));
  assert.doesNotMatch(text,/token|hash|lastSeen|"id"/);
  await assert.rejects(()=>s.preview('ZZZZZZ'),(e:unknown)=>e instanceof RoomError&&e.status===404);
});

test('companions become roster heroes nobody has taken',async()=>{
  const s=new RoomService(new MemoryRoomStore());
  const host=await s.create({name:'Corin Vale',heroClass:'knight',heroId:'corin',options:{...options,companions:3}});
  const companions=host.room.players.filter(p=>p.bot);
  assert.equal(companions.length,3);
  for(const c of companions)assert.ok(c.heroId,`${c.name} has a roster hero`);
  assert.equal(new Set(host.room.players.map(p=>p.heroId)).size,4,'no hero appears twice');
});
