'use client';
import {useEffect,useRef,useState} from 'react';
import {Mic,MicOff,PhoneOff,Volume2,VolumeX} from 'lucide-react';
import {parseStory} from '../../game/creation';
import type {StoryBlueprint} from '../../game/creation';
import {GAME_MASTER_ART_RATIO,SCENE_FOR_BIOME} from '../../game/presets';
import type {GameMasterPreset} from '../../game/presets';
import {useCreation} from './useCreation';
import {useLiveNarrator} from './useLiveNarrator';
import {adoptLegacyAIUnlock,useAIPreference} from './ai-preferences';
import LiveTranscript from './LiveTranscript';
import {RealmButton,QuestSteps,Portrait} from './RealmKit';

type Line={role:'player'|'narrator';text:string};
type Access={available:boolean;unlocked:boolean;audioAvailable:boolean};
type Props={gm:GameMasterPreset;initialIdea:string;initialStory:StoryBlueprint|null;onKeep:(story:StoryBlueprint)=>void;onBack:()=>void;onAISettings?:()=>void};
const Arrow=()=><svg width="9" height="14" viewBox="0 0 9 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 1l6 6-6 6"/></svg>;
const BackArrow=()=><svg width="9" height="14" viewBox="0 0 9 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 1L1 7l6 6"/></svg>;

/**
 * Shape a tale by talking with the chosen Game Master. Uses the same guide request, validation, live voice and captions as the
 * earlier creator; only the presentation changes. The tale forms beside the conversation and joins the Tale list when kept.
 */
