'use client';
import { useEffect, useRef, useState } from 'react';
import type { GameState, GameOptions, HeroClass, RoomView, RoomPlayer, Session, GameAction, PlayerSpec } from '../../game/types';
import { HERO_COLORS } from '../../game/types';
import { createGame, applyAction, runBots } from '../../game/engine';
import {AdventureStore,soloRecord,roomRecord,updateSoloRecord,sortedLibrary} from '../../game/library';
import type {AdventureRecord,SavedAdventure} from '../../game/library';
import {newReplay,appendReplay} from '../../game/replay';
import {acceptNarration,narrationFixture,applyStoryDirection} from '../../game/campaign';

const SOLO_KEY='painted-realms.solo.v1';
const SESSION_KEY='painted-realms.room.v1';
const ADMISSION_KEY='painted-realms.pending-admission.v1';
const COMMAND_KEY='painted-realms.pending-command.v1';
type JsonObject=Record<string,unknown>;
type ApiData={room?:RoomView;session?:Session;unchanged?:true;version?:number;players?:RoomPlayer[];hostId?:string;left?:true};
type PendingAdmission={path:string;parameters:JsonObject;requestId:string};
type PendingCommand={code:string;playerId:string;payload:{requestId:string;version:number;command:unknown}};
const object=(value:unknown):value is JsonObject=>!!value&&typeof value==='object'&&!Array.isArray(value);
const finite=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);
function validSession(value:unknown):value is Session {
 return object(value)&&typeof value.code==='string'&&/^[A-Z]{6}$/.test(value.code)&&typeof value.playerId==='string'&&typeof value.token==='string'&&/^[a-f0-9]{64}$/.test(value.token);
}
function validPlayers(value:unknown):value is RoomPlayer[] {
 return Array.isArray(value)&&value.length<=10&&value.every(p=>object(p)&&typeof p.id==='string'&&typeof p.name==='string'&&typeof p.heroClass==='string'&&typeof p.color==='string'&&typeof p.bot==='boolean'&&typeof p.ready==='boolean'&&finite(p.lastSeen));
}
function validGame(value:unknown):value is GameState {
 return object(value)&&value.schemaVersion===1&&['playing','victory','defeat'].includes(String(value.status))&&object(value.options)&&finite(value.rng)&&finite(value.width)&&finite(value.height)&&value.width>0&&value.width<=100&&value.height>0&&value.height<=100&&Array.isArray(value.tiles)&&value.tiles.length===value.width*value.height&&value.tiles.every(t=>object(t)&&finite(t.x)&&finite(t.y)&&typeof t.kind==='string')&&Array.isArray(value.actors)&&value.actors.length>0&&value.actors.every(a=>object(a)&&typeof a.id==='string'&&typeof a.name==='string'&&finite(a.hp)&&finite(a.maxHp)&&finite(a.x)&&finite(a.y))&&Array.isArray(value.events)&&value.events.every(e=>object(e)&&finite(e.id)&&typeof e.text==='string')&&Array.isArray(value.turnOrder)&&typeof value.activeActorId==='string'&&finite(value.scene)&&finite(value.round)&&object(value.exit)&&object(value.chest);
}
function validRoom(value:unknown):value is RoomView {
 return object(value)&&typeof value.code==='string'&&/^[A-Z]{6}$/.test(value.code)&&typeof value.hostId==='string'&&Number.isInteger(value.version)&&Number(value.version)>=1&&validPlayers(value.players)&&object(value.options)&&finite(value.createdAt)&&(value.game===null||validGame(value.game));
}
function read(key:string,store:Storage):unknown {try{return JSON.parse(store.getItem(key)||'null')}catch{return null}}
function write(key:string,value:unknown,store:Storage){try{if(value===null)store.removeItem(key);else store.setItem(key,JSON.stringify(value));return true}catch{return false}}
function parseData(value:unknown):ApiData {
 if(!object(value))throw new ApiError('The game server returned an unreadable response.',503,'INVALID_RESPONSE');
 const result:ApiData={};
 if(value.room!==undefined){if(!validRoom(value.room))throw new ApiError('The room response was incomplete. Please reconnect.',503,'INVALID_RESPONSE');result.room=value.room;}
 if(value.session!==undefined){if(!validSession(value.session))throw new ApiError('The room credentials were incomplete. Please retry.',503,'INVALID_RESPONSE');result.session=value.session;}
 if(value.unchanged===true){
  if(!Number.isInteger(value.version)||!validPlayers(value.players)||typeof value.hostId!=='string')throw new ApiError('The room response was incomplete.',503,'INVALID_RESPONSE');
  result.unchanged=true;result.version=Number(value.version);result.players=value.players;result.hostId=value.hostId;
 }
 if(value.left===true)result.left=true;
 if(!result.room&&!result.unchanged&&!result.left)throw new ApiError('The game server returned an incomplete response.',503,'INVALID_RESPONSE');
 return result;
}
class ApiError extends Error {
 status:number;code:string;room?:RoomView;retryAfter:number;roomCode?:string;
 constructor(message:string,status=0,code='NETWORK',room?:RoomView,retryAfter=0){super(message);this.status=status;this.code=code;this.room=room;this.retryAfter=retryAfter;}
 get terminal(){return this.status===401||this.status===404;}
 get uncertain(){return this.status===0||[408,502,503,504].includes(this.status);}
}
function mergePresence(previous:RoomPlayer[],incoming:RoomPlayer[]):RoomPlayer[]{
 return incoming.map(p=>({...p,lastSeen:Math.max(p.lastSeen,previous.find(old=>old.id===p.id)?.lastSeen??0)}));
}

