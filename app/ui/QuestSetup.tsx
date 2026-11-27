'use client';
import {playSound} from './sound/engine';
import {useEffect,useRef,useState} from 'react';
import {DEFAULT_OPTIONS} from '../../game/types';
import type {GameOptions,HeroClass} from '../../game/types';
import {GAME_MASTERS,TALES,HEROES,HERO_ART_RATIO,GAME_MASTER_ART_RATIO,SCENE_FOR_BIOME,SETTING} from '../../game/presets';
import {settingLine} from '../../game/lore';
import type {GameMasterPreset,HeroPreset,Role} from '../../game/presets';
import {narratorTone,parseStory} from '../../game/creation';
import type {StoryBlueprint} from '../../game/creation';
import {useCreation} from './useCreation';
import {useAIPreference} from './ai-preferences';
import {RealmButton,RealmTools,QuestSteps,Portrait,Diamond,CheckBadge} from './RealmKit';
import TaleConversation from './TaleConversation';
import {DRAWN_GM_FACE,customGameMasterArt} from './game-master-figure';
import {CUSTOM_FACE,customHeroArt} from './hero-figure';
import {usePaintedFigure,type PaintedFigure} from './painted-portrait';
import PaintPanel from './PaintPanel';
import OwnHeroBuilder,{ownHeroPreset,stagePlacement} from './OwnHeroBuilder';
import {OWN_HERO_DEFAULT,ownHero,parseOwnHeroInput,type OwnHeroInput} from '../../game/own-hero';
import {OWN_ACCESSORIES,OWN_DEFAULT,OWN_FORMS,OWN_NAME_IDEAS,OWN_TONES,ownGameMaster,ownNameTaken,ownVoice,parseOwnInput,type OwnGameMasterInput} from '../../game/own-game-master';
import './quest-setup.css';

type Props={mode:'solo'|'online';onBack:()=>void;onStart:(name:string,cls:HeroClass,options:GameOptions,code:string,heroId?:string)=>unknown;busy:boolean;quick?:boolean;onAISettings?:()=>void};
type Saved={v:1;step:number;gm:string;own:OwnGameMasterInput;tale:string;custom:StoryBlueprint|null;hero:string;ownHero:OwnHeroInput;length:'short'|'standard'|'long';rules:'simple'|'classic';seed:string;companions:number};
const ROLES:('All'|Role)[]=['All','Tank','Damage','Support','Control'];
const LENGTHS=[['short','Short','1 chapter · about 30 minutes'],['standard','Standard','3 chapters · about 90 minutes'],['long','Long','5 chapters · an evening or two']] as const;
const RULES=[['simple','Streamlined','Hits are reliable and recovery is forgiving.'],['classic','Classic','Adds initiative, armour checks and death saves.']] as const;
const Arrow=()=><svg width="9" height="14" viewBox="0 0 9 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 1l6 6-6 6"/></svg>;
const BackArrow=()=><svg width="9" height="14" viewBox="0 0 9 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 1L1 7l6 6"/></svg>;
const fresh=():Saved=>({v:1,step:0,gm:'wanderer',own:OWN_DEFAULT,tale:'lantern',custom:null,hero:'corin',ownHero:OWN_HERO_DEFAULT,length:'standard',rules:'simple',seed:'quest-'+crypto.randomUUID().slice(0,8),companions:DEFAULT_OPTIONS.companions});

