'use client';
import {useEffect,useId,useRef,useState} from 'react';
import type {CSSProperties} from 'react';
import Modal from './Modal';
import {Icon} from './Art';
import {ThemeToggle,useTheme} from './Theme';
import type {useAudio} from './useAudio';
import {ACCENT_NAMES,ACCENT_PALETTES} from './appearance';
import ControlsSettings from './ControlsSettings';
import {useAIPreference} from './ai-preferences';
import AISettings from './AISettings';
import './settings.css';
export type SettingsSection='appearance'|'audio'|'controls'|'game'|'ai';
export interface SettingsProps{
 onClose:()=>void;onAI:()=>void;initialSection?:SettingsSection;
 audio:ReturnType<typeof useAudio>;
 game?:{kind:'solo'|'online';roomCode?:string;seed?:string;onGames:()=>void;onLeave?:()=>Promise<boolean>;busy?:boolean};
}
const SECTIONS=[['appearance','Appearance'],['audio','Sound'],['controls','Controls'],['game','Table'],['ai','AI']] as const;
export default function Settings({onClose,onAI,audio,game,initialSection='appearance'}:SettingsProps){
 const[aiEnabled,setAIEnabled]=useAIPreference();
 const[section,setSection]=useState<SettingsSection>(initialSection),[leave,setLeave]=useState(false),[leaving,setLeaving]=useState(false),[leaveError,setLeaveError]=useState(''),[copied,setCopied]=useState(false),[copyMessage,setCopyMessage]=useState('');
 const{colorMode,setColorMode,accent,setAccent,resolvedColorMode,motion,setMotion,viewMode,setViewMode}=useTheme();const id=useId(),tabs=useRef<Array<HTMLButtonElement|null>>([]),panel=useRef<HTMLElement>(null),copyTimer=useRef<ReturnType<typeof setTimeout>|null>(null),leavePending=useRef(false);
 useEffect(()=>{setSection(initialSection)},[initialSection]);
 useEffect(()=>{panel.current?.scrollTo({top:0});setLeave(false)},[section]);
 useEffect(()=>()=>{if(copyTimer.current)clearTimeout(copyTimer.current)},[]);
 function select(index:number){if(leavePending.current)return;setSection(SECTIONS[index][0]);tabs.current[index]?.focus()}
 async function leaveParty(){
  if(leavePending.current||game?.busy||!game?.onLeave)return;
  leavePending.current=true;setLeaving(true);setLeaveError('');
  try{if(await game.onLeave())game.onGames();else setLeaveError('Could not leave the party. Try again.')}catch{setLeaveError('Could not leave the party. Try again.')}finally{leavePending.current=false;setLeaving(false)}
 }
 async function copySeed(){if(!game?.seed)return;try{await navigator.clipboard.writeText(game.seed);setCopied(true);setCopyMessage('');if(copyTimer.current)clearTimeout(copyTimer.current);copyTimer.current=setTimeout(()=>setCopied(false),2000)}catch{setCopyMessage('Copy unavailable. Select the seed text to copy it.')}}
 return <Modal title="Table settings" onClose={onClose} wide dismissible={!leaving}><div className="settings-shell"><nav className="settings-navigation" role="tablist" aria-label="Settings sections">{SECTIONS.map(([key,label],index)=><button key={key} ref={el=>{tabs.current[index]=el}} id={`${id}-${key}-tab`} role="tab" disabled={leaving} aria-selected={section===key} aria-controls={`${id}-${key}-panel`} tabIndex={section===key?0:-1} onClick={()=>setSection(key)} onKeyDown={event=>{let next:number|undefined;if(['ArrowDown','ArrowRight'].includes(event.key))next=(index+1)%SECTIONS.length;if(['ArrowUp','ArrowLeft'].includes(event.key))next=(index+SECTIONS.length-1)%SECTIONS.length;if(event.key==='Home')next=0;if(event.key==='End')next=SECTIONS.length-1;if(next!==undefined){event.preventDefault();select(next)}}}>{label}</button>)}<span className="settings-saved-note">Saved on this device. Changes apply instantly.</span></nav>
 <section key={section} ref={panel} className="settings-content" id={`${id}-${section}-panel`} role="tabpanel" aria-labelledby={`${id}-${section}-tab`} tabIndex={0}>
 <h3>{section==='audio'?'Sound & voice':section==='controls'?'Key bindings':section==='game'?'At the table':section==='ai'?'AI storyteller':'Appearance'}</h3>
 {section==='ai'?<AISettings onAbout={onAI}/>:null}
 {section==='appearance'?<>
 <p className="settings-description section-intro">Make this table your own. Your adventure stays the same.</p>
 <div className="settings-row"><div><strong>Art style</strong><p>Painted characters or crisp pixel art.</p></div><ThemeToggle/></div>
 <div className="settings-row"><div><strong>Color mode</strong><p>Match your room or follow your device.</p></div><div className="color-mode-toggle" role="group" aria-label="Color mode">{(['light','dark','system'] as const).map(mode=><button key={mode} type="button" aria-pressed={colorMode===mode} onClick={()=>setColorMode(mode)}>{mode[0].toUpperCase()+mode.slice(1)}</button>)}</div></div>
 <div className="settings-row world-view-setting"><div><strong>World view</strong><p id={`${id}-world-view-description`}>A flat map or angled scenery. Your view only.</p></div><div className="color-mode-toggle world-view-toggle" role="group" aria-label="World view" aria-describedby={`${id}-world-view-description`}>{(['2d','2.5d'] as const).map(mode=><button key={mode} type="button" aria-pressed={viewMode===mode} onClick={()=>setViewMode(mode)}>{mode==='2d'?'2D':'2.5D'}</button>)}</div></div>
 <div className="accent-setting"><strong>Accent color</strong><div className="accent-options" role="group" aria-label="Accent color">{ACCENT_NAMES.map(name=><button key={name} type="button" aria-pressed={accent===name} onClick={()=>setAccent(name)} style={{'--swatch':ACCENT_PALETTES[name][resolvedColorMode].accent} as CSSProperties}><span className="accent-swatch" aria-hidden="true">{accent===name?<Icon name="check" size={14}/>:null}</span><span>{name[0].toUpperCase()+name.slice(1)}</span></button>)}</div></div>
 <div className="settings-row motion-setting"><div><strong>Motion</strong><p>Movement, camera and menu animations.</p></div><div className="color-mode-toggle" role="group" aria-label="Motion">{(['system','full','reduced'] as const).map(option=><button key={option} type="button" aria-pressed={motion===option} onClick={()=>setMotion(option)}>{option[0].toUpperCase()+option.slice(1)}</button>)}</div></div>
 </>:null}
 {section==='audio'?<>
 <p className="settings-description section-intro">Levels save on this device. Enable audio each visit, or preview it below.</p>
 <div className="sound-section">
 <div className="settings-row"><div><strong>Interface sounds</strong><p>Soft, tactile clicks from Hex Settlers.</p></div><button className="button paper setting-toggle" aria-label="Interface sounds" aria-pressed={audio.interfaceSounds} onClick={audio.toggleInterfaceSounds}>{audio.interfaceSounds?'On':'Off'}</button></div>
 <div className="sound-controls"><label className="audio-range"><span>Interface volume<output>{Math.round(audio.preferences.interfaceVolume*100)}%</output></span><input aria-label="Interface volume" type="range" min={0} max={1} step={.05} value={audio.preferences.interfaceVolume} onChange={e=>audio.setInterfaceVolume(Number(e.target.value))}/></label>
 <div className="sound-options"><label className="preference-check"><input type="checkbox" checked={audio.preferences.hoverSounds} onChange={e=>audio.setHoverSounds(e.target.checked)}/><span>Hover & keyboard focus sounds</span></label><button className="button paper compact" data-ui-sound="off" disabled={audio.preferences.interfaceVolume===0} onClick={audio.previewSound}>Preview click</button></div>
 {audio.soundError?<p className="settings-audio-error" role="status">{audio.soundError}</p>:null}</div></div>
 <div className="sound-section"><div className="settings-row"><div><strong>Narration</strong><p>{audio.available?'Read the story using your device voice.':'Device narration is unavailable in this browser.'}</p></div><button className="button paper setting-toggle" disabled={!audio.available} aria-label="Spoken narration" aria-pressed={audio.voice} onClick={audio.toggleVoice}>{audio.voice?'On':'Off'}</button></div>
 <div className="sound-controls"><div className="audio-slider-pair"><label className="audio-range"><span>Voice volume<output>{Math.round(audio.preferences.voiceVolume*100)}%</output></span><input aria-label="Narration volume" type="range" min={0} max={1} step={.05} value={audio.preferences.voiceVolume} disabled={!audio.available} onChange={e=>audio.setVoiceVolume(Number(e.target.value))}/></label><label className="audio-range"><span>Voice speed<output>{audio.preferences.speechRate.toFixed(2)}×</output></span><input aria-label="Narration speed" type="range" min={.5} max={1.5} step={.05} value={audio.preferences.speechRate} disabled={!audio.available} onChange={e=>audio.setSpeechRate(Number(e.target.value))}/></label></div>
 <div className="voice-preview"><p>Applies to the next narration.</p><button className="button paper compact" disabled={!audio.available} onClick={audio.previewVoice}>Preview voice</button></div></div></div>
 <div className="sound-section"><div className="settings-row"><div><strong>Music</strong><p>Quiet background notes. Pauses while you’re away.</p></div><button className="button paper setting-toggle" aria-label="Background music" aria-pressed={audio.music} onClick={audio.toggleMusic}>{audio.music?'On':'Off'}</button></div><div className="sound-controls"><label className="audio-range"><span>Music volume<output>{Math.round(audio.preferences.musicVolume*100)}%</output></span><input aria-label="Music volume" type="range" min={0} max={1} step={.05} value={audio.preferences.musicVolume} onChange={e=>audio.setMusicVolume(Number(e.target.value))}/></label></div></div>
 </>:null}
 {section==='controls'?<ControlsSettings section="bindings"/>:null}
 {section==='game'?<><div className="settings-row"><div><strong>AI adventures</strong><p>Personalized quests and characters for new adventures.</p></div><button className="button paper setting-toggle" aria-label="AI adventures" aria-pressed={aiEnabled} onClick={()=>setAIEnabled(!aiEnabled)}>{aiEnabled?'On':'Off'}</button></div><ControlsSettings section="interaction"/><button className="settings-link" disabled={leaving} onClick={onAI}><span>Ask Pip</span><Icon name="arrow" size={17}/></button>{game?<div className="current-game-settings"><h4>{game.kind==='online'?`Party ${game.roomCode}`:'Current adventure'}</h4>{game.seed?<div className="seed-setting"><div><span>Seed</span><code>{game.seed}</code></div><button className="text-button" onClick={()=>void copySeed()}>{copied?'Copied':'Copy'}</button></div>:null}{copyMessage?<p className="settings-description" role="status">{copyMessage}</p>:null}<p className="settings-description">{game.kind==='solo'?'Solo play pauses when you leave.':'Other players can continue while you are away.'}</p><button className="button primary full-width" disabled={leaving} onClick={game.onGames}>Save & return to adventures<Icon name="arrow" size={17}/></button>{game.onLeave?<><button className="leave-button" disabled={game.busy||leaving} onClick={()=>{setLeaveError('');setLeave(true)}}>Leave party</button>{leave?<div className="setting-confirm" role="group" aria-label="Leave party confirmation"><p>Give up your seat? A companion takes over your character.</p><button className="button paper compact" disabled={leaving} onClick={()=>{setLeaveError('');setLeave(false)}}>Cancel</button><button className="button danger compact" disabled={game.busy||leaving} onClick={()=>void leaveParty()}>{leaving?'Leaving…':'Leave party'}</button>{leaveError?<p className="settings-leave-error" role="alert">{leaveError}</p>:null}</div>:null}</>:null}</div>:null}</>:null}
 </section></div></Modal>;
}