export function useSession(){
 const [solo,setSolo]=useState<GameState|null>(null),[room,setRoom]=useState<RoomView|null>(null),[session,setSession]=useState<Session|null>(null);
 const [saved,setSaved]=useState<GameState|null>(null),[savedSession,setSavedSession]=useState<Session|null>(null);
 const [library,setLibrary]=useState<SavedAdventure[]>([]),[libraryReady,setLibraryReady]=useState(false),[activeId,setActiveId]=useState<string|null>(null),[inLibrary,setInLibrary]=useState(true);
 const records=useRef(new Map<string,AdventureRecord>()),store=useRef<AdventureStore|null>(null),active=useRef<string|null>(null),persisted=useRef(new Map<string,number>()),saving=useRef(Promise.resolve()),deleting=useRef(new Set<string>()),generation=useRef(0),failedWrites=useRef(new Map<string,boolean>());
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[connection,setConnection]=useState<'online'|'reconnecting'|'local'>('local');
 const latest=useRef({room,session});latest.current={room,session};
 const lock=useRef(false),mounted=useRef(true),controllers=useRef(new Set<AbortController>());
 const pendingAdmission=useRef<PendingAdmission|null>(null),pendingCommand=useRef<PendingCommand|null>(null);
 useEffect(()=>{
  mounted.current=true;
  const s=read(SOLO_KEY,localStorage),tabSession=read(SESSION_KEY,sessionStorage),r=validSession(tabSession)?tabSession:read(SESSION_KEY,localStorage);
  store.current=new AdventureStore();
  void store.current.migrate(s,r).then(()=>store.current!.all()).then(all=>{if(!mounted.current)return;records.current=new Map(all.map(r=>[r.meta.id,r]));persisted.current=new Map(all.map(r=>[r.meta.id,r.revision]));refreshLibrary();setLibraryReady(true);}).catch(e=>{if(mounted.current){setLibraryReady(true);setError(e instanceof Error?e.message:'Saved games could not be loaded.');}});
  const admission=read(ADMISSION_KEY,sessionStorage);
  if(object(admission)&&typeof admission.path==='string'&&['/api/rooms','/api/rooms/join'].includes(admission.path)&&object(admission.parameters)&&typeof admission.requestId==='string')pendingAdmission.current=admission as PendingAdmission;
  const command=read(COMMAND_KEY,sessionStorage);
  if(object(command)&&typeof command.code==='string'&&typeof command.playerId==='string'&&object(command.payload)&&typeof command.payload.requestId==='string'&&Number.isInteger(command.payload.version))pendingCommand.current=command as PendingCommand;
  return()=>{mounted.current=false;for(const controller of controllers.current)controller.abort();controllers.current.clear();};
 },[]);
 function refreshLibrary(){
  const all=[...records.current.values()];setLibrary(sortedLibrary(all));
  const lastSolo=all.filter(r=>r.meta.kind==='solo'&&!r.meta.archived).sort((a,b)=>b.meta.updatedAt-a.meta.updatedAt)[0];setSaved(lastSolo?.game??null);
  const lastRoom=all.filter(r=>r.meta.kind==='online'&&!r.meta.archived&&r.session).sort((a,b)=>b.meta.updatedAt-a.meta.updatedAt)[0];setSavedSession(lastRoom?.session??null);
 }
 function select(id:string|null){active.current=id;setActiveId(id);setInLibrary(id===null);}
 function saveRecord(record:AdventureRecord){
  if(deleting.current.has(record.meta.id))return Promise.resolve();
  generation.current++;
  records.current.set(record.meta.id,record);refreshLibrary();
  const writeJob=saving.current.catch(()=>{}).then(async()=>{if(deleting.current.has(record.meta.id))return;await store.current!.put(record,persisted.current.get(record.meta.id)??0);persisted.current.set(record.meta.id,record.revision);failedWrites.current.delete(record.meta.id);});
  saving.current=writeJob;writeJob.catch(e=>{failedWrites.current.set(record.meta.id,e instanceof Error&&e.message.includes('another tab'));if(mounted.current)setError(e instanceof Error?e.message:'This game could not be saved. Keep this tab open.');});return writeJob;
 }
 function saveRoom(incoming:RoomView,auth:Session){
  const id=`room-${auth.code}-${auth.playerId}`,previous=records.current.get(id);
  if(deleting.current.has(id))return;
  if(previous?.room&&previous.room.version>=incoming.version)return;
  void saveRecord(roomRecord(incoming,auth,previous)).catch(()=>{});
 }

 function acceptRoom(incoming:RoomView,replace=false){
  if(!mounted.current)return;
  if(!replace&&latest.current.session?.code!==incoming.code)return;
  const previous=latest.current.room;
  if(!replace&&previous?.code===incoming.code&&previous.version>incoming.version)return;
  const next=previous?.code===incoming.code&&previous.version===incoming.version?{...incoming,players:mergePresence(previous.players,incoming.players)}:incoming;
  latest.current.room=next;setRoom(next);
  if(latest.current.session)saveRoom(next,latest.current.session);
 }
 function closeRoom(forget:boolean){
  const departing=latest.current.session??savedSession;
  latest.current={room:null,session:null};setRoom(null);setSession(null);setConnection('local');
  if(forget){
   setSavedSession(null);
   if(departing){const id=`room-${departing.code}-${departing.playerId}`,record=records.current.get(id);if(record)void saveRecord({...record,session:null,revision:record.revision+1,meta:{...record.meta,status:record.game?.status==='playing'||!record.game?'unavailable':record.game.status,yourTurn:false,updatedAt:Date.now()}}).catch(()=>{});}
   // Another tab may have saved a different room after this tab joined.
   for(const store of [sessionStorage,localStorage]){const value=read(SESSION_KEY,store);if(!departing||(validSession(value)&&value.token===departing.token))write(SESSION_KEY,null,store);}
   pendingCommand.current=null;write(COMMAND_KEY,null,sessionStorage);
  }
 }
 function handleError(e:unknown){
  if(!mounted.current)return;
  if(e instanceof ApiError){if(e.room)acceptRoom(e.room);if(e.terminal&&e.roomCode&&(latest.current.session?.code===e.roomCode||savedSession?.code===e.roomCode))closeRoom(true);}
  setError(e instanceof Error?e.message:'Something went wrong. Please try again.');
 }
 async function api(path:string,body?:unknown,auth?:Session,external?:AbortSignal):Promise<ApiData>{
  const controller=new AbortController();controllers.current.add(controller);
  const cancel=()=>controller.abort();external?.addEventListener('abort',cancel,{once:true});
  if(external?.aborted)controller.abort();
  const timeout=setTimeout(()=>controller.abort(),25_000);
  try{
   const response=await fetch(path,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(auth?{Authorization:`Bearer ${auth.token}`}:{})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:controller.signal});
   let data:unknown;try{data=await response.json();}catch{throw new ApiError('The game server is unavailable. Please try again.',503,'INVALID_RESPONSE');}
   if(!response.ok){const details=object(data)?data:{};throw new ApiError(typeof details.error==='string'?details.error:'Could not reach this adventure.',response.status,typeof details.code==='string'?details.code:'SERVER_ERROR',validRoom(details.room)?details.room:undefined,Number(response.headers.get('Retry-After')??0));}
   return parseData(data);
  }catch(e){
   if(e instanceof ApiError){e.roomCode=auth?.code;throw e;}
   throw new ApiError(controller.signal.aborted?'The connection timed out. Try again to recover your request.':'Connection interrupted. Please try again.',0,'NETWORK');
  }finally{clearTimeout(timeout);external?.removeEventListener('abort',cancel);controllers.current.delete(controller);}
 }
 async function retryOnce(fn:()=>Promise<ApiData>):Promise<ApiData>{
  try{return await fn();}catch(e){if(e instanceof ApiError&&e.uncertain&&mounted.current)return fn();throw e;}
 }
 async function guarded<T>(fn:()=>Promise<T>){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{return await fn();}catch(e){handleError(e);}finally{lock.current=false;if(mounted.current)setBusy(false);}
 }
 function persist(s:Session){
  latest.current.session=s;setSession(s);setSavedSession(s);
  const a=write(SESSION_KEY,s,sessionStorage),b=write(SESSION_KEY,s,localStorage);
  if(!a&&!b)setError('Your browser could not save your seat. Keep this tab open to stay in the room.');
 }
 async function admit(path:string,parameters:JsonObject){
  if(!libraryReady)throw new Error('Saved games are still loading. Try again in a moment.');
  const old=pendingAdmission.current;
  const pending=old&&old.path===path&&JSON.stringify(old.parameters)===JSON.stringify(parameters)?old:{path,parameters,requestId:crypto.randomUUID()};
  pendingAdmission.current=pending;write(ADMISSION_KEY,pending,sessionStorage);
  try{
   const data=await retryOnce(()=>api(path,{...pending.parameters,requestId:pending.requestId}));
   if(!data.session||!data.room)throw new ApiError('Your seat was not confirmed. Retry with the same settings.',503,'INVALID_RESPONSE');
   pendingAdmission.current=null;write(ADMISSION_KEY,null,sessionStorage);
   if(!mounted.current)return;
   persist(data.session);acceptRoom(data.room,true);setSolo(null);select(`room-${data.session.code}-${data.session.playerId}`);setConnection('online');return true;
  }catch(e){
   if(e instanceof ApiError&&!e.uncertain&&e.status!==429){pendingAdmission.current=null;write(ADMISSION_KEY,null,sessionStorage);}
   throw e;
  }
 }
 async function createRoom(name:string,heroClass:HeroClass,options:GameOptions){return guarded(()=>admit('/api/rooms',{name,heroClass,options}));}
 async function joinRoom(code:string,name:string,heroClass:HeroClass){return guarded(()=>admit('/api/rooms/join',{code:code.trim().toUpperCase(),name,heroClass}));}
 async function openSaved(id:string){
  if(deleting.current.has(id))return false;
  await reloadLibrary(id);
  if(deleting.current.has(id))return false;
  const record=records.current.get(id);if(!record)return false;
  if(record.meta.kind==='solo'){
   if(!record.game)return false;closeRoom(false);setSolo(record.game);select(id);setError('');
   if(record.meta.archived)void updateSaved(id,{archived:false});return true;
  }
  if(!record.session){setError('This saved seat is no longer available. Its replay is still saved.');return false;}
  const auth=record.session;
  return !!await guarded(async()=>{
   let data:ApiData;try{data=await api(`/api/rooms/${auth.code}`,undefined,auth);}catch(e){if(e instanceof ApiError&&e.terminal){const current=records.current.get(id);if(current)await saveRecord({...current,session:null,revision:current.revision+1,meta:{...current.meta,status:current.game?.status==='victory'||current.game?.status==='defeat'?current.game.status:'unavailable',yourTurn:false}}).catch(()=>{});}throw e;}if(!data.room)throw new ApiError('This room could not be restored.',503,'INVALID_RESPONSE');
   persist(auth);acceptRoom(data.room,true);setSolo(null);select(id);setConnection('online');
   if(record.meta.archived)await updateSaved(id,{archived:false});return true;
  });
 }
 async function resumeRoom(){const entry=[...records.current.values()].find(r=>r.session?.token===savedSession?.token);return entry?openSaved(entry.meta.id):false;}
 async function startSolo(name:string,heroClass:HeroClass,options:GameOptions){
  if(options.aiEnabled){
   const created=await createRoom(name,heroClass,options);if(!created)return false;
   // A failed start keeps a recoverable lobby instead of creating another quest.
   await command({type:'start'});return true;
  }
  try{
   if(!libraryReady)throw new Error('Saved games are still loading. Try again in a moment.');
   const players:PlayerSpec[]=[{id:'you',name,heroClass,color:HERO_COLORS[0],bot:false}];
   const classes:HeroClass[]=['cleric','ranger','mage','knight'],names=['Juniper','Pip','Orla','Wren','Clover','Bramble','Moss','Cricket','Rue'];
   for(let i=0;i<Math.min(9,Math.max(0,options.companions));i++)players.push({id:`companion-${i}`,name:names[i],heroClass:classes[i%classes.length],color:HERO_COLORS[i+1],bot:true});
   const initial=createGame(players,options),game=runBots(initial),record=soloRecord(game,newReplay(initial),crypto.randomUUID());
   void saveRecord(record).catch(()=>{});setSolo(game);closeRoom(false);select(record.meta.id);setError('');return true;
  }catch(e){setError(e instanceof Error?e.message:'This adventure could not be started.');return false;}
 }
 function resumeSolo(){const entry=[...records.current.values()].filter(r=>r.meta.kind==='solo'&&!r.meta.archived).sort((a,b)=>b.meta.updatedAt-a.meta.updatedAt)[0];if(entry)void openSaved(entry.meta.id);}
 async function reloadLibrary(reopenId?:string){
  // Wait for every queued save, including saves queued while an earlier write completes.
  let pending=saving.current;await pending.catch(()=>{});while(pending!==saving.current){pending=saving.current;await pending.catch(()=>{});}
  const revision=generation.current;
  try{const all=await store.current!.all();if(!mounted.current||revision!==generation.current)return;
   const next=new Map(all.map(r=>[r.meta.id,r]));persisted.current=new Map(all.map(r=>[r.meta.id,r.revision]));
   for(const [id,conflict]of failedWrites.current){if(conflict&&(id===reopenId||!next.has(id))){failedWrites.current.delete(id);continue;}const unsaved=records.current.get(id);if(unsaved)next.set(id,unsaved);}
   for(const id of deleting.current)next.delete(id);records.current=next;refreshLibrary();
  }catch(e){setError(e instanceof Error?e.message:'Saved games could not be loaded.');}
 }
 function backToLibrary(){closeRoom(false);setSolo(null);select(null);void reloadLibrary();}
 useEffect(()=>{if(!inLibrary||!libraryReady)return;const refresh=()=>{if(!document.hidden)void reloadLibrary();};window.addEventListener('focus',refresh);return()=>window.removeEventListener('focus',refresh);},[inLibrary,libraryReady]);
 async function updateSaved(id:string,changes:{title?:string;pinned?:boolean;archived?:boolean}){
  const record=records.current.get(id);if(!record)return false;
  const title=changes.title===undefined?record.meta.title:changes.title.trim().slice(0,80);if(!title){setError('Give this game a name.');return false;}
  if(changes.archived&&active.current===id)backToLibrary();
  try{await saveRecord({...record,revision:record.revision+1,meta:{...record.meta,...changes,title}});return true;}catch{return false;}
 }
 async function deleteSaved(id:string){
  const record=records.current.get(id);deleting.current.add(id);generation.current++;
  if(active.current===id)backToLibrary();
  try{await saving.current.catch(()=>{});await store.current!.delete(id);records.current.delete(id);persisted.current.delete(id);failedWrites.current.delete(id);generation.current++;
   if(record?.session){for(const storage of [sessionStorage,localStorage]){const value=read(SESSION_KEY,storage);if(validSession(value)&&value.token===record.session.token)write(SESSION_KEY,null,storage);}const command=pendingCommand.current;if(command?.code===record.session.code&&command.playerId===record.session.playerId){pendingCommand.current=null;write(COMMAND_KEY,null,sessionStorage);}write(`${COMMAND_KEY}.${record.session.code}.${record.session.playerId}`,null,sessionStorage);}
   if(id==='legacy-solo')write(SOLO_KEY,null,localStorage);
   refreshLibrary();return true;
  }catch(e){setError(e instanceof Error?e.message:'Could not delete this saved game.');return false;}finally{deleting.current.delete(id);}
 }
 async function replayFor(id:string){await saving.current.catch(()=>{});return records.current.get(id)?.replay??null;}
 async function command(value:unknown){
  return guarded(async()=>{
   const s=latest.current.session,r=latest.current.room;if(!s||!r)return;
   const commandKey=`${COMMAND_KEY}.${s.code}.${s.playerId}`,cached=read(commandKey,sessionStorage);
   const old=object(cached)&&cached.code===s.code&&cached.playerId===s.playerId&&object(cached.payload)&&typeof cached.payload.requestId==='string'&&Number.isInteger(cached.payload.version)?cached as PendingCommand:pendingCommand.current;
   const recovering=!!old&&old.code===s.code&&old.playerId===s.playerId;
   const pending:PendingCommand=recovering?old:{code:s.code,playerId:s.playerId,payload:{requestId:crypto.randomUUID(),version:r.version,command:value}};
   const differentIntent=recovering&&JSON.stringify(pending.payload.command)!==JSON.stringify(value);
   pendingCommand.current=pending;write(COMMAND_KEY,pending,sessionStorage);write(commandKey,pending,sessionStorage);
   let data:ApiData;
   try{data=await retryOnce(()=>api(`/api/rooms/${s.code}`,pending.payload,s));}
   catch(e){if(e instanceof ApiError&&!e.uncertain&&e.status!==429){pendingCommand.current=null;write(COMMAND_KEY,null,sessionStorage);write(commandKey,null,sessionStorage);}throw e;}
   pendingCommand.current=null;write(COMMAND_KEY,null,sessionStorage);write(commandKey,null,sessionStorage);
   if(!mounted.current||latest.current.session?.token!==s.token)return;
   if(data.room)acceptRoom(data.room);
   if(data.left)closeRoom(true);
   if(differentIntent&&!data.left)throw new Error('Your previous action has been recovered. Please choose your next action again.');
   return true;
  });
 }
 function action(value:GameAction){
  if(latest.current.room)return command({type:'action',action:value});
  const record=active.current?records.current.get(active.current):undefined;
  if(record?.game&&record.replay){try{const game=runBots(applyAction(record.game,'you',value)),replay=appendReplay(record.replay,{type:'action',playerId:'you',action:value});setSolo(game);void saveRecord(updateSoloRecord(record,game,replay)).catch(()=>{});setError('');}catch(e){setError(e instanceof Error?e.message:'That action is unavailable.');}}
 }
 async function narrate(){
  if(latest.current.room)return command({type:'narrate'});
  const record=active.current?records.current.get(active.current):undefined;
  if(!record?.game?.story||!record.replay)return;
  if(record.game.story.narrations.some(n=>n.eventId===record.game!.eventSequence))return;
  if(record.game.story.narrations.length>=100){setError('This adventure has reached its narration limit.');return;}
  const narration=narrationFixture(record.game),game=acceptNarration(record.game,narration),replay=appendReplay(record.replay,{type:'narration',record:narration});
  setSolo(game);await saveRecord(updateSoloRecord(record,game,replay));
 }
 async function steer(text:string){
  if(latest.current.room)return command({type:'steer',text});
  const record=active.current?records.current.get(active.current):undefined;
  if(!record?.game||!record.replay)return false;
  try{const game=applyStoryDirection(record.game,text),replay=appendReplay(record.replay,{type:'steer',text});setSolo(game);await saveRecord(updateSoloRecord(record,game,replay));setError('');return true;}
  catch(error){setError(error instanceof Error?error.message:'Could not save story direction.');return false;}
 }
 // Refresh waiting rooms without heartbeat: being at Games must not claim a player is present at every table.
 useEffect(()=>{
  if(!inLibrary||!libraryReady)return;
  let stopped=false,timer:ReturnType<typeof setTimeout>|undefined,index=0;
  const poll=async()=>{
   if(stopped)return;
   if(!document.hidden){
    const waiting=[...records.current.values()].filter(r=>r.session&&!r.meta.archived&&!deleting.current.has(r.meta.id)&&['playing','lobby'].includes(r.meta.status));
    const record=waiting.length?waiting[index++%waiting.length]:null;
    if(record?.session){try{
     const data=await api(`/api/rooms/${record.session.code}?version=${record.room?.version??-1}&background=1`,undefined,record.session);
     if(!stopped&&data.room&&records.current.has(record.meta.id))saveRoom(data.room,record.session);
    }catch(e){if(!stopped&&e instanceof ApiError&&e.terminal){const current=records.current.get(record.meta.id);if(current)void saveRecord({...current,session:null,revision:current.revision+1,meta:{...current.meta,status:current.game?.status==='playing'||!current.game?'unavailable':current.game.status,yourTurn:false}}).catch(()=>{});}}}
   }
   if(!stopped)timer=setTimeout(poll,2500);
  };void poll();return()=>{stopped=true;if(timer)clearTimeout(timer);};
 },[inLibrary,libraryReady]);
 useEffect(()=>{
  if(!session)return;
  let stopped=false,timer:ReturnType<typeof setTimeout>|undefined,controller:AbortController|undefined,failures=0;
  const poll=async()=>{
   if(stopped)return;
   if(document.hidden){timer=setTimeout(poll,4000);return;}
   const current=latest.current.room;let delay=1200;
   try{
    controller=new AbortController();
    const data=await api(`/api/rooms/${session.code}?version=${current?.version??-1}`,undefined,session,controller.signal);
    if(stopped||latest.current.session?.token!==session.token)return;
    if(data.room)acceptRoom(data.room);
    else if(data.unchanged&&data.players&&data.version===latest.current.room?.version){
     const previous=latest.current.room;
     if(previous)acceptRoom({...previous,players:mergePresence(previous.players,data.players),hostId:data.hostId??previous.hostId});
    }
    failures=0;setConnection('online');
   }catch(e){
    if(stopped||latest.current.session?.token!==session.token)return;
    if(e instanceof ApiError&&e.terminal){stopped=true;handleError(e);return;}
    failures++;
    if(failures>=6){stopped=true;closeRoom(false);setError('The connection is still unavailable. Your seat is saved; return to the menu and reconnect when you’re ready.');return;}
    setConnection('reconnecting');delay=e instanceof ApiError&&e.retryAfter?e.retryAfter*1000:Math.min(15_000,1200*2**failures);
   }finally{if(!stopped&&latest.current.session?.token===session.token)timer=setTimeout(poll,delay);}
  };
  timer=setTimeout(poll,1000);
  return()=>{stopped=true;if(timer)clearTimeout(timer);controller?.abort();};
 },[session]);
 return {game:room?.game||solo,room,session,saved,savedSession,busy,error,setError,connection,startSolo,resumeSolo,createRoom,joinRoom,resumeRoom,command,action,narrate,steer,library,libraryReady,activeId,openSaved,backToLibrary,updateSaved,deleteSaved,replayFor};
}
