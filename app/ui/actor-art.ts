import type {Actor,Biome,KeeperKind} from '../../game/types.ts';
import {HEROES,HERO_ART_RATIO,HERO_FEET,type FaceCentre,type HeroPreset} from '../../game/presets.ts';
import {CUSTOM_FACE,customHeroArt} from './hero-figure.ts';
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
const PAINTING_TOP:Partial<Record<EnemyArtKey,number>>={wolf:182,'wolf-pounce':172,dragon:90,'dragon-warn':90,'dragon-roar':98};

/** Each Keeper's painting, its pose while a signature attack is announced (the warning), its pose on the turn
    after the attack resolves (the release: the dragon's open jaws, the Warden's landing) and, for the wardens, its yield. */
export const KEEPER_ART:Record<Exclude<KeeperKind,'hollow'>,{rest:EnemyArtKey;attack:EnemyArtKey;release?:EnemyArtKey;yielded?:EnemyArtKey}>={
 wolf:{rest:'wolf',attack:'wolf-pounce'},'grey-wolf':{rest:'wolf',attack:'wolf-pounce'},
 dragon:{rest:'dragon',attack:'dragon-warn',release:'dragon-roar'},drake:{rest:'dragon',attack:'dragon-warn',release:'dragon-roar'},
 warden:{rest:'warden',attack:'warden-windup',release:'warden-landing',yielded:'warden-yield'},'tide-warden':{rest:'warden',attack:'warden-windup',release:'warden-landing',yielded:'warden-yield'},
 thornhound:{rest:'thornhound',attack:'thornhound-rush'},giant:{rest:'ridge-giant',attack:'ridge-giant-slam'},eye:{rest:'glass-eye',attack:'glass-eye-gaze'},
};
/** A beaten Keeper that stays on the board in its yield pose. */
export const keeperYields=(kind:KeeperKind|undefined)=>!!kind&&kind!=='hollow'&&!!KEEPER_ART[kind].yielded;
function keeperPose(actor:KeeperArtActor,biome:Biome):EnemyArtKey{
 if(actor.keeper==='hollow')return KEEPER_BY_BIOME[biome];
 const art=KEEPER_ART[actor.keeper!];
 if(actor.defeated&&art.yielded)return art.yielded;
 return actor.plan?art.attack:actor.keeperRest&&art.release?art.release:art.rest;
}
type KeeperArtActor=Pick<Actor,'name'>&Partial<Pick<Actor,'keeper'|'plan'|'defeated'|'keeperRest'>>;

/** "Bramble imp 2" → bramble-imp. Unknown names fall back to the generic token. Keepers use their own paintings;
    saves from before the named Keepers match the untitled Keeper by name. */
export function enemyArtKey(actor:KeeperArtActor,biome:Biome):EnemyArtKey|undefined{
 if(actor.keeper)return keeperPose(actor,biome);
 if(actor.name===KEEPER_NAME)return KEEPER_BY_BIOME[biome];
 const key=actor.name.replace(/\s+\d+$/,'').trim().toLowerCase().replace(/\s+/g,'-');
 return Object.hasOwn(ENEMY_ART,key)?key as EnemyArtKey:undefined;
}

/** A roster hero's painting, when the actor is that hero: the full or short name, playing that hero's class.
    A companion who shares a roster name (the party's "Pip" is a ranger) is someone else. */
export function heroArtFor(actor:Pick<Actor,'name'|'heroClass'>):HeroPreset|undefined{
 const name=actor.name.trim().toLowerCase();
 return HEROES.find(h=>(h.name.toLowerCase()===name||h.short.toLowerCase()===name)&&h.profile.heroClass===actor.heroClass);
}
/** Mira's drawing includes Ash beside her, so her body sits left of the art's centre. */
export const heroAnchor=(hero:HeroPreset)=>hero.id==='mira'?.58:.5;
/** The full-body drawing that stands for a hero: their roster painting, or one drawn for them from their name,
    class and colour (app/ui/hero-figure.ts). Both share the art size, ground line and face position. */
export interface HeroDrawing {art:string;face:FaceCentre;anchor:number;preset?:HeroPreset}
export function heroDrawing(actor:Pick<Actor,'name'|'heroClass'|'color'>):HeroDrawing{
 const preset=heroArtFor(actor);
 return preset?{art:preset.art,face:preset.face,anchor:heroAnchor(preset),preset}:{art:customHeroArt(actor),face:CUSTOM_FACE,anchor:.5};
}
export type Placement={x:number;y:number;width:number;height:number;top:number};
/** Where to draw a hero relative to the tile point its feet stand on. */
export function heroPlacement(hero:{anchor:number},tile=TILE):Placement{
 const height=HERO_TILES*tile,width=height*HERO_ART_RATIO,y=-HERO_FEET*height;
 return {x:-hero.anchor*width,y,width,height,top:y+height*.04};
}
/** Where to draw a creature relative to the tile point its anchor stands on. */
export function enemyPlacement(key:EnemyArtKey,tile=TILE):Placement{
 const art=ENEMY_ART[key],k=tile/art.unitsPerTile,[x0,y0,w,h]=art.viewBox;
 return {x:(x0-art.anchor[0])*k,y:(y0-art.anchor[1])*k,width:w*k,height:h*k,top:((PAINTING_TOP[key]??y0)-art.anchor[1])*k};
}
/** A square crop around a face or muzzle, in the art's own units: [x, y, size, art width, art height, art x, art y]. */
export function heroPortraitBox(hero:{face:FaceCentre}){const w=376,h=488,s=w*.46;return {x:hero.face.x*w-s/2,y:hero.face.y*h-s*.42,size:s,art:{x:0,y:0,width:w,height:h}}}
export function enemyPortraitBox(key:EnemyArtKey){const art=ENEMY_ART[key],[x,y,size]=art.portrait,[ax,ay,width,height]=art.viewBox;return {x,y,size,art:{x:ax,y:ay,width,height}}}
