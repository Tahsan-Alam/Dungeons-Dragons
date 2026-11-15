'use client';
import {useEffect,useMemo,useRef,useState,useId} from 'react';
import type {SavedAdventure} from '../../game/library';
import {CLASS_INFO} from '../../game/types';
import {HEROES,HERO_ART_RATIO,SCENE_FOR_BIOME} from '../../game/presets';
import {HeroArt,Icon} from './Art';
import Modal from './Modal';
import {RealmButton,Diamond,Check,Portrait} from './RealmKit';
import './library.css';
import './journal.css';

type Filter='active'|'finished'|'archived';
type Props={games:SavedAdventure[];ready:boolean;busy:boolean;onOpen:(id:string)=>unknown;onReplay:(id:string)=>unknown;onUpdate:(id:string,patch:{title?:string;pinned?:boolean;archived?:boolean})=>Promise<boolean>;onDelete:(id:string)=>Promise<boolean>};
const Arrow=()=><svg width="9" height="14" viewBox="0 0 9 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 1l6 6-6 6"/></svg>;
const finished=(g:SavedAdventure)=>g.status==='victory'||g.status==='defeat';
const scenes=(g:SavedAdventure)=>SCENE_FOR_BIOME[g.biome??'woodland'];
/** A renamed save keeps its own name; otherwise the journal shows the tale it follows. */
const named=(g:SavedAdventure)=>!g.title.startsWith(`${g.heroName} · `)||!g.taleTitle?g.title:g.taleTitle;
const when=(t:number)=>new Date(t).toLocaleDateString(undefined,{month:'short',day:'numeric'});
/** One line of state or progress for a list row. */
function stateLine(g:SavedAdventure){
 if(g.status==='victory')return `Victory · ${when(g.updatedAt)}`;
 if(g.status==='defeat')return `Defeat · ${when(g.updatedAt)}`;
 if(g.status==='lobby')return 'At party camp';
 if(g.status==='unavailable')return 'Party unavailable';
 const chapter=`Chapter ${g.scene+1}${g.chapters?` of ${g.chapters}`:''}`;
 return g.kind==='solo'?`${chapter} · Paused`:g.yourTurn?`${chapter} · Your turn`:`${chapter} · ${g.turnOf?`Waiting for ${g.turnOf}`:'Waiting for players'}`;
}

