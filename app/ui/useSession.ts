'use client';
import { useEffect, useRef, useState } from 'react';
import type { GameState, GameOptions, HeroClass, RoomView, RoomPlayer, Session, GameAction, PlayerSpec } from '../../game/types';
import { HERO_COLORS } from '../../game/types';
import { createGame, applyAction, runBots } from '../../game/engine';

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
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[connection,setConnection]=useState<'online'|'reconnecting'|'local'>('local');
 const latest=useRef({room,session});latest.current={room,session};
 const lock=useRef(false),mounted=useRef(true),controllers=useRef(new Set<AbortController>());
 const pendingAdmission=useRef<PendingAdmission|null>(null),pendingCommand=useRef<PendingCommand|null>(null);
 useEffect(()=>{
  mounted.current=true;
  const s=read(SOLO_KEY,localStorage);if(validGame(s))setSaved(s);
  const r=read(SESSION_KEY,sessionStorage)||read(SESSION_KEY,localStorage);if(validSession(r))setSavedSession(r);
  const admission=read(ADMISSION_KEY,sessionStorage);
  if(object(admission)&&typeof admission.path==='string'&&['/api/rooms','/api/rooms/join'].includes(admission.path)&&object(admission.parameters)&&typeof admission.requestId==='string')pendingAdmission.current=admission as PendingAdmission;
  const command=read(COMMAND_KEY,sessionStorage);
  if(object(command)&&typeof command.code==='string'&&typeof command.playerId==='string'&&object(command.payload)&&typeof command.payload.requestId==='string'&&Number.isInteger(command.payload.version))pendingCommand.current=command as PendingCommand;
  return()=>{mounted.current=false;for(const controller of controllers.current)controller.abort();controllers.current.clear();};
 },[]);
 useEffect(()=>{if(solo){if(write(SOLO_KEY,solo,localStorage))setSaved(solo);else setError('Your browser could not save this adventure. Keep this tab open.');}},[solo]);

 function acceptRoom(incoming:RoomView,replace=false){
  if(!mounted.current)return;
  if(!replace&&latest.current.session?.code!==incoming.code)return;
  const previous=latest.current.room;
  if(!replace&&previous?.code===incoming.code&&previous.version>incoming.version)return;
  const next=previous?.code===incoming.code&&previous.version===incoming.version?{...incoming,players:mergePresence(previous.players,incoming.players)}:incoming;
  latest.current.room=next;setRoom(next);
 }
 function closeRoom(forget:boolean){
  const departing=latest.current.session??savedSession;
  latest.current={room:null,session:null};setRoom(null);setSession(null);setConnection('local');
  if(forget){
   setSavedSession(null);
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
  const timeout=setTimeout(()=>controller.abort(),10_000);
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
  const old=pendingAdmission.current;
  const pending=old&&old.path===path&&JSON.stringify(old.parameters)===JSON.stringify(parameters)?old:{path,parameters,requestId:crypto.randomUUID()};
  pendingAdmission.current=pending;write(ADMISSION_KEY,pending,sessionStorage);
  try{
   const data=await retryOnce(()=>api(path,{...pending.parameters,requestId:pending.requestId}));
   if(!data.session||!data.room)throw new ApiError('Your seat was not confirmed. Retry with the same settings.',503,'INVALID_RESPONSE');
   pendingAdmission.current=null;write(ADMISSION_KEY,null,sessionStorage);
   if(!mounted.current)return;
   persist(data.session);acceptRoom(data.room,true);setSolo(null);setConnection('online');return true;
  }catch(e){
   if(e instanceof ApiError&&!e.uncertain&&e.status!==429){pendingAdmission.current=null;write(ADMISSION_KEY,null,sessionStorage);}
   throw e;
  }
 }
 async function createRoom(name:string,heroClass:HeroClass,options:GameOptions){return guarded(()=>admit('/api/rooms',{name,heroClass,options}));}
 async function joinRoom(code:string,name:string,heroClass:HeroClass){return guarded(()=>admit('/api/rooms/join',{code:code.trim().toUpperCase(),name,heroClass}));}
 async function resumeRoom(){
  if(!savedSession)return;
  return guarded(async()=>{const data=await api(`/api/rooms/${savedSession.code}`,undefined,savedSession);if(!data.room)throw new ApiError('This room could not be restored.',503,'INVALID_RESPONSE');persist(savedSession);acceptRoom(data.room,true);setSolo(null);setConnection('online');return true;});
 }
 function startSolo(name:string,heroClass:HeroClass,options:GameOptions){
  try{
   const players:PlayerSpec[]=[{id:'you',name,heroClass,color:HERO_COLORS[0],bot:false}];
   const classes:HeroClass[]=['cleric','ranger','mage','knight'],names=['Juniper','Pip','Orla','Wren','Clover','Bramble','Moss','Cricket','Rue'];
   for(let i=0;i<Math.min(9,Math.max(0,options.companions));i++)players.push({id:`companion-${i}`,name:names[i],heroClass:classes[i%classes.length],color:HERO_COLORS[i+1],bot:true});
   setSolo(runBots(createGame(players,options)));closeRoom(false);setError('');return true;
  }catch(e){setError(e instanceof Error?e.message:'This adventure could not be started.');return false;}
 }
 function resumeSolo(){if(saved){setSolo(saved);closeRoom(false);}}
 async function command(value:unknown){
  return guarded(async()=>{
   const s=latest.current.session,r=latest.current.room;if(!s||!r)return;
   const old=pendingCommand.current;
   const recovering=!!old&&old.code===s.code&&old.playerId===s.playerId;
   const pending:PendingCommand=recovering?old:{code:s.code,playerId:s.playerId,payload:{requestId:crypto.randomUUID(),version:r.version,command:value}};
   const differentIntent=recovering&&JSON.stringify(pending.payload.command)!==JSON.stringify(value);
   pendingCommand.current=pending;write(COMMAND_KEY,pending,sessionStorage);
   let data:ApiData;
   try{data=await retryOnce(()=>api(`/api/rooms/${s.code}`,pending.payload,s));}
   catch(e){if(e instanceof ApiError&&!e.uncertain&&e.status!==429){pendingCommand.current=null;write(COMMAND_KEY,null,sessionStorage);}throw e;}
   pendingCommand.current=null;write(COMMAND_KEY,null,sessionStorage);
   if(!mounted.current||latest.current.session?.token!==s.token)return;
   if(data.room)acceptRoom(data.room);
   if(data.left)closeRoom(true);
   if(differentIntent&&!data.left)throw new Error('Your previous action has been recovered. Please choose your next action again.');
   return true;
  });
 }
 function action(value:GameAction){
  if(latest.current.room)return command({type:'action',action:value});
  if(solo){try{setSolo(runBots(applyAction(solo,'you',value)));setError('');}catch(e){setError(e instanceof Error?e.message:'That action is unavailable.');}}
 }
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
 return {game:room?.game||solo,room,session,saved,savedSession,busy,error,setError,connection,startSolo,resumeSolo,createRoom,joinRoom,resumeRoom,command,action};
}
