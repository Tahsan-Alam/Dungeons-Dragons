export type RulesMode = 'simple' | 'classic';
export type HeroClass = 'knight' | 'ranger' | 'mage' | 'cleric';
export type Narrator = 'warm' | 'dramatic' | 'wry';
export type Biome = 'woodland' | 'ruins' | 'coast';
export interface GameOptions { rules: RulesMode; seed: string; narrator: Narrator; biome: Biome; companions: number; }
export interface PlayerSpec { id: string; name: string; heroClass: HeroClass; color: string; bot: boolean; }
export interface Tile { x: number; y: number; kind: 'grass' | 'path' | 'water' | 'wall'; decoration?: 'tree' | 'rock' | 'flower' | 'mushroom' | 'ruin'; }
export interface Actor { id: string; playerId?: string; name: string; heroClass: HeroClass; color: string; enemy: boolean; bot: boolean; x: number; y: number; hp: number; maxHp: number; ac: number; speed: number; movement: number; actionUsed: boolean; guarding: boolean; potions: number; abilityUses: number; initiative: number; deathSuccesses: number; deathFailures: number; defeated: boolean; }
export interface GameEvent { id: number; kind: 'story' | 'action' | 'roll' | 'system'; text: string; actorId?: string; roll?: number; }
export interface GameState { schemaVersion: 1; options: GameOptions; rng: number; status: 'playing' | 'victory' | 'defeat'; width: number; height: number; tiles: Tile[]; actors: Actor[]; activeActorId: string; turnOrder: string[]; round: number; scene: number; sceneName: string; objective: string; relics: number; exit: {x:number;y:number}; chest: {x:number;y:number;opened:boolean}; events: GameEvent[]; eventSequence: number; }
export type GameAction = { type: 'move'; x: number; y: number } | { type: 'attack' | 'ability'; targetId: string } | { type: 'guard' | 'potion' | 'end' | 'interact' | 'advance' };
export interface RoomPlayer extends PlayerSpec { ready: boolean; lastSeen: number; }
export interface RoomView { code: string; hostId: string; version: number; players: RoomPlayer[]; options: GameOptions; game: GameState | null; createdAt: number; }
export interface Session { code: string; playerId: string; token: string; }
export const DEFAULT_OPTIONS: GameOptions = {rules:'simple', seed:'moss-and-moonlight', narrator:'warm', biome:'woodland', companions:2};
export const HERO_COLORS = ['#ef997c','#a3bbf0','#edcf75','#b19bd3','#8ac4ae','#f0a6b2','#87bdcf','#cbad81','#b2c877','#a4a4bf'];
export const CLASS_INFO: Record<HeroClass,{name:string; description:string; ability:string; range:number}> = {
 knight: {name:'Knight',description:'Sturdy defender · close combat',ability:'Power strike',range:1},
 ranger: {name:'Ranger',description:'Quick-footed scout · ranged bow',ability:'Aimed shot',range:5},
 mage: {name:'Mage',description:'Arcane mischief · ranged magic',ability:'Arcane burst',range:4},
 cleric: {name:'Cleric',description:'Party healer · close combat',ability:'Healing light',range:1},
};
