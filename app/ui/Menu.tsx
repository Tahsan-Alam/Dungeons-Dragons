'use client';
import {useEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {DEFAULT_OPTIONS,CLASS_INFO} from '../../game/types';
import type {GameOptions,HeroClass,RoomView,Session} from '../../game/types';
import {HeroArt,Icon,Panorama} from './Art';

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

export function Setup({mode,onBack,onStart,busy,initialCode=''}:{mode:'solo'|'online'|'join';onBack:()=>void;onStart:(name:string,cls:HeroClass,options:GameOptions,code:string)=>void;busy:boolean;initialCode?:string}) {
 const[name,setName]=useState(''),[cls,setCls]=useState<HeroClass>('ranger'),[options,setOptions]=useState<GameOptions>({...DEFAULT_OPTIONS,seed:`lantern-${Math.floor(Math.random()*9000+1000)}`}),[code,setCode]=useState(initialCode);
 const title=mode==='join'?'Join party':mode==='online'?'Gather a party':'Solo quest';
 const powerDescription={cleric:'Heal a teammate, including a downed character.',ranger:'A stronger shot with extra range.',mage:'A stronger magic attack.',knight:'A stronger melee attack.'};
 return <div className="setup-screen">
  <form className="setup-content" onSubmit={e=>{e.preventDefault();onStart(name.trim()||'Adventurer',cls,options,code)}}>
   <div className="setup-title"><h1>{title}</h1></div>
   <div className="setup-columns"><section className="character-setup" aria-label="Character">
    <label className="field">Character name<input value={name} onChange={e=>setName(e.target.value)} maxLength={24} placeholder="Adventurer" autoComplete="off"/></label>
    <span className="field-label" id="class-label">Class</span><div className="class-grid" role="group" aria-labelledby="class-label">{Object.entries(CLASS_INFO).map(([key,info])=><button type="button" key={key} className={`class-option ${cls===key?'selected':''}`} aria-pressed={cls===key} onClick={()=>setCls(key as HeroClass)}><div className="class-portrait"><HeroArt heroClass={key as HeroClass} color={{knight:'#ed9877',ranger:'#a3bd91',mage:'#b4a6cf',cleric:'#e4c775'}[key]}/></div><strong>{info.name}</strong><span>{info.description}</span>{cls===key?<span className="class-check"><Icon name="check" size={13}/></span>:null}</button>)}</div>
    <p className="class-power"><Icon name="spark" size={16}/><strong>{CLASS_INFO[cls].ability}.</strong> {powerDescription[cls]}</p>
   </section><section className="adventure-settings" aria-label="Adventure options">
    {mode==='join'?<><label className="field">Party code<input value={code} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g,''))} maxLength={6} minLength={6} required placeholder="ABCDEF" className="room-input" autoComplete="off" autoCapitalize="characters" spellCheck={false}/></label><p className="setting-note">Enter the six-letter code from your host.</p></>:<>
     <fieldset><legend>Rules</legend><div className="segmented"><button type="button" className={options.rules==='simple'?'active':''} aria-pressed={options.rules==='simple'} onClick={()=>setOptions({...options,rules:'simple'})}>Streamlined</button><button type="button" className={options.rules==='classic'?'active':''} aria-pressed={options.rules==='classic'} onClick={()=>setOptions({...options,rules:'classic'})}>Classic <small>SRD subset</small></button></div><p className="setting-note">{options.rules==='simple'?'Reliable hits, party-first turns and forgiving recovery.':'Initiative, armor checks, critical hits and death saves. A subset of D&D rules.'}</p></fieldset>
     <div className="two-fields"><label className="field">Setting<select value={options.biome} onChange={e=>setOptions({...options,biome:e.target.value as GameOptions['biome']})}><option value="woodland">Lanternwood</option><option value="ruins">Ruins</option><option value="coast">Coast</option></select></label><label className="field">Narrator<select value={options.narrator} onChange={e=>setOptions({...options,narrator:e.target.value as GameOptions['narrator']})}><option value="warm">Warm</option><option value="dramatic">Dramatic</option><option value="wry">Wry</option></select></label></div>
     <label className="field">Seed<div className="input-button"><input value={options.seed} onChange={e=>setOptions({...options,seed:e.target.value})} maxLength={64} required autoComplete="off" spellCheck={false}/><button type="button" title="Randomize seed" aria-label="Randomize seed" onClick={()=>setOptions({...options,seed:`${['moss','moon','fox','fern','ink'][Math.floor(Math.random()*5)]}-${crypto.randomUUID().slice(0,7)}`})}><Icon name="dice"/></button></div></label>
     <details className="rules-details"><summary>Story & character preferences</summary><p className="setting-note">Optional creative direction. The three-shard quest and game rules stay fixed. Saved with this adventure.</p>{(['storyPrompt','narratorPrompt','characterPrompt'] as const).map((key,i)=><label className="field" key={key}>{['Adventure prompt','Narrator direction','Character traits'][i]}<textarea rows={2} maxLength={400} value={options[key]??''} onChange={e=>setOptions({...options,[key]:e.target.value})}/></label>)}</details>
     {mode==='solo'?<label className="field">Companions<select value={options.companions} onChange={e=>setOptions({...options,companions:Number(e.target.value)})}><option value={0}>None</option><option value={1}>1 companion</option><option value={2}>2 companions</option><option value={3}>3 companions</option></select></label>:<p className="setting-note">Up to 10 players. Add companions at party camp.</p>}
    </>}
    <button className="button primary start-button" disabled={busy} type="submit">{busy?'Loading…':mode==='join'?'Join party':mode==='online'?'Gather party':'Start quest'}<Icon name="arrow"/></button>
   </section></div>
  </form>
 </div>;
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
    <aside className="lobby-adventure"><div className="mini-panorama"><Panorama biome={room.options.biome}/></div><h2>The lost lantern</h2><dl><div><dt>Setting</dt><dd>{room.options.biome==='woodland'?'Lanternwood':room.options.biome==='coast'?'Coast':'Ruins'}</dd></div><div><dt>Rules</dt><dd>{room.options.rules==='simple'?'Streamlined':'Classic (SRD subset)'}</dd></div><div><dt>Narrator</dt><dd>{room.options.narrator}</dd></div><div><dt>Seed</dt><dd>{room.options.seed}</dd></div></dl>{host?<button className="button primary" disabled={busy||!canStart} onClick={()=>command({type:'start'})}>Start quest<Icon name="arrow"/></button>:<button className={`button ${me?.ready?'paper':'primary'}`} disabled={busy} aria-pressed={!!me?.ready} onClick={()=>command({type:'ready',ready:!me?.ready})}>{me?.ready?'Unready':'Ready'}<Icon name="check"/></button>}{!host||!canStart?<p className="setting-note">{host?'Waiting for players to get ready.':'The host starts the quest when everyone is ready.'}</p>:null}</aside>
   </div>
  </main>
 </div>;
}
