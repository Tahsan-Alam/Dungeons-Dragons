'use client';
import {useEffect,useRef,useState} from 'react';
import {DEFAULT_OPTIONS} from '../../game/types';
import type {GameOptions,HeroClass,RoomPreview} from '../../game/types';
import {HEROES,HERO_ART_RATIO,SCENE_FOR_BIOME} from '../../game/presets';
import type {Role} from '../../game/presets';
import {normalizePartyCode,partyCodeComplete} from './party';
import {HeroArt} from './Art';
import {RealmButton,QuestSteps,Portrait,Check} from './RealmKit';
import {HeroStep} from './QuestSetup';
import './quest-setup.css';
import './party-camp.css';

type Props={onBack:()=>void;onStart:(name:string,cls:HeroClass,options:GameOptions,code:string,heroId?:string)=>unknown;busy:boolean;initialCode?:string};
type Lookup={state:'idle'}|{state:'checking'}|{state:'found';preview:RoomPreview}|{state:'missing'}|{state:'error'};
type Answer={code:string;result:Lookup};
const Arrow=()=><svg width="9" height="14" viewBox="0 0 9 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 1l6 6-6 6"/></svg>;
const BackArrow=()=><svg width="9" height="14" viewBox="0 0 9 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 1L1 7l6 6"/></svg>;

