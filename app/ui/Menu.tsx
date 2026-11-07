'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {DEFAULT_OPTIONS,CLASS_INFO} from '../../game/types';
import type {GameOptions,HeroClass,RoomView,Session} from '../../game/types';
import {HeroArt,Icon,Panorama} from './Art';
import QuestDictation from './QuestDictation';
import {useAIPreference} from './ai-preferences';
import './setup-flow.css';

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

export function Setup({mode,onBack,onStart,busy,initialCode='',onNavigationBlockChange}:{mode:'solo'|'online'|'join';onBack:()=>void;onStart:(name:string,cls:HeroClass,options:GameOptions,code:string)=>void;busy:boolean;initialCode?:string;onNavigationBlockChange?:(blocked:boolean)=>void}) {
 const[name,setName]=useState(''),[cls,setCls]=useState<HeroClass>('ranger'),[options,setOptions]=useState<GameOptions>(()=>({...DEFAULT_OPTIONS,duration:'standard',seed:`lantern-${Math.floor(Math.random()*9000+1000)}`})),[code,setCode]=useState(initialCode),[step,setStep]=useState(0),[dictating,setDictating]=useState(false);
 const[savedAIEnabled]=useAIPreference(),[questAIEnabled,setAIEnabled]=useState<boolean|null>(null);
 const aiEnabled=questAIEnabled??savedAIEnabled;
 const dictationBusy=useCallback((blocked:boolean)=>{setDictating(blocked);onNavigationBlockChange?.(blocked);},[onNavigationBlockChange]);
 const heading=useRef<HTMLHeadingElement>(null),moved=useRef(false);
 const joining=mode==='join',lastStep=joining?1:2,blocked=busy||dictating;
 const title=joining?'Join party':mode==='online'?'Gather a party':'Solo quest';
 const stepLabels=joining?['Your hero','Join party']:['Your hero','Your story','Ready to play'];
 const powerDescription={cleric:'Heal a teammate, including a downed hero.',ranger:'A stronger shot with extra range.',mage:'A stronger magic attack.',knight:'A stronger melee attack.'};
 const biomeName={woodland:'Lanternwood',ruins:'Ruins',coast:'Coast'}[options.biome];
 const durationName=options.duration==='short'?'Short · 1 chapter':options.duration==='long'?'Long · 5 chapters':'Standard · 3 chapters';
 useEffect(()=>{if(moved.current)heading.current?.focus();moved.current=true},[step]);
 function goTo(next:number){setStep(Math.max(0,Math.min(lastStep,next)))}
 function start(){onStart(name.trim()||'Adventurer',cls,{...options,aiEnabled},code)}
 return <main className="setup-screen guided-setup">
  <form className="setup-content" onSubmit={e=>{e.preventDefault();if(blocked)return;if(step<lastStep)goTo(step+1);else start()}}>
   <div className="setup-title"><h1>{title}</h1><span className="setup-count">{step+1} / {lastStep+1}</span></div>
   <ol className="setup-progress" aria-label="Adventure setup">{stepLabels.map((label,index)=><li key={label} aria-current={step===index?'step':undefined}><button type="button" disabled={blocked||index>step} onClick={()=>goTo(index)}><span>{index<step?<Icon name="check" size={13}/>:index+1}</span>{label}</button></li>)}</ol>
   <section className="setup-step" aria-labelledby="setup-step-title">
    <h2 className="setup-step-title" id="setup-step-title" tabIndex={-1} ref={heading}>{step===0?'Who will you be?':joining?'Enter your invite':step===1?'Where shall we go?':'Review your adventure'}</h2>
    {step===0?<>
     <label className="field">Hero name<input value={name} onChange={e=>setName(e.target.value)} maxLength={24} placeholder="Adventurer" autoComplete="off" disabled={busy}/></label>
     <div className="class-grid" role="group" aria-label="Hero class">{Object.entries(CLASS_INFO).map(([key,info])=><button type="button" key={key} disabled={busy} className={`class-option ${cls===key?'selected':''}`} aria-pressed={cls===key} onClick={()=>setCls(key as HeroClass)}><div className="class-portrait"><HeroArt heroClass={key as HeroClass} color={{knight:'#ed9877',ranger:'#a3bd91',mage:'#b4a6cf',cleric:'#e4c775'}[key]}/></div><strong>{info.name}</strong><span>{info.description}</span>{cls===key?<span className="class-check"><Icon name="check" size={13}/></span>:null}</button>)}</div>
     <p className="class-power"><Icon name="spark" size={16}/><span><strong>{CLASS_INFO[cls].ability}.</strong> {powerDescription[cls]}</span></p>
     {!joining?<div className="setup-companions"><label className="field">Companions<select aria-label="Companions" value={options.companions} onChange={e=>setOptions({...options,companions:Number(e.target.value)})}><option value={0}>Just me</option><option value={1}>1 companion</option><option value={2}>2 companions</option><option value={3}>3 companions</option></select></label>{mode==='online'?<p className="setting-note">Invite friends at party camp. Up to 10 heroes in total.</p>:null}</div>:null}
    </>:joining?<>
     <label className="field">Party code<input value={code} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g,''))} maxLength={6} minLength={6} required placeholder="ABCDEF" className="room-input" autoComplete="off" autoCapitalize="characters" spellCheck={false}/></label>
     <p className="setting-note">Your host's invite contains a six-letter code.</p>
     <p className="setup-join-hero">Joining as <strong>{name.trim()||'Adventurer'}</strong>, {CLASS_INFO[cls].name.toLowerCase()}.</p>
    </>:step===1?<>
     <div className="setup-ai-toggle"><div><strong>AI storyteller</strong><p>{aiEnabled?'Shape your quest with Pip, your lantern guide.':'Play a ready-made lantern adventure.'}</p></div><button type="button" className="button paper" aria-label="AI storyteller" aria-pressed={aiEnabled} disabled={blocked} onClick={()=>setAIEnabled(!aiEnabled)}>{aiEnabled?'On':'Off'}</button></div>
     {aiEnabled?<div className="quest-prompt"><label className="field" htmlFor="quest-description">What kind of adventure do you want?<textarea id="quest-description" rows={4} maxLength={400} disabled={blocked} value={options.storyPrompt??''} placeholder="A cozy mystery on a foggy coast, with a missing lighthouse keeper…" onChange={e=>setOptions({...options,storyPrompt:e.target.value})}/></label><div className="quest-prompt-tools"><QuestDictation value={options.storyPrompt??''} onChange={storyPrompt=>setOptions(current=>({...current,storyPrompt}))} disabled={busy} onBusyChange={dictationBusy}/><span>{(options.storyPrompt??'').length}/400</span></div><details className="quest-ideas"><summary>Need an idea?</summary><div>{[{label:'Moonlit mystery',prompt:'A warm woodland mystery: follow a trail of floating lanterns to find a missing mapmaker.',biome:'woodland' as const},{label:'Lost observatory',prompt:'Explore an abandoned observatory where a stubborn clockwork guardian protects a forgotten promise.',biome:'ruins' as const},{label:'Coastal rescue',prompt:'A playful coastal rescue: help a stranded musician bring the lighthouse beacon back to life.',biome:'coast' as const}].map(idea=><button type="button" key={idea.label} className="button paper" disabled={blocked} onClick={()=>setOptions({...options,storyPrompt:idea.prompt,biome:idea.biome})}>{idea.label}<Icon name="plus" size={14}/></button>)}</div></details></div>:null}
     <div className="two-fields"><label className="field">Setting<select aria-label="Setting" value={options.biome} onChange={e=>setOptions({...options,biome:e.target.value as GameOptions['biome']})}><option value="woodland">Lanternwood</option><option value="ruins">Ruins</option><option value="coast">Coast</option></select></label><label className="field">Adventure length<select aria-label="Adventure length" value={options.duration??'standard'} onChange={e=>setOptions({...options,duration:e.target.value as GameOptions['duration']})}><option value="short">Short · 1 chapter</option><option value="standard">Standard · 3 chapters</option><option value="long">Long · 5 chapters</option></select></label></div>
     <details className="rules-details setup-advanced"><summary>Fine-tune your adventure</summary><label className="field">Rules<select aria-label="Rules" value={options.rules} onChange={e=>setOptions({...options,rules:e.target.value as GameOptions['rules']})}><option value="simple">Streamlined · recommended</option><option value="classic">Classic · SRD subset</option></select></label><p className="setting-note">{options.rules==='simple'?'Reliable hits and forgiving recovery.':'Initiative, armor checks and death saves.'}</p><label className="field">Narrator tone<select aria-label="Narrator tone" value={options.narrator} onChange={e=>setOptions({...options,narrator:e.target.value as GameOptions['narrator']})}><option value="warm">Warm</option><option value="dramatic">Dramatic</option><option value="wry">Wry</option></select></label>{aiEnabled?<>{(['characterPrompt','narratorPrompt'] as const).map((key,index)=><label className="field" key={key}>{index===0?'Character traits (optional)':'Narrator direction (optional)'}<textarea rows={2} maxLength={400} value={options[key]??''} onChange={e=>setOptions({...options,[key]:e.target.value})}/></label>)}</>:null}<label className="field">World seed<div className="input-button"><input value={options.seed} onChange={e=>setOptions({...options,seed:e.target.value})} maxLength={64} minLength={1} required autoComplete="off" spellCheck={false}/><button type="button" aria-label="Randomize seed" onClick={()=>setOptions({...options,seed:`lantern-${crypto.randomUUID().slice(0,8)}`})}><Icon name="dice"/></button></div></label></details>
    </>:<div className="setup-review">
     <div className="setup-hero-summary"><HeroArt heroClass={cls} color={{knight:'#ed9877',ranger:'#a3bd91',mage:'#b4a6cf',cleric:'#e4c775'}[cls]}/><div><strong>{name.trim()||'Adventurer'}</strong><span>{CLASS_INFO[cls].name}{options.companions?` + ${options.companions} companion${options.companions===1?'':'s'}`:''}</span></div></div>
     <dl><div><dt>Setting</dt><dd>{biomeName}</dd></div><div><dt>Length</dt><dd>{durationName}</dd></div><div><dt>Rules</dt><dd>{options.rules==='simple'?'Streamlined':'Classic'}</dd></div><div><dt>Storyteller</dt><dd>{aiEnabled?'Pip · AI enabled':'Pip · ready-made story'}</dd></div></dl>
     {aiEnabled&&options.storyPrompt?<blockquote>{options.storyPrompt}</blockquote>:null}
     <p className="setup-next-note">{mode==='online'?'Next: invite your friends, then begin together.':'Explore, take one action, then end your turn. Pip can help along the way.'}</p>
    </div>}
   </section>
   {dictating?<p className="setting-note" role="status">Finish or cancel dictation before leaving setup.</p>:null}<div className="setup-footer"><button className="button paper" disabled={blocked} type="button" onClick={()=>step?goTo(step-1):onBack()}><Icon name="back" size={17}/>Back</button><button className="button primary" disabled={blocked} type="submit">{busy?'Preparing…':step<lastStep?'Continue':joining?'Join party':mode==='online'?'Create party':'Start adventure'}<Icon name="arrow" size={18}/></button></div>
  </form>
 </main>;
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
