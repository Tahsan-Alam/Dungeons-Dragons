'use client';
import {memo,useMemo,useRef,useState,useEffect,useLayoutEffect,useImperativeHandle,useCallback,useId,type Ref} from 'react';
import type {Actor,GameState} from '../../game/types';
import {getReachable,getValidTargets} from '../../game/engine';
import {HeroArt,Icon,Tree} from './Art';
import {useTheme,type ArtTheme} from './Theme';
import {PixelTerrain,PixelChest,PixelGateway} from './PixelArt';
import {ART_PALETTE as P} from './artPalette';
import {findBoardPath,isBoardDiscontinuity,planActorMotions,boardPathKeyframes,sampleBoardPath,initialBoardFrame,followBoardTarget,anchoredBoardPan,type BoardPoint} from './board-motion';
import {createBoardProjection,type BoardProjection} from './board-projection';
import {DepthTerrain,DepthProp,DepthChest,DepthGateway} from './DepthArt';
import {sameBoardTerrain,rovingBoardTile,nextBoardTile,resizedBoardPan,revealedBoardPan,type BoardDirection} from './board-interaction';
import './board-motion.css';
import './board-view.css';
export type Tool='move'|'attack'|'ability';
export type BoardControls={fit:()=>void;focusActor:()=>void;zoomIn:()=>void;zoomOut:()=>void;toggleGrid:()=>void;pan:(dx:number,dy:number)=>void;isMoving:()=>boolean;isInteracting:()=>boolean};
const Terrain=memo(function Terrain({game,grid}:{game:GameState;grid:boolean}){return <>
 <defs><pattern id="board-dots" width="50" height="50" patternUnits="userSpaceOnUse"><circle cx="0" cy="0" r="1.4" fill={P.grassDetail} opacity=".26"/></pattern><pattern id="water-lines" width="35" height="20" patternUnits="userSpaceOnUse"><path d="M2 10q5-3 11 0t11 0" stroke={P.waterLight} strokeWidth="1" fill="none"/></pattern></defs>
 <rect width={game.width*50} height={game.height*50} rx="18" fill={game.options.biome==='ruins'?P.ruinGrass:P.grass}/>
 {game.tiles.map(t=><g key={`${t.x},${t.y}`} transform={`translate(${t.x*50} ${t.y*50})`}>
 {t.kind==='path'?<rect x="-1" y="-1" width="52" height="52" rx="10" fill={P.road}/>:t.kind==='water'?<><rect width="51" height="51" rx="8" fill={P.water}/><rect width="50" height="50" fill="url(#water-lines)"/></>:t.kind==='wall'?<path d="m5 7 32-4 10 9-3 28-33 3-8-11Z" fill={P.stone} stroke={P.stoneDark} strokeWidth="1.5"/>:((t.x*7+t.y*3)%11===0)?<path d="m20 35-4-6m4 6 4-9m0 9 4-4" fill="none" stroke={P.grassDetail} strokeWidth="1.5"/>:null}
 {t.decoration==='flower'?<g fill={P.flower}><circle cx="18" cy="24" r="3"/><circle cx="32" cy="37" r="2.5"/></g>:t.decoration==='mushroom'?<g stroke={P.bark} strokeWidth="1.3"><path d="M27 37v-7m-8-1q8-18 16 0Z" fill={P.mushroom}/></g>:t.decoration==='rock'?<path d="m14 31 6-13 16 3 4 13-17 5Z" fill={P.stone} stroke={P.stoneDark} strokeWidth="1.5"/>:t.decoration==='ruin'?<g fill={P.stoneLight} stroke={P.stoneDark} strokeWidth="1.5"><path d="m13 39 2-30 8 3 10-5 4 32Z"/><path d="m15 22 12 1m-5 9 14-1"/></g>:null}
 </g>)}
 {grid?<rect width={game.width*50} height={game.height*50} fill="url(#board-dots)"/>:null}
 {game.tiles.filter(t=>t.decoration==='tree').map(t=><Tree key={`tree${t.x}-${t.y}`} x={t.x*50+25} y={t.y*50+32} size={.75+(t.x%3)*.08} tone={t.x+t.y}/>)}
 </>});
