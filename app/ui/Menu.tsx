'use client';
import {useEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {DEFAULT_OPTIONS,CLASS_INFO} from '../../game/types';
import type {GameOptions,HeroClass,RoomView,Session} from '../../game/types';
import {HeroArt,Icon,Panorama} from './Art';
import QuestDictation from './QuestDictation';
import {useAIPreference} from './ai-preferences';
import './setup-flow.css';
import AdventureCreator from './AdventureCreator';

export function Brand({onClick}:{onClick?:()=>void}) {
 const contents=<><span className="brand-die"><Icon name="dice" size={29}/></span><span>Painted<span className="brand-realms">Realms</span></span></>;
 return onClick?<button className="brand" onClick={onClick} aria-label="Painted Realms camp">{contents}</button>:<div className="brand" aria-label="Painted Realms">{contents}</div>;
}

type MenuProps={onNew:(mode:'solo'|'online')=>void;onJoin:()=>void;onHelp:()=>void;onSettings?:()=>void;children?:ReactNode;disabled?:boolean};
export function Menu({onNew,onJoin,onHelp,onSettings,children,disabled=false}:MenuProps) {
 return <div className="menu-screen library-menu">

  <main className="games-main"><div className="games-heading"><h1>Adventures</h1><div className="menu-actions"><button className="button primary" disabled={disabled} onClick={()=>onNew('solo')}><Icon name="dice" size={18}/>Solo quest</button><button className="button paper" disabled={disabled} onClick={()=>onNew('online')}><Icon name="people" size={18}/>Gather party</button><button className="button paper" disabled={disabled} onClick={onJoin}><Icon name="link" size={18}/>Join party</button></div></div>{children}</main>
 </div>;
}

export function Setup(props:Parameters<typeof JoinSetup>[0]&{onAISettings?:()=>void}){
 return props.mode==='join'?<JoinSetup {...props}/>:<AdventureCreator {...props} mode={props.mode}/>;
}
function JoinSetup({onBack,onStart,busy,initialCode=''}:{mode:'solo'|'online'|'join';onBack:()=>void;onStart:(name:string,cls:HeroClass,options:GameOptions,code:string)=>void;busy:boolean;initialCode?:string;onNavigationBlockChange?:(blocked:boolean)=>void}) {
 const [name,setName]=useState(''),[cls,setCls]=useState<HeroClass>('ranger'),[code,setCode]=useState(initialCode),[step,setStep]=useState(0);
 return <main className="setup-screen guided-setup"><form className="setup-content" onSubmit={event=>{event.preventDefault();if(busy)return;if(!step)setStep(1);else onStart(name.trim()||'Adventurer',cls,DEFAULT_OPTIONS,code)}}>
  <div className="setup-title"><h1>Join party</h1><span className="setup-count">{step+1} / 2</span></div><h2 className="setup-step-title">{step?'Enter your invite':'Who will you be?'}</h2>
  {!step?<><label className="field">Hero name<input aria-label="Hero name" maxLength={24} value={name} onChange={e=>setName(e.target.value)} placeholder="Adventurer"/></label><div className="class-grid" role="group" aria-label="Hero class">{Object.entries(CLASS_INFO).map(([key,info])=><button type="button" className={`class-option ${cls===key?'selected':''}`} key={key} aria-pressed={cls===key} onClick={()=>setCls(key as HeroClass)}><div className="class-portrait"><HeroArt heroClass={key as HeroClass}/></div><strong>{info.name}</strong><span>{info.description}</span></button>)}</div></>:<label className="field">Party code<input aria-label="Party code" value={code} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g,''))} minLength={6} maxLength={6} required placeholder="ABCDEF" className="room-input" autoComplete="off"/></label>}
  <div className="setup-footer"><button className="button paper" type="button" disabled={busy} onClick={()=>step?setStep(0):onBack()}><Icon name="back" size={17}/>Back</button><button className="button primary" type="submit" disabled={busy}>{busy?'Joining…':step?'Join party':'Continue'}<Icon name="arrow" size={17}/></button></div>
 </form></main>;
}

