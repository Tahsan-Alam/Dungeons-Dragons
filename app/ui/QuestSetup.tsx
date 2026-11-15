'use client';
import {useEffect,useRef,useState} from 'react';
import {DEFAULT_OPTIONS} from '../../game/types';
import type {GameOptions,HeroClass} from '../../game/types';
import {GAME_MASTERS,TALES,HEROES,HERO_ART_RATIO,GAME_MASTER_ART_RATIO,SCENE_FOR_BIOME} from '../../game/presets';
import type {GameMasterPreset,HeroPreset,Role} from '../../game/presets';
import {narratorTone,parseStory} from '../../game/creation';
import type {StoryBlueprint} from '../../game/creation';
import {useCreation} from './useCreation';
import {useAIPreference} from './ai-preferences';
import {RealmButton,RealmTools,QuestSteps,Portrait,Diamond,CheckBadge} from './RealmKit';
import TaleConversation from './TaleConversation';
import './quest-setup.css';

type Props={mode:'solo'|'online';onBack:()=>void;onStart:(name:string,cls:HeroClass,options:GameOptions,code:string,heroId?:string)=>unknown;busy:boolean;quick?:boolean;onAISettings?:()=>void};
type Saved={v:1;step:number;gm:string;tale:string;custom:StoryBlueprint|null;hero:string;length:'short'|'standard'|'long';rules:'simple'|'classic';seed:string;companions:number};
const ROLES:('All'|Role)[]=['All','Tank','Damage','Support','Control'];
const LENGTHS=[['short','Short','1 chapter · about 30 minutes'],['standard','Standard','3 chapters · about 90 minutes'],['long','Long','5 chapters · an evening or two']] as const;
const RULES=[['simple','Streamlined','Hits are reliable and recovery is forgiving.'],['classic','Classic','Adds initiative, armour checks and death saves.']] as const;
const Arrow=()=><svg width="9" height="14" viewBox="0 0 9 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 1l6 6-6 6"/></svg>;
const BackArrow=()=><svg width="9" height="14" viewBox="0 0 9 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 1L1 7l6 6"/></svg>;
const fresh=():Saved=>({v:1,step:0,gm:'wanderer',tale:'lantern',custom:null,hero:'corin',length:'standard',rules:'simple',seed:'quest-'+crypto.randomUUID().slice(0,8),companions:DEFAULT_OPTIONS.companions});

/** Where the hero stands on the stage art (600 × 560): boots at y 485, figure 380 high. Mira is placed so Ash fits too. */
function heroPlacement(h:HeroPreset){const w=380*HERO_ART_RATIO/600*100,top=(485-0.955*380)/560*100;return {width:w+'%',top:top+'%',left:(50-(h.id==='mira'?0.58:0.5)*w)+'%'};}