const BoardTerrain=memo(function BoardTerrain({game,grid,projection,theme}:{game:GameState;grid:boolean;projection:BoardProjection;theme:ArtTheme}){
 return projection.mode==='2.5d'?<DepthTerrain game={game} grid={grid} projection={projection}/>:theme==='pixel'?<PixelTerrain game={game} grid={grid}/>:<Terrain game={game} grid={grid}/>;
},(before,after)=>before.grid===after.grid&&before.theme===after.theme&&before.projection===after.projection&&sameBoardTerrain(before.game,after.game));
function useActorMotion(game:GameState,projection:BoardProjection,focusId:string|undefined,enabled:boolean,resetKey:string|number|undefined,reducedMotion:boolean,onChange?:((moving:boolean)=>void)){
 const nodes=useRef(new Map<string,SVGGElement>()),animations=useRef(new Map<string,{animation:Animation;x:number;y:number;path:BoardPoint[];duration:number}>()),previous=useRef<GameState|null>(null),lastReset=useRef(resetKey),lastProjection=useRef(projection);
 const[depthPositions,setDepthPositions]=useState<Record<string,BoardPoint>>({}),depthFrame=useRef(0),projectionMode=useRef(projection.mode);projectionMode.current=projection.mode;
 const[moving,setMoving]=useState(false),movingRef=useRef(false),focus=useRef(focusId),callback=useRef(onChange);focus.current=focusId;callback.current=onChange;
 function updateDepth(){
  depthFrame.current=0;if(projectionMode.current!=='2.5d'||!animations.current.size){setDepthPositions(previous=>Object.keys(previous).length?{}:previous);return}
  const next:Record<string,BoardPoint>={};
  for(const[id,entry]of animations.current){const elapsed=typeof entry.animation.currentTime==='number'?entry.animation.currentTime:0,steps=Math.max(1,entry.path.length-1),progress=Math.min(1,Math.max(0,elapsed/entry.duration));next[id]=sampleBoardPath(entry.path,Math.floor(progress*steps*2)/(steps*2))}
  setDepthPositions(previous=>Object.keys(previous).length===Object.keys(next).length&&Object.keys(next).every(id=>previous[id]?.x===next[id].x&&previous[id]?.y===next[id].y)?previous:next);
  depthFrame.current=requestAnimationFrame(updateDepth);
 }
 function report(){
  const next=!!focus.current&&animations.current.has(focus.current);if(next!==movingRef.current){movingRef.current=next;setMoving(next);callback.current?.(next)}
  if(projectionMode.current==='2.5d'&&animations.current.size){if(!depthFrame.current)depthFrame.current=requestAnimationFrame(updateDepth)}
  else{if(depthFrame.current)cancelAnimationFrame(depthFrame.current);depthFrame.current=0;setDepthPositions(previous=>Object.keys(previous).length?{}:previous)}
 }
 function cancel(id:string){const entry=animations.current.get(id);if(!entry)return;entry.animation.onfinish=null;entry.animation.oncancel=null;entry.animation.cancel();animations.current.delete(id)}
 useLayoutEffect(()=>{
  const before=previous.current;previous.current=game;const resetChanged=lastReset.current!==resetKey||lastProjection.current!==projection;lastReset.current=resetKey;lastProjection.current=projection;
  if(!before||!enabled||reducedMotion||resetChanged||isBoardDiscontinuity(before,game)){for(const id of animations.current.keys())cancel(id);report();return;}
  const interrupted=new Set<string>();
  for(const[id,entry]of animations.current){const target=game.actors.find(a=>a.id===id);if(!target||target.x!==entry.x||target.y!==entry.y){cancel(id);interrupted.add(id)}}
  for(const plan of planActorMotions(before,game,{interruptedIds:interrupted})){
   const node=nodes.current.get(plan.id);if(!node||typeof node.animate!=='function')continue;
   const endpoint=plan.path.at(-1)!,animation=node.animate(boardPathKeyframes(plan.path,projection),{duration:plan.duration,easing:'linear'});
   animations.current.set(plan.id,{animation,x:endpoint.x,y:endpoint.y,path:plan.path,duration:plan.duration});
   const finished=()=>{if(animations.current.get(plan.id)?.animation!==animation)return;animations.current.delete(plan.id);report()};animation.onfinish=finished;animation.oncancel=finished;
  }
  report();
 },[game,projection,enabled,reducedMotion,resetKey]);
 useLayoutEffect(()=>{report()},[focusId]);
 useEffect(()=>()=>{if(depthFrame.current)cancelAnimationFrame(depthFrame.current);for(const id of animations.current.keys())cancel(id);if(movingRef.current){movingRef.current=false;callback.current?.(false)}},[]);
 return {nodes,moving,depthPositions,isMoving:()=>movingRef.current};
}
export default function Board({game,actor,tool,onTile,onActor,selectedId,myTurn,controlsRef,focusId,caption,onMotionChange,animateMovement=true,motionResetKey,autoFrame=false}:{game:GameState;actor?:Actor;tool:Tool;onTile:(x:number,y:number)=>void;onActor:(a:Actor)=>void;selectedId:string;myTurn:boolean;controlsRef?:Ref<BoardControls>;focusId?:string;caption?:string;onMotionChange?:(moving:boolean)=>void;animateMovement?:boolean;motionResetKey?:string|number;autoFrame?:boolean}){
 const {theme,reducedMotion,viewMode}=useTheme();
 const projection=useMemo(()=>createBoardProjection(viewMode,game.width,game.height),[viewMode,game.width,game.height]);
 const motion=useActorMotion(game,projection,focusId??actor?.id,animateMovement,motionResetKey,reducedMotion,onMotionChange);
 const[previewTile,setPreviewTile]=useState<BoardPoint|null>(null),[smoothCamera,setSmoothCamera]=useState(false),[cameraDuration,setCameraDuration]=useState(200);
 const[focusedTile,setFocusedTile]=useState<BoardPoint|null>(null),keyboardHelpId=useId();
 const [zoom,setZoom]=useState(1),[pan,setPan]=useState({x:0,y:0}),[grid,setGrid]=useState(true),[dragging,setDragging]=useState(false);
 const svg=useRef<SVGSVGElement>(null),cameraTouched=useRef(false),cameraGame=useRef(game),frameTarget=useRef<BoardPoint>({x:0,y:0}); const drag=useRef<{x:number;y:number;px:number;py:number;move:boolean}|null>(null);const pointers=useRef(new Map<number,{x:number;y:number}>()),pinch=useRef<{distance:number;zoom:number;midX:number;midY:number;px:number;py:number}|null>(null),suppressClick=useRef(0);
 const camera=useRef({zoom,pan});camera.current={zoom,pan};
 const reachable=useMemo(()=>actor&&myTurn&&!motion.moving&&tool==='move'?getReachable(game,actor):[],[game,actor,myTurn,tool,motion.moving]);
 const reachableKeys=useMemo(()=>new Set(reachable.map(t=>`${t.x},${t.y}`)),[reachable]);
 const keyboardTile=useMemo(()=>rovingBoardTile(reachable,focusedTile,actor),[reachable,focusedTile,actor]);
 const targets=useMemo(()=>new Set(actor&&myTurn&&tool!=='move'?getValidTargets(game,actor,tool==='ability').map(a=>a.id):[]),[game,actor,myTurn,tool]);
 const route=useMemo(()=>previewTile&&actor&&!dragging&&reachableKeys.has(`${previewTile.x},${previewTile.y}`)?findBoardPath(game,actor,previewTile):null,[previewTile,actor,dragging,reachableKeys,game]);
 useEffect(()=>{setPreviewTile(null)},[game.eventSequence,tool,motion.moving]);
 useEffect(()=>{
  const current=document.activeElement;
  if(motion.isMoving()||!current?.hasAttribute('data-board-tile')||!svg.current?.contains(current))return;
  if(keyboardTile){const next=svg.current.querySelector<SVGRectElement>(`[data-board-tile="${keyboardTile.x},${keyboardTile.y}"]`);if(next!==current)next?.focus({preventScroll:true})}
  else svg.current.focus({preventScroll:true});
 },[keyboardTile,motion.moving]);
 const w=projection.width,h=projection.height;
 frameTarget.current=game.actors.find(a=>a.id===focusId)||actor||{x:(game.width-1)/2,y:(game.height-1)/2};
 useLayoutEffect(()=>{
  cameraTouched.current=false;setSmoothCamera(false);setPreviewTile(null);
  for(const id of pointers.current.keys())if(svg.current?.hasPointerCapture(id))svg.current.releasePointerCapture(id);pointers.current.clear();drag.current=null;pinch.current=null;setDragging(false);
  const el=svg.current;
  function frame(){
   const bounds=el?.getBoundingClientRect();
   if(cameraTouched.current){
    if(!bounds||pointers.current.size)return;
    const next=resizedBoardPan(bounds,projection,camera.current.zoom,camera.current.pan);
    setSmoothCamera(false);setPan(previous=>previous.x===next.x&&previous.y===next.y?previous:next);return;
   }
   const next=autoFrame&&bounds?initialBoardFrame(bounds,projection,frameTarget.current,projection.tileCenter):{zoom:1,pan:{x:0,y:0}};
   setSmoothCamera(false);setZoom(next.zoom);setPan(previous=>previous.x===next.pan.x&&previous.y===next.pan.y?previous:next.pan);
  }
  frame();
  if(!el||typeof ResizeObserver==='undefined')return;
  const observer=new ResizeObserver(frame);observer.observe(el);return()=>observer.disconnect();
 },[autoFrame,game.scene,game.options.seed,projection,w,h]);
 useLayoutEffect(()=>{
  const before=cameraGame.current;cameraGame.current=game;
  if(!autoFrame||cameraTouched.current||pointers.current.size||before===game)return;
  const target=game.actors.find(a=>a.id===(focusId??actor?.id)),bounds=svg.current?.getBoundingClientRect();
  if(!target||!bounds)return;
  const movement=planActorMotions(before,game).find(plan=>plan.id===target.id);
  if(!movement)return;
  const next=followBoardTarget(bounds,projection,{zoom,pan},target,projection.tileCenter);
  if(next){setCameraDuration(movement.duration);setSmoothCamera(!reducedMotion);setPan(next)}
 },[game,autoFrame,focusId,actor?.id,reducedMotion,projection]);
 function reset(){cameraTouched.current=true;setCameraDuration(200);setSmoothCamera(!reducedMotion);setZoom(1);setPan({x:0,y:0})}
 function clampZoom(z:number){return Math.max(.7,Math.min(2.5,z))}
 function clampPan(next:BoardPoint,z=zoom){
  const bounds=svg.current?.getBoundingClientRect(),scale=bounds&&bounds.width>0&&bounds.height>0?Math.min(bounds.width/w,bounds.height/h):1;
  const limitX=Math.max(w/2,(w*z-(bounds?.width||w)/scale)/2),limitY=Math.max(h/2,(h*z-(bounds?.height||h)/scale)/2);
  return {x:Math.max(-limitX,Math.min(limitX,next.x)),y:Math.max(-limitY,Math.min(limitY,next.y))};
 }
 function movePan(dx:number,dy:number){cameraTouched.current=true;setCameraDuration(200);setSmoothCamera(!reducedMotion);setPan(p=>clampPan({x:p.x+dx,y:p.y+dy}))}
 function focusActor(){cameraTouched.current=true;setCameraDuration(200);setSmoothCamera(!reducedMotion);const target=game.actors.find(a=>a.id===focusId)||actor;if(!target)return;const next=Math.max(zoom,1.5),point=projection.tileCenter(target.x,target.y);setZoom(next);setPan(clampPan({x:(w/2-point.x)*next,y:(h/2-point.y)*next},next))}
 function zoomBy(delta:number){cameraTouched.current=true;setCameraDuration(200);setSmoothCamera(!reducedMotion);setZoom(z=>clampZoom(z+delta))}
 useImperativeHandle(controlsRef,()=>({fit:reset,focusActor,zoomIn:()=>zoomBy(.15),zoomOut:()=>zoomBy(-.15),toggleGrid:()=>setGrid(g=>!g),pan:movePan,isMoving:motion.isMoving,isInteracting:()=>pointers.current.size>0||!!drag.current||!!pinch.current}));
 useEffect(()=>{const el=svg.current;if(!el)return;const wheel=(e:WheelEvent)=>{e.preventDefault();cameraTouched.current=true;setCameraDuration(200);setSmoothCamera(!reducedMotion);setZoom(z=>clampZoom(z-e.deltaY*.001))};el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel)},[reducedMotion]);
 const releasePointer=useCallback((id:number)=>{pointers.current.delete(id);if(drag.current?.move||pinch.current)suppressClick.current=Date.now()+250;pinch.current=null;const remaining=[...pointers.current.values()][0];drag.current=remaining?{x:remaining.x,y:remaining.y,px:camera.current.pan.x,py:camera.current.pan.y,move:true}:null;setDragging(!!remaining);if(svg.current?.hasPointerCapture(id))svg.current.releasePointerCapture(id)},[]);
 function previewFocus(tile:BoardPoint,keyboard:boolean){
  setFocusedTile(tile);setPreviewTile(tile);
  const bounds=svg.current?.getBoundingClientRect();if(!keyboard||!bounds)return;
  const next=revealedBoardPan(bounds,projection,camera.current,tile,projection.tileCenter);
  if(next){cameraTouched.current=true;setCameraDuration(200);setSmoothCamera(!reducedMotion);setPan(next)}
 }
 useEffect(()=>{
  // A click can leave the SVG before it becomes a captured drag. Always release its input lock.
  const release=(event:PointerEvent)=>{if(pointers.current.has(event.pointerId))releasePointer(event.pointerId)};
  const cancel=()=>{for(const id of pointers.current.keys())if(svg.current?.hasPointerCapture(id))svg.current.releasePointerCapture(id);pointers.current.clear();drag.current=null;pinch.current=null;setDragging(false)};
  window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);window.addEventListener('blur',cancel);
  return()=>{window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',release);window.removeEventListener('blur',cancel)};
 },[releasePointer]);
 function renderActor(a:Actor){
  const point=projection.tileCenter(a.x,a.y);return <g key={a.id} data-x={a.x} data-y={a.y} ref={node=>{if(node)motion.nodes.current.set(a.id,node);else motion.nodes.current.delete(a.id)}} className={`board-actor ${a.hp<=0?'downed':''} ${a.defeated?'defeated':''}`} style={{transform:`translate(${point.x}px, ${point.y}px)`}} pointerEvents={a.defeated?'none':undefined} role={a.defeated?undefined:'button'} aria-label={`${a.name}, ${a.hp} of ${a.maxHp} health${a.enemy?', enemy':''}`} tabIndex={a.defeated?undefined:0} onClick={e=>{e.stopPropagation();if(!motion.isMoving()&&Date.now()>suppressClick.current)onActor(a)}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();if(!motion.isMoving())onActor(a)}}}>
 {!a.defeated?<ellipse className="actor-floor-marker" cy={viewMode==='2.5d'?5:11} rx="22" ry={viewMode==='2.5d'?11:15} fill={targets.has(a.id)?P.target:a.id===game.activeActorId?P.active:a.color} stroke={a.id===selectedId?P.marker:a.enemy?P.enemyHealth:P.health} strokeWidth={a.id===selectedId?2.6:1.2} fillOpacity=".65"/>:null}
 {!a.defeated&&a.id===game.activeActorId?<path d="m-4-43 8 0-4 5Z" fill={P.marker}/>:null}
 <g transform={a.defeated?'translate(-3 9) rotate(-75) scale(.55)':undefined}><svg x="-25" y="-45" width="50" height="58" viewBox="0 0 80 90"><HeroArt heroClass={a.heroClass} color={a.color} enemy={a.enemy}/></svg></g>
 {!a.defeated?<><rect x="-16" y="20" width="32" height="4" rx="2" fill={P.healthTrack} opacity=".2"/><rect x="-16" y="20" width={32*Math.max(0,a.hp/a.maxHp)} height="4" rx="2" fill={a.enemy?P.enemyHealth:P.health}/></>:null}
 {!a.defeated&&a.guarding?<path d="m15-33 10 0v7l-5 4-5-4Z" fill={P.accent} stroke={P.leafDark}/>:null}
 </g>;
 }
 const scenery=useMemo(()=>game.tiles.filter(tile=>tile.kind==='wall'||tile.decoration).map(tile=>({key:`prop-${tile.x}-${tile.y}`,depth:tile.x+tile.y,x:tile.x,order:0,kind:'prop' as const,tile})),[game.tiles]);
 const depthItems=useMemo(()=>viewMode==='2.5d'?[
  ...scenery.map(item=>({...item,faded:game.actors.some(a=>{const position=motion.depthPositions[a.id]||a;return !a.defeated&&Math.abs(position.x-item.tile.x)+Math.abs(position.y-item.tile.y)<=2})})),
  {key:'gateway',depth:game.exit.x+game.exit.y,x:game.exit.x,order:1,kind:'gateway' as const},
  {key:'chest',depth:game.chest.x+game.chest.y,x:game.chest.x,order:1,kind:'chest' as const},
  ...game.actors.map(a=>{const position=motion.depthPositions[a.id]||a;return {key:a.id,depth:position.x+position.y,x:position.x,order:a.defeated?1.5:2,kind:'actor' as const,actor:a}}),
 ].sort((a,b)=>a.depth-b.depth||a.x-b.x||a.order-b.order):[],[viewMode,scenery,game.actors,game.exit,game.chest,motion.depthPositions]);
 return <div className="board-container" data-board-view={viewMode}>
 {caption?<div className="board-caption"><span>{caption}</span></div>:null}
 <div className={`board-viewport ${dragging?'dragging':''}`}>
 <svg ref={svg} className={`game-board board-view-${viewMode==='2.5d'?'depth':'flat'}`} viewBox={`0 0 ${w} ${h}`} aria-label={`${game.sceneName} tactical board. ${myTurn?'Select a highlighted tile to move, or select a character.':'Select a character to inspect it.'}`} role="group" tabIndex={keyboardTile?-1:0}
 onPointerDown={e=>{if(e.button!==0&&e.button!==1)return;setSmoothCamera(false);if(e.pointerType==='touch')setPreviewTile(null);pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.current.size===2){cameraTouched.current=true;const [a,b]=[...pointers.current.values()];pinch.current={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom,midX:(a.x+b.x)/2,midY:(a.y+b.y)/2,px:pan.x,py:pan.y};suppressClick.current=Date.now()+250;setDragging(true);svg.current?.setPointerCapture(e.pointerId)}else if(pointers.current.size===1){drag.current={x:e.clientX,y:e.clientY,px:pan.x,py:pan.y,move:false}}}}
 onPointerMove={e=>{if(!pointers.current.has(e.pointerId))return;pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});const bounds=svg.current?.getBoundingClientRect();const scale=Math.max(w/(bounds?.width||w),h/(bounds?.height||h));if(pinch.current&&pointers.current.size>=2){const[a,b]=[...pointers.current.values()],p=pinch.current,nextZoom=clampZoom(p.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,p.distance)),centerX=(bounds?.left||0)+(bounds?.width||w)/2,centerY=(bounds?.top||0)+(bounds?.height||h)/2;setZoom(nextZoom);setPan(clampPan(anchoredBoardPan({x:p.px,y:p.py},p.zoom,nextZoom,{x:(p.midX-centerX)*scale,y:(p.midY-centerY)*scale},{x:((a.x+b.x)/2-centerX)*scale,y:((a.y+b.y)/2-centerY)*scale}),nextZoom));suppressClick.current=Date.now()+250;return}if(!drag.current)return;const dx=e.clientX-drag.current.x,dy=e.clientY-drag.current.y;if(Math.abs(dx)+Math.abs(dy)>6){cameraTouched.current=true;drag.current.move=true;setDragging(true);svg.current?.setPointerCapture(e.pointerId);setPan(clampPan({x:drag.current.px+dx*scale,y:drag.current.py+dy*scale}))}}}
 onPointerUp={e=>releasePointer(e.pointerId)} onPointerCancel={e=>releasePointer(e.pointerId)}>
 <g className={`board-camera ${smoothCamera&&!dragging&&!reducedMotion?'camera-smooth':''}`} style={{transitionDuration:`${cameraDuration}ms`,transform:`translate(${w/2+pan.x}px, ${h/2+pan.y}px) scale(${zoom}) translate(${-w/2}px, ${-h/2}px)`}}>
 <BoardTerrain game={game} grid={grid} projection={projection} theme={theme}/>
 <g className="board-ground-overlay" transform={projection.groundTransform||undefined}>
 {reachable.map(t=><rect key={`reach${t.x},${t.y}`} x={t.x*50+3} y={t.y*50+3} width="44" height="44" rx="9" fill={P.reachable} fillOpacity=".15" stroke={P.reachable} strokeOpacity=".4" strokeDasharray="3 4"/>)}
 {route&&route.length>1?<g className="board-route" aria-hidden="true"><polyline className="board-route-line" points={route.map(p=>`${p.x*50+25},${p.y*50+25}`).join(' ')} fill="none" stroke={P.route} strokeWidth="3.5"/><circle className="board-route-destination" cx={route.at(-1)!.x*50+25} cy={route.at(-1)!.y*50+25} r="9" fill={P.grass} stroke={P.route}/></g>:null}
 {viewMode==='2d'?<> <g role="img" aria-label="Gateway" transform={`translate(${game.exit.x*50+25} ${game.exit.y*50+25})`}>{theme==='pixel'?<PixelGateway active={game.chest.opened}/>:<><ellipse rx="19" ry="15" fill={game.chest.opened?P.gatewayActive:P.gateway} stroke={P.glyph} strokeDasharray="3 3"/><path d="M-13 3h25m-7-6 7 6-7 6" stroke={P.glyph} strokeWidth="2" fill="none"/></>}</g>
 <g role="img" aria-label="Chest" transform={`translate(${game.chest.x*50+10} ${game.chest.y*50+13})`} stroke={P.ink} strokeWidth="2">{theme==='pixel'?<PixelChest opened={game.chest.opened}/>:<><path d={game.chest.opened?'M0 11 5 2l26 4-2 9v14H0Z':'M0 11q0-18 30 0v18H0Z'} fill={game.chest.opened?P.chestOpen:P.chest}/><path d="M0 16h30m-18-4v9h6v-9" fill={P.chestTrim}/></>}</g>
 </>:null}
 {game.tiles.map(t=>{const tileKey=`${t.x},${t.y}`,canMove=reachableKeys.has(tileKey);return <rect key={`hit${tileKey}`} data-board-tile={tileKey} x={t.x*50} y={t.y*50} width="50" height="50" fill="transparent" className={`tile-hit ${canMove?'reachable':''}`} role={canMove?'button':undefined} aria-label={canMove?`Move to ${t.x}, ${t.y}`:undefined} aria-describedby={canMove?keyboardHelpId:undefined} tabIndex={canMove?(keyboardTile?.x===t.x&&keyboardTile.y===t.y?0:-1):undefined} onPointerEnter={e=>{if(e.pointerType!=='touch'&&canMove)setPreviewTile({x:t.x,y:t.y})}} onPointerLeave={e=>{if(document.activeElement!==e.currentTarget)setPreviewTile(null)}} onFocus={e=>{if(canMove)previewFocus(t,e.currentTarget.matches(':focus-visible'))}} onBlur={()=>setPreviewTile(null)} onClick={()=>{if(!motion.isMoving()&&Date.now()>suppressClick.current&&canMove)onTile(t.x,t.y)}} onKeyDown={e=>{
  if(!e.altKey&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){
   e.preventDefault();e.stopPropagation();if(!canMove)return;
   const next=nextBoardTile(reachable,t,e.key as BoardDirection,projection.tileCenter);svg.current?.querySelector<SVGRectElement>(`[data-board-tile="${next.x},${next.y}"]`)?.focus({preventScroll:true});
  }else if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();if(!motion.isMoving()&&canMove)onTile(t.x,t.y)}
 }}/>})}
 </g>
 {viewMode==='2.5d'?depthItems.map(item=><g key={item.key} data-depth={item.depth}>{item.kind==='prop'?<DepthProp tile={item.tile} projection={projection} faded={item.faded}/>:item.kind==='gateway'?<DepthGateway {...game.exit} active={game.chest.opened} projection={projection}/>:item.kind==='chest'?<DepthChest {...game.chest} projection={projection}/>:renderActor(item.actor)}</g>):[...game.actors].sort((a,b)=>a.y-b.y||Number(b.defeated)-Number(a.defeated)).map(renderActor)}
 </g></svg>
 <span id={keyboardHelpId} className="sr-only">Arrow keys preview a destination. Enter or Space moves. Tab leaves the tiles.</span>
 <div className="board-keyboard-help" aria-hidden="true">Arrows preview · Enter moves · Tab leaves tiles</div>
 {route&&route.length>1?<div className="board-route-cost">{route.length-1} {route.length===2?'tile':'tiles'} · {(route.length-1)*5} ft</div>:null}
 <div className="map-compass" title={viewMode==='2.5d'?'North: upper right':'North'}><span>N</span><svg viewBox="0 0 30 40" style={viewMode==='2.5d'?{transform:'rotate(63.435deg)'}:undefined}><path d="m15 5 8 25-8-6-8 6Z" fill={P.stoneDark}/><path d="m15 5 0 19-8 6Z" fill={P.stoneLight}/></svg></div>
 <div className="board-tools"><button title={grid?'Hide grid':'Show grid'} aria-label="Toggle grid" aria-pressed={grid} onClick={()=>setGrid(!grid)}><Icon name="eye" size={16}/></button><i/><button title="Zoom out" aria-label="Zoom out" onClick={()=>zoomBy(-.15)}><Icon name="minus" size={16}/></button><span>{Math.round(zoom*100)}%</span><button title="Zoom in" aria-label="Zoom in" onClick={()=>zoomBy(.15)}><Icon name="plus" size={16}/></button><i/><button title="Center on your hero" aria-label="Center on your hero" onClick={focusActor}><Icon name="people" size={16}/></button><button title="Fit board" aria-label="Fit board" onClick={reset}><Icon name="fit" size={16}/></button></div>
 
 </div></div>
}
