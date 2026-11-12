'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Check,ChevronDown,Mic,MicOff,PhoneOff,Send,Sparkles,Undo2,Volume2,VolumeX} from 'lucide-react';
import {CLASS_INFO,DEFAULT_OPTIONS,HERO_COLORS} from '../../game/types';
import type {GameOptions,HeroClass} from '../../game/types';
import {AETHER,NARRATOR_FORMS,NARRATOR_ACCESSORIES,NARRATOR_VOICES,narratorTone,parseBlueprint,parseHero,parseNarrator,parseStory} from '../../game/creation';
import type {CreationAction,CreatorFocus,CreatorProposal,HeroProfile,NarratorProfile,StoryBlueprint,TraitCategory,TraitSelection} from '../../game/creation';
import {applyCreatorProposal,editCreatorDraft,emptyCreatorDraft} from '../../game/creator-state';
import type {CreatorDraft} from '../../game/creator-state';
import {HeroArt} from './Art';
import {adoptLegacyAIUnlock,readAIPreference,useAIPreference} from './ai-preferences';
import {useCreation} from './useCreation';
import {useLiveNarrator} from './useLiveNarrator';
import {TraitPicker} from './CreatorControls';
import type {ConversationLine} from './CreatorControls';
import CreationScene from './CreationScene';
import LiveTranscript from './LiveTranscript';
import {creatorPalette} from './creator-palette';
import './adventure-creator.css';

type Props={mode:'solo'|'online';onBack:()=>void;onStart:(name:string,cls:HeroClass,options:GameOptions,code:string)=>void;busy:boolean;onNavigationBlockChange?:(blocked:boolean)=>void;onAISettings?:()=>void};
type Access={passwordRequired?:boolean;available:boolean;unlocked:boolean;audioAvailable:boolean};
const INITIAL_MESSAGE='A place, a feeling, a wonderfully strange idea. I’m listening.';
const VOICE_NAMES:Record<string,string>={vesper:'Vesper · British',willow:'Willow · Irish',stone:'Stone · Irish',marin:'Marin',cedar:'Cedar',gleam:'Gleam',meridian:'Meridian'};
const newDraft=():CreatorDraft=>({...emptyCreatorDraft(),narrator:structuredClone(AETHER)});
const heroSeed=(world:string):HeroProfile=>({name:'Wren',heroClass:'ranger',color:HERO_COLORS[4],personality:['Curious'],background:'A wanderer from '+world+', following an impossible promise.'});
const cap=(s:string)=>s.charAt(0).toUpperCase()+s.slice(1);

