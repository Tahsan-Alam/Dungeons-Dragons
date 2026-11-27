'use client';
import {useChangeCue} from './sound/useCue';
import {useEffect,useRef,useState} from 'react';
import type {CSSProperties} from 'react';
import type {RoomPlayer,RoomView,Session} from '../../game/types';
import {CLASS_INFO} from '../../game/types';
import {GAME_MASTERS,HEROES,HERO_ART_RATIO,GAME_MASTER_ART_RATIO} from '../../game/presets';
import {openSeats} from './party';
import {Icon} from './Art';
import {RealmButton,Portrait,Check} from './RealmKit';
import {CUSTOM_FACE,customHeroArt} from './hero-figure';
import './party-camp.css';

/* Party camp: the party stands in a shallow arc around one fire. Positions are in the 1280 × 720 scene's coordinates.
   The inner pair stands a step back; the outer heroes stay inside the firelight. Right of x≈940 is kept for the panels. */
const SLOTS:[x:number,feet:number,depth:0|1|2][]=[[450,516,1],[670,516,1],[340,536,0],[790,536,0],[230,550,0],[900,550,0],[130,562,0],[395,492,2],[725,492,2],[285,496,2]];
const HEIGHT=[260,244,228];
const pct=(v:number,of:number)=>`${(v/of*100).toFixed(3)}%`;

/** A player's figure: their roster hero's painting, or the drawing made for them (companions, players without a roster hero). */
export function CampFigure({player,slot}:{player:RoomPlayer;slot:[number,number,0|1|2]}){
 const [x,feet,depth]=slot,h=HEIGHT[depth],hero=player.heroId?HEROES.find(p=>p.id===player.heroId):undefined;
 const wide=hero?.id==='mira',w=h*HERO_ART_RATIO,left=x-(wide?0.58:0.5)*w,top=feet-0.955*h;
 const box={left:pct(left,1280),top:pct(top,720),width:pct(w,1280),height:pct(h,720),zIndex:10+depth*-3+Math.round(feet/40)} as CSSProperties;
 return <>
  <span className="camp-contact" style={{left:pct(x-(wide?50:32),1280),top:pct(feet-6,720),width:pct(wide?100:64,1280)}} aria-hidden="true"/>
  <span className="camp-figure" style={box} aria-hidden="true"><img src={hero?.art??customHeroArt(player)} alt=""/></span>
 </>;
}

