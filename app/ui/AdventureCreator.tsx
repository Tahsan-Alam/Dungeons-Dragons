'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {CLASS_INFO,DEFAULT_OPTIONS,HERO_COLORS} from '../../game/types';
import type {GameOptions,HeroClass} from '../../game/types';
import {narratorTone,parseBlueprint,parseHero,parseStory} from '../../game/creation';
import type {CreationAction,CreationResult,HeroProfile,NarratorProfile,StoryBlueprint,TraitCategory,TraitSelection} from '../../game/creation';
import {Icon,HeroArt} from './Art';
import {useAIPreference} from './ai-preferences';
import {useCreation} from './useCreation';
import {CreatorConversation,PairedModel,TraitPicker} from './CreatorControls';
import type {ConversationLine} from './CreatorControls';
import QuestDictation from './QuestDictation';
import './adventure-creator.css';

type Props={mode:'solo'|'online';onBack:()=>void;onStart:(name:string,cls:HeroClass,options:GameOptions,code:string)=>void;busy:boolean;onNavigationBlockChange?:(blocked:boolean)=>void;onAISettings?:()=>void};
const STEPS=['Your idea','Narrator','Story','Character','Play'];
type Access={available:boolean;unlocked:boolean;audioAvailable:boolean};
export default function AdventureCreator({mode,onBack,onStart,busy,onNavigationBlockChange,onAISettings}:Props){
 const [step,setStep]=useState(0),[prompt,setPrompt]=useState(''),[narratorIntent,setNarratorIntent]=useState('');
 const [traits,setTraits]=useState<TraitSelection>({}),[heroTraits,setHeroTraits]=useState<TraitSelection>({});
 const [narrators,setNarrators]=useState<NarratorProfile[]>([]),[narrator,setNarrator]=useState<NarratorProfile|null>(null),[story,setStory]=useState<StoryBlueprint|null>(null),[heroes,setHeroes]=useState<HeroProfile[]>([]),[hero,setHero]=useState<HeroProfile|null>(null),[customHero,setCustomHero]=useState(false);
 const [options,setOptions]=useState<GameOptions>(()=>({...DEFAULT_OPTIONS,duration:'standard',seed:'quest-'+crypto.randomUUID().slice(0,8)}));
 const [savedAI]=useAIPreference(),[overrideAI,setOverrideAI]=useState<boolean|null>(null),[access,setAccess]=useState<Access|null>(null);
 const [conversations,setConversations]=useState<Record<string,ConversationLine[]>>({}),[notice,setNotice]=useState(''),[source,setSource]=useState<'fixture'|'openai'>('fixture'),[dictating,setDictating]=useState(false);
 const [sample,setSample]=useState<{index:number;text:string;audio:string|null}|null>(null),[talking,setTalking]=useState(false);
 const audio=useRef<HTMLAudioElement|null>(null),heading=useRef<HTMLHeadingElement>(null),firstStep=useRef(true);
 const auditions=useRef<Record<string,ConversationLine[]>>({});
 const creation=useCreation(),enabled=overrideAI??savedAI,blocked=busy||creation.pending||dictating;
 const stopAudio=useCallback(()=>{audio.current?.pause();setTalking(false);},[]);
 const dictationBusy=useCallback((value:boolean)=>setDictating(value),[]);
 useEffect(()=>{onNavigationBlockChange?.(creation.pending||dictating);return()=>onNavigationBlockChange?.(false);},[creation.pending,dictating,onNavigationBlockChange]);
 useEffect(()=>{if(firstStep.current)firstStep.current=false;else heading.current?.focus();stopAudio();},[step,stopAudio]);
 useEffect(()=>()=>{audio.current?.pause();},[]);
 useEffect(()=>{
  const controller=new AbortController();
  async function refresh(){try{const response=await fetch('/api/ai/access',{cache:'no-store',signal:controller.signal});if(response.ok)setAccess(await response.json());}catch{/* Built-in creation stays available. */}}
  void refresh();window.addEventListener('focus',refresh);window.addEventListener('painted-realms-ai-access',refresh);
  return()=>{controller.abort();window.removeEventListener('focus',refresh);window.removeEventListener('painted-realms-ai-access',refresh);};
 },[]);
 const name=narrator?.name??'your guide';
 function updateNarratorTraits(category:TraitCategory,values:string[]){setTraits(current=>({...current,[category]:values}));setNarrators([]);}
 function request(action:CreationAction,message='',extra:Record<string,unknown>={}){
  return creation.run({action,enabled,prompt,message,narratorBrief:narratorIntent,...(action==='narrators'&&narrators.length===3?{candidates:narrators}:{}),traits:step===3?heroTraits:traits,...(narrator?{narrator}:{}),...(story?{story}:{}),...(hero?{hero}:{}),history:[...(step<2&&narratorIntent?[{role:'player' as const,text:narratorIntent}]:[]),...(conversations[step]??[])].slice(-6),...extra});
 }
 function accept(result:CreationResult){
  setNotice(result.reply);setSource(result.source);
  if(result.narrators){setNarrators(result.narrators);setNarrator(null);setSample(null);setStory(null);setHeroes([]);}
  if(result.story){setStory(result.story);setHeroes([]);}
  if(result.heroes){setHeroes(result.heroes);setCustomHero(!!hero);}
  if(result.hero){setHero(result.hero);setCustomHero(true);}
 }
 async function validate(category:TraitCategory,value:string){const result=await request('trait','',{category,value});if(result)setSource(result.source);return result;}
 async function converse(message:string){
  const action=step<2?'narrators':step===2?'story':'hero';
  const result=await request(action,message);
  if(!result)return false;accept(result);setConversations(current=>({...current,[step]:[...(current[step]??[]),{role:'player' as const,text:message},{role:'narrator' as const,text:result.reply}].slice(-6)}));return true;
 }
 async function preview(profile:NarratorProfile,index:number){
  if(blocked)return;stopAudio();setSample(null);
  const result=await request('sample','',{narrator:profile,history:auditions.current[profile.name]??[]});if(!result)return;
  if(result.sample)auditions.current[profile.name]=[...(auditions.current[profile.name]??[]),{role:'narrator' as const,text:result.sample.slice(0,400)}].slice(-6);
  setSource(result.source);setNotice(result.reply);setSample({index,text:result.sample??'',audio:result.audio??null});
 }
 async function next(){
  if(blocked)return;stopAudio();creation.setError('');setNotice('');
  if(step===0){
   if(!narrators.length){const result=await request('narrators',narratorIntent);if(!result)return;accept(result);}
   setStep(1);return;
  }
  if(step===1){if(!narrator)return;if(!story){const result=await request('story');if(!result)return;accept(result);}setStep(2);return;}
  if(step===2){if(!parseStory(story)){creation.setError('Give your story a title, synopsis, timeline, world and at least one location.');return;}if(!heroes.length){const result=await request('heroes');if(!result)return;accept(result);}setStep(3);return;}
  if(step===3){if(!parseHero(hero)){creation.setError('Give your hero a name, background and personality before continuing.');return;}setStep(4);return;}
  const blueprint=parseBlueprint({narrator,story,hero});if(!blueprint){creation.setError('Review your narrator, story and hero before starting.');return;}
  if(!options.seed.trim()){creation.setError('Give your world a seed before starting.');return;}
  onStart(blueprint.hero.name,blueprint.hero.heroClass,{...options,aiEnabled:enabled,narrator:narratorTone(blueprint.narrator),biome:blueprint.story.biome,storyPrompt:prompt,narratorPrompt:[blueprint.narrator.persona,...blueprint.narrator.speakingStyle].join('. ').slice(0,400),characterPrompt:blueprint.hero.background,creation:blueprint},'');
 }
 function goBack(){if(blocked)return;stopAudio();creation.setError('');setNotice('');if(step)setStep(step-1);else onBack();}
 function editStory(patch:Partial<StoryBlueprint>){setStory(current=>current?{...current,...patch}:current);setHeroes([]);}
 function editHero(patch:Partial<HeroProfile>){setHero(current=>current?{...current,...patch}:current);}
 function newHero(){setCustomHero(true);setHero({name:'Adventurer',heroClass:'ranger',color:HERO_COLORS[4],background:`A wanderer from ${story?.world??'a faraway realm'}, ready to follow the light.`,personality:['Curious']});}
 const canContinue=step!==1&&step!==3||step===1&&!!narrator||step===3&&!!hero;
 return <main className="setup-screen guided-setup adventure-creator"><div className="setup-content">
  <div className="setup-title"><h1>{mode==='online'?'Gather a party':'Your next adventure'}</h1><span className="setup-count">{step+1} / 5</span></div>
  <ol className="setup-progress" aria-label="Adventure setup">{STEPS.map((label,i)=><li key={label} aria-current={step===i?'step':undefined}><button type="button" disabled={blocked||i>step} onClick={()=>{stopAudio();creation.setError('');setNotice('');setStep(i);}}><span>{i<step?<Icon name="check" size={12}/>:i+1}</span>{label}</button></li>)}</ol>
  <section className="setup-step" aria-labelledby="creator-step-title"><h2 id="creator-step-title" className="setup-step-title" tabIndex={-1} ref={heading}>{['Every adventure starts with an idea.','Who should tell your story?','Let’s find the story.','Who belongs in this adventure?','Ready when you are.'][step]}</h2>
   <fieldset className="creator-fields" disabled={busy||creation.pending}>
   {step===0?<>
    <label className="field">What kind of story would you like?<textarea aria-label="What kind of story would you like?" maxLength={400} rows={3} value={prompt} onChange={e=>{setPrompt(e.target.value);setNarrators([]);}} placeholder="A floating city, a missing dragon, and a mystery nobody wants solved…"/></label>
    <div className="quest-prompt-tools"><QuestDictation value={prompt} onChange={value=>{setPrompt(value);setNarrators([]);}} disabled={busy||creation.pending} onBusyChange={dictationBusy}/><span>Or leave it to your narrator.</span></div>
    <label className="field creator-narrator-prompt">Who should narrate it?<textarea rows={2} maxLength={400} value={narratorIntent} onChange={e=>{setNarratorIntent(e.target.value);setNarrators([]);}} placeholder="A sarcastic old wizard? A bubbly star explorer?"/></label>
    <details className="creator-details"><summary>Choose narrator traits</summary>{(['personality','speakingStyle','appearance'] as const).map(category=><TraitPicker key={category} category={category} label={category==='speakingStyle'?'Speaking style':category==='personality'?'Personality':'Appearance'} values={traits[category]??[]} onChange={values=>updateNarratorTraits(category,values)} validate={validate} disabled={blocked}/>)}</details>
    <details className="creator-details"><summary>Talk through your narrator</summary><CreatorConversation name="your guide" lines={conversations[step]??[]} onSend={converse} disabled={blocked} placeholder="I want someone warm, but with a wicked sense of humor…"/></details>
    <div className="creator-ai"><div><strong>AI storyteller</strong><p>{enabled?(access?.unlocked?'Live drafts, conversation and character voices.':'Unlock team AI for live generation. Built-in drafts remain available.'):'Built-in drafts. Turn on AI for live generation.'}</p></div><button type="button" className="button paper compact" aria-label="AI storyteller" aria-pressed={enabled} onClick={()=>setOverrideAI(!enabled)}>{enabled?'On':'Off'}</button>{enabled&&!access?.unlocked&&onAISettings?<button className="text-button" type="button" onClick={onAISettings}>Team AI settings</button>:null}</div>
   </>:step===1?<>
    <p className="creator-intro">Three different voices for the same beginning. Choose your guide.</p>
    <div className="creator-cards">{narrators.map((profile,index)=><article className="creator-card" data-selected={narrator===profile} key={profile.name}>
     <PairedModel model={profile.model} color={profile.color} name={profile.name}/><h3>{profile.name}</h3><p className="creator-persona">{profile.persona}</p>
     <dl><dt>Personality</dt><dd>{profile.personality.join(' · ')}</dd><dt>Speaking style</dt><dd>{profile.speakingStyle.join(' · ')}</dd><dt>Appearance</dt><dd>{profile.appearance.join(' · ')}</dd></dl>
     <button className="text-button creator-play" type="button" onClick={()=>void preview(profile,index)}><Icon name="sound" size={15}/>{talking&&sample?.index===index?'Playing…':'Play'}<span className="sr-only"> a fresh voice sample for {profile.name}</span></button>
     {sample?.index===index?<div className="creator-sample" role="status"><p>{sample.text}</p>{sample.audio?<audio ref={audio} autoPlay controls src={sample.audio} aria-label={`${profile.name} fresh voice sample`} onPlay={()=>setTalking(true)} onPause={()=>setTalking(false)} onEnded={()=>setTalking(false)}/>:<small>Live voice needs unlocked team AI, paid audio and remaining allowance.</small>}</div>:null}
     <button className={`button ${narrator===profile?'primary':'paper'}`} type="button" aria-pressed={narrator===profile} onClick={()=>setNarrator(profile)}>{narrator===profile?'Selected':`Choose ${profile.name}`}{narrator===profile?<Icon name="check" size={15}/>:null}</button>
    </article>)}</div>
    <CreatorConversation name={name} lines={conversations[step]??[]} onSend={converse} disabled={blocked} placeholder="Make the narrator more theatrical, with a little dry wit…"/>
   </>:step===2&&story?<>
    <div className="creator-narrator-note"><HeroArt heroClass={narrator!.model} color={narrator!.color}/><p><strong>{name}’s story</strong>Keep it, change a detail, or take it somewhere stranger.</p></div>
    <label className="field">Story title<input aria-label="Story title" maxLength={80} value={story.title} onChange={e=>editStory({title:e.target.value})}/></label>
    <label className="field">Synopsis<textarea aria-label="Synopsis" rows={5} maxLength={700} value={story.synopsis} onChange={e=>editStory({synopsis:e.target.value})}/></label>
    <div className="two-fields"><label className="field">Timeline<input aria-label="Timeline" list="creator-timelines" maxLength={80} value={story.timeline} onChange={e=>editStory({timeline:e.target.value})}/><datalist id="creator-timelines">{['An age of wandering magic','The last days of an empire','After the stars fell','A distant magical future'].map(x=><option key={x} value={x}/>)}</datalist></label><label className="field">World or planet<input aria-label="World or planet" list="creator-worlds" maxLength={80} value={story.world} onChange={e=>editStory({world:e.target.value})}/><datalist id="creator-worlds">{['Asterfall','A moon of floating islands','The realm beneath the sea','A living clockwork world'].map(x=><option key={x} value={x}/>)}</datalist></label></div>
    <fieldset className="creator-locations"><legend>Key locations</legend>{story.locations.map((location,i)=><div key={i}><input aria-label={`Location ${i+1}`} maxLength={60} value={location} onChange={e=>editStory({locations:story.locations.map((old,j)=>i===j?e.target.value:old)})}/>{story.locations.length>1?<button type="button" className="icon-button" aria-label={`Remove location ${i+1}`} onClick={()=>editStory({locations:story.locations.filter((_,j)=>i!==j)})}><Icon name="close" size={15}/></button>:null}</div>)}{story.locations.length<4?<button type="button" className="text-button" onClick={()=>editStory({locations:[...story.locations,'New location']})}><Icon name="plus" size={14}/>Add a location</button>:null}</fieldset>
    <details className="creator-details"><summary>Landscape</summary><label className="field">Terrain<select aria-label="Terrain" value={story.biome} onChange={e=>editStory({biome:e.target.value as StoryBlueprint['biome']})}><option value="woodland">Woodland</option><option value="ruins">Ruins</option><option value="coast">Coast</option></select></label></details>
    <CreatorConversation name={name} lines={conversations[step]??[]} onSend={converse} disabled={blocked} placeholder="Set it after the moon cracked, and make the observatory a moving island…"/>
   </>:step===3?<>
    <p className="creator-intro">A few heroes with a reason to be in {story?.world}. Pick one, or make your own.</p>
    <div className="creator-cards">{heroes.map(profile=><article className="creator-card" data-selected={!customHero&&hero===profile} key={profile.name}><PairedModel model={profile.heroClass} color={profile.color} name={profile.name}/><h3>{profile.name}</h3><span className="creator-class">{CLASS_INFO[profile.heroClass].name}</span><p className="creator-persona">{profile.background}</p><p className="creator-trait-line">{profile.personality.join(' · ')}</p><button className={`button ${!customHero&&hero===profile?'primary':'paper'}`} type="button" aria-pressed={!customHero&&hero===profile} onClick={()=>{setHero(profile);setCustomHero(false);}}>{!customHero&&hero===profile?'Selected':`Choose ${profile.name}`}</button></article>)}</div>
    {!customHero?<button className="button paper creator-custom-button" type="button" onClick={()=>{if(hero)setCustomHero(true);else newHero();}}><Icon name="plus" size={15}/>{hero?'Customize your character':'Create my own character'}</button>:null}
    {customHero&&hero?<section className="creator-custom-hero"><h3>Your character</h3><div className="two-fields"><label className="field">Hero name<input aria-label="Hero name" maxLength={24} value={hero.name} onChange={e=>editHero({name:e.target.value})}/></label><label className="field">Class<select aria-label="Class" value={hero.heroClass} onChange={e=>editHero({heroClass:e.target.value as HeroClass})}>{Object.entries(CLASS_INFO).map(([key,value])=><option key={key} value={key}>{value.name}</option>)}</select></label></div><p className="creator-intro">{CLASS_INFO[hero.heroClass].description} · {CLASS_INFO[hero.heroClass].ability}</p><label className="field">Background<textarea aria-label="Background" rows={3} maxLength={240} value={hero.background} onChange={e=>editHero({background:e.target.value})}/></label><label className="field">Palette<select aria-label="Palette" value={hero.color} onChange={e=>editHero({color:e.target.value})}>{HERO_COLORS.map((color,i)=><option key={color} value={color}>{['Coral','Sky','Gold','Lilac','Sage','Rose','Teal','Sand','Lime','Slate'][i]}</option>)}</select></label><TraitPicker category="personality" label="Personality" values={hero.personality} onChange={values=>{setHeroTraits(current=>({...current,personality:values}));editHero({personality:values});}} validate={validate} disabled={blocked}/><TraitPicker category="background" label="Background" values={heroTraits.background??[]} onChange={values=>{setHeroTraits(current=>({...current,background:values}));if(values.length)editHero({background:`A ${values.join(', ').toLowerCase()} from ${story?.world}.`});}} validate={validate} disabled={blocked}/></section>:null}
    <CreatorConversation name={name} lines={conversations[step]??[]} onSend={converse} disabled={blocked} placeholder="Create a soft-hearted knight who used to repair the city’s clocks…"/>
   </>:step===4&&hero&&story&&narrator?<>
    <div className="creator-ready"><HeroArt heroClass={hero.heroClass} color={hero.color}/><div><h3>{story.title}</h3><p>{hero.name}, {CLASS_INFO[hero.heroClass].name.toLowerCase()} · Narrated by {narrator.name}</p></div></div><p className="creator-synopsis">{story.synopsis}</p>
    <div className="two-fields"><label className="field">Adventure length<select aria-label="Adventure length" value={options.duration} onChange={e=>setOptions({...options,duration:e.target.value as GameOptions['duration']})}><option value="short">Short · 1 chapter</option><option value="standard">Standard · 3 chapters</option><option value="long">Long · 5 chapters</option></select></label><label className="field">Companions<select aria-label="Companions" value={options.companions} onChange={e=>setOptions({...options,companions:Number(e.target.value)})}><option value={0}>Just me</option><option value={1}>1 companion</option><option value={2}>2 companions</option><option value={3}>3 companions</option></select></label></div>
    <label className="field">Rules<select aria-label="Rules" value={options.rules} onChange={e=>setOptions({...options,rules:e.target.value as GameOptions['rules']})}><option value="simple">Streamlined · recommended</option><option value="classic">Classic · SRD subset</option></select></label><p className="creator-intro">{options.rules==='simple'?'Forgiving recovery and straightforward actions.':'Initiative, armor checks and death saves. A D&D-style subset.'}</p>
    <details className="creator-details"><summary>World seed</summary><label className="field">Seed<input aria-label="Seed" value={options.seed} maxLength={64} onChange={e=>setOptions({...options,seed:e.target.value})}/></label></details><p className="setup-next-note">{mode==='online'?'Next, invite your party and begin together.':'Move, take an action, then end your turn. Your narrator can help along the way.'}</p>
   </>:null}
   </fieldset>
  </section>
  <div aria-live="polite" role="status" className="creator-status">{creation.pending?<p><Icon name="spark" size={16}/>Creating your next page… <button type="button" className="text-button" onClick={creation.cancel}>Cancel</button></p>:notice?<p>{notice}<small>{source==='openai'?'AI generated':'Built-in draft'}</small></p>:null}</div>
  {creation.error?<div className="creator-error" role="alert"><p>{creation.error}</p>{enabled?<button type="button" className="text-button" onClick={()=>{setOverrideAI(false);creation.setError('');setNotice('Built-in drafts are on. Your choices are still here.');setSource('fixture');}}>Use built-in drafts</button>:null}</div>:null}
  {dictating?<p className="setting-note" role="status">Finish or discard your recording before continuing.</p>:null}
  <div className="setup-footer"><button className="button paper" type="button" disabled={blocked} onClick={goBack}><Icon name="back" size={17}/>Back</button><button className="button primary" type="button" disabled={blocked||!canContinue} onClick={()=>void next()}>{busy?'Preparing…':step===0?'Meet your narrators':step===4?mode==='online'?'Create party':'Start adventure':'Continue'}<Icon name="arrow" size={17}/></button></div>
 </div></main>;
}