/** The campaign journal: saves on the left, the selected save opened to its place on the right. */
export default function GameLibrary({games,ready,busy,onOpen,onReplay,onUpdate,onDelete}:Props){
 const[filter,setFilter]=useState<Filter>('active'),[search,setSearch]=useState(''),[edit,setEdit]=useState<SavedAdventure|null>(null),[title,setTitle]=useState(''),[remove,setRemove]=useState<SavedAdventure|null>(null),[saving,setSaving]=useState(false),[notice,setNotice]=useState(''),[more,setMore]=useState(false),[picked,setPicked]=useState('');
 const panelId=useId(),menu=useRef<HTMLDivElement>(null);
 const filtered=useMemo(()=>games.filter(g=>(filter==='archived'?g.archived:!g.archived&&(filter==='finished'?finished(g):!finished(g)))&&`${g.title} ${g.heroName} ${g.taleTitle??''} ${g.roomCode||''}`.toLowerCase().includes(search.trim().toLowerCase())).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.updatedAt-a.updatedAt),[games,filter,search]);
 const counts={active:games.filter(g=>!g.archived&&!finished(g)).length,finished:games.filter(g=>!g.archived&&finished(g)).length,archived:games.filter(g=>g.archived).length};
 const selected=filtered.find(g=>g.id===picked)??filtered[0];
 useEffect(()=>{
  if(!more)return;
  const close=(event:PointerEvent)=>{if(!menu.current?.contains(event.target as Node))setMore(false)};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setMore(false)};
  document.addEventListener('pointerdown',close);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape)};
 },[more]);
 async function update(id:string,patch:{pinned?:boolean;archived?:boolean}){setSaving(true);try{await onUpdate(id,patch);}finally{setSaving(false)}}
 const tabs:Filter[]=['active','finished','archived'];

 return <section className="realm journal" aria-label="Saved adventures">
  <div className="journal-list">
   <div className="journal-tabs" role="tablist" aria-label="Adventure list" onKeyDown={e=>{let index=tabs.indexOf(filter);if(e.key==='ArrowRight')index=(index+1)%3;else if(e.key==='ArrowLeft')index=(index+2)%3;else if(e.key==='Home')index=0;else if(e.key==='End')index=2;else return;e.preventDefault();setFilter(tabs[index]);e.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]')[index]?.focus()}}>
    {tabs.map(f=><button key={f} type="button" role="tab" id={`${panelId}-${f}`} aria-controls={panelId} tabIndex={filter===f?0:-1} aria-selected={filter===f} className={`journal-tab${filter===f?' on':''}`} onClick={()=>setFilter(f)}>{f==='active'?'In progress':f==='finished'?'Finished':'Archived'}<span>{counts[f]}</span></button>)}
   </div>
   <label className="journal-search"><span className="sr-only">Search adventures</span><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search adventures"/></label>
   <div id={panelId} role="tabpanel" aria-labelledby={`${panelId}-${filter}`}>
    {!ready?<p className="journal-empty" role="status">Loading adventures…</p>
     :!filtered.length?<div className="journal-empty"><h2>{search?'No matching adventures':filter==='archived'?'No archived adventures':filter==='finished'?'No finished adventures':'No saved adventures yet'}</h2>{!search&&filter==='active'?<p>Start a new quest or gather a party.</p>:null}</div>
     :<div className="journal-rows" role="radiogroup" aria-label="Saved adventures">{filtered.map(g=><button key={g.id} type="button" role="radio" aria-checked={g.id===selected?.id} className="realm-choice journal-row" onClick={()=>{setPicked(g.id);setMore(false)}}>
      <img src={scenes(g).thumb} alt="" className="journal-thumb"/>
      <span className={`journal-row-text${g.id===selected?.id?' realm-tint':''}`}><strong>{named(g)}</strong><span className={g.yourTurn&&g.status==='playing'&&g.kind==='online'?'turn':''}>{stateLine(g)}</span></span>
      {g.pinned?<span className="journal-pin" aria-label="Pinned"><Icon name="pin" size={13}/></span>:null}
      {g.id===selected?.id?<Diamond/>:null}
     </button>)}</div>}
   </div>
  </div>
  {selected?<Preview g={selected} busy={busy||saving} onOpen={onOpen} onReplay={onReplay} onRestore={()=>void update(selected.id,{archived:false})} onPin={()=>void update(selected.id,{pinned:!selected.pinned})}
   more={more} setMore={setMore} menu={menu} onRename={()=>{setMore(false);setEdit(selected);setTitle(selected.title)}} onArchive={()=>{setMore(false);void update(selected.id,{archived:true})}} onDelete={()=>{setMore(false);setRemove(selected)}}/>:<div className="journal-preview journal-blank" aria-hidden="true"><img src="/art/scenes/tale-lantern.svg" alt=""/></div>}
  {games.length?<p className="journal-storage">Saved in this browser. Online parties expire after 30 days without a visit or game change; saved replays remain available.</p>:null}
  {notice?<p className="library-notice" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss notification"><Icon name="close" size={14}/></button></p>:null}
  {edit?<Modal title="Rename adventure" dismissible={!saving} onClose={()=>{if(!saving)setEdit(null)}}><form className="library-dialog" onSubmit={async e=>{e.preventDefault();if(!title.trim()||saving)return;setSaving(true);try{if(await onUpdate(edit.id,{title:title.trim()}))setEdit(null)}finally{setSaving(false)}}}><label className="field">Adventure name<input autoFocus value={title} onChange={e=>setTitle(e.target.value)} maxLength={60} required/></label><div className="dialog-actions"><button type="button" className="button paper" disabled={saving} onClick={()=>setEdit(null)}>Cancel</button><button className="button primary" disabled={saving||!title.trim()}>{saving?'Saving…':'Save'}</button></div></form></Modal>:null}
  {remove?<Modal title="Delete saved adventure?" dismissible={!saving} onClose={()=>{if(!saving)setRemove(null)}}><div className="library-dialog"><p>Delete <strong>{remove.title}</strong> and its replay from this browser? This cannot be undone.</p>{remove.kind==='online'?<p>This removes your saved seat from this browser. Other players can continue. Archive instead if you want to return later.</p>:null}<div className="dialog-actions"><button className="button paper" disabled={saving} onClick={()=>setRemove(null)}>Cancel</button><button className="button danger" disabled={saving} onClick={async()=>{setSaving(true);try{if(await onDelete(remove.id)){setRemove(null);setNotice('Saved adventure deleted.')}}finally{setSaving(false)}}}>{saving?'Deleting…':'Delete adventure'}</button></div></div></Modal>:null}
 </section>;
}

type PreviewProps={g:SavedAdventure;busy:boolean;onOpen:(id:string)=>unknown;onReplay:(id:string)=>unknown;onRestore:()=>void;onPin:()=>void;more:boolean;setMore:(v:boolean)=>void;menu:React.RefObject<HTMLDivElement|null>;onRename:()=>void;onArchive:()=>void;onDelete:()=>void};
function Preview({g,busy,onOpen,onReplay,onRestore,onPin,more,setMore,menu,onRename,onArchive,onDelete}:PreviewProps){
 const hero=HEROES.find(h=>h.name===g.heroName),done=finished(g);
 const marks=g.chapters&&!done&&g.status==='playing'?Array.from({length:g.chapters},(_,i)=><span key={i} className={i<g.scene?'done':i===g.scene?'now':''}/>):null;
 const main=g.archived?<RealmButton disabled={busy} onClick={onRestore}>Restore</RealmButton>
  :done?<RealmButton variant="primary" minWidth={200} disabled={busy} onClick={()=>onReplay(g.id)}>Watch Replay<Arrow/></RealmButton>
  :g.status==='unavailable'?null
  :g.status==='lobby'?<RealmButton variant="primary" minWidth={200} disabled={busy} onClick={()=>onOpen(g.id)}>Open party camp<Arrow/></RealmButton>
  :g.kind==='online'&&!g.yourTurn?<RealmButton minWidth={140} disabled={busy} onClick={()=>onOpen(g.id)}>Open</RealmButton>
  :<RealmButton variant="primary" minWidth={180} disabled={busy} onClick={()=>onOpen(g.id)}>Continue<Arrow/></RealmButton>;
 const side=done?<span className="journal-side">Replay ready</span>
  :g.status==='playing'?(g.kind==='solo'||g.yourTurn?<span className="journal-side turn"><span aria-hidden="true"/>Your turn</span>:<span className="journal-side">{g.turnOf?`Waiting for ${g.turnOf}`:'Waiting for players'}</span>):null;
 return <article className="journal-preview realm-panel" aria-label={named(g)}>
  <img className="journal-scene realm-fade" key={g.id} src={scenes(g).scene} alt=""/>
  <div className="journal-body">
   <div className="journal-head"><h2>{named(g)}</h2>{g.status==='playing'?<span>{g.sceneName}</span>:null}</div>
   <div className="journal-facts">
    <div className="journal-hero">{hero?<Portrait art={hero.art} face={hero.face} ratio={HERO_ART_RATIO} width={64} height={64} scale={1.6} className="journal-portrait"/>:<span className="journal-portrait journal-art"><HeroArt heroClass={g.heroClass}/></span>}
     <div><span className="realm-eyebrow">Playing as</span><strong>{g.heroName}</strong><span>{CLASS_INFO[g.heroClass].name}{g.kind==='online'?` · Party ${g.roomCode}`:' · Solo'}</span></div></div>
    <div className="journal-divider" aria-hidden="true"/>
    <div className="journal-progress">
     {done?<span className={`journal-result ${g.status}`}>{g.status==='victory'?<><Check size={14}/>Victory</>:<>✕ Defeat</>}</span>
      :<strong>{g.status==='lobby'?'At party camp':`Chapter ${g.scene+1}${g.chapters?` of ${g.chapters}`:''}`}</strong>}
     {marks?<span className="journal-marks" role="img" aria-label={`Chapter ${g.scene+1} of ${g.chapters}`}>{marks}</span>:null}
     <span><time dateTime={new Date(g.updatedAt).toISOString()}>{done?'Finished':'Played'} {when(g.updatedAt)}</time>{g.status==='playing'?` · Round ${g.round}`:''}</span>
    </div>
   </div>
   <div className="journal-actions">
    <div className="journal-tools" ref={menu}>
     <button type="button" className={`journal-icon${g.pinned?' on':''}`} aria-pressed={g.pinned} aria-label={`${g.pinned?'Unpin':'Pin'} ${g.title}`} data-tooltip={g.pinned?'Unpin':'Pin to the top'} disabled={busy} onClick={onPin}><Icon name="pin" size={16}/></button>
     <button type="button" className="journal-icon" aria-expanded={more} aria-label={`Options for ${g.title}`} data-tooltip="Adventure options" onClick={()=>setMore(!more)}>•••</button>
     {more?<div className="journal-menu" role="group" aria-label={`Adventure options for ${g.title}`}><button type="button" onClick={onRename}>Rename</button>{!g.archived?<button type="button" onClick={onArchive}>Archive</button>:null}<button type="button" className="danger" onClick={onDelete}>Delete</button></div>:null}
    </div>
    {!done&&g.status==='playing'&&!g.archived?<RealmButton small disabled={busy} onClick={()=>onReplay(g.id)}>Watch replay</RealmButton>:null}
    {side}{main}
   </div>
  </div>
 </article>;
}