/** Where the hero stands on the stage art (600 × 560): boots at y 485, figure 380 high. Mira is placed so Ash fits too. */

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
   if(raw?.v===1&&(GAME_MASTERS.some(g=>g.id===raw.gm)||raw.gm==='own')&&(HEROES.some(h=>h.id===raw.hero)||raw.hero==='own')){
    const custom=raw.custom?parseStory(raw.custom):null;
    next={...next,...raw,own:parseOwnInput(raw.own),ownHero:parseOwnHeroInput(raw.ownHero),custom,tale:raw.tale==='custom'&&!custom?'lantern':raw.tale,step:Math.max(0,Math.min(3,Number(raw.step)||0))};
   }}catch{/* Setup works without storage. */}
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setS(next);setReady(true);
 },[key,quick]);
 useEffect(()=>{if(!ready||quick)return;try{localStorage.setItem(key,JSON.stringify(s));}catch{/* Storage is optional. */}},[ready,quick,key,s]);
 useEffect(()=>{heading.current?.focus({preventScroll:true});},[s.step,sheet,talking]);

 const ownProfile=ownGameMaster(s.own);
 const painted=usePaintedFigure(s.own.portrait);
 const gm=s.gm==='own'?ownPreset(s.own,ownProfile,painted):GAME_MASTERS.find(g=>g.id===s.gm)??GAME_MASTERS[0];
 const ownHeroProfile=ownHero(s.ownHero),paintedHero=usePaintedFigure(s.ownHero.portrait,'hero');
 const hero=s.hero==='own'?ownHeroPreset(s.ownHero,ownHeroProfile,paintedHero):HEROES.find(h=>h.id===s.hero)??HEROES[0];
 const heroReady=s.hero!=='own'||!!ownHeroProfile;
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
  if(busy||(s.gm==='own'&&!ownProfile)||!heroReady)return;
  const options:GameOptions={...DEFAULT_OPTIONS,rules:s.rules,seed:s.seed.trim()||fresh().seed,duration:s.length,companions:s.companions,aiEnabled:savedAI,
   narrator:narratorTone(gm.profile),biome:story.biome,narratorPrompt:[gm.profile.persona,...gm.profile.speakingStyle].join('. ').slice(0,400),characterPrompt:hero.profile.background,
   creation:{narrator:gm.profile,story,hero:hero.profile}};
  playSound('ui-confirm');
  void onStart(hero.profile.name,hero.profile.heroClass,options,'',hero.id==='own'?undefined:hero.id);
 }

 // Talking a tale through with the Game Master replaces the Tale step until the player keeps a tale or goes back.
 if(ready&&talking&&s.step===1)return <TaleConversation gm={gm} initialIdea={idea} initialStory={s.tale==='custom'?s.custom:null} onAISettings={onAISettings}
  onKeep={made=>{update({custom:made,tale:'custom'});setTalking(false);}} onBack={()=>setTalking(false)}/>;

 const title=['Who will tell your tale?','Which tale shall I tell?',sheet?hero.name:'Who will you be?','Ready to set out?'][s.step];
 const back=()=>sheet?setSheet(false):s.step===0?onBack():go(s.step-1);
 const forward=s.step===0?<RealmButton variant="primary" minWidth={190} disabled={s.gm==='own'&&!ownProfile} onClick={()=>go(1)}>{s.gm==='own'&&!ownProfile?'Name them first':'Continue'}<Arrow/></RealmButton>
  :s.step===1?<RealmButton variant="primary" minWidth={190} onClick={()=>go(2)}>Continue<Arrow/></RealmButton>
  :s.step===2?<RealmButton variant="primary" minWidth={220} disabled={!heroReady} onClick={()=>go(3)}>{heroReady?<>Play as {hero.short}</>:'Name them first'}<Arrow/></RealmButton>
  :<RealmButton variant="primary" minWidth={240} disabled={busy} onClick={begin}>{busy?'Preparing…':mode==='online'?'Gather the Party':'Begin Adventure'}<Arrow/></RealmButton>;

 return <main className="realm qs" aria-labelledby="qs-title">
  <header className="qs-top">
   <h1 id="qs-title" ref={heading} tabIndex={-1}>{title}</h1>
   <div className="qs-top-end"><RealmTools/><QuestSteps current={s.step}/></div>
  </header>
  {!ready?null:s.step===0?<GameMasterStep gm={gm} pick={id=>update({gm:id})} own={s.own} setOwn={own=>update({own})} ownReady={!!ownProfile}/>
   :s.step===1?<TaleStep s={s} gm={gm} story={story} art={taleArt.scene} pick={id=>update({tale:id})} idea={idea} setIdea={setIdea} shape={shape} tellAnother={tellAnother} pending={creation.pending} error={creation.error} onCreateWithNarrator={()=>setTalking(true)}/>
   :s.step===2?<HeroStep hero={hero} role={role} setRole={setRole} pick={id=>update({hero:id})} sheet={sheet} openSheet={()=>setSheet(true)} sealed={s.gm!=='own'&&s.hero!=='own'} own={{input:s.ownHero,set:ownHero=>update({ownHero})}}/>
   :<SetOutStep s={s} gm={gm} hero={hero} story={story} art={taleArt.scene} thumb={taleArt.thumb} update={update} advanced={advanced} setAdvanced={setAdvanced} mode={mode}/>}
  <footer className="qs-footer">
   <RealmButton onClick={back}><BackArrow/>{sheet?'Back to heroes':'Back'}</RealmButton>
   {forward}
  </footer>
 </main>;
}

