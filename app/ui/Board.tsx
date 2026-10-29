'use client';
import {memo,useMemo,useRef,useState,useEffect} from 'react';
import type {Actor,GameState} from '../../game/types';
import {getReachable,getValidTargets} from '../../game/engine';
import {HeroArt,Icon,Tree} from './Art';
import {useTheme} from './Theme';
import {PixelTerrain,PixelChest,PixelGateway} from './PixelArt';
export type Tool='move'|'attack'|'ability';
const Terrain=memo(function Terrain({game,grid}:{game:GameState;grid:boolean}){return <>
 <defs><pattern id="board-dots" width="50" height="50" patternUnits="userSpaceOnUse"><circle cx="0" cy="0" r="1.4" fill="#70896b" opacity=".26"/></pattern><pattern id="water-lines" width="35" height="20" patternUnits="userSpaceOnUse"><path d="M2 10q5-3 11 0t11 0" stroke="#81aaa5" strokeWidth="1" fill="none"/></pattern></defs>
 <rect width={game.width*50} height={game.height*50} rx="18" fill={game.options.biome==='ruins'?'#d7dac7':'#dbe5c7'}/>
 {game.tiles.map(t=><g key={`${t.x},${t.y}`} transform={`translate(${t.x*50} ${t.y*50})`}>
 {t.kind==='path'?<rect x="-1" y="-1" width="52" height="52" rx="10" fill="#eae0bf"/>:t.kind==='water'?<><rect width="51" height="51" rx="8" fill="#b6d0c6"/><rect width="50" height="50" fill="url(#water-lines)"/></>:t.kind==='wall'?<path d="m5 7 32-4 10 9-3 28-33 3-8-11Z" fill="#abb69e" stroke="#82927a" strokeWidth="1.5"/>:((t.x*7+t.y*3)%11===0)?<path d="m20 35-4-6m4 6 4-9m0 9 4-4" fill="none" stroke="#8da276" strokeWidth="1.5"/>:null}
 {t.decoration==='flower'?<g fill="#e8b476"><circle cx="18" cy="24" r="3"/><circle cx="32" cy="37" r="2.5"/></g>:t.decoration==='mushroom'?<g stroke="#906b50" strokeWidth="1.3"><path d="M27 37v-7m-8-1q8-18 16 0Z" fill="#c99072"/></g>:t.decoration==='rock'?<path d="m14 31 6-13 16 3 4 13-17 5Z" fill="#b6beaa" stroke="#80917a" strokeWidth="1.5"/>:t.decoration==='ruin'?<g fill="#c6c5ab" stroke="#8d967f" strokeWidth="1.5"><path d="m13 39 2-30 8 3 10-5 4 32Z"/><path d="m15 22 12 1m-5 9 14-1"/></g>:null}
 </g>)}
 {grid?<rect width={game.width*50} height={game.height*50} fill="url(#board-dots)"/>:null}
 {game.tiles.filter(t=>t.decoration==='tree').map(t=><Tree key={`tree${t.x}-${t.y}`} x={t.x*50+25} y={t.y*50+32} size={.75+(t.x%3)*.08} tone={t.x+t.y}/>)}
 </>});
