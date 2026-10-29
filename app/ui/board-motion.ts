import type {Actor,GameState} from '../../game/types.ts';
import type {BoardProjection} from './board-projection.ts';
export type BoardPoint={x:number;y:number};
export type ActorMotion={id:string;path:BoardPoint[];duration:number};
const key=(p:BoardPoint)=>`${p.x},${p.y}`;
const directions=[[1,0],[-1,0],[0,1],[0,-1]] as const;

/** Mirrors the rules engine's cardinal search, including downed occupied tiles. */
export function findBoardPath(game:GameState,actor:Actor,target:BoardPoint,maxSteps=actor.movement):BoardPoint[]|null {
 if(!Number.isInteger(target.x)||!Number.isInteger(target.y)||target.x<0||target.y<0||target.x>=game.width||target.y>=game.height)return null;
 const start={x:actor.x,y:actor.y},queue=[start],parents=new Map<string,BoardPoint|null>([[key(start),null]]),depth=new Map([[key(start),0]]);
 const blocked=new Set(game.actors.filter(a=>a.id!==actor.id&&!a.defeated).map(key));
 for(let i=0;i<queue.length;i++){
  const p=queue[i],distance=depth.get(key(p))!;
  if(p.x===target.x&&p.y===target.y){const path:BoardPoint[]=[];let current:BoardPoint|null=p;while(current){path.push(current);current=parents.get(key(current))??null;}return path.reverse();}
  if(distance>=maxSteps)continue;
  for(const[dx,dy]of directions){const n={x:p.x+dx,y:p.y+dy},k=key(n),tile=game.tiles[n.y*game.width+n.x];
   if(n.x<0||n.y<0||n.x>=game.width||n.y>=game.height||!tile||tile.kind==='wall'||tile.kind==='water'||blocked.has(k)||parents.has(k))continue;
   parents.set(k,p);depth.set(k,distance+1);queue.push(n);
  }
 }
 return null;
}
/** A different adventure, map, or backwards timeline should never glide between positions. */
export function isBoardDiscontinuity(before:GameState,after:GameState):boolean {
 return before.options.seed!==after.options.seed||before.options.biome!==after.options.biome||before.options.rules!==after.options.rules||before.scene!==after.scene||before.width!==after.width||before.height!==after.height||after.eventSequence<before.eventSequence||after.round<before.round||before.tiles.some((t,i)=>t.kind!==after.tiles[i]?.kind)||before.actors.filter(a=>!a.enemy).some(a=>{const next=after.actors.find(b=>b.id===a.id);return !next||next.name!==a.name||next.heroClass!==a.heroClass;});
}
export function planActorMotions(before:GameState,after:GameState,options:{enabled?:boolean;reducedMotion?:boolean;interruptedIds?:ReadonlySet<string>}={}):ActorMotion[]{
 if(options.enabled===false||options.reducedMotion||isBoardDiscontinuity(before,after)||after.eventSequence<=before.eventSequence)return [];
 const events=after.events.filter(e=>e.id>before.eventSequence);
 // Missing history or several moves by one actor indicate a jump, not one visible step.
 if(!events.length||events[0].id!==before.eventSequence+1)return [];
 const motions:ActorMotion[]=[];
 for(const next of after.actors){
  const previous=before.actors.find(a=>a.id===next.id);if(!previous||previous.defeated||options.interruptedIds?.has(next.id)||(previous.x===next.x&&previous.y===next.y))continue;
  const moves=events.filter(e=>e.actorId===next.id&&/ moves \d+ feet\.$/.test(e.text));if(moves.length!==1)continue;
  const feet=Number(moves[0].text.match(/ moves (\d+) feet\.$/)?.[1]),distance=feet/5;
  if(!Number.isInteger(distance)||distance<1||distance>Math.max(previous.speed,previous.movement))continue;
  const path=findBoardPath(before,previous,next,distance);
  if(!path||path.length-1!==distance)continue;
  motions.push({id:next.id,path,duration:Math.min(850,Math.max(160,distance*115))});
 }
 return motions;
}
/** Interpolate visual depth along the same legal route used by the movement animation. */
export function sampleBoardPath(path:BoardPoint[],progress:number):BoardPoint{
 if(!path.length)return {x:0,y:0};
 const position=Math.max(0,Math.min(1,progress))*(path.length-1),index=Math.floor(position),from=path[index],to=path[Math.min(index+1,path.length-1)],fraction=position-index;
 return {x:from.x+(to.x-from.x)*fraction,y:from.y+(to.y-from.y)*fraction};
}
export function boardPathKeyframes(path:BoardPoint[],projection?:Pick<BoardProjection,'tileCenter'>):{transform:string;offset:number}[]{
 return path.map((p,index)=>{const point=projection?projection.tileCenter(p.x,p.y):{x:p.x*50+25,y:p.y*50+25};return {transform:`translate(${point.x}px, ${point.y}px)`,offset:path.length===1?1:index/(path.length-1)}});
}