export default function QuestSetup({mode,onBack,onStart,busy,quick=false,onAISettings}:Props){
 const key='painted-realms-setup-v1-'+mode;
 const [s,setS]=useState<Saved>(fresh),[ready,setReady]=useState(false);
 const [role,setRole]=useState<'All'|Role>('All'),[sheet,setSheet]=useState(false),[talking,setTalking]=useState(false),[idea,setIdea]=useState(''),[advanced,setAdvanced]=useState(false);
 const [savedAI]=useAIPreference();const creation=useCreation();
 const heading=useRef<HTMLHeadingElement>(null);
 const update=(patch:Partial<Saved>)=>setS(current=>({...current,...patch}));

 // Restore the last setup, or open a ready-made quest on Set Out.
 useEffect(()=>{
  let next=fresh();
  if(quick)next={...next,step:3};
  else try{const raw=JSON.parse(localStorage.getItem(key)??'null');
   if(raw?.v===1&&GAME_MASTERS.some(g=>g.id===raw.gm)&&HEROES.some(h=>h.id===raw.hero)){
    const custom=raw.custom?parseStory(raw.custom):null;
    next={...next,...raw,custom,tale:raw.tale==='custom'&&!custom?'lantern':raw.tale,step:Math.max(0,Math.min(3,Number(raw.step)||0))};
   }}catch{/* Setup works without storage. */}
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setS(next);setReady(true);
 },[key,quick]);
 useEffect(()=>{if(!ready||quick)return;try{localStorage.setItem(key,JSON.stringify(s));}catch{/* Storage is optional. */}},[ready,quick,key,s]);
 useEffect(()=>{heading.current?.focus({preventScroll:true});},[s.step,sheet,talking]);

 const gm=GAME_MASTERS.find(g=>g.id===s.gm)??GAME_MASTERS[0];
 const hero=HEROES.find(h=>h.id===s.hero)??HEROES[0];
 const presetTale=TALES.find(t=>t.id===s.tale);
 const story:StoryBlueprint=s.tale==='custom'&&s.custom?s.custom:(presetTale??TALES[0]).story;
 const taleArt=SCENE_FOR_BIOME[story.biome];
 const go=(step:number)=>{setSheet(false);update({step});};

 async function shape(){
  const text=idea.trim();if(!text||creation.pending)return;
  const result=await creation.run({action:'story',enabled:savedAI,prompt:text,message:'',traits:{personality:[]},narrator:gm.profile,guideNarrator:gm.profile,history:[]});
  const made=result?.story?parseStory(result.story):null;
  if(made)update({custom:made,tale:'custom'});
  else if(result)creation.setError('That idea did not become a tale yet. Try saying where it happens.');
 }
 function tellAnother(){const others=TALES.filter(t=>t.id!==s.tale);update({tale:others[Math.floor(Math.random()*others.length)].id});}
 function begin(){
  if(busy)return;
  const options:GameOptions={...DEFAULT_OPTIONS,rules:s.rules,seed:s.seed.trim()||fresh().seed,duration:s.length,companions:s.companions,aiEnabled:savedAI,
   narrator:narratorTone(gm.profile),biome:story.biome,narratorPrompt:[gm.profile.persona,...gm.profile.speakingStyle].join('. ').slice(0,400),characterPrompt:hero.profile.background,
   creation:{narrator:gm.profile,story,hero:hero.profile}};
  void onStart(hero.profile.name,hero.profile.heroClass,options,'',hero.id);
 }

 // Talking a tale through with the Game Master replaces the Tale step until the player keeps a tale or goes back.
 if(ready&&talking&&s.step===1)return <TaleConversation gm={gm} initialIdea={idea} initialStory={s.tale==='custom'?s.custom:null} onAISettings={onAISettings}
  onKeep={made=>{update({custom:made,tale:'custom'});setTalking(false);}} onBack={()=>setTalking(false)}/>;

 const title=['Who will tell your tale?','Which tale shall I tell?',sheet?hero.name:'Who will you be?','Ready to set out?'][s.step];
 const back=()=>sheet?setSheet(false):s.step===0?onBack():go(s.step-1);
 const forward=s.step===0?<RealmButton variant="primary" minWidth={190} onClick={()=>go(1)}>Continue<Arrow/></RealmButton>
  :s.step===1?<RealmButton variant="primary" minWidth={190} onClick={()=>go(2)}>Continue<Arrow/></RealmButton>
  :s.step===2?<RealmButton variant="primary" minWidth={220} onClick={()=>go(3)}>Play as {hero.short}<Arrow/></RealmButton>
  :<RealmButton variant="primary" minWidth={240} disabled={busy} onClick={begin}>{busy?'Preparing…':mode==='online'?'Gather the Party':'Begin Adventure'}<Arrow/></RealmButton>;

 return <main className="realm qs" aria-labelledby="qs-title">
  <header className="qs-top">
   <h1 id="qs-title" ref={heading} tabIndex={-1}>{title}</h1>
   <div className="qs-top-end"><RealmTools/><QuestSteps current={s.step}/></div>
  </header>
  {!ready?null:s.step===0?<GameMasterStep gm={gm} pick={id=>update({gm:id})}/>
   :s.step===1?<TaleStep s={s} gm={gm} story={story} art={taleArt.scene} pick={id=>update({tale:id})} idea={idea} setIdea={setIdea} shape={shape} tellAnother={tellAnother} pending={creation.pending} error={creation.error} onCreateWithNarrator={()=>setTalking(true)}/>
   :s.step===2?<HeroStep hero={hero} role={role} setRole={setRole} pick={id=>update({hero:id})} sheet={sheet} openSheet={()=>setSheet(true)}/>
   :<SetOutStep s={s} gm={gm} hero={hero} story={story} art={taleArt.scene} thumb={taleArt.thumb} update={update} advanced={advanced} setAdvanced={setAdvanced} mode={mode}/>}
  <footer className="qs-footer">
   <RealmButton onClick={back}><BackArrow/>{sheet?'Back to heroes':'Back'}</RealmButton>
   {forward}
  </footer>
 </main>;
}