export default function PartyCamp({room,session,busy,command,onMenu}:{room:RoomView;session:Session;busy:boolean;command:(c:unknown)=>unknown;onMenu:()=>void}){
 const host=room.hostId===session.playerId,me=room.players.find(p=>p.id===session.playerId);
 const [copied,setCopied]=useState(false),[copyFailed,setCopyFailed]=useState(false),[confirmLeave,setConfirmLeave]=useState(false),[canShare,setCanShare]=useState(false);
 const copyTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(copyTimer.current)clearTimeout(copyTimer.current)},[]);
 // The system share sheet exists mostly on phones; it is detected after mount so the first render matches everywhere.
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{setCanShare(typeof navigator.share==='function')},[]);
 const story=room.options.creation?.story,title=story?.title||'The lost lantern',seats=openSeats(room.players.length);
 const gm=GAME_MASTERS.find(g=>g.profile.name===room.options.creation?.narrator.name);
 const inviteUrl=()=>{const url=new URL(location.href);url.searchParams.set('room',room.code);return url.href};
 async function copy(){try{await navigator.clipboard.writeText(inviteUrl());setCopied(true);setCopyFailed(false);if(copyTimer.current)clearTimeout(copyTimer.current);copyTimer.current=setTimeout(()=>setCopied(false),2500)}catch{setCopyFailed(true)}}
 async function share(){try{await navigator.share({title:'Painted Realms',text:`Join my party for “${title}”. Party code: ${room.code}`,url:inviteUrl()})}catch(error){/* Closing the share sheet is not a failure. */if((error as Error)?.name!=='AbortError')void copy()}}
 useChangeCue(room.players.length,'ui-join');useChangeCue(room.players.filter(p=>p.ready).length,'ui-latch');
 const ready=room.players.filter(p=>p.ready),waiting=room.players.filter(p=>!p.ready).map(p=>p.name),canStart=waiting.length===0;
 const waitingText=waiting.length?`Waiting for ${waiting.length>2?`${waiting.slice(0,2).join(', ')} and ${waiting.length-2} more`:waiting.join(' and ')}`:'Everyone is ready';
 const placed=room.players.slice(0,SLOTS.length).map((p,i)=>({p,slot:SLOTS[i]}));
 const status=(p:RoomPlayer)=>p.ready?<span className="camp-ready"><Check size={11}/>Ready</span>:<span className="camp-not-ready"><span aria-hidden="true"/>Not ready</span>;
 const remove=(p:RoomPlayer)=>host&&p.id!==session.playerId?<button type="button" className="camp-remove" aria-label={`Remove ${p.name}`} data-tooltip={`Remove ${p.name}`} disabled={busy} onClick={()=>command({type:'remove',playerId:p.id})}><Icon name="close" size={12}/></button>:null;

 return <div className="lobby-screen camp-scroll"><main className="realm camp" aria-labelledby="camp-title">
  <div className="camp-frame">
  <div className="camp-stage">
   <img className="camp-scene" src="/art/scenes/camp.svg" alt=""/>
   <img className="camp-fire" src="/art/scenes/campfire.svg" alt="" style={{left:pct(560-70,1280),top:pct(536-112,720),width:pct(140,1280)}}/>
   {placed.map(({p,slot})=><CampFigure key={p.id} player={p} slot={slot}/>)}
   <ul className="camp-plates" aria-label={`Party, ${room.players.length} of 10 seats occupied`}>
    {placed.map(({p,slot:[x,feet]})=><li key={p.id} className="camp-plate" style={{left:pct(x-56,1280),top:pct(feet+8,720)}}>
     <strong>{p.name}{p.id===session.playerId?<span className="camp-you"> (you)</span>:null}</strong>{status(p)}{remove(p)}
    </li>)}
   </ul>
  </div>
  <div className="camp-ui">
   <header className="camp-title">
    <p className="realm-eyebrow">Party camp</p>
    <h1 id="camp-title">{title}</h1>
    <p className="camp-meta">{gm?`Told by ${gm.title.replace('The ','the ')}`:'Your narrator'} · {room.options.rules==='simple'?'Streamlined rules':'Classic rules'}</p>
    <div className="camp-leave-row"><RealmButton small disabled={busy} aria-expanded={confirmLeave} onClick={()=>setConfirmLeave(v=>!v)}>Leave party</RealmButton></div>
    {confirmLeave?<div className="camp-confirm realm-panel" role="group" aria-label="Confirm leaving party"><span>Leave this party and give up your seat?</span>
     <RealmButton small onClick={()=>setConfirmLeave(false)}>Stay</RealmButton><RealmButton small variant="primary" disabled={busy} onClick={async()=>{if(await command({type:'leave'}))onMenu()}}>Leave party</RealmButton></div>:null}
   </header>
   <section className="camp-invite realm-panel" aria-label="Invite">
    <p className="realm-eyebrow">Party code</p><strong className="camp-code">{room.code}</strong>
    <div className="camp-invite-actions"><RealmButton small onClick={copy}>{copied?'Copied':'Copy invite'}</RealmButton>{canShare?<RealmButton small onClick={()=>void share()}>Share Invite</RealmButton>:null}</div>
    {copyFailed?<p className="camp-note" role="status">Copy is unavailable. Share the party code above.</p>:null}
   </section>
   <section className="camp-seats realm-panel" aria-label="Seats">
    <p className="realm-eyebrow">Seats</p>
    <p className="camp-seat-count"><strong>{seats} open {seats===1?'seat':'seats'}</strong><span>{room.players.length} of 10 occupied</span></p>
    <div className="camp-pips" aria-hidden="true">{Array.from({length:10},(_,i)=><span key={i} className={i<room.players.length?'taken':''}/>)}</div>
    {host?<RealmButton small disabled={busy||room.players.length>=10} onClick={()=>command({type:'addBot'})}>+ Add Companion</RealmButton>:null}
    <p className="camp-note">{seats?'Share the code to fill the rest.':'Every seat is taken.'}</p>
   </section>
   <section className="camp-gm realm-panel" aria-label="Game Master">
    {gm?<Portrait art={gm.art} face={gm.face} ratio={GAME_MASTER_ART_RATIO} width={46} height={46} scale={2.4} eye={0.4}/>:null}
    <p><span className="realm-eyebrow">{gm?.title??'Your narrator'}</span>“{gm?.lines.setOut??story?.synopsis??'Gather round the fire. When everyone is ready, the road begins.'}”</p>
   </section>
   <div className="camp-action">
    <p role="status"><strong>{ready.length} of {room.players.length} ready</strong><span>{waitingText}</span></p>
    {host?<RealmButton variant="primary" minWidth={190} disabled={busy||!canStart} onClick={()=>command({type:'start'})}>Start Quest</RealmButton>
     :<RealmButton variant={me?.ready?'secondary':'primary'} minWidth={160} disabled={busy} aria-pressed={!!me?.ready} onClick={()=>command({type:'ready',ready:!me?.ready})}>{me?.ready?'Not ready yet':'Ready'}</RealmButton>}
   </div>
  </div>
  </div>
  {/* Phones: the scene is too small for nameplates, so the party is listed under it. */}
  <ul className="camp-list" aria-label="Party">
   {room.players.map(p=>{const hero=p.heroId?HEROES.find(h=>h.id===p.heroId):undefined;return <li key={p.id}>
    <Portrait art={hero?.art??customHeroArt(p)} face={hero?.face??CUSTOM_FACE} ratio={HERO_ART_RATIO} width={44} height={44} scale={1.6}/>
    <span><strong>{p.name}{p.id===session.playerId?' (you)':''}</strong><span>{CLASS_INFO[p.heroClass].name}{p.bot?' · Companion':p.id===room.hostId?' · Host':''}</span></span>{status(p)}{remove(p)}
   </li>})}
  </ul>
 </main></div>;
}
