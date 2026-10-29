'use client';
import {memo,useMemo,useRef,useState,useEffect,useImperativeHandle,type Ref} from 'react';
import type {Actor,GameState} from '../../game/types';
import {getReachable,getValidTargets} from '../../game/engine';
import {HeroArt,Icon,Tree} from './Art';
import {useTheme} from './Theme';
import {PixelTerrain,PixelChest,PixelGateway} from './PixelArt';
import {ART_PALETTE as P} from './artPalette';
export type Tool='move'|'attack'|'ability';
export type BoardControls={fit:()=>void;focusActor:()=>void;zoomIn:()=>void;zoomOut:()=>void;toggleGrid:()=>void;pan:(dx:number,dy:number)=>void};
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
export default function Board({game,actor,tool,onTile,onActor,selectedId,myTurn,controlsRef,focusId,caption}:{game:GameState;actor?:Actor;tool:Tool;onTile:(x:number,y:number)=>void;onActor:(a:Actor)=>void;selectedId:string;myTurn:boolean;controlsRef?:Ref<BoardControls>;focusId?:string;caption?:string}){
 const {theme}=useTheme();
 const [zoom,setZoom]=useState(1),[pan,setPan]=useState({x:0,y:0}),[grid,setGrid]=useState(true),[dragging,setDragging]=useState(false);
 const svg=useRef<SVGSVGElement>(null); const drag=useRef<{x:number;y:number;px:number;py:number;move:boolean}|null>(null);const pointers=useRef(new Map<number,{x:number;y:number}>()),pinch=useRef<{distance:number;zoom:number;midX:number;midY:number;px:number;py:number}|null>(null),suppressClick=useRef(0);
 const reachable=useMemo(()=>actor&&myTurn&&tool==='move'?getReachable(game,actor):[],[game,actor,myTurn,tool]);
 const reachableKeys=useMemo(()=>new Set(reachable.map(t=>`${t.x},${t.y}`)),[reachable]);
 const targets=useMemo(()=>new Set(actor&&myTurn&&tool!=='move'?getValidTargets(game,actor,tool==='ability').map(a=>a.id):[]),[game,actor,myTurn,tool]);
 useEffect(()=>{setPan({x:0,y:0});setZoom(1)},[game.scene]);
 const w=game.width*50,h=game.height*50;
 function reset(){setZoom(1);setPan({x:0,y:0})}
 function clampZoom(z:number){return Math.max(.7,Math.min(2.5,z))}
 function movePan(dx:number,dy:number){setPan(p=>({x:Math.max(-w/2,Math.min(w/2,p.x+dx)),y:Math.max(-h/2,Math.min(h/2,p.y+dy))}))}
 function focusActor(){const target=game.actors.find(a=>a.id===focusId)||actor;if(!target)return;const next=Math.max(zoom,1.5);setZoom(next);setPan({x:Math.max(-w/2,Math.min(w/2,(w/2-target.x*50-25)*next)),y:Math.max(-h/2,Math.min(h/2,(h/2-target.y*50-25)*next))})}
 useImperativeHandle(controlsRef,()=>({fit:reset,focusActor,zoomIn:()=>setZoom(z=>clampZoom(z+.15)),zoomOut:()=>setZoom(z=>clampZoom(z-.15)),toggleGrid:()=>setGrid(g=>!g),pan:movePan}));
 useEffect(()=>{const el=svg.current;if(!el)return;const wheel=(e:WheelEvent)=>{e.preventDefault();setZoom(z=>clampZoom(z-e.deltaY*.001))};el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel)},[]);
 function releasePointer(id:number){pointers.current.delete(id);if(drag.current?.move||pinch.current)suppressClick.current=Date.now()+250;pinch.current=null;const remaining=[...pointers.current.values()][0];drag.current=remaining?{x:remaining.x,y:remaining.y,px:pan.x,py:pan.y,move:true}:null;setDragging(!!remaining);if(svg.current?.hasPointerCapture(id))svg.current.releasePointerCapture(id)}
 return <div className="board-container">
 {caption?<div className="board-caption"><span>{caption}</span></div>:null}
 <div className={`board-viewport ${dragging?'dragging':''}`}>
 <svg ref={svg} className="game-board" viewBox={`0 0 ${w} ${h}`} aria-label={`${game.sceneName} tactical board. Select a highlighted tile to move, or select a character.`} role="group"
 onPointerDown={e=>{if(e.button!==0&&e.button!==1)return;pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.current.size===2){const [a,b]=[...pointers.current.values()];pinch.current={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom,midX:(a.x+b.x)/2,midY:(a.y+b.y)/2,px:pan.x,py:pan.y};suppressClick.current=Date.now()+250;setDragging(true);svg.current?.setPointerCapture(e.pointerId)}else if(pointers.current.size===1){drag.current={x:e.clientX,y:e.clientY,px:pan.x,py:pan.y,move:false}}}}
 onPointerMove={e=>{if(!pointers.current.has(e.pointerId))return;pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});const bounds=svg.current?.getBoundingClientRect();const scale=Math.max(w/(bounds?.width||w),h/(bounds?.height||h));if(pinch.current&&pointers.current.size>=2){const[a,b]=[...pointers.current.values()],p=pinch.current;setZoom(clampZoom(p.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,p.distance)));setPan({x:Math.max(-w/2,Math.min(w/2,p.px+((a.x+b.x)/2-p.midX)*scale)),y:Math.max(-h/2,Math.min(h/2,p.py+((a.y+b.y)/2-p.midY)*scale))});suppressClick.current=Date.now()+250;return}if(!drag.current)return;const dx=e.clientX-drag.current.x,dy=e.clientY-drag.current.y;if(Math.abs(dx)+Math.abs(dy)>6){drag.current.move=true;setDragging(true);svg.current?.setPointerCapture(e.pointerId);setPan({x:Math.max(-w/2,Math.min(w/2,drag.current.px+dx*scale)),y:Math.max(-h/2,Math.min(h/2,drag.current.py+dy*scale))})}}}
 onPointerUp={e=>releasePointer(e.pointerId)} onPointerCancel={e=>releasePointer(e.pointerId)}>
 <g transform={`translate(${w/2+pan.x} ${h/2+pan.y}) scale(${zoom}) translate(${-w/2} ${-h/2})`}>
 {theme==='pixel'?<PixelTerrain game={game} grid={grid}/>:<Terrain game={game} grid={grid}/>}
 {reachable.map(t=><rect key={`reach${t.x},${t.y}`} x={t.x*50+3} y={t.y*50+3} width="44" height="44" rx="9" fill={P.reachable} fillOpacity=".15" stroke={P.reachable} strokeOpacity=".4" strokeDasharray="3 4"/>)}
 <g role="img" aria-label="Gateway" transform={`translate(${game.exit.x*50+25} ${game.exit.y*50+25})`}>{theme==='pixel'?<PixelGateway active={game.chest.opened}/>:<><ellipse rx="19" ry="15" fill={game.chest.opened?P.gatewayActive:P.gateway} stroke={P.leafDark} strokeDasharray="3 3"/><path d="M-13 3h25m-7-6 7 6-7 6" stroke={P.leafDark} strokeWidth="2" fill="none"/></>}</g>
 <g role="img" aria-label="Chest" transform={`translate(${game.chest.x*50+10} ${game.chest.y*50+13})`} stroke={P.ink} strokeWidth="2">{theme==='pixel'?<PixelChest opened={game.chest.opened}/>:<><path d={game.chest.opened?'M0 11 5 2l26 4-2 9v14H0Z':'M0 11q0-18 30 0v18H0Z'} fill={game.chest.opened?P.chestOpen:P.chest}/><path d="M0 16h30m-18-4v9h6v-9" fill={P.chestTrim}/></>}</g>
 {game.tiles.map(t=><rect key={`hit${t.x},${t.y}`} x={t.x*50} y={t.y*50} width="50" height="50" fill="transparent" className={`tile-hit ${reachableKeys.has(`${t.x},${t.y}`)?'reachable':''}`} role={reachableKeys.has(`${t.x},${t.y}`)?'button':undefined} aria-label={reachableKeys.has(`${t.x},${t.y}`)?`Move to ${t.x}, ${t.y}`:undefined} tabIndex={reachableKeys.has(`${t.x},${t.y}`)?0:undefined} onClick={()=>{if(Date.now()>suppressClick.current&&reachableKeys.has(`${t.x},${t.y}`))onTile(t.x,t.y)}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();if(reachableKeys.has(`${t.x},${t.y}`))onTile(t.x,t.y)}}}/>)}
 {[...game.actors].sort((a,b)=>a.y-b.y).map(a=><g key={a.id} className={`board-actor ${a.hp<=0?'downed':''}`} style={{transform:`translate(${a.x*50+25}px, ${a.y*50+25}px)`}} pointerEvents={a.defeated?'none':undefined} role={a.defeated?undefined:'button'} aria-label={`${a.name}, ${a.hp} of ${a.maxHp} health${a.enemy?', enemy':''}`} tabIndex={a.defeated?undefined:0} onClick={e=>{e.stopPropagation();if(Date.now()>suppressClick.current)onActor(a)}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();onActor(a)}}}>
 <ellipse cy="11" rx="22" ry="15" fill={targets.has(a.id)?P.target:a.id===game.activeActorId?P.active:a.color} stroke={a.id===selectedId?P.ink:a.enemy?P.enemyHealth:P.health} strokeWidth={a.id===selectedId?2.6:1.2} fillOpacity={a.defeated?.2:.65}/>
 {a.id===game.activeActorId?<path d="m-4-43 8 0-4 5Z" fill={P.ink}/>:null}
 <svg x="-25" y="-45" width="50" height="58" viewBox="0 0 80 90"><HeroArt heroClass={a.heroClass} color={a.color} enemy={a.enemy}/></svg>
 <rect x="-16" y="20" width="32" height="4" rx="2" fill={P.ink} opacity=".2"/><rect x="-16" y="20" width={32*Math.max(0,a.hp/a.maxHp)} height="4" rx="2" fill={a.enemy?P.enemyHealth:P.health}/>
 {a.guarding?<path d="m15-33 10 0v7l-5 4-5-4Z" fill={P.accent} stroke={P.leafDark}/>:null}
 </g>)}
 </g></svg>
 <div className="map-compass"><span>N</span><svg viewBox="0 0 30 40"><path d="m15 5 8 25-8-6-8 6Z" fill={P.stoneDark}/><path d="m15 5 0 19-8 6Z" fill={P.stoneLight}/></svg></div>
 <div className="board-tools"><button title={grid?'Hide grid':'Show grid'} aria-label="Toggle grid" aria-pressed={grid} onClick={()=>setGrid(!grid)}><Icon name="eye" size={16}/></button><i/><button title="Zoom out" aria-label="Zoom out" onClick={()=>setZoom(z=>clampZoom(z-.15))}><Icon name="minus" size={16}/></button><span>{Math.round(zoom*100)}%</span><button title="Zoom in" aria-label="Zoom in" onClick={()=>setZoom(z=>clampZoom(z+.15))}><Icon name="plus" size={16}/></button><i/><button title="Center on your hero" aria-label="Center on your hero" onClick={focusActor}><Icon name="people" size={16}/></button><button title="Fit board" aria-label="Fit board" onClick={reset}><Icon name="fit" size={16}/></button></div>
 
 </div></div>
}