/** Join a party: the code on the left, an invitation that opens on the right, then a hero from the roster. */
export default function JoinParty({onBack,onStart,busy,initialCode=''}:Props){
 const [code,setCode]=useState(()=>normalizePartyCode(initialCode)),[answer,setAnswer]=useState<Answer|null>(null);
 const [step,setStep]=useState<'code'|'hero'>('code'),[heroId,setHeroId]=useState(''),[role,setRole]=useState<'All'|Role>('All');
 const boxes=useRef<(HTMLInputElement|null)[]>([]);

 // The invitation is fetched once all six letters are in; a changed code starts over.
 useEffect(()=>{
  if(!partyCodeComplete(code))return;
  const controller=new AbortController(),settle=(result:Lookup)=>setAnswer({code,result});
  fetch(`/api/rooms/${code}/preview`,{cache:'no-store',signal:controller.signal})
   .then(async r=>settle(r.ok?{state:'found',preview:await r.json() as RoomPreview}:{state:r.status===404?'missing':'error'}))
   .catch(()=>{if(!controller.signal.aborted)settle({state:'error'});});
  return()=>controller.abort();
 },[code]);
 // Until the server answers for exactly this code, the lookup is idle (code incomplete) or checking.
 const lookup:Lookup=!partyCodeComplete(code)?{state:'idle'}:answer?.code===code?answer.result:{state:'checking'};

 const preview=lookup.state==='found'?lookup.preview:null;
 const taken:Record<string,string>=Object.fromEntries((preview?.players??[]).filter(p=>p.heroId).map(p=>[p.heroId!,p.name]));
 const seatsLeft=preview?preview.capacity-preview.players.length:0;
 const joinable=!!preview&&!preview.started&&seatsLeft>0;
 const hero=HEROES.find(h=>h.id===heroId&&!taken[h.id])??HEROES.find(h=>!taken[h.id])??HEROES[0];

 function setLetter(i:number,value:string){
  const letters=code.padEnd(6,' ').split('');
  const typed=normalizePartyCode(value);
  if(typed.length>1){setCode(normalizePartyCode(code.slice(0,i)+typed).slice(0,6));boxes.current[Math.min(5,i+typed.length)]?.focus();return;}
  letters[i]=typed||' ';
  setCode(letters.join('').replace(/\s+$/,'').replace(/\s/g,''));
  if(typed&&i<5)boxes.current[i+1]?.focus();
 }
 const status=lookup.state==='found'?(preview!.started?<p className="jp-status bad" role="status">That adventure has already started.</p>:seatsLeft<1?<p className="jp-status bad" role="status">That party is full.</p>:<p className="jp-status ok" role="status"><Check size={13}/>Code verified</p>)
  :lookup.state==='checking'?<p className="jp-status" role="status">Looking for the party…</p>
  :lookup.state==='missing'?<p className="jp-status bad" role="status">No open party uses that code. Check the letters with your host.</p>
  :lookup.state==='error'?<p className="jp-status bad" role="status">Could not reach the party. Try again in a moment.</p>
  :<p className="jp-status" role="status"><span className="jp-dot" aria-hidden="true"/>{6-code.length===6?'Six letters from your host’s invite.':`${6-code.length} more ${6-code.length===1?'letter':'letters'} to go`}</p>;

 if(step==='hero'&&preview)return <main className="realm qs" aria-labelledby="jp-hero-title">
  <header className="qs-top"><h1 id="jp-hero-title" tabIndex={-1}>Who will you be?</h1><p className="jp-joining">Joining <strong>{preview.title}</strong> · {preview.code}</p></header>
  <HeroStep hero={hero} role={role} setRole={setRole} pick={setHeroId} sheet={false} openSheet={()=>{}} taken={taken}/>
  <footer className="qs-footer">
   <RealmButton onClick={()=>setStep('code')}><BackArrow/>Back</RealmButton>
   <RealmButton variant="primary" minWidth={220} disabled={busy} onClick={async()=>{if(await onStart(hero.profile.name,hero.profile.heroClass,DEFAULT_OPTIONS,code,hero.id)===false)setStep('code');}}>{busy?'Joining…':`Join as ${hero.short}`}<Arrow/></RealmButton>
  </footer>
 </main>;

 return <main className="realm qs jp" aria-labelledby="jp-title">
  <img className="jp-scene" src="/art/scenes/camp.svg" alt=""/><img className="jp-fire" src="/art/scenes/campfire.svg" alt=""/>
  <header className="qs-top"><span/><QuestSteps current={0} className="jp-steps-hidden"/></header>
  <div className="jp-main">
   <section className="jp-code realm-panel" aria-labelledby="jp-title">
    <h1 id="jp-title">Join a party</h1>
    <p>Enter the six letters from your host’s invite, or open the invite link they sent.</p>
    <div className="jp-boxes" role="group" aria-label="Party code">
     {Array.from({length:6},(_,i)=><input key={i} ref={el=>{boxes.current[i]=el;}} aria-label={`Letter ${i+1}`} value={code[i]??''} inputMode="text" autoComplete="off" autoCapitalize="characters" spellCheck={false}
      className={i===Math.min(code.length,5)&&lookup.state!=='found'?'next':''} autoFocus={i===Math.min(code.length,5)}
      onChange={e=>setLetter(i,e.target.value)} onKeyDown={e=>{if(e.key==='Backspace'&&!code[i]&&i>0){e.preventDefault();setCode(code.slice(0,i-1));boxes.current[i-1]?.focus();}}}/>)}
    </div>
    {status}
   </section>
   <section className="jp-invite realm-panel" aria-label={preview?'Invitation':'Party preview'} aria-live="polite">
    <div className="jp-invite-frame">
     {preview?<>
      <img className="jp-banner" src={SCENE_FOR_BIOME[preview.biome].scene} alt=""/>
      <div className="jp-invite-head"><h2>{preview.title}</h2><p>Hosted by {preview.host}{preview.world?` · ${preview.world}`:''}</p></div>
      <p className="realm-eyebrow">Already at the fire</p>
      <ul className="jp-party">{preview.players.map((p,i)=>{const h=p.heroId?HEROES.find(x=>x.id===p.heroId):undefined;return <li key={i}>
       {h?<Portrait art={h.art} face={h.face} ratio={HERO_ART_RATIO} width={64} height={64} scale={1.6}/>:<span className="jp-art"><HeroArt heroClass={p.heroClass} color="#a3bbf0"/></span>}
       <span>{p.name}</span></li>;})}</ul>
      <p className="jp-seats"><strong>{preview.players.length} of {preview.capacity} seats taken</strong> · {seatsLeft} open {seatsLeft===1?'seat':'seats'}</p>
      <p className="qs-note">After joining, you choose your hero. Heroes already at the fire are marked taken.</p>
     </>:<div className="jp-waiting"><img src="/art/scenes/join-lantern.svg" alt=""/><p>The host, tale and party appear here once the code matches an open party.</p></div>}
    </div>
   </section>
  </div>
  <footer className="qs-footer">
   <RealmButton onClick={onBack}><BackArrow/>Back</RealmButton>
   <RealmButton variant="primary" minWidth={200} disabled={!joinable} onClick={()=>setStep('hero')}>Join Party<Arrow/></RealmButton>
  </footer>
 </main>;
}