function GameMasterStep({gm,pick}:{gm:GameMasterPreset;pick:(id:string)=>void}){
 return <div className="qs-gm">
  <div className="qs-gm-cards" role="radiogroup" aria-label="Game Masters">
   {GAME_MASTERS.map(g=><button key={g.id} type="button" role="radio" aria-checked={g.id===gm.id} data-tooltip={`${g.title}: ${g.tone.toLowerCase()}`} className="realm-choice qs-gm-card" onClick={()=>pick(g.id)}>
    <Portrait art={g.art} face={g.face} ratio={GAME_MASTER_ART_RATIO} width={84} height={104} scale={2.1}/>
    <span className={`qs-gm-card-text${g.id===gm.id?' realm-tint':''}`}><strong>{g.title}</strong><span>{g.mood}</span><span>{g.tone}</span></span>
    {g.id===gm.id?<Diamond/>:null}
   </button>)}
  </div>
  <section className="qs-gm-preview" aria-label={`${gm.title}, ${gm.realName}`}>
   <div className="qs-gm-stage">
    {GAME_MASTERS.map(g=><img key={g.id} className="realm-fade qs-gm-scene" src={g.scene} alt="" style={{opacity:g.id===gm.id?1:0}}/>)}
    <span className="qs-gm-shadow" aria-hidden="true"/>
    {GAME_MASTERS.map(g=><img key={g.id} className="realm-fade qs-gm-figure" src={g.art} alt={g.id===gm.id?`${g.title}, full figure`:''} aria-hidden={g.id!==gm.id} style={{opacity:g.id===gm.id?1:0}}/>)}
   </div>
   <div className="qs-gm-text" aria-live="polite">
    <h2>{gm.title}</h2><p className="qs-gm-name">{gm.realName}</p><p className="realm-eyebrow">{gm.style}</p>
    <p className="qs-gm-excerpt">{gm.excerpt}</p><p className="qs-quote">“{gm.quote}”</p>
   </div>
  </section>
 </div>;
}

type TaleProps={s:Saved;gm:GameMasterPreset;story:StoryBlueprint;art:string;pick:(id:string)=>void;idea:string;setIdea:(v:string)=>void;shape:()=>void;tellAnother:()=>void;pending:boolean;error:string;onCreateWithNarrator:()=>void};
function TaleStep({s,gm,story,art,pick,idea,setIdea,shape,tellAnother,pending,error,onCreateWithNarrator}:TaleProps){
 const preset=TALES.find(t=>t.id===s.tale);
 const rows=[...TALES.map(t=>({id:t.id,title:t.title,meta:`${t.region} · ${t.chapters} chapters`,thumb:SCENE_FOR_BIOME[t.biome].thumb})),
  ...(s.custom?[{id:'custom',title:s.custom.title,meta:`Your tale · ${s.custom.world}`,thumb:SCENE_FOR_BIOME[s.custom.biome].thumb}]:[])];
 return <div className="qs-tale">
  <section className="qs-tale-preview realm-panel" aria-label="Chosen tale">
   <div className="qs-tale-scene">
    {(['woodland','ruins','coast'] as const).map(b=><img key={b} className="realm-fade" src={SCENE_FOR_BIOME[b].scene} alt="" style={{opacity:SCENE_FOR_BIOME[b].scene===art?1:0}}/>)}
   </div>
   <div className="qs-tale-caption" aria-live="polite">
    <div className="qs-tale-title"><h2>{story.title}</h2><span>{preset?`${preset.region} · ${preset.chapters} chapters`:story.world}</span></div>
    <p>{story.synopsis}</p>
   </div>
  </section>
  <div className="qs-tale-side">
   <div className="qs-tale-list" role="radiogroup" aria-label="Tales">
    {rows.map(r=><button key={r.id} type="button" role="radio" aria-checked={s.tale===r.id} data-tooltip={`${r.title} · ${r.meta}`} className="realm-choice qs-row" onClick={()=>pick(r.id)}>
     <img src={r.thumb} alt="" className="qs-row-thumb"/>
     <span className={`qs-row-text${s.tale===r.id?' realm-tint':''}`}><strong>{r.title}</strong><span>{r.meta}</span></span>
     {s.tale===r.id?<Diamond/>:null}
    </button>)}
   </div>
   <section className="qs-own realm-panel" aria-label="Write your own">
    <div className="qs-own-head"><h2>Write your own</h2><span>One sentence is enough</span></div>
    <label htmlFor="qs-idea" className="sr-only">Your idea</label>
    <textarea id="qs-idea" rows={2} maxLength={400} value={idea} onChange={e=>setIdea(e.target.value)} placeholder="A heist in a city built on a sleeping giant…"/>
    {error?<p className="qs-error" role="alert">{error}</p>:null}
    <div className="qs-own-actions"><RealmButton small disabled={pending||!idea.trim()} onClick={shape}>{pending?`Shaping…`:'Shape it'}</RealmButton>
     <button type="button" className="qs-link" onClick={onCreateWithNarrator}>Talk it through with {gm.title.replace('The ','the ')}</button></div>
   </section>
  </div>
  <div className="qs-gm-line">
   <div className="qs-line realm-panel"><Portrait art={gm.art} face={gm.face} ratio={GAME_MASTER_ART_RATIO} width={44} height={44} scale={2.4} eye={0.4}/><p><span className="realm-eyebrow">{gm.title}</span>“{gm.lines.tale}”</p></div>
   <RealmButton small onClick={tellAnother}>Tell me another</RealmButton>
  </div>
 </div>;
}