/** Your own Game Master, shaped like a built-in one so every setup screen can show them. They keep no sealed notes. */
function ownPreset(own:OwnGameMasterInput,profile:ReturnType<typeof ownGameMaster>,painted?:PaintedFigure):GameMasterPreset{
 const tone=OWN_TONES.find(t=>t.id===own.tone)??OWN_TONES[0],name=profile?.name??(own.name.trim()||'Your own');
 const lines={hopeful:{tale:'Every road keeps a light somewhere. Pick a tale, or tell me yours.',setOut:'Good company and a long road. I could not ask for more.'},
  wry:{tale:'Three tales, all of them trouble. Pick the one you can survive.',setOut:'Bring a light and low expectations. We will be fine. Probably.'},
  grave:{tale:'Every tale here has a cost. Choose the one you are willing to pay.',setOut:'The road is listening. Walk it as if every step will be remembered.'}}[tone.id];
 return {id:'own' as GameMasterPreset['id'],title:name,realName:'Your own Game Master',mood:tone.label,tone:tone.tells,style:profile?profile.speakingStyle.join(' · '):tone.label,
  excerpt:profile?.persona??'',quote:tone.sample,art:painted?.art??ownArt(own,name),scene:'/art/scenes/camp.svg',face:painted?.face??DRAWN_GM_FACE,lines,
  profile:profile??{name,persona:'',personality:['Warm'],speakingStyle:['Hopeful'],appearance:['Owl'],model:'cleric',color:own.color,avatar:{form:own.form,accessory:own.accessory}}};
}
/** Your own Game Master's drawing (app/ui/game-master-figure.ts): their shape, colour and what they wear, carrying what their tone carries. */
const ownArt=(own:OwnGameMasterInput,name:string)=>customGameMasterArt({name,form:own.form,accessory:own.accessory,color:own.color,voice:ownVoice(own.tone)});
/** A Game Master's face, cropped from their full figure. */
function GmFace({gm,size=44}:{gm:GameMasterPreset;size?:number}){
 return <Portrait art={gm.art} face={gm.face} ratio={GAME_MASTER_ART_RATIO} width={size} height={size} scale={2.4} eye={0.4}/>;
}

