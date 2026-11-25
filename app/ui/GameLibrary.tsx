'use client';
import {useEffect,useId,useMemo,useState,type KeyboardEvent} from 'react';
import type {SavedAdventure} from '../../game/library';
import {CLASS_INFO,HERO_COLORS} from '../../game/types';
import {HEROES,HERO_ART_RATIO,SCENE_FOR_BIOME,TALES} from '../../game/presets';
import {Icon} from './Art';
import Modal from './Modal';
import {RealmButton,Portrait} from './RealmKit';
import {KeyHints} from './MenuKit';
import {CUSTOM_FACE,customHeroArt} from './hero-figure';
import './library.css';
import './journal.css';

/* Adventures as a save-slot screen: the chosen tale's painting fills the screen as Camp's title art does, the saves are
   slots on the left, and the chosen one is written over its painting. Phones put the painting in a band at the top and
   open the chosen slot in place. */
type Filter='active'|'finished'|'archived';
type Props={games:SavedAdventure[];ready:boolean;busy:boolean;onOpen:(id:string)=>unknown;onReplay:(id:string)=>unknown;onUpdate:(id:string,patch:{title?:string;pinned?:boolean;archived?:boolean})=>Promise<boolean>;onDelete:(id:string)=>Promise<boolean>;
 onCamp:()=>void;onNew:(mode:'solo'|'online')=>void;onJoin:()=>void;onHelp:()=>void;onSettings:()=>void;disabled?:boolean};
const finished=(g:SavedAdventure)=>g.status==='victory'||g.status==='defeat';
const scenes=(g:SavedAdventure)=>SCENE_FOR_BIOME[g.biome??'woodland'];
const region=(g:SavedAdventure)=>TALES.find(tale=>tale.biome===(g.biome??'woodland'))?.region;
/** A renamed save keeps its own name; otherwise the journal shows the tale it follows. */
const named=(g:SavedAdventure)=>!g.title.startsWith(`${g.heroName} · `)||!g.taleTitle?g.title:g.taleTitle;
const when=(t:number)=>new Date(t).toLocaleDateString(undefined,{month:'short',day:'numeric'});
const today=(t:number)=>new Date(t).toDateString()===new Date().toDateString();
const day=(t:number)=>today(t)?'Today':when(t);
const ROMAN=['I','II','III','IV','V','VI','VII','VIII','IX','X'];
const SEARCH_FROM=8;
const yours=(g:SavedAdventure)=>g.status==='playing'&&(g.kind==='solo'||g.yourTurn);

/** Under the title: who you play and how far the tale has come. */
function whoLine(g:SavedAdventure){
 if(g.status==='lobby')return `${g.heroName} · At party camp`;
 if(g.status==='unavailable')return `${g.heroName} · Party unavailable`;
 if(g.status==='victory')return `${g.heroName} · Victory`;
 if(g.status==='defeat')return `${g.heroName} · Defeat`;
 return `${g.heroName} · Chapter ${ROMAN[g.scene]??g.scene+1}${g.chapters?` of ${ROMAN[g.chapters-1]??g.chapters}`:''}`;
}
/** At the slot's right: whose turn it is, or how it stands. */
function stateLine(g:SavedAdventure){
 if(finished(g))return 'Replay ready';
 if(g.status==='lobby')return g.kind==='online'?`Party ${g.roomCode}`:'At camp';
 if(g.status!=='playing')return '';
 return g.yourTurn?'':g.turnOf?`${g.turnOf}’s turn`:'Waiting for players';
}

/** The waymarks along the road: lit up to the chapter you are on. */
function Road({g,big=false}:{g:SavedAdventure;big?:boolean}){
 const total=g.chapters??0;if(!total||g.status==='lobby'||g.status==='unavailable')return null;
 const reached=g.status==='victory'?total:g.scene;
 if(big)return <span className="adv-bigroad" role="img" aria-label={g.status==='victory'?`All ${total} chapters walked`:`Chapter ${g.scene+1} of ${total}`}>{Array.from({length:total},(_,i)=><span key={i} className="adv-stop-wrap">{i?<i className={i<=reached?'lit':''}/>:null}<span className={`adv-stop${i<reached?' done':''}${i===reached&&g.status==='playing'?' here':''}`}>{ROMAN[i]??i+1}</span></span>)}</span>;
 return <span className="adv-road" aria-hidden="true">{Array.from({length:total},(_,i)=><span key={i}>{i?<i className={i<=reached?'lit':''}/>:null}<b className={i<reached||(i===reached&&g.status==='playing')?'lit':''}/></span>)}</span>;
}