/** The roster and the hero's stage. Also used when joining a party, where heroes already at the fire are marked taken. */
export function HeroStep({hero,role,setRole,pick,sheet,openSheet,taken={}}:{hero:HeroPreset;role:'All'|Role;setRole:(r:'All'|Role)=>void;pick:(id:string)=>void;sheet:boolean;openSheet:()=>void;taken?:Record<string,string>}){
 const wide=hero.id==='mira';
 const stage=<div className="qs-stage" aria-label={`${hero.name}, ${hero.className} ${hero.subclass}`} role="img">
  <img className="realm-fade qs-stage-set" src="/art/scenes/hero-stage.svg" alt="" style={{opacity:wide?0:1}}/>
  <img className="realm-fade qs-stage-set" src="/art/scenes/hero-stage-wide.svg" alt="" style={{opacity:wide?1:0}}/>
  {HEROES.map(h=><span key={h.id} className="realm-fade qs-stage-figure" style={{...heroPlacement(h),opacity:h.id===hero.id?1:0}} aria-hidden="true">
   <span className="qs-stage-shadow" style={h.id==='mira'?{left:'14%',width:'26%'}:undefined}/>{h.id==='mira'?<span className="qs-stage-shadow" style={{left:'48%',width:'34%'}}/>:null}
   <img src={h.art} alt=""/></span>)}
 </div>;
 if(sheet)return <div className="qs-hero qs-sheet">
  {stage}
  <section className="qs-sheet-page" aria-label={`${hero.name}'s story`}>
   <p className="realm-eyebrow">{hero.className} · {hero.subclass} · {hero.role}</p>
   <p className="qs-epithet">{hero.epithet}</p>
   <div className="qs-sheet-body">
    <div className="qs-parchment"><p>{hero.profile.background}</p></div>
    <dl className="qs-facts realm-panel">
     <div><dt className="realm-eyebrow">Class</dt><dd>{hero.className}</dd></div>
     <div><dt className="realm-eyebrow">Subclass</dt><dd>{hero.subclass}</dd></div>
     <div><dt className="realm-eyebrow">Role</dt><dd>{hero.role}</dd></div>
     <div><dt className="realm-eyebrow">Manner</dt><dd>{hero.profile.personality.join(', ')}</dd></div>
    </dl>
   </div>
   <div className="qs-sealed"><p className="qs-sealed-kicker">Sealed note</p><p className="qs-sealed-title">Your secret with the Game Master</p><p>Only you see it, once the quest begins.</p><span className="qs-seal" aria-hidden="true"/></div>
  </section>
 </div>;
 const shown=HEROES.filter(h=>role==='All'||h.role===role);
 return <div className="qs-hero">
  <div className="qs-roster">
   <div className="qs-filters" role="group" aria-label="Filter by role">
    {ROLES.map(r=><button key={r} type="button" aria-pressed={role===r} className={`qs-filter${role===r?' on':''}`} onClick={()=>setRole(r)}>{r}</button>)}
    <span>16 heroes · two may share a class</span>
   </div>
   <div className="qs-grid realm-panel" role="radiogroup" aria-label="Heroes">
    {shown.map(h=>{const by=taken[h.id];return <button key={h.id} type="button" role="radio" aria-checked={h.id===hero.id} aria-disabled={by?true:undefined} aria-label={by?`${h.name}, ${h.subclass}, taken by ${by}`:`${h.name}, ${h.subclass}`} className={`realm-choice qs-tile${by?' taken':''}`} onClick={()=>{if(!by)pick(h.id);}}>
     <Portrait art={h.art} face={h.face} ratio={HERO_ART_RATIO} width={120} height={58} scale={1.33} eye={0.42}/>
     <span className={`qs-tile-name${h.id===hero.id?' realm-tint':''}`}><strong>{h.name}</strong><span>{by?`Taken · ${by}`:h.subclass}</span></span>
     {h.id===hero.id?<Diamond/>:null}
    </button>;})}
   </div>
  </div>
  <section className="qs-hero-stage" aria-live="polite">
   {stage}
   <div className="qs-hero-info">
    <h2>{hero.name}</h2><p className="realm-eyebrow">{hero.className} · {hero.subclass} · {hero.role}</p>
    <p className="qs-epithet">{hero.epithet}</p>{hero.intro?<p className="qs-intro">{hero.intro}</p>:null}
    <RealmButton small onClick={openSheet}>Read their story</RealmButton>
   </div>
  </section>
 </div>;
}