export default function Board({game,actor,tool,onTile,onActor,selectedId,myTurn}:{game:GameState;actor?:Actor;tool:Tool;onTile:(x:number,y:number)=>void;onActor:(a:Actor)=>void;selectedId:string;myTurn:boolean}){
 const {theme}=useTheme();
 const [zoom,setZoom]=useState(1),[pan,setPan]=useState({x:0,y:0}),[grid,setGrid]=useState(true),[dragging,setDragging]=useState(false);
 const svg=useRef<SVGSVGElement>(null); const drag=useRef<{x:number;y:number;px:number;py:number;move:boolean}|null>(null);
 const reachable=useMemo(()=>actor&&myTurn&&tool==='move'?getReachable(game,actor):[],[game,actor,myTurn,tool]);
 const reachableKeys=useMemo(()=>new Set(reachable.map(t=>`${t.x},${t.y}`)),[reachable]);
 const targets=useMemo(()=>new Set(actor&&myTurn&&tool!=='move'?getValidTargets(game,actor,tool==='ability').map(a=>a.id):[]),[game,actor,myTurn,tool]);
 useEffect(()=>{setPan({x:0,y:0});setZoom(1)},[game.scene]);
 const w=game.width*50,h=game.height*50;
 function reset(){setZoom(1);setPan({x:0,y:0})}
 return <div className="board-container">
 <div className="board-caption"><span><span className="live-dot"/> {myTurn?'Your turn to make a little trouble':`${actor?.name||'Your party'} is taking a turn`}</span><button className="text-button" onClick={()=>setGrid(!grid)} title="Toggle board grid"><Icon name="eye" size={15}/>{grid?'Grid on':'Grid off'}</button></div>
 <div className={`board-viewport ${dragging?'dragging':''}`}>
 <svg ref={svg} className="game-board" viewBox={`0 0 ${w} ${h}`} aria-label={`${game.sceneName} tactical board. Select a highlighted tile to move, or select a character.`} role="group"
 onWheel={e=>{setZoom(z=>Math.max(.7,Math.min(2.2,z-e.deltaY*.001)))}}
 onPointerDown={e=>{if(e.button!==0&&e.button!==1)return;drag.current={x:e.clientX,y:e.clientY,px:pan.x,py:pan.y,move:false};}}
 onPointerMove={e=>{if(!drag.current)return;const dx=e.clientX-drag.current.x,dy=e.clientY-drag.current.y;if(Math.abs(dx)+Math.abs(dy)>6){drag.current.move=true;setDragging(true);svg.current?.setPointerCapture(e.pointerId);const bounds=svg.current?.getBoundingClientRect();const scale=Math.max(w/(bounds?.width||w),h/(bounds?.height||h));setPan({x:Math.max(-w/2,Math.min(w/2,drag.current.px+dx*scale)),y:Math.max(-h/2,Math.min(h/2,drag.current.py+dy*scale))})}}}
 onPointerUp={()=>{setDragging(false);setTimeout(()=>{drag.current=null},0)}} onPointerCancel={()=>{drag.current=null;setDragging(false)}}>
 <g transform={`translate(${w/2+pan.x} ${h/2+pan.y}) scale(${zoom}) translate(${-w/2} ${-h/2})`}>
 {theme==='pixel'?<PixelTerrain game={game} grid={grid}/>:<Terrain game={game} grid={grid}/>}
 {reachable.map(t=><rect key={`reach${t.x},${t.y}`} x={t.x*50+3} y={t.y*50+3} width="44" height="44" rx="9" fill="#759a77" fillOpacity=".15" stroke="#6c936e" strokeOpacity=".4" strokeDasharray="3 4"/>)}
 <g transform={`translate(${game.exit.x*50+25} ${game.exit.y*50+25})`}>{theme==='pixel'?<PixelGateway active={game.chest.opened}/>:<><ellipse rx="19" ry="15" fill="#d5cb92" stroke="#8c9366" strokeDasharray="3 3"/><path d="M-13 3h25m-7-6 7 6-7 6" stroke="#657c5a" strokeWidth="2" fill="none"/></>}</g>
 <g transform={`translate(${game.chest.x*50+10} ${game.chest.y*50+13})`} stroke="#79633d" strokeWidth="2">{theme==='pixel'?<PixelChest opened={game.chest.opened}/>:<><path d={game.chest.opened?'M0 11 5 2l26 4-2 9v14H0Z':'M0 11q0-18 30 0v18H0Z'} fill={game.chest.opened?'#b5ae84':'#d8b56f'}/><path d="M0 16h30m-18-4v9h6v-9" fill="#f0d789"/></>}</g>
 {game.tiles.map(t=><rect key={`hit${t.x},${t.y}`} x={t.x*50} y={t.y*50} width="50" height="50" fill="transparent" className="tile-hit" role={reachableKeys.has(`${t.x},${t.y}`)?'button':undefined} aria-label={reachableKeys.has(`${t.x},${t.y}`)?`Move to ${t.x}, ${t.y}`:undefined} tabIndex={reachableKeys.has(`${t.x},${t.y}`)?0:undefined} onClick={()=>{if(!drag.current?.move)onTile(t.x,t.y)}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onTile(t.x,t.y)}}}/>)}
 {[...game.actors].sort((a,b)=>a.y-b.y).map(a=><g key={a.id} className={`board-actor ${a.hp<=0?'downed':''}`} style={{transform:`translate(${a.x*50+25}px, ${a.y*50+25}px)`}} pointerEvents={a.defeated?'none':undefined} role={a.defeated?undefined:'button'} aria-label={`${a.name}, ${a.hp} of ${a.maxHp} health${a.enemy?', enemy':''}`} tabIndex={a.defeated?undefined:0} onClick={e=>{e.stopPropagation();if(!drag.current?.move)onActor(a)}} onKeyDown={e=>{if(e.key==='Enter'){onActor(a)}}}>
 <ellipse cy="11" rx="22" ry="15" fill={targets.has(a.id)?'#ed9877':a.id===game.activeActorId?'#f2d98e':a.color} stroke={a.id===selectedId?'#293e35':a.enemy?'#ac735c':'#68816a'} strokeWidth={a.id===selectedId?2.6:1.2} fillOpacity={a.defeated?.2:.65}/>
 {a.id===game.activeActorId?<path d="m-4-43 8 0-4 5Z" fill="#293e35"/>:null}
 <svg x="-25" y="-45" width="50" height="58" viewBox="0 0 80 90"><HeroArt heroClass={a.heroClass} color={a.color} enemy={a.enemy}/></svg>
 <rect x="-16" y="20" width="32" height="4" rx="2" fill="#455944" opacity=".2"/><rect x="-16" y="20" width={32*Math.max(0,a.hp/a.maxHp)} height="4" rx="2" fill={a.enemy?'#bc7961':'#426c50'}/>
 {a.guarding?<path d="m15-33 10 0v7l-5 4-5-4Z" fill="#e5cf83" stroke="#526b4a"/>:null}
 </g>)}
 </g></svg>
 <div className="map-compass"><span>N</span><svg viewBox="0 0 30 40"><path d="m15 5 8 25-8-6-8 6Z" fill="#75866d"/><path d="m15 5 0 19-8 6Z" fill="#aab998"/></svg></div>
 <div className="board-tools"><button title="Zoom out" aria-label="Zoom out" onClick={()=>setZoom(z=>Math.max(.7,z-.15))}><Icon name="minus" size={16}/></button><span>{Math.round(zoom*100)}%</span><button title="Zoom in" aria-label="Zoom in" onClick={()=>setZoom(z=>Math.min(2.2,z+.15))}><Icon name="plus" size={16}/></button><i/><button title="Fit board" aria-label="Fit board" onClick={reset}><Icon name="fit" size={16}/></button></div>
 <div className="board-note">Drag to explore · scroll to zoom</div>
 </div></div>
}
