import { DEFAULT_OPTIONS, HERO_COLORS } from '../game/types.ts';
import type { GameAction, GameOptions, HeroClass, RoomPlayer, RoomView, Session } from '../game/types.ts';
import { applyAction, createGame, runBots } from '../game/engine.ts';
import type { RoomStore, StoredRoom } from './room-store.ts';

export const ROOM_CAPACITY = 10;
export const ROOM_LIFETIME = 72 * 60 * 60 * 1000;
export const OFFLINE_AFTER = 45_000;
const HOST_TRANSFER_AFTER = 90_000;
const CLASSES: HeroClass[] = ['knight', 'ranger', 'mage', 'cleric'];
const BOT_NAMES = ['Pip', 'Clover', 'Wren', 'Moss', 'Bramble', 'Fern', 'Otto', 'Cricket', 'Rue'];
export type RoomCommand =
  | {type:'ready'; ready:boolean}
  | {type:'options'; options:GameOptions}
  | {type:'addBot'; heroClass?:HeroClass}
  | {type:'remove'; playerId:string}
  | {type:'start' | 'leave' | 'skip'}
  | {type:'action'; action:GameAction};

export class RoomError extends Error {
  status: number;
  code: string;
  room?: RoomView;
  constructor(message: string, status = 400, code = 'INVALID_REQUEST', room?: RoomView) {
    super(message); this.status = status; this.code = code; this.room = room;
  }
}
const reject = (message: string, status = 400, code = 'INVALID_REQUEST'): never => { throw new RoomError(message, status, code); };
const hash = async (text: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))).map(n => n.toString(16).padStart(2, '0')).join('');
const makeCode = (digest:string) => Array.from({length:6},(_,i)=>'ABCDEFGHJKLMNPQRSTUVWXYZ'[parseInt(digest.slice(i*2,i*2+2),16)%24]).join('');
function requestIdOf(input:unknown):string {
  if(input===undefined)return crypto.randomUUID();
  if(typeof input!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input))return reject('Use a newly generated random UUID for the request ID.');
  return input.toLowerCase();
}
async function admission(kind:'create'|'join',requestId:unknown,payload:unknown,scope='') {
  const id=requestIdOf(requestId);
  // A client-generated random UUID is the recovery secret, never a room code.
  // Domain separation produces stable credentials without storing plaintext.
  return {requestHash:await hash(`request:${kind}:${scope}:${id}`),payloadHash:await hash(JSON.stringify(payload)),
    playerId:await hash(`player:${kind}:${scope}:${id}`),token:await hash(`token:${kind}:${scope}:${id}`)};
}
const publicView = (record: StoredRoom): RoomView => structuredClone(record.room);
function nameOf(input: unknown): string {
  if (typeof input !== 'string') return reject('Enter a character name.');
  const value = input.trim();
  if (!value || value.length > 28 || /[\u0000-\u001f]/.test(value)) return reject('Use a character name between 1 and 28 letters.');
  return value;
}
function classOf(input: unknown): HeroClass {
  if (!CLASSES.includes(input as HeroClass)) return reject('Choose a valid character class.');
  return input as HeroClass;
}
export function validateOptions(input: unknown): GameOptions {
  if (!input || typeof input !== 'object') return reject('Choose adventure options.');
  const o = input as GameOptions;
  if (!['simple','classic'].includes(o.rules) || !['warm','dramatic','wry'].includes(o.narrator) || !['woodland','ruins','coast'].includes(o.biome)) return reject('These adventure options are not supported.');
  if (typeof o.seed !== 'string' || !o.seed.trim() || o.seed.length > 64 || /[\u0000-\u001f]/.test(o.seed)) return reject('Use an adventure seed between 1 and 64 characters.');
  if (!Number.isInteger(o.companions) || o.companions < 0 || o.companions > 9) return reject('Choose between 0 and 9 companions.');
  return {rules:o.rules, narrator:o.narrator, biome:o.biome, seed:o.seed.trim(), companions:o.companions};
}
function validateAction(input: unknown): GameAction {
  if (!input || typeof input !== 'object') return reject('Choose a game action.');
  const a = input as Record<string, unknown>;
  if (a.type === 'move') {
    if (!Number.isInteger(a.x) || !Number.isInteger(a.y) || Number(a.x) < 0 || Number(a.x) > 100 || Number(a.y) < 0 || Number(a.y) > 100) return reject('Choose a tile on the board.');
    return {type:'move',x:Number(a.x),y:Number(a.y)};
  }
  if (a.type === 'attack' || a.type === 'ability') {
    if (typeof a.targetId !== 'string' || a.targetId.length > 100) return reject('Choose a valid target.');
    return {type:a.type,targetId:a.targetId};
  }
  if (['guard','potion','end','interact','advance'].includes(String(a.type))) return {type:a.type} as GameAction;
  return reject('That action is not supported.');
}
function addBot(room: RoomView, heroClass?: HeroClass) {
  if (room.players.length >= ROOM_CAPACITY) return reject('This party already has 10 adventurers.', 409, 'ROOM_FULL');
  const index = room.players.length;
  const usedNames = new Set(room.players.map(p => p.name));
  const name = BOT_NAMES.find(n => !usedNames.has(n)) ?? `Companion ${index}`;
  const color=HERO_COLORS.find(c=>!room.players.some(p=>p.color===c))??HERO_COLORS[index];
  room.players.push({id:crypto.randomUUID(),name,heroClass:heroClass ?? CLASSES[index % 4],color,bot:true,ready:true,lastSeen:0});
}

