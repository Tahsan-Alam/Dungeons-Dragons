import {MAP_SIZE,ROADS,WAYMARKS,type Point,type RoadId,type Segment} from './route-map-data.ts';
import {builtInTale} from '../../game/lore.ts';
import {storyGoal} from '../../game/campaign.ts';
import type {GameState} from '../../game/types.ts';
import type {TaleId} from '../../game/presets.ts';

/* The between-chapters map: which stretch of a built-in tale's road is lit, where the party stands and what just
   relit. Everything is read from the saved game, so nothing about the map is stored, sent or replayed. */

export type Anchor='start'|'middle'|'end';
export interface StopLabel {dx:number;dy:number;anchor:Anchor}
export interface TaleRoute {road:string;legs:readonly [RoadId,RoadId];home:readonly RoadId[];stops:readonly [Point,Point,Point];labels:readonly [StopLabel,StopLabel,StopLabel];focus:{x:number;y:number;w:number;h:number}}

export const ROUTES:Record<TaleId,TaleRoute>={
 lantern:{road:'west road',legs:['w1','shrine'],home:['w2'],stops:[ROADS.w1[0],ROADS.w1[3],ROADS.shrine[3]],
  labels:[{dx:0,dy:32,anchor:'middle'},{dx:10,dy:34,anchor:'middle'},{dx:0,dy:-30,anchor:'middle'}],focus:{x:30,y:226,w:640,h:310}},
 crown:{road:'north road',legs:['n2','n3'],home:['n1'],stops:[ROADS.n2[0],ROADS.n2[3],ROADS.n3[3]],
  labels:[{dx:18,dy:4,anchor:'start'},{dx:18,dy:4,anchor:'start'},{dx:18,dy:4,anchor:'start'}],focus:{x:440,y:76,w:380,h:400}},
 salt:{road:'harbour road',legs:['q1','q2'],home:['h1','h2','cw'],stops:[ROADS.q1[0],ROADS.q1[3],ROADS.q2[3]],
  labels:[{dx:-16,dy:40,anchor:'end'},{dx:-14,dy:-18,anchor:'end'},{dx:46,dy:-38,anchor:'end'}],focus:{x:780,y:470,w:420,h:282}},
};
export const ALL_ROADS=Object.keys(ROADS) as RoadId[];

export interface RouteView {
 tale:TaleId;
 /** Chapters planned for this run, and how many are finished. */
 total:number;cleared:number;
 /** Which of the tale's three stops the party stands at, or null after victory. */
 here:number|null;
 /** Roads drawn lit, and the ones that relight now (animated once). */
 lit:RoadId[];fresh:RoadId[];
 /** Stops whose shard has been recovered. */
 recovered:number;
 victory:boolean;
}

export function routeView(game:GameState):RouteView|null {
 const tale=builtInTale(game.options.creation?.story);if(!tale)return null;
 const route=ROUTES[tale],total=storyGoal(game),victory=game.status==='victory';
 const cleared=victory?total:Math.min(game.scene,total);
 const before=Math.min(Math.max(cleared-1,0),2),now=victory?2:Math.min(cleared,2);
 const lit:RoadId[]=[...route.legs.slice(0,now),...(victory?route.home:[])];
 // A leg relights when the party first crosses it; a long run that circles back relights nothing new.
 const fresh:RoadId[]=victory?[...route.legs.slice(before),...route.home]:cleared>=1&&cleared<=2?[route.legs[cleared-1]]:[];
 return {tale,total,cleared,here:victory?null:game.scene%3,lit,fresh,recovered:Math.min(game.relics,3),victory};
}

/** One line that carries the same state for screen readers. */
export function describeRoute(view:RouteView,places:readonly string[]):string {
 const route=ROUTES[view.tale],name=(i:number)=>lower(places[i]??'');
 const lit=view.victory?`The ${route.road} is lit all the way to the Waylantern at Threeway Crossing.`:
  view.lit.length?`The ${route.road} is lit from ${name(0)} to ${name(view.lit.length)}.`:`The ${route.road} is still dark.`;
 return view.here===null?lit:`${lit} Next: ${name(view.here)}, chapter ${view.cleared+1} of ${view.total}.`;
}

/** The screen's headline, in the same words the map shows. */
export function routeHeadline(view:RouteView,places:readonly string[]):string {
 const road=ROUTES[view.tale].road,next=view.here===null?'':lower(places[view.here]??'');
 if(view.victory)return `The ${road} is lit to the Waylantern`;
 if(view.fresh.length)return `The ${road} is lit to ${next}`;
 if(!view.cleared)return `The ${road} is still dark`;
 return `Back along the ${road} to ${next}`;
}

/** “The forest road” → “the forest road”; proper names stay as they are. */
export const lower=(place:string)=>/^The /.test(place)?'t'+place.slice(1):place;

export function pointOn(s:Segment,t:number):Point {
 const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=s,u=1-t;
 return [u*u*u*x0+3*u*u*t*x1+3*u*t*t*x2+t*t*t*x3,u*u*u*y0+3*u*u*t*y1+3*u*t*t*y2+t*t*t*y3];
}
export const pathOf=(s:Segment)=>`M${s[0][0]} ${s[0][1]} C${s[1][0]} ${s[1][1]} ${s[2][0]} ${s[2][1]} ${s[3][0]} ${s[3][1]}`;
export const waymarksOf=(road:RoadId)=>WAYMARKS[road].map(t=>pointOn(ROADS[road],t));

/** The focus box grown to the panel's shape, so nothing that matters is cropped at any size. */
export function fitView(focus:TaleRoute['focus'],aspect:number):{x:number;y:number;w:number;h:number} {
 if(!(aspect>0))return focus;
 const cx=focus.x+focus.w/2,cy=focus.y+focus.h/2;
 const w=focus.w/focus.h<aspect?focus.h*aspect:focus.w,h=w/aspect;
 // Slide the view back inside the map's edges when it fits, so the art never ends mid-panel.
 const inside=(start:number,size:number,limit:number)=>size>=limit?(limit-size)/2:Math.min(Math.max(start,0),limit-size);
 return {x:inside(cx-w/2,w,MAP_SIZE.width),y:inside(cy-h/2,h,MAP_SIZE.height),w,h};
}
