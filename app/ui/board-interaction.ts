import type {GameState} from '../../game/types.ts';
import type {BoardPoint} from './board-motion.ts';

/** Terrain is unchanged by actor turns, but imported maps must invalidate every visual field. */
export function sameBoardTerrain(before:GameState,after:GameState):boolean{
 return before===after||before.width===after.width&&before.height===after.height&&before.options.biome===after.options.biome&&before.tiles.length===after.tiles.length&&before.tiles.every((tile,index)=>{
  const next=after.tiles[index];return tile.x===next.x&&tile.y===next.y&&tile.kind===next.kind&&tile.decoration===next.decoration;
 });
}

/** Keep one legal destination in the Tab order, preferably the player's last preview. */
export function rovingBoardTile(tiles:readonly BoardPoint[],preferred:BoardPoint|null,origin?:BoardPoint):BoardPoint|null{
 const previous=preferred&&tiles.find(tile=>tile.x===preferred.x&&tile.y===preferred.y);
 if(previous)return previous;
 if(!origin)return tiles[0]??null;
 let nearest:BoardPoint|null=null,distance=Infinity;
 for(const tile of tiles){const next=Math.abs(tile.x-origin.x)+Math.abs(tile.y-origin.y);if(next<distance){nearest=tile;distance=next}}
 return nearest;
}

export type BoardDirection='ArrowUp'|'ArrowDown'|'ArrowLeft'|'ArrowRight';
/** Navigate visible destinations in screen space in either projection, without moving the actor. */
export function nextBoardTile(tiles:readonly BoardPoint[],current:BoardPoint,direction:BoardDirection,project:(x:number,y:number)=>BoardPoint=(x,y)=>({x,y})):BoardPoint{
 const from=project(current.x,current.y),horizontal=direction==='ArrowLeft'||direction==='ArrowRight',sign=direction==='ArrowLeft'||direction==='ArrowUp'?-1:1;
 let closest=current,best=Infinity;
 for(const tile of tiles){
  const point=project(tile.x,tile.y),forward=(horizontal?point.x-from.x:point.y-from.y)*sign,sideways=Math.abs(horizontal?point.y-from.y:point.x-from.x);
  if(forward<=.001)continue;
  const score=Math.hypot(forward,sideways)+sideways*2;
  if(score<best){best=score;closest=tile}
 }
 return closest;
}

/** Preserve a manual camera's zoom and position after resizing, clamping only exposed map edges. */
export function resizedBoardPan(viewport:{width:number;height:number},world:{width:number;height:number},zoom:number,pan:BoardPoint):BoardPoint{
 if(viewport.width<=0||viewport.height<=0||world.width<=0||world.height<=0)return pan;
 const scale=Math.min(viewport.width/world.width,viewport.height/world.height),limitX=Math.max(0,(world.width*zoom-viewport.width/scale)/2),limitY=Math.max(0,(world.height*zoom-viewport.height/scale)/2);
 return {x:Math.max(-limitX,Math.min(limitX,pan.x)),y:Math.max(-limitY,Math.min(limitY,pan.y))};
}

/** A keyboard preview remains visible even when the player has manually zoomed the board. */
export function revealedBoardPan(viewport:{width:number;height:number},world:{width:number;height:number},camera:{zoom:number;pan:BoardPoint},target:BoardPoint,project:(x:number,y:number)=>BoardPoint):BoardPoint|null{
 if(viewport.width<=0||viewport.height<=0||world.width<=0||world.height<=0)return null;
 const scale=Math.min(viewport.width/world.width,viewport.height/world.height),point=project(target.x,target.y);
 const x=viewport.width/2+(camera.pan.x+(point.x-world.width/2)*camera.zoom)*scale,y=viewport.height/2+(camera.pan.y+(point.y-world.height/2)*camera.zoom)*scale;
 const marginX=Math.min(48,viewport.width*.15),marginY=Math.min(48,viewport.height*.2),outsideX=x<marginX||x>viewport.width-marginX,outsideY=y<marginY||y>viewport.height-marginY;
 if(!outsideX&&!outsideY)return null;
 const next=resizedBoardPan(viewport,world,camera.zoom,{x:outsideX?(world.width/2-point.x)*camera.zoom:camera.pan.x,y:outsideY?(world.height/2-point.y)*camera.zoom:camera.pan.y});
 return Math.abs(next.x-camera.pan.x)<.01&&Math.abs(next.y-camera.pan.y)<.01?null:next;
}