export class RoomService {
  store: RoomStore;
  now: () => number;
  constructor(store: RoomStore, now: () => number = Date.now) { this.store=store; this.now=now; }

  async create(input: {name:unknown;heroClass:unknown;options?:unknown;requestId?:unknown}): Promise<{session:Session;room:RoomView}> {
    const name=nameOf(input.name), heroClass=classOf(input.heroClass);
    const options=validateOptions(input.options ?? DEFAULT_OPTIONS);
    const receipt=await admission('create',input.requestId,{name,heroClass,options});
    const {playerId,token}=receipt,tokenHash=await hash(token),now=this.now();
    for(let i=0;i<12;i++) {
      const code=makeCode(await hash(`${receipt.requestHash}:${i}`));
      const existing=await this.store.read(code);
      if(existing) {
        const previous=existing.admissions?.find(r=>r.kind==='create'&&r.requestHash===receipt.requestHash);
        if(previous) {
          this.replayAdmission(existing,previous,receipt.payloadHash,tokenHash);
          return {session:{code,playerId,token},room:publicView(existing)};
        }
        continue;
      }
      const room:RoomView={code,hostId:playerId,version:1,players:[{id:playerId,name,heroClass,color:HERO_COLORS[0],bot:false,ready:true,lastSeen:now}],options,game:null,createdAt:now};
      for(let j=0;j<options.companions;j++) addBot(room);
      const record:StoredRoom={revision:1,room,tokenHashes:{[playerId]:tokenHash},requests:[],admissions:[{kind:'create',requestHash:receipt.requestHash,payloadHash:receipt.payloadHash,playerId}],expiresAt:now+ROOM_LIFETIME};
      if(await this.store.insert(record)) return {session:{code,playerId,token},room:publicView(record)};
      // Another worker may have handled this same request between read/insert.
      const won=await this.store.read(code);
      const previous=won?.admissions?.find(r=>r.kind==='create'&&r.requestHash===receipt.requestHash);
      if(won&&previous){this.replayAdmission(won,previous,receipt.payloadHash,tokenHash);return {session:{code,playerId,token},room:publicView(won)};}
    }
    return reject('Could not create a room. Please try again.',503,'BUSY');
  }

