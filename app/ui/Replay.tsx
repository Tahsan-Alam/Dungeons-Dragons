'use client';
import {useEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import type {GameState,ReplayArchive} from '../../game/types';
import {reconstructReplayAsync} from '../../game/replay';
import Board,{type BoardControls} from './Board';
import {Icon} from './Art';
import {ActorPortrait} from './ActorArt';
import {useHeaderInert} from './AppHeader';
import {useControls} from './useControls';
import {actionForKey,bindingLabel,eventBinding,type ControlAction} from './controls';
import {Chooser,KeyHints} from './MenuKit';
import './replay.css';
import './realm-shell.css';
export default function Replay({archive,title,onBack,onSettings,onHelp,suspended=false}:{archive:ReplayArchive;title:string;onBack:()=>void;onSettings:()=>void;onHelp:()=>void;suspended?:boolean}){
 const {preferences}=useControls();
 const[result,setResult]=useState<{frames:GameState[];error:string;loading:boolean}>({frames:[],error:'',loading:true});
 useEffect(()=>{const controller=new AbortController();setResult({frames:[],error:'',loading:true});void reconstructReplayAsync(archive,controller.signal).then(frames=>{if(!controller.signal.aborted)setResult({frames,error:'',loading:false})}).catch(()=>{if(!controller.signal.aborted)setResult({frames:[],error:'This replay could not be read. Your saved game has not been changed.',loading:false})});return()=>controller.abort()},[archive]);
 const frames=result.frames,[index,setIndex]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1),[selectedId,setSelectedId]=useState(''),[panel,setPanel]=useState(false),[seekVersion,setSeekVersion]=useState(0);
 const board=useRef<BoardControls>(null),sidebar=useRef<HTMLElement>(null),opener=useRef<HTMLElement|null>(null),game=frames[index],last=frames.length-1;
 const[compact,setCompact]=useState(false);
 useHeaderInert(compact&&panel);
 useEffect(()=>{if(suspended)setPlaying(false)},[suspended]);
 useEffect(()=>{const query=matchMedia('(max-width:850px)');const update=()=>{setCompact(query.matches);if(!query.matches)setPanel(false)};update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update)},[]);
 function closePanel(){setPanel(false);requestAnimationFrame(()=>opener.current?.focus())}
 function togglePanel(){if(panel)closePanel();else{opener.current=document.activeElement as HTMLElement;setPanel(true)}}
 useEffect(()=>{if(panel&&compact)(sidebar.current?.querySelector('.replay-close') as HTMLElement|null)?.focus()},[panel,compact]);
 function seek(next:number){setSeekVersion(v=>v+1);setPlaying(false);setIndex(Math.max(0,Math.min(last,next)))}
 useEffect(()=>{if(suspended||!playing||index>=last){if(index>=last)setPlaying(false);return;}const timer=setTimeout(()=>setIndex(i=>Math.min(last,i+1)),1000/speed);return()=>clearTimeout(timer)},[playing,index,last,speed,suspended]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{
  if(panel&&compact&&!document.querySelector('dialog[open]')){if(e.key==='Escape'){e.preventDefault();closePanel();return}if(e.key==='Tab'){const items=[...sidebar.current!.querySelectorAll<HTMLElement>('button:not([disabled])')],first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}return}return;}
  if(suspended||e.repeat||e.isComposing||document.querySelector('dialog[open]')||(e.target as HTMLElement)?.closest('input,select,textarea,[contenteditable=true]')||((e.target as HTMLElement)?.closest('button,[role=button]')&&(e.key===' '||e.key==='Enter')))return;
  const action=actionForKey(preferences.bindings,eventBinding(e));
  if(action==='replayPlay'){e.preventDefault();if(index===last)setIndex(0);setPlaying(p=>!p)}
  else if(action==='replayPrevious'){e.preventDefault();seek(index-1)}else if(action==='replayNext'){e.preventDefault();seek(index+1)}else if(action==='replayStart'){e.preventDefault();seek(0)}else if(action==='replayEnd'){e.preventDefault();seek(last)}
  else if(action==='menu'){e.preventDefault();onBack()}else if(action==='settings'){e.preventDefault();setPlaying(false);onSettings()}else if(action==='fit'){e.preventDefault();board.current?.fit()}else if(action==='zoomIn'){e.preventDefault();board.current?.zoomIn()}else if(action==='zoomOut'){e.preventDefault();board.current?.zoomOut()}else if(action==='grid'){e.preventDefault();board.current?.toggleGrid()}else if(action==='story'||action==='party'){e.preventDefault();togglePanel()}else if(action?.startsWith('pan')){e.preventDefault();board.current?.pan(action==='panLeft'?50:action==='panRight'?-50:0,action==='panUp'?50:action==='panDown'?-50:0)}
 };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[preferences.bindings,index,last,onBack,onSettings,panel,compact,suspended]);
 const chapters=useMemo(()=>frames.flatMap((f,i)=>i===0||frames[i-1].scene!==f.scene?[{index:i,scene:f.scene,name:f.sceneName}]:[]),[frames]);
 const key=(action:ControlAction)=>bindingLabel(preferences.bindings[action].find(Boolean)??null);
 const top=<header className="rp-top game-menu"><button type="button" className="rp-back" onClick={onBack}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5"/></svg>Adventures</button><div className="rp-corner"><button type="button" className="rp-word" onClick={onHelp}><Icon name="book" size={18}/><span>Guide</span></button><button type="button" className="rp-word" onClick={()=>{setPlaying(false);onSettings()}}><Icon name="gear" size={18}/><span>Settings</span></button></div></header>;
 if(!game)return <div className="replay-screen rp-theatre">{top}<main className="rp-waiting game-menu"><p role={result.error?'alert':'status'}>{result.loading?'Setting the stage…':result.error||'No replay recorded yet.'}</p>{!result.loading?<button type="button" className="mk-link" onClick={onBack}>Back to adventures</button>:null}</main></div>;
 const actor=game.actors.find(a=>a.id===game.activeActorId),selected=game.actors.find(a=>a.id===selectedId),event=game.events.at(-1);
 const ROMAN=['I','II','III','IV','V','VI','VII','VIII','IX','X'];
 const chapterNow=chapters.filter(c=>c.index<=index).at(-1);
 const pct=(i:number)=>last>0?i/last*100:0;
 return <div className="replay-screen rp-theatre" aria-label={`Replay of ${title}`}>
 {top}
 <div className="replay-layout"><main className="replay-main" inert={compact&&panel}>
  <div className="replay-scene game-menu"><div className="rp-title"><span className="rp-eyebrow">Replay · Chapter {ROMAN[game.scene]??game.scene+1} · Round {game.round}</span><h1>{title}</h1><span className="rp-place">{game.sceneName}</span></div><button type="button" className="mk-link replay-details-button" onClick={togglePanel} aria-expanded={panel}>The party &amp; the tale</button></div>
  <Board game={game} actor={actor} tool="move" myTurn={false} selectedId={selectedId} onTile={()=>{}} onActor={a=>setSelectedId(a.id)} controlsRef={board} caption="Replay" animateMovement={playing} motionResetKey={seekVersion}/>
  <p className="replay-event" aria-live={playing?'off':'polite'}>{game.story?.narrations.find(n=>n.eventId===game.eventSequence)?.caption||event?.text||'The tale begins.'}</p>
  <div className="replay-controls game-menu">
   <div className="rp-road">
    <input className="rp-range" type="range" min={0} max={Math.max(0,last)} value={index} onChange={e=>seek(Number(e.target.value))} aria-label="Replay position" aria-valuetext={`Step ${index+1} of ${frames.length}, chapter ${game.scene+1}, round ${game.round}`} style={{'--rp-at':`${pct(index)}%`} as CSSProperties}/>
    {chapters.map(c=><button key={c.index} type="button" className={`rp-waymark${c.index<=index?' lit':''}`} style={{left:`${pct(c.index)}%`}} onClick={()=>seek(c.index)} aria-label={`Go to chapter ${c.scene+1}: ${c.name}`}><span>{ROMAN[c.scene]??c.scene+1}</span></button>)}
   </div>
   <div className="replay-transport">
    <div className="transport-group">
     <button type="button" className="rp-btn" aria-label="Replay start" disabled={!index} onClick={()=>seek(0)}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 4v12M15 4 7 10l8 6z"/></svg></button>
     <button type="button" className="rp-btn" aria-label="Previous replay step" disabled={!index} onClick={()=>seek(index-1)}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M13 4 6 10l7 6"/></svg></button>
     <button type="button" className="rp-play" onClick={()=>{if(index===last)setIndex(0);setPlaying(!playing)}} aria-label={playing?'Pause replay':'Play replay'}>{playing?<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4h3v12H6zM11 4h3v12h-3z"/></svg>:<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 3.5v13L16 10z"/></svg>}<span>{playing?'Pause':index===last&&last>0?'Again':'Play'}</span></button>
     <button type="button" className="rp-btn" aria-label="Next replay step" disabled={index===last} onClick={()=>seek(index+1)}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 7 6-7 6"/></svg></button>
     <button type="button" className="rp-btn" aria-label="Replay end" disabled={index===last} onClick={()=>seek(last)}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M15 4v12M5 4l8 6-8 6z"/></svg></button>
    </div>
    <span className="replay-progress">Step {index+1} of {frames.length}{chapterNow?<em> · {chapterNow.name}</em>:null}</span>
    <div className="rp-speed"><span className="rp-label">Speed</span><Chooser label="Playback speed" options={[{value:'0.5',label:'½×'},{value:'1',label:'1×'},{value:'2',label:'2×'},{value:'4',label:'4×'}]} value={String(speed)} onChange={v=>setSpeed(Number(v))}/></div>
    <KeyHints hints={[[[key('replayPlay')],'Play'],[[key('replayPrevious'),key('replayNext')],'Step'],[[key('menu')],'Back']]}/>
   </div>
  </div>
 </main>
 {panel?<button className="replay-scrim" aria-label="Dismiss replay panel" onClick={closePanel}/>:null}
 <aside ref={sidebar} role={compact&&panel?'dialog':undefined} aria-modal={compact&&panel?true:undefined} aria-label="Replay details" className={`replay-sidebar game-menu ${panel?'open':''}`}>
  <div className="rail-heading"><h2>The party</h2><button type="button" className="rp-btn replay-close" aria-label="Close replay details" onClick={closePanel}><Icon name="close"/></button></div>
  <div className="replay-party">{game.actors.filter(a=>!a.enemy).map(a=><button key={a.id} type="button" className={`replay-hero${a.id===selectedId?' selected':''}${a.id===game.activeActorId?' active':''}`} aria-pressed={a.id===selectedId} onClick={()=>setSelectedId(a.id)}><ActorPortrait actor={a} biome={game.options.biome}/><span><strong>{a.name}</strong><span className="rp-hp" aria-hidden="true"><i style={{width:`${Math.max(0,Math.min(100,a.hp/a.maxHp*100))}%`}} className={a.hp<=a.maxHp/4?'low':a.hp<=a.maxHp/2?'mid':''}/></span><small>{a.hp} / {a.maxHp} health{a.id===game.activeActorId?' · their turn':''}</small></span></button>)}</div>
  {selected?<p className="replay-inspect"><strong>{selected.name}</strong> · {selected.hp}/{selected.maxHp} health · armour {selected.ac}</p>:null}
  <div className="rail-heading"><h2>The tale so far</h2><span>{game.status==='playing'?`Chapter ${ROMAN[game.scene]??game.scene+1}`:game.status==='victory'?'Victory':'Defeat'}</span></div>
  <div className="replay-log">{game.story?.narrations.slice(-10).reverse().map(n=><p key={`narration-${n.eventId}`} className="story">{n.caption}</p>)}{game.events.slice(-15).reverse().map(e=><p key={e.id} className={e.kind}>{e.text}</p>)}</div>
  {!archive.complete?<p className="replay-legacy">This older game’s replay starts at the first saved position.</p>:null}
 </aside></div>
 </div>
}
