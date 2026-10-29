import type {GameState,HeroClass,RoomView,Session,ReplayArchive} from './types.ts';
import {newReplay} from './replay.ts';

export interface SavedAdventure {
 id:string;title:string;kind:'solo'|'online';status:'playing'|'victory'|'defeat'|'lobby'|'unavailable';
 createdAt:number;updatedAt:number;pinned:boolean;archived:boolean;heroName:string;heroClass:HeroClass;
 sceneName:string;scene:number;round:number;roomCode?:string;yourTurn:boolean;recordedActions:number;
}
export interface AdventureRecord {
 meta:SavedAdventure;game:GameState|null;room:RoomView|null;session:Session|null;replay:ReplayArchive|null;revision:number;
}
export const LIBRARY_DB='painted-realms.library.v1';
export const LEGACY_SOLO='painted-realms.solo.v1';
export const LEGACY_ROOM='painted-realms.room.v1';
export function isSavedGame(value:unknown):value is GameState {
 if(!value||typeof value!=='object')return false;
 const v=value as GameState;
 return v.schemaVersion===1&&['playing','victory','defeat'].includes(v.status)&&!!v.options&&Number.isFinite(v.rng)&&Number.isInteger(v.eventSequence)&&Array.isArray(v.actors)&&v.actors.length>0&&v.actors.every(a=>typeof a.id==='string'&&typeof a.name==='string'&&Number.isFinite(a.hp)&&Number.isFinite(a.x))&&Array.isArray(v.events)&&Array.isArray(v.turnOrder)&&Array.isArray(v.tiles)&&v.tiles.length===v.width*v.height&&v.width>0&&v.width<=100&&v.height>0&&v.height<=100&&typeof v.activeActorId==='string'&&!!v.exit&&!!v.chest;
}
export function isSession(value:unknown):value is Session {
 if(!value||typeof value!=='object')return false;const v=value as Session;
 return /^[A-Z]{6}$/.test(v.code)&&typeof v.playerId==='string'&&/^[a-f0-9]{64}$/.test(v.token);
}
export function soloRecord(game:GameState,replay:ReplayArchive,id:string,now=Date.now()):AdventureRecord {
 const me=game.actors.find(a=>a.playerId==='you')??game.actors.find(a=>!a.enemy)!;
 return {meta:{id,title:`${me.name} · ${game.sceneName}`,kind:'solo',status:game.status,createdAt:now,updatedAt:now,pinned:false,archived:false,heroName:me.name,heroClass:me.heroClass,sceneName:game.sceneName,scene:game.scene,round:game.round,yourTurn:game.status==='playing',recordedActions:replay.commands.length},game,room:null,session:null,replay,revision:1};
}
export function roomRecord(room:RoomView|null,session:Session,previous?:AdventureRecord,now=Date.now()):AdventureRecord {
 const game=room?.game??previous?.game??null;
 const me=room?.players.find(p=>p.id===session.playerId);
 const replay=room?.replay??previous?.replay??(game?newReplay(game,false):null);
 return {meta:{id:`room-${session.code}-${session.playerId}`,title:previous?.meta.title??`${me?.name??'Online game'} · ${session.code}`,kind:'online',status:room?(game?.status??'lobby'):(previous?.meta.status??'lobby'),createdAt:previous?.meta.createdAt??room?.createdAt??now,updatedAt:now,pinned:previous?.meta.pinned??false,archived:previous?.meta.archived??false,heroName:me?.name??previous?.meta.heroName??'Adventurer',heroClass:me?.heroClass??previous?.meta.heroClass??'ranger',sceneName:game?.sceneName??'Lobby',scene:game?.scene??0,round:game?.round??0,roomCode:session.code,yourTurn:game?.status==='playing'&&game.actors.find(a=>a.id===game.activeActorId)?.playerId===session.playerId,recordedActions:replay?.commands.length??0},game,room:room??previous?.room??null,session,replay,revision:(previous?.revision??0)+1};
}
export function updateSoloRecord(previous:AdventureRecord,game:GameState,replay:ReplayArchive,now=Date.now()):AdventureRecord {
 return {...previous,game,replay,revision:previous.revision+1,meta:{...previous.meta,status:game.status,updatedAt:now,scene:game.scene,sceneName:game.sceneName,round:game.round,yourTurn:game.status==='playing',recordedActions:replay.commands.length}};
}
export function sortedLibrary(records:AdventureRecord[]):SavedAdventure[]{
 return records.map(r=>r.meta).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.updatedAt-a.updatedAt||a.id.localeCompare(b.id));
}
export function legacyRecords(solo:unknown,session:unknown,now=Date.now()):AdventureRecord[]{
 const records:AdventureRecord[]=[];
 if(isSavedGame(solo))records.push(soloRecord(solo,newReplay(solo,false),'legacy-solo',now));
 if(isSession(session))records.push(roomRecord(null,session,undefined,now));
 return records;
}