/** Frame narrow or short boards around a readable area without magnifying desktop boards. */
export function initialBoardFrame(viewport:{width:number;height:number},world:{width:number;height:number},target:BoardPoint,project:(x:number,y:number)=>BoardPoint=(x,y)=>({x:x*50+25,y:y*50+25})):{zoom:number;pan:BoardPoint}{
 const fit={zoom:1,pan:{x:0,y:0}};
 if(viewport.width<=0||viewport.height<=0||world.width<=0||world.height<=0||(viewport.width>=700&&viewport.height>=280))return fit;
 const scale=Math.min(viewport.width/world.width,viewport.height/world.height),tilePixels=viewport.height<280?30:32;
 const zoom=Math.max(1,Math.min(2.5,tilePixels/(50*scale)));
 const center=project(target.x,target.y);
 const limitX=Math.max(0,(world.width*zoom-viewport.width/scale)/2),limitY=Math.max(0,(world.height*zoom-viewport.height/scale)/2);
 return {zoom,pan:{x:Math.max(-limitX,Math.min(limitX,(world.width/2-center.x)*zoom)),y:Math.max(-limitY,Math.min(limitY,(world.height/2-center.y)*zoom))}};
}

/** Recenter only an edge-bound hero; keep comfortable moves and desktop Fit stationary. */
export function followBoardTarget(viewport:{width:number;height:number},world:{width:number;height:number},camera:{zoom:number;pan:BoardPoint},target:BoardPoint,project:(x:number,y:number)=>BoardPoint=(x,y)=>({x:x*50+25,y:y*50+25})):BoardPoint|null{
 if(viewport.width<=0||viewport.height<=0||world.width<=0||world.height<=0||camera.zoom<=1||(viewport.width>=700&&viewport.height>=280))return null;
 const scale=Math.min(viewport.width/world.width,viewport.height/world.height);
 const center=project(target.x,target.y);
 const x=viewport.width/2+(camera.pan.x+(center.x-world.width/2)*camera.zoom)*scale;
 const y=viewport.height/2+(camera.pan.y+(center.y-world.height/2)*camera.zoom)*scale;
 const marginX=Math.min(72,viewport.width*.22),marginY=Math.min(72,viewport.height*.25);
 const outsideX=x<marginX||x>viewport.width-marginX,outsideY=y<marginY||y>viewport.height-marginY;
 if(!outsideX&&!outsideY)return null;
 const limitX=Math.max(0,(world.width*camera.zoom-viewport.width/scale)/2),limitY=Math.max(0,(world.height*camera.zoom-viewport.height/scale)/2);
 const pan={x:outsideX?Math.max(-limitX,Math.min(limitX,(world.width/2-center.x)*camera.zoom)):camera.pan.x,y:outsideY?Math.max(-limitY,Math.min(limitY,(world.height/2-center.y)*camera.zoom)):camera.pan.y};
 return Math.abs(pan.x-camera.pan.x)<.01&&Math.abs(pan.y-camera.pan.y)<.01?null:pan;
}

/** Keep the same world point between the fingers while zoom and midpoint both change. */
export function anchoredBoardPan(pan:BoardPoint,fromZoom:number,toZoom:number,initialAnchor:BoardPoint,currentAnchor=initialAnchor):BoardPoint{
 const ratio=toZoom/fromZoom;
 return {x:currentAnchor.x-(initialAnchor.x-pan.x)*ratio,y:currentAnchor.y-(initialAnchor.y-pan.y)*ratio};
}
