import type {GameState,SetPieceProp} from '../../game/types.ts';
import {groundOf,isSetPieceProp} from '../../game/set-pieces.ts';

/** The board at night (dark colour mode): only the lights already on the board light it. Nothing here changes a rule. */
export type NightTone='warm'|'teal'|'sea';
export type NightLight={x:number;y:number;r:number;tone:NightTone;y0?:number;y1?:number};

/** Each lit prop's light, in tile-local ground units: where its day glow sits and how far it reaches. */
export const NIGHT_SOURCES:Partial<Record<SetPieceProp,{cx:number;cy:number;r:number;tone:NightTone}>>={
 lamp:{cx:45,cy:10,r:80,tone:'warm'},
 'cage-lit':{cx:25,cy:40,r:46,tone:'teal'},
 carving:{cx:75,cy:45,r:40,tone:'warm'},
 'waymark-lit':{cx:25,cy:45,r:70,tone:'warm'},
 shrine:{cx:75,cy:70,r:90,tone:'warm'},
 crown:{cx:25,cy:45,r:40,tone:'warm'},
 'wall-torch':{cx:25,cy:60,r:50,tone:'warm'},
 'stairs-down':{cx:-6,cy:25,r:34,tone:'teal'},
 'sea-door':{cx:0,cy:25,r:60,tone:'sea'},
 'vault-door':{cx:50,cy:95,r:44,tone:'warm'},
 // The long tales' middle places (app/ui/LongPlaceArt.tsx, LongLight).
 moonwell:{cx:50,cy:20,r:70,tone:'teal'},
 orrery:{cx:50,cy:20,r:56,tone:'warm'},
 lectern:{cx:38,cy:22,r:34,tone:'warm'},
 wreck:{cx:-6,cy:20,r:30,tone:'warm'},
};

/** Light colours: [core, spill, rim on a figure standing in it]. */
export const NIGHT_COLOURS:Record<NightTone,readonly [string,string,string]>={
 warm:['#ffb347','#e8862a','rgba(255,190,110,.9)'],
 teal:['#5fd8c8','#2fa59a','rgba(110,230,215,.85)'],
 sea:['#cdeeff','#7fb8d8','rgba(200,236,255,.8)'],
};

export const nightInner=(l:NightLight)=>l.tone==='sea'?48:Math.max(62,l.r*1.05);
export const nightSpill=(l:NightLight)=>l.tone==='sea'?110:Math.max(140,l.r*2.2);

/** Every light on the board in ground units; a column of sea door tiles is one tall doorway of light. */
export function nightLights(game:GameState):NightLight[]{
 const out:NightLight[]=[];
 for(const t of game.tiles){
  if(!isSetPieceProp(t.decoration))continue;
  const s=NIGHT_SOURCES[t.decoration];if(!s)continue;
  const l:NightLight={x:t.x*50+s.cx,y:t.y*50+s.cy,r:s.r,tone:s.tone};
  const near=l.tone==='sea'?out.find(o=>o.tone==='sea'&&Math.abs(o.x-l.x)<10&&Math.abs((o.y1??o.y)-l.y)<=60):undefined;
  if(near){near.y0=Math.min(near.y0??near.y,l.y);near.y1=Math.max(near.y1??near.y,l.y);continue}
  if(out.some(o=>Math.hypot(o.x-l.x,o.y-l.y)<30))continue;
  out.push(l);
 }
 return out;
}

function nearest(lights:NightLight[],x:number,y:number){
 let best:{light:NightLight;d:number}|undefined;
 for(const light of lights){
  const ly=light.y1!==undefined?Math.min(Math.max(y,light.y0!),light.y1):light.y;
  const d=Math.hypot(light.x-x,ly-y);
  if(d<nightSpill(light)*.8&&(!best||d<best.d))best={light,d};
 }
 return best?.light;
}

/** Which light, if any, falls on something standing at this tile, and from which side. */
export function nightRim(lights:NightLight[],tileX:number,tileY:number):{tone:NightTone;side:1|-1}|undefined{
 const x=tileX*50+25,y=tileY*50+40,light=nearest(lights,x,y);
 return light?{tone:light.tone,side:light.x>=x?1:-1}:undefined;
}

/** Props standing in a pool keep their full colour at night. */
export function nightLitTiles(game:GameState,lights=nightLights(game)){
 const lit=new Set<string>();
 for(const t of game.tiles)if((t.kind==='wall'||t.decoration)&&nearest(lights,t.x*50+25,t.y*50+40))lit.add(`${t.x},${t.y}`);
 return lit;
}

/** Thin moonlit glints on every third water tile. */
export function nightGlints(game:GameState){
 return game.tiles.filter(t=>groundOf(game,t).kind==='water').filter((_,i)=>i%3===0).map((t,i)=>({x:t.x*50,y:t.y*50,d:i%2?'M10 22h16M30 34h9':'M14 18h10M22 32h18'}));
}