export default function TaleConversation({gm,initialIdea,initialStory,onKeep,onBack,onAISettings}:Props){
 const [savedAI]=useAIPreference();
 const [scope]=useState(()=>crypto.randomUUID());
 const creation=useCreation(scope);
 const [access,setAccess]=useState<Access|null>(null);
 const [lines,setLines]=useState<Line[]>([{role:'narrator',text:gm.lines.tale}]);
 const [message,setMessage]=useState(initialIdea),[logOpen,setLogOpen]=useState(false);
 const [story,setStory]=useState<StoryBlueprint|null>(initialStory),[proposal,setProposal]=useState<StoryBlueprint|null>(null),[undo,setUndo]=useState<StoryBlueprint|null|undefined>(undefined);
 // The draft version guards against a reply that arrives after the player has already changed the tale.
 const [version,setVersion]=useState(0),versionRef=useRef(0);
 const input=useRef<HTMLTextAreaElement>(null),requestRef=useRef<(text:string)=>Promise<{reply:string}|null>>(async()=>null);

 // AI is used only when the player has turned it on and the server allows it; otherwise the scripted storyteller answers.
 useEffect(()=>{
  if(!savedAI)return;
  const controller=new AbortController();
  fetch('/api/ai/access',{cache:'no-store',signal:controller.signal}).then(r=>r.ok?r.json() as Promise<Access>:null).then(result=>{if(result&&typeof result.unlocked==='boolean'){adoptLegacyAIUnlock(result.unlocked);setAccess(result);}}).catch(()=>{});
  return()=>controller.abort();
 },[savedAI]);
 const enabled=savedAI&&!!access?.unlocked;
 const voiceAvailable=enabled&&!!access?.audioAvailable;
 const context=JSON.stringify({focus:'story',version,narrator:{name:gm.title,traits:gm.profile.personality,style:gm.profile.speakingStyle},story:story?{title:story.title,synopsis:story.synopsis.slice(0,500),world:story.world}:null,recent:lines.slice(-2).map(l=>({role:l.role,text:l.text.slice(0,120)}))});
 const live=useLiveNarrator({enabled:voiceAvailable,scope,narrator:gm.profile,context,onRequest:text=>requestRef.current(text)});
 const liveActive=live.status==='connecting'||live.status==='listening'||live.status==='speaking';

 async function converse(text:string,fromVoice=false){
  const said=text.trim().slice(0,400);if(!said||creation.pending)return null;
  const sent=versionRef.current;
  const result=await creation.run({action:'guide',enabled,prompt:initialIdea||said,message:said,traits:{personality:gm.profile.personality,speakingStyle:gm.profile.speakingStyle,appearance:gm.profile.appearance},
   focus:'story',draftVersion:sent,narrator:gm.profile,guideNarrator:gm.profile,...(story?{story}:{}),history:lines.slice(-6)});
  if(!result||versionRef.current!==sent)return null;
  setLines(current=>[...current,{role:'player' as const,text:said},{role:'narrator' as const,text:result.reply}].slice(-14));
  const suggested=result.guide?.proposal?.story?parseStory(result.guide.proposal.story):null;
  setProposal(suggested);
  if(!fromVoice&&!live.speakerMuted)void live.speak(result.reply);
  return {reply:result.reply};
 }
 useEffect(()=>{requestRef.current=text=>converse(text,true);});
 async function send(){const sent=message;if(await converse(sent))setMessage(current=>current===sent?'':current);}
 const bump=()=>{versionRef.current++;setVersion(versionRef.current);};
 function accept(){if(!proposal)return;setUndo(story);setStory(proposal);setProposal(null);bump();}
 function revert(){if(undo===undefined)return;setStory(undo);setUndo(undefined);setProposal(null);bump();}
 const shown=proposal??story, lastPlayer=[...lines].reverse().find(l=>l.role==='player'), lastReply=[...lines].reverse().find(l=>l.role==='narrator');
 const scene=shown?SCENE_FOR_BIOME[shown.biome].scene:null;

 return <main className="realm qs tc" aria-labelledby="tc-title">
  <header className="qs-top"><h1 id="tc-title">Shape a tale with {gm.title.replace('The ','the ')}</h1><QuestSteps current={1}/></header>
  <div className="tc-main">
   <section className="tc-scene" aria-label={`${gm.title} in their scene`}>
    <img className="tc-backdrop" src={gm.scene} alt=""/>
    <span className="tc-shadow" aria-hidden="true"/>
    <img className={`tc-figure${live.speaking?' speaking':''}`} src={gm.art} alt={`${gm.title}, ${gm.realName}`}/>
   </section>
   <section className="tc-tale realm-panel" aria-label="Your tale" aria-live="polite">
    {shown&&scene?<>
     <div className="tc-tale-art"><img src={scene} alt=""/>{proposal?<span className="tc-badge">Suggested</span>:null}</div>
     <div className="tc-tale-text">
      <h2>{shown.title}</h2><p className="realm-eyebrow">{shown.world} · {shown.biome}</p>
      <p className="tc-synopsis">{shown.synopsis}</p>
      <p className="tc-places"><span className="realm-eyebrow">Places</span>{shown.locations.join(' · ')}</p>
     </div>
     {proposal?<div className="tc-tale-actions"><RealmButton small variant="primary" onClick={accept}>Use this</RealmButton><RealmButton small onClick={()=>setProposal(null)}>Not yet</RealmButton></div>
      :undo!==undefined?<button type="button" className="qs-link tc-undo" onClick={revert}>Undo last change</button>:null}
    </>:<div className="tc-empty"><p className="realm-eyebrow">Your tale</p><p>Tell {gm.title.replace('The ','the ')} a place, a feeling or a strange idea. The tale takes shape here.</p></div>}
   </section>
  </div>
  <section className="tc-dialogue" aria-label="Conversation">
   <div className="tc-dialogue-face">
    <div className="tc-dialogue-head">
     <Portrait art={gm.art} face={gm.face} ratio={GAME_MASTER_ART_RATIO} width={40} height={40} scale={2.4} eye={0.4}/>
     <span className="realm-eyebrow">{gm.title}</span>
     <span className="tc-mode">{enabled?'AI storyteller':'Offline storyteller'}</span>
     <button type="button" className="qs-link tc-log-toggle" aria-expanded={logOpen} onClick={()=>setLogOpen(!logOpen)}>Dialogue log</button>
    </div>
    {logOpen?<ol className="tc-log">{lines.map((l,i)=><li key={i} className={l.role}><span>{l.role==='player'?'You':gm.title}</span>{l.text}</li>)}</ol>:null}
    {lastPlayer?<p className="tc-asked">You said: <span>{lastPlayer.text}</span></p>:null}
    {creation.pending?<p className="tc-reply tc-waiting" role="status"><span aria-hidden="true" className="tc-dots"><i/><i/><i/></span>Waiting for {gm.title.replace('The ','the ')}…</p>
     :<p className="tc-reply">“{lastReply?.text}”</p>}
    {creation.error?<div className="tc-failed" role="alert"><p>{creation.error}</p><RealmButton small onClick={()=>void send()}>Try again</RealmButton></div>:null}
    <form className="tc-input" onSubmit={e=>{e.preventDefault();void send();}}>
     <label htmlFor="tc-message" className="sr-only">What do you say?</label>
     <textarea id="tc-message" ref={input} rows={2} maxLength={400} value={message} onChange={e=>setMessage(e.target.value)} placeholder="What do you say?"
      onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void send();}}}/>
     <RealmButton type="submit" variant="primary" minWidth={120} disabled={creation.pending||!message.trim()}>Speak</RealmButton>
    </form>
    <div className="tc-voice">
     <button type="button" className="tc-voice-btn" onClick={()=>{live.setSpeakerMuted(!live.speakerMuted);if(live.speakerMuted&&lastReply)void live.speak(lastReply.text);}} aria-pressed={!live.speakerMuted} disabled={!voiceAvailable} aria-label={live.speakerMuted?'Unmute the Game Master':'Mute the Game Master'}>{live.speakerMuted?<VolumeX size={17}/>:<Volume2 size={17}/>}</button>
     <button type="button" className="tc-voice-btn" onClick={()=>void live.setMicMuted(!live.micMuted)} aria-pressed={!live.micMuted} disabled={!voiceAvailable} aria-label={live.micMuted?'Unmute microphone':'Mute microphone'}>{live.micMuted?<MicOff size={17}/>:<Mic size={17}/>}</button>
     {liveActive?<button type="button" className="qs-link" onClick={live.disconnect}><PhoneOff size={14}/> {live.status==='connecting'?'Cancel connection':'End call'}</button>
      :<button type="button" className="qs-link" onClick={()=>{if(!voiceAvailable)onAISettings?.();else{live.setSpeakerMuted(false);void live.setMicMuted(false);}}}>{voiceAvailable?'Start voice':'Set up voice'}</button>}
     {live.error?<span className="tc-voice-note" role="status">{live.error}</span>:null}
    </div>
   </div>
  </section>
  {liveActive||live.transcriptStarted?<LiveTranscript lines={live.transcript} active={liveActive} onClear={live.clearTranscript}/>:null}
  <footer className="qs-footer">
   <RealmButton onClick={onBack}><BackArrow/>Back to tales</RealmButton>
   <RealmButton variant="primary" minWidth={220} disabled={!story} onClick={()=>{if(story){live.disconnect();onKeep(story);}}}>Keep this tale<Arrow/></RealmButton>
  </footer>
 </main>;
}
