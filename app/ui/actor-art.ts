import type {Actor,Biome} from '../../game/types.ts';
import {HEROES,HERO_ART_RATIO,HERO_FEET,type HeroPreset} from '../../game/presets.ts';
import {ENEMY_ART,type EnemyArtKey} from './enemy-art-data.ts';

/* Which artwork stands for an actor. Presentation only: nothing here reads or changes the rules. */

/** Before the named Keepers (game/keepers.ts), every final guardian was titled "The Hollow Keeper". */
export const KEEPER_NAME='The Hollow Keeper';
export const KEEPER_BY_BIOME:Record<Biome,EnemyArtKey>={woodland:'wolf',ruins:'dragon',coast:'warden'};
/** Board units per tile. Every figure shares this scale. */
export const TILE=50;
/** Hero figures stand about 1.78 tiles tall in the art, with boots at HERO_FEET of the height. */
const HERO_TILES=1.78;
/** Paintings carry transparent margins; this is where each figure's head or wings begin. */
const PAINTING_TOP:Partial<Record<EnemyArtKey,number>>={wolf:182,'wolf-pounce':172,dragon:90,'dragon-roar':98};

/** Each named Keeper's painting, with its pose while a signature attack is announced (and the Warden's yield). */
function keeperPose(actor:KeeperArtActor,biome:Biome):EnemyArtKey{
 const kind=actor.keeper==='hollow'?KEEPER_BY_BIOME[biome]:actor.keeper!;
 if(kind==='warden'&&actor.defeated)return 'warden-yield';
 if(!actor.plan)return kind;
 return kind==='wolf'?'wolf-pounce':kind==='dragon'?'dragon-roar':'warden-windup';
}
type KeeperArtActor=Pick<Actor,'name'>&Partial<Pick<Actor,'keeper'|'plan'|'defeated'>>;

/** "Bramble imp 2" → bramble-imp. Unknown names fall back to the generic token. Keepers use their own paintings;
    saves from before the named Keepers match the untitled Keeper by name. */
export function enemyArtKey(actor:KeeperArtActor,biome:Biome):EnemyArtKey|undefined{
 if(actor.keeper)return keeperPose(actor,biome);
 if(actor.name===KEEPER_NAME)return KEEPER_BY_BIOME[biome];
 const key=actor.name.replace(/\s+\d+$/,'').trim().toLowerCase().replace(/\s+/g,'-');
 return Object.hasOwn(ENEMY_ART,key)?key as EnemyArtKey:undefined;
}

/** A hero's drawing: by name first (built-in heroes), otherwise the first hero of the same class. */
export function heroArtFor(actor:Pick<Actor,'name'|'heroClass'>):HeroPreset|undefined{
 const name=actor.name.trim().toLowerCase();
 return HEROES.find(h=>h.name.toLowerCase()===name||h.short.toLowerCase()===name)??HEROES.find(h=>h.profile.heroClass===actor.heroClass);
}
/** Mira's drawing includes Ash beside her, so her body sits left of the art's centre. */
export const heroAnchor=(hero:HeroPreset)=>hero.id==='mira'?.58:.5;

export type Placement={x:number;y:number;width:number;height:number;top:number};
/** Where to draw a hero relative to the tile point its feet stand on. */
export function heroPlacement(hero:HeroPreset,tile=TILE):Placement{
 const height=HERO_TILES*tile,width=height*HERO_ART_RATIO,y=-HERO_FEET*height;
 return {x:-heroAnchor(hero)*width,y,width,height,top:y+height*.04};
}
/** Where to draw a creature relative to the tile point its anchor stands on. */
export function enemyPlacement(key:EnemyArtKey,tile=TILE):Placement{
 const art=ENEMY_ART[key],k=tile/art.unitsPerTile,[x0,y0,w,h]=art.viewBox;
 return {x:(x0-art.anchor[0])*k,y:(y0-art.anchor[1])*k,width:w*k,height:h*k,top:((PAINTING_TOP[key]??y0)-art.anchor[1])*k};
}
/** A square crop around a face or muzzle, in the art's own units: [x, y, size, art width, art height, art x, art y]. */
export function heroPortraitBox(hero:HeroPreset){const w=376,h=488,s=w*.46;return {x:hero.face.x*w-s/2,y:hero.face.y*h-s*.42,size:s,art:{x:0,y:0,width:w,height:h}}}
export function enemyPortraitBox(key:EnemyArtKey){const art=ENEMY_ART[key],[x,y,size]=art.portrait,[ax,ay,width,height]=art.viewBox;return {x,y,size,art:{x:ax,y:ay,width,height}}}