/** One record per adventure avoids localStorage's small whole-library quota. */
export class AdventureStore {
 private opening:Promise<IDBDatabase>|null=null;
 private open():Promise<IDBDatabase>{
  if(!this.opening)this.opening=new Promise((resolve,reject)=>{
   if(typeof indexedDB==='undefined'){reject(new Error('Saved games are unavailable in this browser.'));return;}
   const request=indexedDB.open(LIBRARY_DB,1);
   request.onupgradeneeded=()=>{request.result.createObjectStore('adventures',{keyPath:'meta.id'});request.result.createObjectStore('settings');};
   request.onerror=()=>{this.opening=null;reject(request.error??new Error('Could not open saved games.'));};
   request.onblocked=()=>{this.opening=null;reject(new Error('Close older Painted Realms tabs to update saved games.'));};
   request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();this.opening=null;};resolve(db);};
  });return this.opening;
 }
 async all():Promise<AdventureRecord[]>{
  const db=await this.open();return new Promise((resolve,reject)=>{const tx=db.transaction('adventures','readonly'),request=tx.objectStore('adventures').getAll();request.onsuccess=()=>resolve(request.result as AdventureRecord[]);request.onerror=()=>reject(request.error);});
 }
 async put(record:AdventureRecord,expectedRevision?:number):Promise<void>{
  const db=await this.open();return new Promise((resolve,reject)=>{
   const tx=db.transaction(['adventures','settings'],'readwrite'),store=tx.objectStore('adventures');let conflict=false,deleted=false;
   const tombstone=tx.objectStore('settings').get(`deleted-${record.meta.id}`);
   tombstone.onsuccess=()=>{
    if(tombstone.result){deleted=true;tx.abort();return;}
    const request=store.get(record.meta.id);
    request.onsuccess=()=>{const previous=request.result as AdventureRecord|undefined;if(expectedRevision!==undefined&&(previous?.revision??0)!==expectedRevision){conflict=true;tx.abort();return;}try{store.put(record);}catch{tx.abort();}};
   };
   tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error??new Error('Could not save this adventure.'));tx.onabort=()=>reject(new Error(deleted?'This saved game was deleted in another tab. Return to Games.':conflict?'This game changed in another tab. Return to Games and reopen it before playing.':'Your browser could not save this game. Keep this tab open and free some storage.'));
  });
 }
 async delete(id:string):Promise<void>{const db=await this.open();return new Promise((resolve,reject)=>{const tx=db.transaction(['adventures','settings'],'readwrite');tx.objectStore('adventures').delete(id);tx.objectStore('settings').put(true,`deleted-${id}`);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??new Error('Could not delete this saved game.'));});}
 async migrate(solo:unknown,session:unknown):Promise<void>{
  const db=await this.open();return new Promise((resolve,reject)=>{
   const tx=db.transaction(['adventures','settings'],'readwrite'),settings=tx.objectStore('settings'),store=tx.objectStore('adventures');const marker=settings.get('legacy-migrated');
   marker.onsuccess=()=>{
    for(const record of legacyRecords(solo,session)){
     if(record.meta.kind==='solo'&&marker.result)continue;
     const key=`migrated-${record.meta.id}`,migrated=settings.get(key);
     migrated.onsuccess=()=>{if(migrated.result)return;const deleted=settings.get(`deleted-${record.meta.id}`);deleted.onsuccess=()=>{if(deleted.result)return;const check=store.get(record.meta.id);check.onsuccess=()=>{if(!check.result)store.put(record);settings.put(true,key);};};};
    }
    settings.put(true,'legacy-migrated');
   };
   tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
  });
 }
 close(){this.opening?.then(db=>db.close());this.opening=null;}
}