  async join(input: {code:unknown;name:unknown;heroClass:unknown;requestId?:unknown}): Promise<{session:Session;room:RoomView}> {
    const code=this.code(input.code), name=nameOf(input.name),heroClass=classOf(input.heroClass);
    const receipt=await admission('join',input.requestId,{name,heroClass},code);
    const {playerId,token}=receipt,tokenHash=await hash(token);
    for(let i=0;i<20;i++) {
      const record=await this.load(code), next=structuredClone(record), now=this.now();
      const previous=record.admissions?.find(r=>r.kind==='join'&&r.requestHash===receipt.requestHash);
      if(previous){this.replayAdmission(record,previous,receipt.payloadHash,tokenHash);return {session:{code,playerId,token},room:publicView(record)};}
      if(next.room.game) return reject('This adventure has started. Reconnect using the browser where you joined, or start a new room.',409,'ALREADY_STARTED');
      if(next.room.players.length>=ROOM_CAPACITY) return reject('This party is full. The host can remove a companion to make room.',409,'ROOM_FULL');
      const color=HERO_COLORS.find(c=>!next.room.players.some(p=>p.color===c)) ?? HERO_COLORS[next.room.players.length];
      next.room.players.push({id:playerId,name,heroClass,color,bot:false,ready:false,lastSeen:now});
      next.tokenHashes[playerId]=tokenHash;
      const admissions=next.admissions??[];
      next.admissions=[...admissions.filter(r=>r.kind==='create'),...admissions.filter(r=>r.kind==='join').slice(-126),{kind:'join',requestHash:receipt.requestHash,payloadHash:receipt.payloadHash,playerId}];
      this.transferHost(next,now);
      next.room.version++;
      this.bump(next,now);
      if(await this.store.compareAndSwap(code,record.revision,next)) return {session:{code,playerId,token},room:publicView(next)};
    }
    return reject('The room is busy. Try joining again.',503,'BUSY');
  }

  async get(codeInput: unknown, token: string, knownVersion?: number): Promise<{room:RoomView}|{unchanged:true;version:number;players:RoomPlayer[];hostId:string}> {
    const code=this.code(codeInput), tokenHash=await hash(token);
    for(let i=0;i<16;i++) {
      const record=await this.load(code), playerId=this.authenticate(record,tokenHash), next=structuredClone(record),now=this.now();
      const player=next.room.players.find(p=>p.id===playerId)!;
      let touched=false;
      if(now-player.lastSeen>=15_000) {player.lastSeen=now;touched=true;}
      if(this.transferHost(next,now)) {next.room.version++;touched=true;}
      if(touched) {
        this.bump(next,now);
        if(!await this.store.compareAndSwap(code,record.revision,next)) continue;
      }
      if(knownVersion===next.room.version) return {unchanged:true,version:next.room.version,players:structuredClone(next.room.players),hostId:next.room.hostId};
      return {room:publicView(next)};
    }
    return reject('The room is busy. Reconnecting…',503,'BUSY');
  }