export default function AdventureCreator({mode,onBack,onStart,busy,onNavigationBlockChange,onAISettings}:Props){
 const [stage,setStage]=useState(0),[focus,setFocus]=useState<CreatorFocus>('story');
 const [draft,setDraft]=useState<CreatorDraft>(newDraft),draftRef=useRef(draft);
 const [confirmed,setConfirmed]=useState<NarratorProfile>(structuredClone(AETHER)),[speaker,setSpeaker]=useState<'guide'|'narrator'>('guide');
 const [proposal,setProposal]=useState<CreatorProposal|null>(null),[undo,setUndo]=useState<{draft:CreatorDraft;confirmed:NarratorProfile;speaker:'guide'|'narrator'}|null>(null);
 const [prompt,setPrompt]=useState(''),[message,setMessage]=useState(''),[lines,setLines]=useState<(ConversationLine&{name?:string})[]>([]);
 const [asideText,setAsideText]=useState(INITIAL_MESSAGE),[heroes,setHeroes]=useState<HeroProfile[]>([]);
 const [options,setOptions]=useState<GameOptions>(()=>({...DEFAULT_OPTIONS,duration:'standard',seed:'quest-'+crypto.randomUUID().slice(0,8)}));
 const [savedAI]=useAIPreference(),[overrideAI,setOverrideAI]=useState<boolean|null>(null),[access,setAccess]=useState<Access|null>(null);
 const [accessResolved,setAccessResolved]=useState(false),[accessError,setAccessError]=useState('');
 const [source,setSource]=useState<'fixture'|'openai'>('fixture'),[ready,setReady]=useState(false),[scope,setScope]=useState(()=>crypto.randomUUID());
 const [restored,setRestored]=useState(false),[stored,setStored]=useState(false);
 const messageInput=useRef<HTMLTextAreaElement>(null),heading=useRef<HTMLHeadingElement>(null),requestRef=useRef<(text:string)=>Promise<{reply:string}|null>>(async()=>null);
 const creation=useCreation(scope),enabled=overrideAI??savedAI,storageKey='painted-realms-creator-v2-'+mode;
 const currentNarrator=draft.narrator??AETHER,narrator=proposal?.narrator??currentNarrator,story=proposal?.story??draft.story,hero=proposal?.hero??draft.hero;
 const activeNarrator=speaker==='guide'?AETHER:confirmed;
 const context=JSON.stringify({focus:stage===1?'hero':focus,version:draft.version,narrator:{name:currentNarrator.name,traits:currentNarrator.personality,style:currentNarrator.speakingStyle,form:currentNarrator.avatar?.form},story:draft.story?{title:draft.story.title,synopsis:draft.story.synopsis.slice(0,500),world:draft.story.world}:null,hero:draft.hero?{name:draft.hero.name,class:draft.hero.heroClass,background:draft.hero.background}:null,confirmed:confirmed.name,recent:lines.slice(-2).map(l=>({role:l.role,text:l.text.slice(0,120)}))});
 const live=useLiveNarrator({enabled:enabled&&!!access?.unlocked&&!!access.audioAvailable,scope,narrator:activeNarrator,context,onRequest:text=>requestRef.current(text)});
 const narratorDirty=JSON.stringify(currentNarrator)!==JSON.stringify(confirmed);
 const pending=busy||creation.pending;
 const canRequest=ready&&(accessResolved||overrideAI===false);
 const voiceAvailable=enabled&&!!access?.unlocked&&!!access.audioAvailable;

 function install(next:CreatorDraft){draftRef.current=next;setDraft(next);}
 function remember(){setUndo({draft:structuredClone(draftRef.current),confirmed:structuredClone(confirmed),speaker});}
 function edit(changes:Partial<Omit<CreatorDraft,'version'>>){
  const next=editCreatorDraft(draftRef.current,changes);if(!next)return;
  creation.cancel();setProposal(null);install(next);
 }
 function editNarrator(patch:Partial<NarratorProfile>){edit({narrator:{...narrator,...patch}});}
 function editStory(patch:Partial<StoryBlueprint>){if(story){setHeroes([]);edit({story:{...story,...patch}});}}
 function editHero(patch:Partial<HeroProfile>){if(hero)edit({hero:{...hero,...patch}});}
 function say(text:string,aloud=false){setAsideText(text);if(aloud&&!live.speakerMuted)void live.speak(text);}

 useEffect(()=>{
  try{
   const raw=JSON.parse(localStorage.getItem(storageKey)??'null');
   if(raw?.v===2&&raw.draft&&Number.isSafeInteger(raw.draft.version)&&raw.draft.version>=0&&raw.draft.version<1_000_000){
    const restoredDraft=editCreatorDraft({...emptyCreatorDraft(),version:raw.draft.version},{narrator:raw.draft.narrator,story:raw.draft.story,hero:raw.draft.hero});
    if(restoredDraft){
     install(restoredDraft);const chosen=parseNarrator(raw.confirmed);if(chosen)setConfirmed(chosen);
     setSpeaker(raw.speaker==='narrator'?'narrator':'guide');setFocus(raw.focus==='narrator'?'narrator':'story');
     setPrompt(typeof raw.prompt==='string'?raw.prompt.slice(0,400):'');setMessage(typeof raw.message==='string'?raw.message.slice(0,400):'');
     if(typeof raw.scope==='string'&&/^[-a-zA-Z0-9]{1,64}$/.test(raw.scope))setScope(raw.scope);
     // Only new explicit choices survive reload; old defaults must not mask an unlock.
     if(raw.aiPreferenceRevision===2&&raw.aiDefault===readAIPreference()&&typeof raw.overrideAI==='boolean')setOverrideAI(raw.overrideAI);
     if(Array.isArray(raw.heroes)){const valid=raw.heroes.slice(0,3).map((h:unknown)=>parseHero(h)).filter(Boolean);setHeroes(valid);}
     if(Array.isArray(raw.lines))setLines(raw.lines.filter((l:ConversationLine)=>l&&(l.role==='player'||l.role==='narrator')&&typeof l.text==='string'&&l.text.length<=400).slice(-12));
     if(parseStory(restoredDraft.story)&&(raw.stage===1||raw.stage===2))setStage(raw.stage===2&&parseHero(restoredDraft.hero)?2:1);
     if(raw.options&&typeof raw.options==='object'){
      const saved=raw.options;setOptions(current=>({...current,...(['short','standard','long'].includes(saved.duration)?{duration:saved.duration}:{}),...(['simple','classic'].includes(saved.rules)?{rules:saved.rules}:{}),...(Number.isInteger(saved.companions)&&saved.companions>=0&&saved.companions<=3?{companions:saved.companions}:{}),...(typeof saved.seed==='string'&&saved.seed.length<=64?{seed:saved.seed}:{})}));
     }
     setRestored(true);setAsideText('Your world is still here. We can pick up wherever you like.');
    }
   }
  }catch{/* Creation works when storage is unavailable. */}
  setReady(true);
 },[storageKey]);
 useEffect(()=>{
  if(!ready)return;
  try{localStorage.setItem(storageKey,JSON.stringify({v:2,draft,confirmed,speaker,focus,prompt,message,scope,stage,heroes,options,overrideAI,aiPreferenceRevision:2,aiDefault:savedAI,lines}));setStored(true);}catch{setStored(false);}
 },[ready,storageKey,draft,confirmed,speaker,focus,prompt,message,scope,stage,heroes,options,overrideAI,savedAI,lines]);
 useEffect(()=>{onNavigationBlockChange?.(creation.pending);return()=>onNavigationBlockChange?.(false);},[creation.pending,onNavigationBlockChange]);
 useEffect(()=>{
  const controller=new AbortController();
  async function refresh(){try{const response=await fetch('/api/ai/access',{cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error();const result=await response.json() as Access;if(typeof result.unlocked!=='boolean')throw new Error();adoptLegacyAIUnlock(result.unlocked);setAccess(result);setAccessResolved(true);setAccessError('');}catch{if(!controller.signal.aborted){setAccessError('Could not check AI access. Retry, or choose offline mode.');setAccessResolved(false);}}}
  const accessChanged=()=>{setOverrideAI(null);void refresh();};
  void refresh();window.addEventListener('focus',refresh);window.addEventListener('painted-realms-ai-access',accessChanged);
  return()=>{controller.abort();window.removeEventListener('focus',refresh);window.removeEventListener('painted-realms-ai-access',accessChanged);};
 },[]);
 useEffect(()=>{if(stage)heading.current?.focus();},[stage]);
 useEffect(()=>{if(!enabled)live.disconnect();},[enabled]); // A disabled per-quest AI setting also closes its live call.

 async function request(action:CreationAction,text='',extra:Record<string,unknown>={}){
  if(!canRequest){creation.setError(accessError||'Checking AI access. Your message is still here.');return null;}
  const current=draftRef.current;
  const traits:TraitSelection=stage===1?{personality:current.hero?.personality??[]}:{personality:current.narrator?.personality??[],speakingStyle:current.narrator?.speakingStyle??[],appearance:current.narrator?.appearance??[]};
  return creation.run({action,enabled,prompt,message:text,traits,focus:stage===1?'hero':focus,draftVersion:current.version,narrator:current.narrator??AETHER,guideNarrator:activeNarrator,...(current.story?{story:current.story}:{}),...(current.hero?{hero:current.hero}:{}),history:lines.slice(-6).map(({role,text})=>({role,text})),...extra});
 }
 async function converse(text:string,fromVoice=false){
  if(pending||!text.trim())return null;
  const version=draftRef.current.version,result=await request('guide',text.trim().slice(0,400));if(!result||draftRef.current.version!==version)return null;
  setSource(result.source);setLines(current=>[...current,{role:'player' as const,text:text.slice(0,400)},{role:'narrator' as const,text:result.reply,name:activeNarrator.name}].slice(-12));
  setProposal(result.guide?.proposal??null);say(result.reply,!fromVoice);
  if(result.guide?.proposal?.narrator)setFocus('narrator');else if(result.guide?.proposal?.story)setFocus('story');
  return {reply:result.reply};
 }
 requestRef.current=text=>converse(text,true);
 async function send(){const sent=message;if(await converse(sent)){setMessage(current=>current===sent?'':current);}}
 async function submitIdea(text:string){if(await converse(text))setPrompt(text);}
 async function validate(category:TraitCategory,value:string){return request('trait','',{category,value});}

 function confirmProposal(){
  if(!proposal)return;const next=applyCreatorProposal(draftRef.current,proposal);
  if(!next){setProposal(null);creation.setError('That suggestion belongs to an earlier draft. Ask again with your current choices.');return;}
  remember();install(next);
  if(proposal.narrator){setConfirmed(proposal.narrator);setSpeaker('narrator');}
  if(proposal.story)setHeroes([]);
  setProposal(null);say(proposal.narrator?'Meet '+proposal.narrator.name+'. Your narrator is ready.':'That is part of your story now. We can keep shaping it.',!proposal.narrator);
 }
 function confirmNarrator(){
  const chosen=parseNarrator(currentNarrator);if(!chosen){creation.setError('Add a name, persona, and at least one trait in each category.');return;}
  remember();edit({narrator:chosen});setConfirmed(chosen);setSpeaker('narrator');say('Meet '+chosen.name+'. Your narrator is ready.',false);
 }
 function restoreUndo(){
  if(!undo)return;creation.cancel();install({...undo.draft,version:draftRef.current.version+1});setConfirmed(undo.confirmed);setSpeaker(undo.speaker);setProposal(null);setUndo(null);say('Back to the previous version.');
 }
 function keepAether(){remember();edit({narrator:structuredClone(AETHER)});setConfirmed(structuredClone(AETHER));setSpeaker('guide');say('I will be here, from the first spark to the last page.');}
 async function continueToHero(){
  creation.setError('');
  if(proposal){creation.setError('Confirm or dismiss the suggestion before continuing.');return;}
  if(narratorDirty){setFocus('narrator');creation.setError('Confirm your narrator before continuing.');return;}
  if(!parseStory(draft.story)){setFocus('story');creation.setError('Create a story first, or ask your guide to surprise you.');return;}
  if(!heroes.length){const result=await request('heroes');if(!result)return;setHeroes(result.heroes??[]);setSource(result.source);say(result.reply);}
  setStage(1);
 }
 function toBegin(){if(proposal){creation.setError('Confirm or dismiss the suggestion first.');return;}if(!parseHero(draft.hero)){creation.setError('Choose a hero, or finish their name, background and personality.');return;}setStage(2);creation.setError('');}
 function start(){
  const blueprint=parseBlueprint({narrator:confirmed,story:draft.story,hero:draft.hero});if(!blueprint||narratorDirty||proposal){creation.setError('Finish your narrator, story and hero before beginning.');return;}
  if(!options.seed.trim()){creation.setError('Give your world a seed.');return;}
  live.disconnect();
  onStart(blueprint.hero.name,blueprint.hero.heroClass,{...options,aiEnabled:enabled,narrator:narratorTone(confirmed),biome:blueprint.story.biome,storyPrompt:prompt,narratorPrompt:[confirmed.persona,...confirmed.speakingStyle].join('. ').slice(0,400),characterPrompt:blueprint.hero.background,creation:blueprint},'');
 }
 function chooseFocus(next:CreatorFocus){creation.cancel();setFocus(next);setStage(0);creation.setError('');}
 function openChat(){messageInput.current?.scrollIntoView({block:'nearest'});messageInput.current?.focus({preventScroll:true});}
 function enableVoice(){live.setSpeakerMuted(!live.speakerMuted);if(live.speakerMuted)void live.speak(asideText);}
 const shownAvatar=proposal?.narrator??currentNarrator;
 const previewing=!!proposal?.narrator||narratorDirty;
 const displayAvatar=previewing?shownAvatar:activeNarrator;
 const palette=creatorPalette(shownAvatar);
 useLayoutEffect(()=>{
  const shell=document.querySelector<HTMLElement>('.app-root');if(!shell)return;
  shell.style.setProperty('--creation-color',palette.primary);shell.style.setProperty('--creation-secondary',palette.secondary);shell.dataset.creating='true';shell.dataset.creationNeutral=String(palette.neutral);
  return()=>{delete shell.dataset.creating;delete shell.dataset.creationNeutral;shell.style.removeProperty('--creation-color');shell.style.removeProperty('--creation-secondary');};
 },[palette.primary,palette.secondary,palette.neutral]);
 const liveActive=live.status==='connecting'||live.status==='listening'||live.status==='speaking';

 return <main className="living-creator" aria-label="Create an adventure">
  <div className="creator-workspace">
   <section className="creator-editor" aria-label={stage===0?'Story and narrator':stage===1?'Your hero':'Game settings'}>
  <header className="creator-heading"><button type="button" className="creator-back" aria-label="Back to adventures" disabled={pending} onClick={()=>{live.disconnect();onBack();}}><ArrowLeft size={20}/></button><h1>Create an adventure</h1>{restored?<span className="creator-saved">Draft restored</span>:null}</header>
  <nav className="creator-steps" aria-label="Adventure setup">
   {['Imagine','Your hero','Begin'].map((label,i)=><button key={label} type="button" aria-current={stage===i?'step':undefined} disabled={pending||i>stage} onClick={()=>{setStage(i);creation.setError('');}}>{i<stage?<Check size={14}/>:null}{label}</button>)}
  </nav>
    <div className="creator-conversation-area">
     <h2 ref={heading} tabIndex={-1}>{stage===0?'What shall we create?':stage===1?'Who will you become?':'One last look.'}</h2>
     <form className="creator-composer" onSubmit={e=>{e.preventDefault();void send();}}><label htmlFor="narrator-message" className="sr-only">Message your narrator</label><textarea ref={messageInput} id="narrator-message" rows={2} maxLength={400} value={message} onChange={e=>setMessage(e.target.value)} placeholder={stage===0?'Tell '+activeNarrator.name+' about a world, a narrator, or just say hello…':'Ask '+activeNarrator.name+'…'} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void send();}}}/><button type="submit" className="creator-send" disabled={pending||!canRequest||!message.trim()} aria-label="Send message"><Send size={18}/></button></form>
     {!lines.length&&stage===0?<div className="creator-suggestions"><button disabled={pending} onClick={()=>void submitIdea('A city above the clouds, where a dragon has vanished.')}>A world above the clouds</button><button disabled={pending} onClick={()=>void submitIdea('Surprise me with an imaginative D&D-style adventure.')}><Sparkles size={14}/>Surprise me</button></div>:null}
     {lines.length?<div className="creator-conversation-log" role="log" aria-label="Creation conversation" aria-live="polite">{lines.length>2?<details className="creator-history"><summary>Earlier messages<ChevronDown size={14}/></summary>{lines.slice(0,-2).map((line,i)=><p key={i} data-speaker={line.role}><strong>{line.role==='player'?'You':line.name??activeNarrator.name}</strong>{line.text}</p>)}</details>:null}{lines.slice(-2).map((line,i)=><p key={i} data-speaker={line.role}><strong>{line.role==='player'?'You':line.name??activeNarrator.name}</strong>{line.text}</p>)}</div>:null}
    {creation.pending?<p className="creator-progress" role="status"><span/>Shaping your next page…<button className="creator-link" onClick={creation.cancel}>Cancel</button></p>:null}
    {creation.error?<div className="creator-error" role="alert"><p>{creation.error}</p>{enabled&&onAISettings?<button className="creator-link" onClick={onAISettings}>Open AI settings</button>:null}{enabled?<button className="creator-link" onClick={()=>{setOverrideAI(false);creation.setError('');say('Built-in drafts are on. Your choices are still here.');}}>Use built-in drafts</button>:null}</div>:null}
     {!accessResolved&&overrideAI!==false?<div className="creator-access-status" role="status"><p>{accessError||"Checking AI access…"}</p>{accessError?<><button className="creator-link" onClick={()=>window.dispatchEvent(new Event("painted-realms-ai-access"))}>Retry</button><button className="creator-link" onClick={()=>setOverrideAI(false)}>Choose offline mode</button></>:null}</div>:null}
    </div>

    {stage===0?<><div className="creator-focus" role="tablist" aria-label="Shape your adventure">{(['story','narrator'] as const).map(tab=><button role="tab" type="button" id={'creator-tab-'+tab} aria-controls={'creator-panel-'+tab} aria-selected={focus===tab} tabIndex={focus===tab?0:-1} key={tab} onClick={()=>chooseFocus(tab)} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const next=tab==='story'?'narrator':'story';chooseFocus(next);document.getElementById('creator-tab-'+next)?.focus();}}}>{cap(tab)}</button>)}</div>
    <div role="tabpanel" id={'creator-panel-'+focus} aria-labelledby={'creator-tab-'+focus}>
    {focus==='story'?<>
     {story?<div className="creator-story-draft"><div className="creator-section-heading"><h3>Your story</h3>{proposal?.story?<span>Suggested draft</span>:<span>Editable</span>}</div>
      <label className="creator-field">Title<input aria-label="Story title" maxLength={80} value={story.title} onChange={e=>editStory({title:e.target.value})}/></label>
      <label className="creator-field">Synopsis<textarea aria-label="Synopsis" rows={3} maxLength={700} value={story.synopsis} onChange={e=>editStory({synopsis:e.target.value})}/></label>
      <div className="creator-detail-grid"><label className="creator-field">World<input aria-label="World or planet" maxLength={80} value={story.world} onChange={e=>editStory({world:e.target.value})}/></label><label className="creator-field">Era<input aria-label="Timeline" maxLength={80} value={story.timeline} onChange={e=>editStory({timeline:e.target.value})}/></label></div>
      <label className="creator-field">Places<input aria-label="Key locations" maxLength={240} value={story.locations.join(', ')} onChange={e=>editStory({locations:e.target.value.split(',').slice(0,4).map(s=>s.trimStart().slice(0,60))})}/></label>
     </div>:<div className="creator-empty"><Sparkles size={28}/><p>Your story takes shape here.</p></div>}
    </>:<>
     <div className="creator-narrator-title"><h2>Shape your narrator</h2><button className="creator-link" onClick={keepAether} disabled={pending}>Reset to Aether</button></div>
     <div className="creator-narrator-fields"><div className="creator-detail-grid"><label className="creator-field">Name<input aria-label="Narrator name" maxLength={28} value={narrator.name} onChange={e=>editNarrator({name:e.target.value})}/></label><label className="creator-field">Voice<select aria-label="Narrator voice" value={narrator.voice??'vesper'} onChange={e=>editNarrator({voice:e.target.value as NarratorProfile['voice']})}>{NARRATOR_VOICES.map(v=><option key={v} value={v}>{VOICE_NAMES[v]}</option>)}</select></label></div>
      <label className="creator-field">Persona<textarea aria-label="Narrator persona" rows={2} maxLength={240} value={narrator.persona} onChange={e=>editNarrator({persona:e.target.value})}/></label>
      <details className="creator-trait-section" open><summary>Personality<span>{narrator.personality.join(" · ")}</span><ChevronDown size={15}/></summary><TraitPicker category="personality" label="Personality" values={narrator.personality} onChange={values=>{editNarrator({personality:values});say(values.includes('Sarcastic')?'A little wit, with the kindness left in.':values.includes('Gentle')?'Gentle it is. There is room for quiet courage.':'Those traits will shape how your narrator sees the world.',true);}} validate={validate} disabled={pending}/></details>
      <details className="creator-trait-section"><summary>Speaking style<span>{narrator.speakingStyle.join(" · ")}</span><ChevronDown size={15}/></summary><TraitPicker category="speakingStyle" label="Speaking style" values={narrator.speakingStyle} onChange={values=>{editNarrator({speakingStyle:values});say('The delivery changes when you confirm. The story stays yours.',true);}} validate={validate} disabled={pending}/></details>
      <fieldset className="creator-choice"><legend>Form</legend><div>{NARRATOR_FORMS.map(form=><button type="button" key={form} aria-pressed={(narrator.avatar?.form??'spirit')===form} onClick={()=>editNarrator({avatar:{form,accessory:narrator.avatar?.accessory??'none'}})}>{cap(form)}</button>)}</div></fieldset>
      <div className="creator-detail-grid"><label className="creator-field">Accessory<select aria-label="Narrator accessory" value={narrator.avatar?.accessory??'hood'} onChange={e=>editNarrator({avatar:{form:narrator.avatar?.form??'spirit',accessory:e.target.value as 'none'|'glasses'|'crown'|'hood'}})}>{NARRATOR_ACCESSORIES.map(a=><option key={a} value={a}>{cap(a)}</option>)}</select></label><div className="creator-palette-note"><span style={{background:palette.primary}}/><p>Color follows your traits</p></div></div>
      <details className="creator-details"><summary>More appearance traits<ChevronDown size={14}/></summary><TraitPicker category="appearance" label="Appearance" values={narrator.appearance} onChange={values=>editNarrator({appearance:values})} validate={validate} disabled={pending}/></details>
     </div>
     {!proposal&&narratorDirty?<div className="creator-confirm"><div><strong>Ready to become {narrator.name||'your narrator'}?</strong><p>{narrator.personality.join(' · ')} · {narrator.speakingStyle.join(' · ')}</p></div><button className="creator-primary" disabled={pending} onClick={confirmNarrator}>Confirm narrator<Check size={16}/></button></div>:null}

    </>}
    </div></>:stage===1?<>
     <p className="creator-intro">Choose a hero, or make one your own.</p>
     <div className="creator-heroes">{heroes.map((profile,i)=><button key={i} className="creator-hero-option" aria-pressed={hero?.name===profile.name&&hero?.heroClass===profile.heroClass} onClick={()=>edit({hero:profile})}><HeroArt heroClass={profile.heroClass} color={profile.color}/><strong>{profile.name}</strong><span>{CLASS_INFO[profile.heroClass].name}</span><p>{profile.background}</p>{hero?.name===profile.name?<Check size={16} className="creator-hero-check"/>:null}</button>)}</div>
     {!hero?<button className="creator-link" onClick={()=>edit({hero:heroSeed(story?.world??'Asterfall')})}>Create my own hero<ArrowRight size={15}/></button>:<div className="creator-hero-editor"><div className="creator-detail-grid"><label className="creator-field">Hero name<input aria-label="Hero name" maxLength={24} value={hero.name} onChange={e=>editHero({name:e.target.value})}/></label><label className="creator-field">Class<select aria-label="Class" value={hero.heroClass} onChange={e=>editHero({heroClass:e.target.value as HeroClass})}>{Object.entries(CLASS_INFO).map(([key,value])=><option key={key} value={key}>{value.name}</option>)}</select></label></div><p className="creator-class-description">{CLASS_INFO[hero.heroClass].description} · {CLASS_INFO[hero.heroClass].ability}</p><label className="creator-field">Background<textarea aria-label="Background" rows={3} maxLength={240} value={hero.background} onChange={e=>editHero({background:e.target.value})}/></label><TraitPicker category="personality" label="Personality" values={hero.personality} onChange={values=>editHero({personality:values})} validate={validate} disabled={pending}/><label className="creator-field">Palette<select aria-label="Hero palette" value={hero.color} onChange={e=>editHero({color:e.target.value})}>{HERO_COLORS.map((c,i)=><option value={c} key={c}>{['Coral','Sky','Gold','Lilac','Sage','Rose','Teal','Sand','Lime','Slate'][i]}</option>)}</select></label></div>}
    </>:<>

     <div className="creator-review"><HeroArt heroClass={hero?.heroClass} color={hero?.color}/><div><h3>{story?.title}</h3><p>{hero?.name} · Narrated by {confirmed.name}</p></div></div><p className="creator-review-synopsis">{story?.synopsis}</p>
     <div className="creator-detail-grid"><label className="creator-field">Adventure length<select aria-label="Adventure length" value={options.duration} onChange={e=>setOptions({...options,duration:e.target.value as GameOptions['duration']})}><option value="short">Short · 1 chapter</option><option value="standard">Standard · 3 chapters</option><option value="long">Long · 5 chapters</option></select></label><label className="creator-field">Companions<select aria-label="Companions" value={options.companions} onChange={e=>setOptions({...options,companions:Number(e.target.value)})}>{[0,1,2,3].map(n=><option key={n} value={n}>{n?n+' companion'+(n===1?'':'s'):'Just me'}</option>)}</select></label></div>
     <label className="creator-field">Rules<select aria-label="Rules" value={options.rules} onChange={e=>setOptions({...options,rules:e.target.value as GameOptions['rules']})}><option value="simple">Streamlined · recommended</option><option value="classic">Classic · SRD subset</option></select></label>
     <details className="creator-details"><summary>World settings<ChevronDown size={14}/></summary><label className="creator-field">Terrain<select aria-label="Terrain" value={story?.biome} onChange={e=>editStory({biome:e.target.value as StoryBlueprint['biome']})}><option value="woodland">Woodland</option><option value="ruins">Ruins</option><option value="coast">Coast</option></select></label><label className="creator-field">World seed<input aria-label="Seed" maxLength={64} value={options.seed} onChange={e=>setOptions({...options,seed:e.target.value})}/></label></details>
     <p className="creator-intro">{mode==='online'?'Invite your party at camp, then begin together.':'Move, take an action, then end your turn. Your narrator will help along the way.'}</p>
    </>}
    {proposal?<section className="creator-confirm" aria-label="Suggested changes"><div><strong>{proposal.narrator?'Ready to become '+proposal.narrator.name+'?':proposal.hero?'Meet '+proposal.hero.name+'.':'Shall we tell this story?'}</strong><p>{proposal.narrator?proposal.narrator.personality.join(' · ')+' · '+proposal.narrator.speakingStyle.join(' · '):proposal.hero?proposal.hero.background:proposal.story?.title}</p></div><div className="creator-proposal-details">{proposal.narrator?<p><strong>Narrator · {proposal.narrator.name}</strong>{proposal.narrator.persona}</p>:null}{proposal.story?<p><strong>Story · {proposal.story.title}</strong>{proposal.story.synopsis}<br/>{proposal.story.world} · {proposal.story.timeline} · {proposal.story.locations.join(", ")}</p>:null}{proposal.hero?<p><strong>Hero · {proposal.hero.name}</strong>{CLASS_INFO[proposal.hero.heroClass].name} · {proposal.hero.background}</p>:null}</div><div className="creator-confirm-actions"><button className="creator-primary" disabled={pending} onClick={confirmProposal}>{[proposal.narrator,proposal.story,proposal.hero].filter(Boolean).length>1?'Apply these changes':proposal.narrator?'Confirm narrator':proposal.hero?'Choose this hero':'Use this story'}<Check size={16}/></button><button className="creator-link" onClick={()=>setProposal(null)}>Keep exploring</button></div></section>:null}
    <footer className="creator-editor-footer">{undo?<button className="creator-link" onClick={restoreUndo}><Undo2 size={14}/>Undo</button>:<span/>}<button className="creator-primary" disabled={pending} onClick={()=>stage===0?void continueToHero():stage===1?toBegin():start()}>{busy?'Preparing…':stage===0?'Continue to your hero':stage===1?'Choose game settings':mode==='online'?'Create party':'Begin adventure'}<ArrowRight size={17}/></button></footer>
  <footer className="creator-access"><label><input type="checkbox" checked={enabled} onChange={e=>setOverrideAI(e.target.checked)}/><span>AI storyteller</span></label><span>{!accessResolved&&overrideAI!==false?'Checking AI access…':enabled?access?.unlocked?'Connected to AI':access?.passwordRequired?'AI needs unlocking':'AI is unavailable':'Offline mode'}{enabled&&source==='openai'?' · Last reply from AI':''}</span>{enabled&&!access?.unlocked&&onAISettings?<button className="creator-link" onClick={onAISettings}>AI settings<ArrowRight size={13}/></button>:null}<small>{stored?"Saved on this device":""}</small></footer>
   </section>
   <aside className="creator-companion" aria-label="Narrator companion" data-captions={liveActive||live.transcriptStarted}>
    <div className="creator-scene-space"><CreationScene profile={displayAvatar} story={story} neutral={JSON.stringify(displayAvatar)===JSON.stringify(AETHER)} palette={palette} speaking={live.speaking&&!previewing} pending={creation.pending} onClick={openChat}/></div>
    <div className="creator-companion-bottom">
     <div className="creator-companion-identity"><h2>{displayAvatar.name}</h2>{previewing?<span>Preview · Speaking with {activeNarrator.name}</span>:null}</div>
     <p className="creator-speech" aria-live="polite" title={asideText}>{asideText}</p>
     <div className="creator-audio"><button className="creator-audio-button" type="button" onClick={enableVoice} aria-label={live.speakerMuted?'Unmute narrator':'Mute narrator'} title={live.speakerMuted?'Unmute narrator':'Mute narrator'} aria-pressed={!live.speakerMuted} disabled={!voiceAvailable}>{live.speakerMuted?<VolumeX size={19}/>:<Volume2 size={19}/>}</button><button className="creator-audio-button" type="button" onClick={()=>live.setMicMuted(!live.micMuted)} aria-label={live.micMuted?'Unmute microphone':'Mute microphone'} title={live.micMuted?'Unmute microphone':'Mute microphone'} aria-pressed={!live.micMuted} disabled={!voiceAvailable}>{live.micMuted?<MicOff size={19}/>:<Mic size={19}/>}</button>{liveActive?<button className="creator-call-button" onClick={live.disconnect}><PhoneOff size={16}/>{live.status==='connecting'?'Cancel connection':'End call'}</button>:<button className="creator-call-button" onClick={()=>{if(!voiceAvailable){setOverrideAI(true);onAISettings?.();}else{live.setSpeakerMuted(false);void live.setMicMuted(false);}}}><Mic size={16}/>{voiceAvailable?'Start voice':'Set up voice'}</button>}
      {liveActive?<span className="creator-live-state" role="status">{live.status==='connecting'?'Connecting…':live.micMuted?'Mic muted':'Live'}</span>:null}
      {JSON.stringify(confirmed)!==JSON.stringify(AETHER)?<select className="creator-speaker-select" aria-label="Conversation partner" value={speaker} onChange={e=>setSpeaker(e.target.value as 'guide'|'narrator')}><option value="narrator">{confirmed.name}</option><option value="guide">Aether</option></select>:null}
     </div>
     {live.error?<p className="creator-voice-error" role="status">{live.error}</p>:!voiceAvailable?<p className="creator-voice-note">{enabled?(access?.unlocked?'Voice is not enabled on this server.':'Check AI settings to talk with '+activeNarrator.name+'.'):'Turn on AI to talk with '+activeNarrator.name+'.'}</p>:null}
    </div>
    {liveActive||live.transcriptStarted?<LiveTranscript lines={live.transcript} active={liveActive} onClear={live.clearTranscript}/>:null}
   </aside>

  </div>

 </main>;
}
