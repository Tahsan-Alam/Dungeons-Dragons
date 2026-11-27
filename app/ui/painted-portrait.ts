'use client';
import {useSyncExternalStore} from 'react';
import type {FaceCentre} from '../../game/presets';
import type {NarratorProfile} from '../../game/creation';
import {gameMasterDrawing} from './game-master-figure';

/* A painted Game Master arrives as a picture on a plain light background. Before it stands in a scene it is
   cut out and placed in the built-in Game Masters' frame (400 × 520, feet on y 488, centred), so every crop,
   card and scene that fits the Wanderer fits it too. The work happens once per picture, in the browser. */

export interface PaintedFigure {art:string;face:FaceCentre}
const W=400,H=520,GROUND=488,TOP=34;
const done=new Map<string,PaintedFigure|'failed'>(),running=new Set<string>(),listeners=new Set<()=>void>();
const notify=()=>{for(const l of listeners)l()};
export const portraitUrl=(id:string)=>`/api/ai/image/${id}`;

/** Clears the background by flooding in from the edges through light, low-saturation pixels. */
export function cutOut(data:Uint8ClampedArray,width:number,height:number){
 const corner=[0,width-1,(height-1)*width,height*width-1].map(i=>[data[i*4],data[i*4+1],data[i*4+2]]);
 const bg=[0,1,2].map(c=>corner.reduce((s,p)=>s+p[c],0)/4);
 // Background, or a pale grey ground shadow on it: our outlined figures stop the flood at their outline.
 const near=(i:number)=>{const r=data[i*4],g=data[i*4+1],b=data[i*4+2];return Math.abs(r-bg[0])+Math.abs(g-bg[1])+Math.abs(b-bg[2])<54||(Math.min(r,g,b)>165&&Math.max(r,g,b)-Math.min(r,g,b)<26);};
 const seen=new Uint8Array(width*height),stack:number[]=[];
 for(let x=0;x<width;x++)stack.push(x,(height-1)*width+x);
 for(let y=0;y<height;y++)stack.push(y*width,y*width+width-1);
 while(stack.length){
  const i=stack.pop()!;if(seen[i]||!near(i))continue;seen[i]=1;data[i*4+3]=0;
  const x=i%width;if(x>0)stack.push(i-1);if(x<width-1)stack.push(i+1);if(i>=width)stack.push(i-width);if(i<width*(height-1))stack.push(i+width);
 }
 // Soften the cut edge by one pixel so it doesn't look jagged against the scene.
 for(let i=0;i<width*height;i++)if(!seen[i]){const x=i%width;if((x>0&&seen[i-1])||(x<width-1&&seen[i+1])||(i>=width&&seen[i-width])||(i<width*(height-1)&&seen[i+width]))data[i*4+3]=170;}
 let minX=width,minY=height,maxX=-1,maxY=-1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>40){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}
 return maxX<0?null:{minX,minY,maxX,maxY};
}

async function prepare(id:string){
 const image=new Image();image.crossOrigin='anonymous';image.src=portraitUrl(id);await image.decode();
 const source=document.createElement('canvas');source.width=image.naturalWidth;source.height=image.naturalHeight;
 const sctx=source.getContext('2d',{willReadFrequently:true})!;sctx.drawImage(image,0,0);
 const pixels=sctx.getImageData(0,0,source.width,source.height),box=cutOut(pixels.data,source.width,source.height);
 // A picture whose background could not be cleared (a frame or a scene behind the figure) is not used.
 if(!box||((box.maxX-box.minX)>source.width*.9&&(box.maxY-box.minY)>source.height*.9))throw new Error('background');
 sctx.putImageData(pixels,0,0);
 const bw=box.maxX-box.minX+1,bh=box.maxY-box.minY+1,scale=Math.min((GROUND-TOP)/bh,(W-16)/bw);
 const out=document.createElement('canvas');out.width=W;out.height=H;const ctx=out.getContext('2d')!;
 const dw=bw*scale,dh=bh*scale,dx=(W-dw)/2,dy=GROUND-dh;
 ctx.drawImage(source,box.minX,box.minY,bw,bh,dx,dy,dw,dh);
 // The face sits near the top of a standing figure: about a ninth of its height down, at its centre line.
 return {art:out.toDataURL('image/png'),face:{x:.5,y:(dy+dh*.11)/H}};
}

/** The cut-out figure for a painted portrait, or undefined while it is loading or if it could not be used. */
export function paintedFigure(id:string|undefined):PaintedFigure|undefined{
 if(!id||typeof document==='undefined')return undefined;
 const ready=done.get(id);if(ready)return ready==='failed'?undefined:ready;
 if(!running.has(id)){running.add(id);prepare(id).then(f=>done.set(id,f),()=>done.set(id,'failed')).finally(()=>{running.delete(id);notify();});}
 return undefined;
}
const subscribe=(l:()=>void)=>{listeners.add(l);return()=>{listeners.delete(l)}};
/** React hook form of paintedFigure: re-renders when the cut-out is ready. */
export function usePaintedFigure(id:string|undefined){
 return useSyncExternalStore(subscribe,()=>paintedFigure(id),()=>undefined);
}

/** The figure that stands for a narrator: their painted portrait once it is ready, otherwise their drawing
    (a built-in Game Master's painting, or the drawn figure from app/ui/game-master-figure.ts). */
export function useGameMasterDrawing(profile?:NarratorProfile|null):PaintedFigure{
 const painted=usePaintedFigure(profile?.portrait);
 return painted??gameMasterDrawing(profile);
}
/** True once a picture has been tried and could not be cut out. */
export const paintedFailed=(id:string)=>done.get(id)==='failed';