export default function GameLibrary({games,ready,busy,onOpen,onReplay,onUpdate,onDelete,onCamp,onNew,onJoin,onHelp,onSettings,disabled=false}:Props){
 const[filter,setFilter]=useState<Filter>('active'),[search,setSearch]=useState(''),[edit,setEdit]=useState<SavedAdventure|null>(null),[title,setTitle]=useState(''),[remove,setRemove]=useState<SavedAdventure|null>(null),[saving,setSaving]=useState(false),[notice,setNotice]=useState(''),[picked,setPicked]=useState('');
 const[narrow,setNarrow]=useState(false);
 const panelId=useId();
 useEffect(()=>{const media=window.matchMedia('(max-width:760px)');const sync=()=>setNarrow(media.matches);sync();media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync)},[]);
 const filtered=useMemo(()=>games.filter(g=>(filter==='archived'?g.archived:!g.archived&&(filter==='finished'?finished(g):!finished(g)))&&`${g.title} ${g.heroName} ${g.taleTitle??''} ${g.roomCode||''}`.toLowerCase().includes(search.trim().toLowerCase())).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.updatedAt-a.updatedAt),[games,filter,search]);
 const counts={active:games.filter(g=>!g.archived&&!finished(g)).length,finished:games.filter(g=>!g.archived&&finished(g)).length,archived:games.filter(g=>g.archived).length};
 const selected=filtered.find(g=>g.id===picked)??filtered[0];
 const tabs:Filter[]=['active','finished','archived'];
 const dialogOpen=!!edit||!!remove;
 async function update(id:string,patch:{pinned?:boolean;archived?:boolean}){setSaving(true);try{await onUpdate(id,patch);}finally{setSaving(false)}}
 function primary(g:SavedAdventure){if(g.archived)void update(g.id,{archived:false});else if(finished(g))onReplay(g.id);else if(g.status!=='unavailable')onOpen(g.id)}
 // Esc goes back to Camp when no dialog is open, as a game menu's Back does.
 useEffect(()=>{const back=(event:globalThis.KeyboardEvent)=>{if(event.key!=='Escape'||event.defaultPrevented||document.querySelector('dialog[open]'))return;onCamp()};window.addEventListener('keydown',back);return()=>window.removeEventListener('keydown',back)},[onCamp]);
 function slotKeys(event:KeyboardEvent<HTMLDivElement>){
  const index=filtered.findIndex(g=>g.id===selected?.id);let next=-1;
  if(event.key==='ArrowDown')next=Math.min(filtered.length-1,index+1);else if(event.key==='ArrowUp')next=Math.max(0,index-1);
  else if(event.key==='Home')next=0;else if(event.key==='End')next=filtered.length-1;
  else if(event.key==='Enter'&&selected&&(event.target as HTMLElement).getAttribute('role')==='radio'){event.preventDefault();if(!busy)primary(selected);return}
  else return;
  event.preventDefault();const g=filtered[next];if(!g)return;setPicked(g.id);
  event.currentTarget.querySelectorAll<HTMLElement>('[role=radio]')[next]?.focus();
 }
 const details=selected?<Details g={selected} busy={busy||saving} narrow={narrow} onPrimary={()=>primary(selected)} onReplay={()=>onReplay(selected.id)} onPin={()=>void update(selected.id,{pinned:!selected.pinned})}
  onRename={()=>{setEdit(selected);setTitle(selected.title)}} onArchive={()=>void update(selected.id,{archived:true})} onDelete={()=>setRemove(selected)}/>:null;
 const scene=selected?scenes(selected).scene:SCENE_FOR_BIOME.woodland.scene;

 return <section className={`adventures${dialogOpen?' has-dialog':''}`} aria-label="Saved adventures">
  <div className="adv-scene" aria-hidden="true"><img key={scene} src={scene} alt=""/></div>
  <header className="adv-top">
   <button type="button" className="adv-back" onClick={onCamp}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5"/></svg>Camp</button>
   <div className="adv-corner"><button type="button" className="adv-word" onClick={onHelp}><Icon name="book" size={18}/><span>Guide</span></button><button type="button" className="adv-word" onClick={onSettings}><Icon name="gear" size={18}/><span>Settings</span></button></div>
  </header>
  <div className="adv-page">
   <div className="adv-left">
    <p className="realm-eyebrow">Your journal</p>
    <h1>Adventures</h1>
    <div className="adv-tabs" role="tablist" aria-label="Adventure list" onKeyDown={e=>{let index=tabs.indexOf(filter);if(e.key==='ArrowRight')index=(index+1)%3;else if(e.key==='ArrowLeft')index=(index+2)%3;else if(e.key==='Home')index=0;else if(e.key==='End')index=2;else return;e.preventDefault();setFilter(tabs[index]);e.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]')[index]?.focus()}}>
     {tabs.map(f=><button key={f} type="button" role="tab" id={`${panelId}-${f}`} aria-controls={panelId} tabIndex={filter===f?0:-1} aria-selected={filter===f} onClick={()=>setFilter(f)}>{f==='active'?'In progress':f==='finished'?'Finished':'Archived'}{counts[f]?<b>{counts[f]}</b>:null}</button>)}
    </div>
    {games.length>=SEARCH_FROM?<label className="adv-search"><span className="sr-only">Search adventures</span><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find an adventure"/></label>:null}
    <div id={panelId} role="tabpanel" aria-labelledby={`${panelId}-${filter}`} className="adv-slots-wrap">
     {!ready?<p className="adv-empty" role="status">Opening the journal…</p>
      :!filtered.length?<p className="adv-empty">{search?'No adventure by that name.':filter==='archived'?'Nothing archived.':filter==='finished'?'No tale finished yet.':'No adventure under way.'}</p>
      :<div className="adv-slots" role="radiogroup" aria-label="Saved adventures" onKeyDown={slotKeys}>{filtered.map(g=>{const on=g.id===selected?.id,state=stateLine(g);return <div key={g.id} className={`adv-slot${on?' on':''}`}>
       <div role="radio" aria-checked={on} tabIndex={on?0:-1} className="adv-slot-face" onClick={()=>setPicked(g.id)} onDoubleClick={()=>{if(!busy)primary(g)}}>
        <img src={scenes(g).thumb} alt="" className="adv-thumb"/>
        <span className="adv-slot-text"><strong>{named(g)}</strong><span>{whoLine(g)}</span><Road g={g}/></span>
        <span className="adv-state">{yours(g)?<span className="adv-turn">Your turn</span>:state?<span>{state}</span>:null}<span>{day(g.updatedAt)}</span></span>
        {g.pinned?<span className="adv-ribbon" aria-label="Pinned" role="img"/>:null}
       </div>
       {on&&narrow?details:null}
      </div>})}</div>}
     {filter==='active'&&!search&&ready?<div className="adv-newslot">
      <span className="adv-plus" aria-hidden="true">+</span>
      <div><button type="button" className="adv-new" disabled={disabled} onClick={()=>onNew('solo')}>Begin a new quest</button>
       <p>or <button type="button" disabled={disabled} onClick={()=>onNew('online')}>gather a party</button> · <button type="button" disabled={disabled} onClick={onJoin}>join a party</button></p></div>
     </div>:null}
    </div>
    <div className="adv-foot"><KeyHints hints={[[['↑','↓'],'Choose'],[['Enter'],'Continue'],[['Esc'],'Camp']]}/>{games.length?<span className="adv-kept" title="Online parties end after 30 days without a visit or a move; their replays stay.">Kept on this device</span>:null}</div>
   </div>
   {!narrow?<div className="adv-right">{details}</div>:null}
  </div>
  {notice?<p className="library-notice adv-notice" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss notification"><Icon name="close" size={14}/></button></p>:null}
  {edit?<Modal title="Rename adventure" className="game-menu parchment-note" dismissible={!saving} onClose={()=>{if(!saving)setEdit(null)}}><form className="library-dialog" onSubmit={async e=>{e.preventDefault();if(!title.trim()||saving)return;setSaving(true);try{if(await onUpdate(edit.id,{title:title.trim()}))setEdit(null)}finally{setSaving(false)}}}><label className="field">A new name for this tale<input autoFocus value={title} onChange={e=>setTitle(e.target.value)} maxLength={60} required/></label><div className="dialog-actions"><button type="button" className="button paper" disabled={saving} onClick={()=>setEdit(null)}>Cancel</button><button className="button primary" disabled={saving||!title.trim()}>{saving?'Saving…':'Save'}</button></div></form></Modal>:null}
  {remove?<Modal title="Delete saved adventure?" className="game-menu parchment-note" dismissible={!saving} onClose={()=>{if(!saving)setRemove(null)}}><div className="library-dialog"><p>Delete <strong>{remove.title}</strong> and its replay from this device? This cannot be undone.</p>{remove.kind==='online'?<p>This removes your saved seat from this device. Other players can continue. Archive instead if you want to return later.</p>:null}<div className="dialog-actions"><button className="button paper" disabled={saving} onClick={()=>setRemove(null)}>Cancel</button><button className="button danger" disabled={saving} onClick={async()=>{setSaving(true);try{if(await onDelete(remove.id)){setRemove(null);setNotice('Saved adventure deleted.')}}finally{setSaving(false)}}}>{saving?'Deleting…':'Delete adventure'}</button></div></div></Modal>:null}
 </section>;
}

type DetailsProps={g:SavedAdventure;busy:boolean;narrow:boolean;onPrimary:()=>void;onReplay:()=>void;onPin:()=>void;onRename:()=>void;onArchive:()=>void;onDelete:()=>void};
/** The chosen save, written over its painting (or opened in place on a phone). */
function Details({g,busy,narrow,onPrimary,onReplay,onPin,onRename,onArchive,onDelete}:DetailsProps){
 const hero=HEROES.find(h=>h.name===g.heroName&&h.profile.heroClass===g.heroClass),done=finished(g),where=region(g);
 const label=g.archived?'Restore':done?'Watch replay':g.status==='lobby'?'Open party camp':g.kind==='online'&&!g.yourTurn?'Open':'Continue';
 const main=g.status==='unavailable'&&!g.archived?null:<RealmButton variant={g.archived||(g.kind==='online'&&!g.yourTurn&&g.status==='playing')?'secondary':'primary'} minWidth={narrow?undefined:190} disabled={busy} onClick={onPrimary}>{label}{label==='Continue'||label==='Watch replay'||label==='Open party camp'?<span aria-hidden="true">›</span>:null}</RealmButton>;
 return <article className="adv-tale" aria-label={named(g)}>
  {!narrow?<>
   <p className="adv-where">{[where,'The Lantern Marches'].filter(Boolean).join(' · ')}</p>
   <h2>{named(g)}</h2>
   {g.status==='playing'?<p className="adv-place">{g.sceneName}</p>:null}
  </>:null}
  {g.lastLine&&!done?<p className="adv-line">“{g.lastLine}”</p>:null}
  <div className="adv-party">
   <div className="adv-hero"><Portrait art={hero?.art??customHeroArt({name:g.heroName,heroClass:g.heroClass,color:HERO_COLORS[0]})} face={hero?.face??CUSTOM_FACE} ratio={HERO_ART_RATIO} width={56} height={64} scale={1.6} className="adv-portrait"/>
    <div><span className="adv-label">Playing as</span><strong>{g.heroName}</strong><span>{CLASS_INFO[g.heroClass].name}{g.kind==='online'?` · Party ${g.roomCode}`:' · Solo'}</span></div></div>
   <div className="adv-onroad">
    {done?<span className={`adv-result ${g.status}`}>{g.status==='victory'?'Victory':'Defeat'}</span>:<span className="adv-label">{g.status==='lobby'?'At party camp':'On the road'}</span>}
    <Road g={g} big/>
    <span className="adv-when">{g.status==='playing'?`Round ${g.round} · `:''}<time dateTime={new Date(g.updatedAt).toISOString()}>{done?'finished':'played'} {today(g.updatedAt)?'today':when(g.updatedAt)}</time></span>
   </div>
  </div>
  <div className="adv-acts">{main}{!done&&g.status==='playing'&&!g.archived?<RealmButton disabled={busy} onClick={onReplay}>Watch replay</RealmButton>:null}</div>
  <div className="adv-small">
   <button type="button" disabled={busy} aria-pressed={g.pinned} onClick={onPin}>{g.pinned?'Unpin':'Pin'}</button>
   <button type="button" disabled={busy} onClick={onRename}>Rename</button>
   {!g.archived?<button type="button" disabled={busy} onClick={onArchive}>Archive</button>:null}
   <button type="button" className="danger" disabled={busy} onClick={onDelete}>Delete</button>
  </div>
 </article>;
}