  async command(codeInput: unknown, token: string, input: {requestId:unknown;version:unknown;command:unknown}): Promise<{room:RoomView}|{left:true}> {
    const code=this.code(codeInput),tokenHash=await hash(token);
    if(typeof input.requestId!=='string' || input.requestId.length<8 || input.requestId.length>100) return reject('A unique request ID is required.');
    if(!Number.isInteger(input.version) || Number(input.version)<1) return reject('A valid room version is required.');
    if(!input.command || typeof input.command!=='object') return reject('Choose a room action.');
    const command=input.command as RoomCommand;
    for(let i=0;i<16;i++) {
      const record=await this.load(code);
      // A repeated leave remains successful after its token has been removed.
      if(command.type==='leave' && record.requests.some(r=>r.id===input.requestId && r.playerId===`left:${tokenHash}`)) return {left:true};
      const playerId=this.authenticate(record,tokenHash);
      if(record.requests.some(r=>r.id===input.requestId && r.playerId===playerId)) return {room:publicView(record)};
      if(record.room.version!==input.version) throw new RoomError('The room changed. Your view has been refreshed; try your action again.',409,'STALE_VERSION',publicView(record));
      const next=structuredClone(record), room=next.room,now=this.now();
      const player=room.players.find(p=>p.id===playerId)!;
      player.lastSeen=now;
      const requireHost=()=>{if(room.hostId!==playerId) reject('Only the host can do that.',403,'HOST_ONLY');};
      const requireLobby=()=>{if(room.game) reject('That setting is locked once the adventure starts.',409,'ALREADY_STARTED');};
      switch(command.type) {
        case 'ready':
          requireLobby();
          if(typeof command.ready!=='boolean') return reject('Choose ready or not ready.');
          player.ready=command.ready; break;
        case 'options':
          requireHost();requireLobby();room.options=validateOptions(command.options); break;
        case 'addBot':
          requireHost();requireLobby();addBot(room,command.heroClass===undefined?undefined:classOf(command.heroClass));break;
        case 'remove': {
          requireHost();requireLobby();
          if(command.playerId===playerId) return reject('Use Leave to leave your room.');
          const target=room.players.find(p=>p.id===command.playerId);
          if(!target) return reject('That player is no longer in the room.');
          room.players=room.players.filter(p=>p.id!==command.playerId);
          delete next.tokenHashes[command.playerId]; break;
        }
        case 'start':
          requireHost();requireLobby();
          if(room.players.some(p=>!p.ready && !p.bot)) return reject('Wait for everyone to be ready.',409,'NOT_READY');
          room.game=runBots(createGame(room.players,room.options));break;
        case 'action':
          if(!room.game) return reject('Start the adventure first.',409,'NOT_STARTED');
          try {room.game=runBots(applyAction(room.game,playerId,validateAction(command.action)));}
          catch(error) {if(error instanceof RoomError)throw error;return reject(error instanceof Error?error.message:'That move is not available.');}
          break;
        case 'skip': {
          requireHost();
          if(!room.game || room.game.status!=='playing') return reject('There is no active turn to skip.');
          const actor=room.game.actors.find(a=>a.id===room.game!.activeActorId);
          const owner=room.players.find(p=>p.id===actor?.playerId);
          if(!actor || !owner || owner.bot || now-owner.lastSeen<OFFLINE_AFTER) return reject('A turn can be skipped only after its player has been offline for 45 seconds.',409,'PLAYER_ONLINE');
          room.game=runBots(applyAction(room.game,owner.id,{type:'end'}));break;
        }
        case 'leave': {
          room.players=room.players.filter(p=>p.id!==playerId);delete next.tokenHashes[playerId];
          if(room.game) {
            const actor=room.game.actors.find(a=>a.playerId===playerId);
            if(actor)actor.bot=true;
            if(room.players.some(p=>!p.bot))room.game=runBots(room.game);
          }
          if(room.hostId===playerId)room.hostId=room.players.find(p=>!p.bot)?.id ?? '';
          break;
        }
        default:return reject('That room command is not supported.');
      }
      next.requests.push({id:input.requestId,playerId:command.type==='leave'?`left:${tokenHash}`:playerId});
      next.requests=next.requests.slice(-128);
      room.version++;
      this.bump(next,now);
      if(!room.players.some(p=>!p.bot))next.expiresAt=now+60_000;
      if(await this.store.compareAndSwap(code,record.revision,next)) return command.type==='leave'?{left:true}:{room:publicView(next)};
    }
    return reject('The room is busy. Please try again.',503,'BUSY');
  }

  private code(input:unknown) {
    if(typeof input!=='string')return reject('Enter a six-letter room code.');
    const code=input.trim().toUpperCase();
    if(!/^[A-Z]{6}$/.test(code))return reject('Enter a six-letter room code.');
    return code;
  }
  private async load(code:string) {
    const room=await this.store.read(code);
    if(!room || room.expiresAt<=this.now())return reject('This room could not be found or has expired.',404,'ROOM_NOT_FOUND');
    return room;
  }
  private authenticate(record:StoredRoom,tokenHash:string) {
    const playerId=Object.keys(record.tokenHashes).find(id=>record.tokenHashes[id]===tokenHash);
    if(!playerId || !record.room.players.some(p=>p.id===playerId&&!p.bot))return reject('Your seat is no longer available. Rejoin the lobby with its room code.',401,'UNAUTHORIZED');
    return playerId;
  }
  private replayAdmission(record:StoredRoom,receipt:{playerId:string;payloadHash:string},payloadHash:string,tokenHash:string) {
    if(record.expiresAt<=this.now())return reject('That room has expired. Start a new adventure.',404,'ROOM_NOT_FOUND');
    if(receipt.payloadHash!==payloadHash)return reject('That request ID was already used with different options. Start a new request.',409,'IDEMPOTENCY_CONFLICT');
    if(record.tokenHashes[receipt.playerId]!==tokenHash)return reject('That seat was left or removed. Join again with a new request.',409,'SEAT_LEFT');
  }
  private bump(record:StoredRoom,now:number) {record.revision++;record.expiresAt=now+ROOM_LIFETIME;}
  private transferHost(record:StoredRoom,now:number) {
    const host=record.room.players.find(p=>p.id===record.room.hostId);
    if(host && now-host.lastSeen<HOST_TRANSFER_AFTER)return false;
    const next=record.room.players.find(p=>!p.bot&&now-p.lastSeen<OFFLINE_AFTER);
    if(!next || next.id===record.room.hostId)return false;
    record.room.hostId=next.id;return true;
  }
}