type SetOutProps={s:Saved;gm:GameMasterPreset;hero:HeroPreset;story:StoryBlueprint;art:string;thumb:string;update:(p:Partial<Saved>)=>void;advanced:boolean;setAdvanced:(v:boolean)=>void;mode:'solo'|'online'};
function SetOutStep({s,gm,hero,story,art,thumb,update,advanced,setAdvanced,mode}:SetOutProps){
 const seg=<T extends string>(label:string,value:T,items:readonly (readonly [T,string,string])[],set:(v:T)=>void)=><div className="qs-field">
  <span className="realm-eyebrow">{label}</span>
  <div className="qs-seg" role="radiogroup" aria-label={label}>{items.map(([id,name])=><button key={id} type="button" role="radio" aria-checked={value===id} className="realm-choice qs-seg-option" onClick={()=>set(id)}>{value===id?<CheckBadge/>:null}{name}</button>)}</div>
  <span className="qs-note">{items.find(i=>i[0]===value)?.[2]}</span></div>;
 return <div className="qs-setout">
  <div className="qs-setout-scene-wrap">
   <section className="qs-setout-scene" aria-label={`${gm.title} and ${hero.name} at the start of ${story.title}`}>
    <img className="qs-setout-bg" src={art} alt=""/>
    <span className="qs-setout-label">{story.title}</span>
    <span className="qs-setout-shadow" style={{left:'26%'}} aria-hidden="true"/><span className="qs-setout-shadow" style={{left:'68%'}} aria-hidden="true"/>
    <img className="qs-setout-gm" src={gm.art} alt=""/><img className="qs-setout-hero" src={hero.art} alt=""/>
   </section>
   <div className="qs-line realm-panel"><Portrait art={gm.art} face={gm.face} ratio={GAME_MASTER_ART_RATIO} width={44} height={44} scale={2.4} eye={0.4}/><p><span className="realm-eyebrow">{gm.title}</span>“{gm.lines.setOut}”</p></div>
  </div>
  <section className="qs-summary realm-panel" aria-label="Your quest">
   <div className="qs-summary-rows">
    <div className="qs-summary-row"><Portrait art={gm.art} face={gm.face} ratio={GAME_MASTER_ART_RATIO} width={44} height={44} scale={2.4} eye={0.4}/><div><span className="realm-eyebrow">Game Master</span><strong>{gm.title}</strong><span>{gm.mood}</span></div></div>
    <div className="qs-summary-row"><img src={thumb} alt="" className="qs-summary-thumb"/><div><span className="realm-eyebrow">Tale</span><strong>{story.title}</strong><span>{story.world}</span></div></div>
    <div className="qs-summary-row"><Portrait art={hero.art} face={hero.face} ratio={HERO_ART_RATIO} width={44} height={44} scale={1.6}/><div><span className="realm-eyebrow">Hero</span><strong>{hero.name}</strong><span>{hero.className} · {hero.subclass}</span></div></div>
   </div>
   {seg('Length',s.length,LENGTHS,v=>update({length:v}))}
   {seg('Rules',s.rules,RULES,v=>update({rules:v}))}
   <button type="button" className="qs-link" aria-expanded={advanced} onClick={()=>setAdvanced(!advanced)}>Advanced options</button>
   {advanced?<div className="qs-advanced">
    <label>World seed<input value={s.seed} maxLength={48} onChange={e=>update({seed:e.target.value})}/></label>
    {mode==='solo'?<label>Companions<select value={s.companions} onChange={e=>update({companions:Number(e.target.value)})}>{[0,1,2,3].map(n=><option key={n} value={n}>{n===0?'None':n===1?'1 companion':`${n} companions`}</option>)}</select></label>:null}
   </div>:null}
  </section>
 </div>;
}