function GameMasterStep({gm,pick,own,setOwn,ownReady}:{gm:GameMasterPreset;pick:(id:string)=>void;own:OwnGameMasterInput;setOwn:(own:OwnGameMasterInput)=>void;ownReady:boolean}){
 // A new shape, colour, accessory or tone makes an earlier painting out of date, so it is cleared.
 const mine=gm.id===('own' as GameMasterPreset['id']),set=(patch:Partial<OwnGameMasterInput>)=>setOwn({...own,...patch,...(['form','color','accessory','tone'].some(k=>k in patch)?{portrait:undefined}:{})}),tone=OWN_TONES.find(t=>t.id===own.tone)!;
 // The drawing follows the name, so it settles a moment after typing stops instead of changing with every letter.
 const [drawnName,setDrawnName]=useState(gm.title);
 useEffect(()=>{const t=window.setTimeout(()=>setDrawnName(gm.title),450);return()=>window.clearTimeout(t)},[gm.title]);
 const drawing=ownArt(own,drawnName),painted=usePaintedFigure(own.portrait),figure=painted?.art??drawing,face=painted?.face??DRAWN_GM_FACE;
 // On a phone the cards sit below the preview: choosing your own Game Master brings its builder into view.
 const builder=useRef<HTMLElement>(null),wasMine=useRef(mine);
 useEffect(()=>{if(mine&&!wasMine.current&&window.matchMedia('(max-width:900px)').matches)builder.current?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});wasMine.current=mine},[mine]);
 return <div className="qs-gm">
  <div className="qs-gm-cards" role="radiogroup" aria-label="Game Masters">
   {GAME_MASTERS.map(g=><button key={g.id} type="button" role="radio" aria-checked={g.id===gm.id} data-tooltip="none" className="realm-choice qs-gm-card" onClick={()=>pick(g.id)}>
    <Portrait art={g.art} face={g.face} ratio={GAME_MASTER_ART_RATIO} width={84} height={104} scale={2.1}/>
    <span className={`qs-gm-card-text${g.id===gm.id?' realm-tint':''}`}><strong>{g.title}</strong><span>{g.mood}</span><span>{g.tone}</span></span>
    {g.id===gm.id?<Diamond/>:null}
   </button>)}
   <button type="button" role="radio" aria-checked={mine} data-tooltip="none" className="realm-choice qs-gm-card qs-gm-card-own" onClick={()=>pick('own')}>
    <Portrait art={figure} face={face} ratio={GAME_MASTER_ART_RATIO} width={84} height={104} scale={2.1}/>
    <span className={`qs-gm-card-text${mine?' realm-tint':''}`}><strong>{mine&&ownReady?gm.title:'Your own'}</strong><span>{mine&&ownReady?'Your own Game Master':'Name them'}</span><span>{tone.tells}</span></span>
    {mine?<Diamond/>:null}
   </button>
  </div>
  {mine?<section ref={builder} className="qs-gm-preview qs-own" aria-label="Your own Game Master" style={{['--own-colour' as string]:own.color}}>
   <div className="qs-gm-stage">
    <img className="qs-gm-scene" src="/art/scenes/camp.svg" alt=""/>
    <span className="qs-own-shadow" aria-hidden="true"/>
    <img className="qs-own-figure" src={figure} alt={`${gm.title}, full figure`}/>
    <p className="qs-own-sample" aria-live="polite"><span className="realm-eyebrow">{ownReady?gm.title:'They say'}</span>“{tone.sample}”</p>
   </div>
   <div className="qs-own-form">
    <label className="qs-own-name"><span className="realm-eyebrow">Their name</span>
     <input name="own-name" value={own.name} maxLength={28} placeholder="The Lamplighter" autoComplete="off" spellCheck={false} onChange={e=>set({name:e.target.value})}/></label>
    {ownNameTaken(own.name)?<p className="qs-own-taken" role="status">That name belongs to one of the Game Masters above. Choose another.</p>:null}
    {!own.name.trim()?<p className="qs-own-ideas"><span>Or borrow one:</span>{OWN_NAME_IDEAS.slice(0,4).map(n=><button key={n} type="button" className="qs-own-chip" onClick={()=>set({name:n})}>{n}</button>)}</p>:null}
    <label className="qs-own-who"><span className="realm-eyebrow">Who are they?</span>
     <textarea name="own-who" value={own.who} maxLength={200} rows={2} placeholder="A retired lighthouse keeper who still counts the ships that never came home." onChange={e=>set({who:e.target.value})}/></label>
    <fieldset className="qs-own-set"><legend className="realm-eyebrow">How they tell it</legend>
     <div className="qs-own-tones" role="radiogroup" aria-label="How they tell it">{OWN_TONES.map(t=><button key={t.id} type="button" role="radio" aria-checked={own.tone===t.id} className="realm-choice qs-own-tone" onClick={()=>set({tone:t.id})}>{own.tone===t.id?<CheckBadge/>:null}<strong>{t.label}</strong><span>{t.tells}</span></button>)}</div>
    </fieldset>
    <fieldset className="qs-own-set"><legend className="realm-eyebrow">Their shape</legend>
     <div className="qs-own-forms" role="radiogroup" aria-label="Their shape">{OWN_FORMS.map(f=><button key={f.id} type="button" role="radio" aria-checked={own.form===f.id} aria-label={f.label} data-tooltip={f.label} className="realm-choice qs-own-form-pick" onClick={()=>set({form:f.id})}>
      <Portrait art={ownArt({...own,form:f.id},drawnName)} face={DRAWN_GM_FACE} ratio={GAME_MASTER_ART_RATIO} width={46} height={46} scale={2.4} eye={0.4}/><span>{f.label}</span></button>)}</div>
    </fieldset>
    <div className="qs-own-row">
     <fieldset className="qs-own-set"><legend className="realm-eyebrow">They wear</legend>
      <div className="qs-own-chips" role="radiogroup" aria-label="They wear">{OWN_ACCESSORIES.map(a=><button key={a.id} type="button" role="radio" aria-checked={own.accessory===a.id} className="qs-own-chip" onClick={()=>set({accessory:a.id})}>{a.label}</button>)}</div>
     </fieldset>
     <fieldset className="qs-own-set"><legend className="realm-eyebrow">Their colour</legend>
      <div className="qs-own-swatches" role="radiogroup" aria-label="Their colour">{['#ef997c','#a3bbf0','#edcf75','#b19bd3','#8ac4ae','#f0a6b2','#87bdcf','#cbad81','#b2c877','#a4a4bf'].map(c=><button key={c} type="button" role="radio" aria-checked={own.color===c} aria-label={`Colour ${c}`} data-tooltip="Their colour" className="qs-own-swatch" style={{background:c}} onClick={()=>set({color:c})}/>)}</div>
     </fieldset>
    </div>
    <PaintPanel key={`${own.form}|${own.color}|${own.accessory}|${own.tone}`} kind="gm" fields={{form:own.form,accessory:own.accessory,color:own.color,tone:own.tone}} name={ownReady?gm.title:''} portrait={own.portrait} drawing={drawing} setPortrait={portrait=>setOwn({...own,portrait})} placeholder="A few words: a one-eyed sailor with a parrot"/>
    <p className="qs-own-note">Your own Game Master tells any tale in the Lantern Marches. Sealed notes belong to the three Game Masters above, so heroes keep none with yours.</p>
   </div>
  </section>:<section className="qs-gm-preview" aria-label={`${gm.title}, ${gm.realName}`}>
   <div className="qs-gm-stage">
    {GAME_MASTERS.map(g=><img key={g.id} className="realm-fade qs-gm-scene" src={g.scene} alt="" style={{opacity:g.id===gm.id?1:0}}/>)}
    <span className="qs-gm-shadow" aria-hidden="true"/>
    {GAME_MASTERS.map(g=><img key={g.id} className="realm-fade qs-gm-figure" src={g.art} alt={g.id===gm.id?`${g.title}, full figure`:''} aria-hidden={g.id!==gm.id} style={{opacity:g.id===gm.id?1:0}}/>)}
   </div>
   <div className="qs-gm-text" aria-live="polite">
    <h2>{gm.title}</h2><p className="qs-gm-name">{gm.realName}</p><p className="realm-eyebrow">{gm.style}</p>
    <p className="qs-gm-excerpt">{gm.excerpt}</p><p className="qs-quote">“{gm.quote}”</p>
   </div>
  </section>}
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
    <div className="qs-tale-title"><h2>{story.title}</h2><span>{preset?`${SETTING} · ${preset.region} · ${preset.chapters} chapters`:story.world}</span></div>
    <p>{story.synopsis}</p>
   </div>
  </section>
  <div className="qs-tale-side">
   <div className="qs-tale-list" role="radiogroup" aria-label="Tales">
    {rows.map(r=><button key={r.id} type="button" role="radio" aria-checked={s.tale===r.id} data-tooltip="none" className="realm-choice qs-row" onClick={()=>pick(r.id)}>
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
   <div className="qs-line realm-panel"><GmFace gm={gm}/><p><span className="realm-eyebrow">{gm.title}</span>“{gm.lines.tale}”</p></div>
   <RealmButton small onClick={tellAnother}>Tell me another</RealmButton>
  </div>
 </div>;
}

/** The roster and the hero's stage. Also used when joining a party, where heroes already at the fire are marked taken. */
export function HeroStep({hero,role,setRole,pick,sheet,openSheet,taken={},sealed=true,own}:{hero:HeroPreset;role:'All'|Role;setRole:(r:'All'|Role)=>void;pick:(id:string)=>void;sheet:boolean;openSheet:()=>void;taken?:Record<string,string>;sealed?:boolean;
 /** Offers "Your own" after the roster (quest setup only). */ own?:{input:OwnHeroInput;set:(own:OwnHeroInput)=>void}}){
 const mine=hero.id==='own';
 const wide=hero.id==='mira';
 const stage=<div className="qs-stage" aria-label={`${hero.name}, ${hero.className} ${hero.subclass}`} role="img">
  <img className="realm-fade qs-stage-set" src="/art/scenes/hero-stage.svg" alt="" style={{opacity:wide?0:1}}/>
  <img className="realm-fade qs-stage-set" src="/art/scenes/hero-stage-wide.svg" alt="" style={{opacity:wide?1:0}}/>
  {HEROES.map(h=><span key={h.id} className="realm-fade qs-stage-figure" style={{...stagePlacement(h),opacity:h.id===hero.id?1:0}} aria-hidden="true">
   <span className="qs-stage-shadow" style={h.id==='mira'?{left:'14%',width:'26%'}:undefined}/>{h.id==='mira'?<span className="qs-stage-shadow" style={{left:'48%',width:'34%'}}/>:null}
   <img src={h.art} alt=""/></span>)}
 </div>;
 if(sheet)return <div className="qs-hero qs-sheet">
  {stage}
  <section className="qs-sheet-page" aria-label={`${hero.name}'s story`}>
   <p className="realm-eyebrow">{hero.className} · {hero.subclass} · {hero.role}</p>
   <p className="qs-epithet">{hero.epithet}</p>
   <div className="qs-sheet-body">
    <div className="qs-parchment"><p>{hero.story}</p></div>
    <dl className="qs-facts realm-panel">
     <div><dt className="realm-eyebrow">Class</dt><dd>{hero.className}</dd></div>
     <div><dt className="realm-eyebrow">Subclass</dt><dd>{hero.subclass}</dd></div>
     <div><dt className="realm-eyebrow">Role</dt><dd>{hero.role}</dd></div>
     <div><dt className="realm-eyebrow">Manner</dt><dd>{hero.profile.personality.join(', ')}</dd></div>
    </dl>
   </div>
   {sealed?<div className="qs-sealed"><p className="qs-sealed-kicker">Sealed note</p><p className="qs-sealed-title">Your secret with the Game Master</p><p>Only you see it, once the quest begins.</p><span className="qs-seal" aria-hidden="true"/></div>:null}
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
    {own?<button type="button" role="radio" aria-checked={mine} aria-label="Your own hero" className="realm-choice qs-tile qs-tile-own" onClick={()=>pick('own')}>
     <Portrait art={mine?hero.art:customHeroArt({name:own.input.name||'Your own',heroClass:own.input.heroClass,color:own.input.color})} face={mine?hero.face:CUSTOM_FACE} ratio={HERO_ART_RATIO} width={120} height={58} scale={1.33} eye={0.42}/>
     <span className={`qs-tile-name${mine?' realm-tint':''}`}><strong>{mine&&own.input.name.trim()?hero.name:'Your own'}</strong><span>{mine?hero.className:'Make a hero'}</span></span>
     {mine?<Diamond/>:null}
    </button>:null}
   </div>
  </div>
  {mine&&own?<OwnHeroBuilder hero={hero} own={own.input} setOwn={own.set}/>:<section className="qs-hero-stage" aria-live="polite">
   {stage}
   <div className="qs-hero-info">
    <h2>{hero.name}</h2><p className="realm-eyebrow">{hero.className} · {hero.subclass} · {hero.role}</p>
    <p className="qs-epithet">{hero.epithet}</p>{hero.intro?<p className="qs-intro">{hero.intro}</p>:null}
    <RealmButton small onClick={openSheet}>Read their story</RealmButton>
   </div>
  </section>}
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
   <div className="qs-line realm-panel"><GmFace gm={gm}/><p><span className="realm-eyebrow">{gm.title}</span>“{gm.lines.setOut}”</p></div>
  </div>
  <section className="qs-summary realm-panel" aria-label="Your quest">
   <div className="qs-summary-rows">
    <div className="qs-summary-row"><GmFace gm={gm}/><div><span className="realm-eyebrow">Game Master</span><strong>{gm.title}</strong><span>{gm.mood}</span></div></div>
    <div className="qs-summary-row"><img src={thumb} alt="" className="qs-summary-thumb"/><div><span className="realm-eyebrow">Tale</span><strong>{story.title}</strong><span>{settingLine(story)}</span></div></div>
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