export function Lobby({room,session,busy,command,onMenu}:{room:RoomView;session:Session;busy:boolean;command:(c:unknown)=>unknown;onMenu:()=>void}) {
 const host=room.hostId===session.playerId,me=room.players.find(p=>p.id===session.playerId);
 const[copied,setCopied]=useState(false),[copyFailed,setCopyFailed]=useState(false),[confirmLeave,setConfirmLeave]=useState(false);const copyTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(copyTimer.current)clearTimeout(copyTimer.current)},[]);
 const canStart=room.players.every(p=>p.ready);
 async function copy(){const url=new URL(location.href);url.searchParams.set('room',room.code);try{await navigator.clipboard.writeText(url.href);setCopied(true);setCopyFailed(false);if(copyTimer.current)clearTimeout(copyTimer.current);copyTimer.current=setTimeout(()=>setCopied(false),2500)}catch{setCopyFailed(true)}}
 return <div className="lobby-screen">
  <main className="lobby-main"><div className="lobby-heading"><div className="lobby-title"><h1>Party camp</h1><button className="text-button" disabled={busy} onClick={()=>setConfirmLeave(v=>!v)}>Leave party</button></div><div className="invite-ticket"><span>Party code</span><strong>{room.code}</strong><button className="text-button" onClick={copy}><Icon name={copied?'check':'link'} size={16}/>{copied?'Copied':'Copy invite'}</button>{copyFailed?<small role="status">Copy unavailable. Share the party code above.</small>:null}</div></div>
   {confirmLeave?<div className="leave-confirm" role="group" aria-label="Confirm leaving party"><span>Leave this party and give up your seat?</span><button className="button paper" onClick={()=>setConfirmLeave(false)}>Cancel</button><button className="button danger" disabled={busy} onClick={async()=>{if(await command({type:'leave'}))onMenu()}}>Leave party</button></div>:null}
   <div className="lobby-layout"><section><div className="section-heading"><h2>Players</h2><span>{room.players.length} / 10</span></div><div className="lobby-players">{room.players.map(p=><article className="lobby-player" key={p.id}><div className="lobby-portrait" style={{background:p.color+'45'}}><HeroArt heroClass={p.heroClass} color={p.color}/></div><div><strong>{p.name} {p.id===session.playerId?<small>(you)</small>:null}</strong><span>{CLASS_INFO[p.heroClass].name} · {p.bot?'Companion':p.id===room.hostId?'Host':'Player'}</span></div><span className={`ready-label ${p.ready?'ready':''}`}>{p.ready?'Ready':'Not ready'}</span>{host&&p.id!==session.playerId?<button className="icon-button" aria-label={`Remove ${p.name}`} title={`Remove ${p.name}`} onClick={()=>command({type:'remove',playerId:p.id})} disabled={busy}><Icon name="close" size={15}/></button>:null}</article>)}</div>{host?<button className="button paper add-companion" disabled={busy||room.players.length>=10} onClick={()=>command({type:'addBot'})}><Icon name="plus" size={18}/>Add companion</button>:null}</section>
    <aside className="lobby-adventure"><div className="mini-panorama"><Panorama biome={room.options.biome} characters={room.players}/></div><h2>The lost lantern</h2><dl><div><dt>Setting</dt><dd>{room.options.biome==='woodland'?'Lanternwood':room.options.biome==='coast'?'Coast':'Ruins'}</dd></div><div><dt>Rules</dt><dd>{room.options.rules==='simple'?'Streamlined':'Classic (SRD subset)'}</dd></div><div><dt>Narrator</dt><dd>{room.options.narrator}</dd></div><div><dt>Seed</dt><dd>{room.options.seed}</dd></div></dl>{host?<button className="button primary" disabled={busy||!canStart} onClick={()=>command({type:'start'})}>Start quest<Icon name="arrow"/></button>:<button className={`button ${me?.ready?'paper':'primary'}`} disabled={busy} aria-pressed={!!me?.ready} onClick={()=>command({type:'ready',ready:!me?.ready})}>{me?.ready?'Unready':'Ready'}<Icon name="check"/></button>}{!host||!canStart?<p className="setting-note">{host?'Waiting for players to get ready.':'The host starts the quest when everyone is ready.'}</p>:null}</aside>
   </div>
  </main>
 </div>;
}
