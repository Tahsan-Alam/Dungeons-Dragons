'use client';
import {memo,useMemo,useRef,useState,useEffect,useLayoutEffect,useImperativeHandle,useCallback,useId,type Ref,type ReactNode} from 'react';
import type {Actor,GameState} from '../../game/types';
import {getReachable,getValidTargets} from '../../game/engine';
import {Icon} from './Art';
import {useTheme} from './Theme';
import {ART_PALETTE as P} from './artPalette';
import {findBoardPath,isBoardDiscontinuity,planActorMotions,boardPathKeyframes,sampleBoardPath,initialBoardFrame,followBoardTarget,anchoredBoardPan,type BoardPoint} from './board-motion';
import {createBoardProjection,type BoardProjection} from './board-projection';
import {collectBoardFeedback,type BoardFeedback} from './board-feedback';
import {DepthTerrain,DepthProp,DepthChest,DepthGateway} from './DepthArt';
import {isGroundMark} from '../../game/set-pieces';
import {ActorSprite,spriteTop} from './ActorArt';
import {keeperYields} from './actor-art';
import {KeeperMarks} from './KeeperMarks';
import {TacticalTerrain,TacticalToken} from './TacticalArt';
import {nightLights,nightLitTiles,nightRim} from './night-light';
import {healthLevel} from './readability';
import {sameBoardTerrain,rovingBoardTile,nextBoardTile,resizedBoardPan,revealedBoardPan,type BoardDirection} from './board-interaction';
import './board-motion.css';
import './board-view.css';
import './night.css';
export type Tool='move'|'attack'|'ability';
export type BoardControls={fit:()=>void;focusActor:()=>void;zoomIn:()=>void;zoomOut:()=>void;toggleGrid:()=>void;pan:(dx:number,dy:number)=>void;isMoving:()=>boolean;isInteracting:()=>boolean};
const BoardTerrain=memo(function BoardTerrain({game,grid,projection}:{game:GameState;grid:boolean;projection:BoardProjection}){
 return projection.mode==='2.5d'?<DepthTerrain game={game} grid={grid} projection={projection}/>:<TacticalTerrain game={game} grid={grid}/>;
},(before,after)=>before.grid===after.grid&&before.projection===after.projection&&sameBoardTerrain(before.game,after.game));
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
type ShownFeedback=BoardFeedback&{delay:number};
/** Floating combat results. They read snapshots only and never influence the rules or a replay. */
function useBoardFeedback(game:GameState,enabled:boolean,resetKey:string|number|undefined,hold:boolean){
 const previous=useRef<GameState|null>(null),lastReset=useRef(resetKey),waiting=useRef<BoardFeedback[]>([]),timers=useRef(new Set<ReturnType<typeof setTimeout>>());
 const[shown,setShown]=useState<ShownFeedback[]>([]);
 useEffect(()=>{
  const before=previous.current;previous.current=game;const reset=lastReset.current!==resetKey;lastReset.current=resetKey;
  if(!enabled||reset||(before&&before!==game&&isBoardDiscontinuity(before,game))){waiting.current=[];for(const timer of timers.current)clearTimeout(timer);timers.current.clear();setShown(current=>current.length?[]:current);return}
  if(before&&before!==game)waiting.current.push(...collectBoardFeedback(before,game));
  // A roll dialog covers the board, so its results appear once the player can see them.
  if(hold||!waiting.current.length)return;
  const ready=waiting.current;waiting.current=[];
  const step=Math.min(160,Math.round(900/ready.length)),fresh=ready.map((item,index)=>({...item,delay:index*step}));
  setShown(current=>[...current,...fresh]);
  const timer=setTimeout(()=>{timers.current.delete(timer);setShown(current=>current.filter(item=>!fresh.includes(item)))},1300+fresh.length*step);timers.current.add(timer);
 },[game,enabled,resetKey,hold]);
 useEffect(()=>{const pending=timers.current;return()=>{for(const timer of pending)clearTimeout(timer)}},[]);
 return shown;
}
export default function Board({game,actor,tool,onTile,onActor,selectedId,myTurn,controlsRef,focusId,caption,onMotionChange,animateMovement=true,motionResetKey,autoFrame=false,holdFeedback=false,children}:{game:GameState;actor?:Actor;tool:Tool;onTile:(x:number,y:number)=>void;onActor:(a:Actor)=>void;selectedId:string;myTurn:boolean;controlsRef?:Ref<BoardControls>;focusId?:string;caption?:string;onMotionChange?:(moving:boolean)=>void;animateMovement?:boolean;motionResetKey?:string|number;autoFrame?:boolean;holdFeedback?:boolean;children?:ReactNode}){
 const {reducedMotion,viewMode,setViewMode}=useTheme();
 const projection=useMemo(()=>createBoardProjection(viewMode,game.width,game.height),[viewMode,game.width,game.height]);
 const motion=useActorMotion(game,projection,focusId??actor?.id,animateMovement,motionResetKey,reducedMotion,onMotionChange);
 const feedback=useBoardFeedback(game,animateMovement,motionResetKey,holdFeedback);
 const struck=useMemo(()=>{const map=new Map<string,{kind:'hit'|'healed';delay:number}>();for(const item of feedback)if(item.kind!=='miss'&&!map.has(item.actorId))map.set(item.actorId,{kind:item.kind==='heal'?'healed':'hit',delay:item.delay});return map},[feedback]);
 const[previewTile,setPreviewTile]=useState<BoardPoint|null>(null),[smoothCamera,setSmoothCamera]=useState(false),[cameraDuration,setCameraDuration]=useState(200);
 const[focusedTile,setFocusedTile]=useState<BoardPoint|null>(null),keyboardHelpId=useId();
 const [zoom,setZoom]=useState(1),[pan,setPan]=useState({x:0,y:0}),[grid,setGrid]=useState(true),[dragging,setDragging]=useState(false);
 const svg=useRef<SVGSVGElement>(null),cameraTouched=useRef(false),cameraGame=useRef(game),frameTarget=useRef<BoardPoint>({x:0,y:0}); const drag=useRef<{x:number;y:number;px:number;py:number;move:boolean}|null>(null);const pointers=useRef(new Map<number,{x:number;y:number}>()),pinch=useRef<{distance:number;zoom:number;midX:number;midY:number;px:number;py:number}|null>(null),suppressClick=useRef(0);
 const camera=useRef({zoom,pan});camera.current={zoom,pan};
 const reachable=useMemo(()=>actor&&myTurn&&!motion.moving&&tool==='move'?getReachable(game,actor):[],[game,actor,myTurn,tool,motion.moving]);
 const reachableKeys=useMemo(()=>new Set(reachable.map(t=>`${t.x},${t.y}`)),[reachable]);
 const keyboardTile=useMemo(()=>rovingBoardTile(reachable,focusedTile,actor),[reachable,focusedTile,actor]);
 const targets=useMemo(()=>new Set(actor&&myTurn&&tool!=='move'?getValidTargets(game,actor,tool==='ability').map(a=>a.id):[]),[game,actor,myTurn,tool]);
 // In Move, selecting an enemy already in reach attacks it; the board marks those enemies.
 const quickTargets=useMemo(()=>new Set(actor&&myTurn&&!motion.moving&&tool==='move'?getValidTargets(game,actor).filter(a=>a.enemy).map(a=>a.id):[]),[game,actor,myTurn,tool,motion.moving]);
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
  const rim=nightRim(lights,a.x,a.y),point=projection.tileCenter(a.x,a.y),targeted=targets.has(a.id),attackable=quickTargets.has(a.id),dimmed=targets.size>0&&!targeted&&!a.defeated&&a.id!==actor?.id,hit=struck.get(a.id),depth=viewMode==='2.5d',top=depth?spriteTop(a,game.options.biome):-20;return <g key={a.id} data-x={a.x} data-y={a.y} ref={node=>{if(node)motion.nodes.current.set(a.id,node);else motion.nodes.current.delete(a.id)}} className={`board-actor ${a.hp<=0?'downed':''} ${a.defeated?keeperYields(a.keeper)?'defeated yielded':'defeated':''} ${targeted?'targeted':''} ${attackable?'attackable':''} ${dimmed?'out-of-range':''} ${rim?`night-${rim.tone}`:''}`} style={{transform:`translate(${point.x}px, ${point.y}px)`,...(rim?{'--night-side':rim.side}:{})}} pointerEvents={a.defeated?'none':undefined} role={a.defeated?undefined:'button'} aria-label={`${a.name}, ${a.hp} of ${a.maxHp} health${a.enemy?', enemy':''}${attackable?', select to attack':targeted?', valid target':''}`} tabIndex={a.defeated?undefined:0} onClick={e=>{e.stopPropagation();if(!motion.isMoving()&&Date.now()>suppressClick.current)onActor(a)}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();if(!motion.isMoving())onActor(a)}}}>
 {attackable?<title>{`Attack ${a.name}`}</title>:null}
 {!a.defeated?<ellipse className="actor-floor-marker" cy={depth?5:0} rx={depth?22:24} ry={depth?11:24} fill={targets.has(a.id)?P.target:a.id===game.activeActorId?P.active:a.color} stroke={a.id===selectedId?P.marker:a.enemy?P.enemyHealth:P.health} strokeWidth={a.id===selectedId?2.6:1.2} fillOpacity=".65"/>:null}
 {!a.defeated&&(targeted||attackable)?<ellipse className={`actor-target-ring ${targeted?'pulse':''}`} cy={depth?5:0} rx={depth?27:28} ry={depth?15:28} stroke={P.target} strokeWidth={targeted?3:2} strokeDasharray={targeted?undefined:'4 4'}/>:null}
 {!a.defeated&&a.id===game.activeActorId?<path d={`M-4 ${top-8}h8l-4 5Z`} fill={P.marker}/>:null}
 <g className={hit?`actor-body ${hit.kind}`:'actor-body'} style={hit?{animationDelay:`${hit.delay}ms`}:undefined}>{depth?<g opacity={a.defeated&&!keeperYields(a.keeper)?.3:undefined}><ActorSprite actor={a} biome={game.options.biome}/></g>:<g transform={a.defeated?'scale(.8)':undefined}><TacticalToken actor={a} biome={game.options.biome} ring={a.enemy?P.enemyHealth:a.color}/></g>}</g>
 {!a.defeated?<><rect x="-16" y={depth?20:25} width="32" height="4" rx="2" fill={P.healthTrack} opacity=".2"/><rect x="-16" y={depth?20:25} width={32*Math.max(0,a.hp/a.maxHp)} height="4" rx="2" fill={a.enemy?P.enemyHealth:{ok:P.health,low:'var(--warning)',critical:'var(--danger)',down:'var(--danger)'}[healthLevel(a.hp,a.maxHp)]}/></>:null}
 {!a.defeated&&a.guarding?<path transform={`translate(15 ${top+12})`} d="M0 0h10v7l-5 4-5-4Z" fill={P.accent} stroke={P.leafDark}/>:null}
 </g>;
 }
 // The scene camera faces the board from the front, so nearer rows (larger y) draw over farther ones.
 const scenery=useMemo(()=>game.tiles.filter(tile=>(tile.kind==='wall'||tile.decoration)&&!isGroundMark(tile.decoration)&&tile.decoration!=='span').map(tile=>({key:`prop-${tile.x}-${tile.y}`,depth:tile.y,x:tile.x,order:0,kind:'prop' as const,tile})),[game.tiles]);
 const lights=useMemo(()=>nightLights(game),[game.tiles]),nightLit=useMemo(()=>nightLitTiles(game,lights),[game.tiles,lights]);
 const depthItems=useMemo(()=>viewMode==='2.5d'?[
  ...scenery.map(item=>({...item,faded:game.actors.some(a=>{const position=motion.depthPositions[a.id]||a;return !a.defeated&&Math.abs(position.x-item.tile.x)<=1&&item.tile.y-position.y>=0&&item.tile.y-position.y<=2})})),
  {key:'gateway',depth:game.exit.y,x:game.exit.x,order:1,kind:'gateway' as const},
  {key:'chest',depth:game.chest.y,x:game.chest.x,order:1,kind:'chest' as const},
  ...game.actors.map(a=>{const position=motion.depthPositions[a.id]||a;return {key:a.id,depth:position.y,x:position.x,order:a.defeated?1.5:2,kind:'actor' as const,actor:a}}),
 ].sort((a,b)=>a.depth-b.depth||a.x-b.x||a.order-b.order):[],[viewMode,scenery,game.actors,game.exit,game.chest,motion.depthPositions]);
 return <div className="board-container" data-board-view={viewMode}>
 {caption?<div className="board-caption"><span>{caption}</span></div>:null}
 <div className={`board-viewport ${dragging?'dragging':''}`}>
 <svg ref={svg} className={`game-board board-view-${viewMode==='2.5d'?'depth':'flat'}`} viewBox={`0 0 ${w} ${h}`} aria-label={`${game.sceneName} tactical board. ${myTurn?'Select a highlighted tile to move, or select a character.':'Select a character to inspect it.'}`} role="group" tabIndex={keyboardTile?-1:0}
 onPointerDown={e=>{if(e.button!==0&&e.button!==1)return;setSmoothCamera(false);if(e.pointerType==='touch')setPreviewTile(null);pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.current.size===2){cameraTouched.current=true;const [a,b]=[...pointers.current.values()];pinch.current={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom,midX:(a.x+b.x)/2,midY:(a.y+b.y)/2,px:pan.x,py:pan.y};suppressClick.current=Date.now()+250;setDragging(true);svg.current?.setPointerCapture(e.pointerId)}else if(pointers.current.size===1){drag.current={x:e.clientX,y:e.clientY,px:pan.x,py:pan.y,move:false}}}}
 onPointerMove={e=>{if(!pointers.current.has(e.pointerId))return;pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});const bounds=svg.current?.getBoundingClientRect();const scale=Math.max(w/(bounds?.width||w),h/(bounds?.height||h));if(pinch.current&&pointers.current.size>=2){const[a,b]=[...pointers.current.values()],p=pinch.current,nextZoom=clampZoom(p.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,p.distance)),centerX=(bounds?.left||0)+(bounds?.width||w)/2,centerY=(bounds?.top||0)+(bounds?.height||h)/2;setZoom(nextZoom);setPan(clampPan(anchoredBoardPan({x:p.px,y:p.py},p.zoom,nextZoom,{x:(p.midX-centerX)*scale,y:(p.midY-centerY)*scale},{x:((a.x+b.x)/2-centerX)*scale,y:((a.y+b.y)/2-centerY)*scale}),nextZoom));suppressClick.current=Date.now()+250;return}if(!drag.current)return;const dx=e.clientX-drag.current.x,dy=e.clientY-drag.current.y;if(Math.abs(dx)+Math.abs(dy)>6){cameraTouched.current=true;drag.current.move=true;setDragging(true);svg.current?.setPointerCapture(e.pointerId);setPan(clampPan({x:drag.current.px+dx*scale,y:drag.current.py+dy*scale}))}}}
 onPointerUp={e=>releasePointer(e.pointerId)} onPointerCancel={e=>releasePointer(e.pointerId)}>
 <g className={`board-camera ${smoothCamera&&!dragging&&!reducedMotion?'camera-smooth':''}`} style={{transitionDuration:`${cameraDuration}ms`,transform:`translate(${w/2+pan.x}px, ${h/2+pan.y}px) scale(${zoom}) translate(${-w/2}px, ${-h/2}px)`}}>
 <BoardTerrain game={game} grid={grid} projection={projection}/>
 <g className="board-ground-overlay" transform={projection.groundTransform||undefined}>
 <KeeperMarks game={game}/>
 {reachable.map(t=><rect key={`reach${t.x},${t.y}`} x={t.x*50+3} y={t.y*50+3} width="44" height="44" rx="9" fill={P.reachable} fillOpacity=".15" stroke={P.reachable} strokeOpacity=".4" strokeDasharray="3 4"/>)}
 {route&&route.length>1?<g className="board-route" aria-hidden="true"><polyline className="board-route-line" points={route.map(p=>`${p.x*50+25},${p.y*50+25}`).join(' ')} fill="none" stroke={P.route} strokeWidth="3.5"/><circle className="board-route-destination" cx={route.at(-1)!.x*50+25} cy={route.at(-1)!.y*50+25} r="9" fill={P.grass} stroke={P.route}/></g>:null}
 {viewMode==='2d'?<> <g role="img" aria-label="Gateway" transform={`translate(${game.exit.x*50+25} ${game.exit.y*50+25})`}>{<><ellipse rx="19" ry="15" fill={game.chest.opened?P.gatewayActive:P.gateway} stroke={P.glyph} strokeDasharray="3 3"/><path d="M-13 3h25m-7-6 7 6-7 6" stroke={P.glyph} strokeWidth="2" fill="none"/></>}</g>
 <g role="img" aria-label="Chest" transform={`translate(${game.chest.x*50+10} ${game.chest.y*50+13})`} stroke={P.ink} strokeWidth="2">{<><path d={game.chest.opened?'M0 11 5 2l26 4-2 9v14H0Z':'M0 11q0-18 30 0v18H0Z'} fill={game.chest.opened?P.chestOpen:P.chest}/><path d="M0 16h30m-18-4v9h6v-9" fill={P.chestTrim}/></>}</g>
 </>:null}
 {game.tiles.map(t=>{const tileKey=`${t.x},${t.y}`,canMove=reachableKeys.has(tileKey);return <rect key={`hit${tileKey}`} data-board-tile={tileKey} x={t.x*50} y={t.y*50} width="50" height="50" fill="transparent" className={`tile-hit ${canMove?'reachable':''}`} role={canMove?'button':undefined} aria-label={canMove?`Move to ${t.x}, ${t.y}`:undefined} aria-describedby={canMove?keyboardHelpId:undefined} tabIndex={canMove?(keyboardTile?.x===t.x&&keyboardTile.y===t.y?0:-1):undefined} onPointerEnter={e=>{if(e.pointerType!=='touch'&&canMove)setPreviewTile({x:t.x,y:t.y})}} onPointerLeave={e=>{if(document.activeElement!==e.currentTarget)setPreviewTile(null)}} onFocus={e=>{if(canMove)previewFocus(t,e.currentTarget.matches(':focus-visible'))}} onBlur={()=>setPreviewTile(null)} onClick={()=>{if(!motion.isMoving()&&Date.now()>suppressClick.current&&canMove)onTile(t.x,t.y)}} onKeyDown={e=>{
  if(!e.altKey&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){
   e.preventDefault();e.stopPropagation();if(!canMove)return;
   const next=nextBoardTile(reachable,t,e.key as BoardDirection,projection.tileCenter);svg.current?.querySelector<SVGRectElement>(`[data-board-tile="${next.x},${next.y}"]`)?.focus({preventScroll:true});
  }else if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();if(!motion.isMoving()&&canMove)onTile(t.x,t.y)}
 }}/>})}
 </g>
 {viewMode==='2.5d'?depthItems.map(item=><g key={item.key} data-depth={item.depth}>{item.kind==='prop'?<DepthProp tile={item.tile} projection={projection} faded={item.faded} lit={nightLit.has(`${item.tile.x},${item.tile.y}`)}/>:item.kind==='gateway'?<DepthGateway {...game.exit} active={game.chest.opened} projection={projection}/>:item.kind==='chest'?<DepthChest {...game.chest} projection={projection}/>:renderActor(item.actor)}</g>):[...game.actors].sort((a,b)=>a.y-b.y||Number(b.defeated)-Number(a.defeated)).map(renderActor)}
 {feedback.length?<g className="board-feedback" aria-hidden="true">{feedback.map(item=>{const point=projection.tileCenter(item.x,item.y);return <g key={item.key} transform={`translate(${point.x} ${point.y-36})`}><text className={`board-float ${item.kind}`} textAnchor="middle" style={{animationDelay:`${item.delay}ms`}}>{item.text}</text></g>})}</g>:null}
 </g></svg>
 <span id={keyboardHelpId} className="sr-only">Arrow keys preview a destination. Enter or Space moves. Tab leaves the tiles.</span>
 <div className="board-keyboard-help" aria-hidden="true">Arrows preview · Enter moves · Tab leaves tiles</div>
 {route&&route.length>1?<div className="board-route-cost">{route.length-1} {route.length===2?'tile':'tiles'} · {(route.length-1)*5} ft</div>:null}
 <div className="map-compass" title={viewMode==='2.5d'?'North: away from you':'North'}><span>N</span><svg viewBox="0 0 30 40"><path d="m15 5 8 25-8-6-8 6Z" fill={P.stoneDark}/><path d="m15 5 0 19-8 6Z" fill={P.stoneLight}/></svg></div>
 <div className="board-tools"><button title={grid?'Hide grid':'Show grid'} aria-label="Toggle grid" aria-pressed={grid} onClick={()=>setGrid(!grid)}><Icon name="eye" size={16}/></button><i/><button title="Zoom out" aria-label="Zoom out" onClick={()=>zoomBy(-.15)}><Icon name="minus" size={16}/></button><span>{Math.round(zoom*100)}%</span><button title="Zoom in" aria-label="Zoom in" onClick={()=>zoomBy(.15)}><Icon name="plus" size={16}/></button><i/><button title="Center on your hero" aria-label="Center on your hero" onClick={focusActor}><Icon name="people" size={16}/></button><button title="Fit board" aria-label="Fit board" onClick={reset}><Icon name="fit" size={16}/></button><i/><button className="view-toggle" title={viewMode==='2.5d'?'Show the tactical map (from above)':'Show the scene'} aria-label={viewMode==='2.5d'?'Show the tactical map':'Show the scene'} onClick={()=>setViewMode(viewMode==='2.5d'?'2d':'2.5d')}>{viewMode==='2.5d'?'Map':'Scene'}</button></div>
 {children}
 </div></div>
}
