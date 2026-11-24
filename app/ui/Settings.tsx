'use client';
import {useEffect,useId,useRef,useState} from 'react';
import type {CSSProperties} from 'react';
import Modal from './Modal';
import {Icon} from './Art';
import {useTheme} from './Theme';
import type {useAudio} from './useAudio';
import {ACCENT_NAMES,ACCENT_PALETTES} from './appearance';
import ControlsSettings from './ControlsSettings';
import {useAIPreference} from './ai-preferences';
import AISettings from './AISettings';
import {Chooser,KeyHints,MenuRow,Notches,OnOff,moveBetweenControls} from './MenuKit';
import './settings.css';
import './options-menu.css';
export type SettingsSection='appearance'|'audio'|'controls'|'game'|'ai';
export interface SettingsProps{
 onClose:()=>void;onAI:()=>void;initialSection?:SettingsSection;
 audio:ReturnType<typeof useAudio>;
 game?:{kind:'solo'|'online';roomCode?:string;seed?:string;onGames:()=>void;onLeave?:()=>Promise<boolean>;busy?:boolean};
}
const SECTIONS=[['appearance','The look'],['audio','Sound'],['controls','Controls'],['game','At the table'],['ai','Storyteller']] as const;
export default function Settings({onClose,onAI,audio,game,initialSection='appearance'}:SettingsProps){
 const[aiEnabled,setAIEnabled]=useAIPreference();
 const[section,setSection]=useState<SettingsSection>(initialSection),[leave,setLeave]=useState(false),[leaving,setLeaving]=useState(false),[leaveError,setLeaveError]=useState(''),[copied,setCopied]=useState(false),[copyMessage,setCopyMessage]=useState('');
 const{colorMode,setColorMode,accent,setAccent,motion,setMotion,viewMode,setViewMode}=useTheme();const id=useId(),tabs=useRef<Array<HTMLButtonElement|null>>([]),panel=useRef<HTMLElement>(null),copyTimer=useRef<ReturnType<typeof setTimeout>|null>(null),leavePending=useRef(false);
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
 const accentIndex=ACCENT_NAMES.indexOf(accent);
 const stepAccent=(next:number)=>{if(next>=0&&next<ACCENT_NAMES.length)setAccent(ACCENT_NAMES[next])};
 return <Modal title="Table settings" className="game-menu options-menu" escHint={game?'Back to the table':'Back'} onClose={onClose} wide dismissible={!leaving}><div className="settings-shell"><nav className="settings-navigation" role="tablist" aria-label="Settings sections" aria-orientation="vertical">{SECTIONS.map(([key,label],index)=><button key={key} ref={el=>{tabs.current[index]=el}} id={`${id}-${key}-tab`} role="tab" disabled={leaving} aria-selected={section===key} aria-controls={`${id}-${key}-panel`} tabIndex={section===key?0:-1} onClick={()=>setSection(key)} onKeyDown={event=>{let next:number|undefined;if(['ArrowDown','ArrowRight'].includes(event.key))next=(index+1)%SECTIONS.length;if(['ArrowUp','ArrowLeft'].includes(event.key))next=(index+SECTIONS.length-1)%SECTIONS.length;if(event.key==='Home')next=0;if(event.key==='End')next=SECTIONS.length-1;if(next!==undefined){event.preventDefault();select(next)}}}>{label}</button>)}</nav>
 <section key={section} ref={panel} className="settings-content" id={`${id}-${section}-panel`} role="tabpanel" aria-labelledby={`${id}-${section}-tab`} tabIndex={-1} onKeyDown={moveBetweenControls}>
 {section==='ai'?<AISettings onAbout={onAI}/>:null}
 {section==='appearance'?<>
 <MenuRow name="Time of day" id={`${id}-time`} why="Night darkens the board, and its lamps, torches and shrines light it."><Chooser label="Time of day" describedBy={`${id}-time`} options={[{value:'light',label:'Day'},{value:'dark',label:'Night'},{value:'system',label:'Your device'}]} value={colorMode} onChange={setColorMode}/></MenuRow>
 <MenuRow name="View" id={`${id}-view`} why="The scene shows your party standing in the world. The tactical map shows the same board from above. Your view only."><Chooser label="View" describedBy={`${id}-view`} options={[{value:'2.5d',label:'Scene'},{value:'2d',label:'Tactical map'}]} value={viewMode} onChange={setViewMode}/></MenuRow>
 <MenuRow name="Banner colour" id={`${id}-banner`} why="The colour of your buttons, rings and markers."><div className="mk-gems" role="slider" tabIndex={0} aria-label="Banner colour" aria-describedby={`${id}-banner`} aria-valuemin={0} aria-valuemax={ACCENT_NAMES.length-1} aria-valuenow={accentIndex} aria-valuetext={accent[0].toUpperCase()+accent.slice(1)} data-menu-control="" onKeyDown={event=>{if(event.key==='ArrowLeft'){event.preventDefault();stepAccent(accentIndex-1)}else if(event.key==='ArrowRight'){event.preventDefault();stepAccent(accentIndex+1)}}}>{ACCENT_NAMES.map(name=><button key={name} type="button" tabIndex={-1} className={`mk-gem${accent===name?' on':''}`} aria-label={name[0].toUpperCase()+name.slice(1)} aria-pressed={accent===name} onClick={()=>setAccent(name)} style={{'--gem':ACCENT_PALETTES[name].dark.accent} as CSSProperties}/>)}<span className="mk-gem-name">{accent}</span></div></MenuRow>
 <MenuRow name="Motion" id={`${id}-motion`} why="Figures walking, the camera and menu animations."><Chooser label="Motion" describedBy={`${id}-motion`} options={[{value:'system',label:'Your device'},{value:'full',label:'Full'},{value:'reduced',label:'Reduced'}]} value={motion} onChange={setMotion}/></MenuRow>
 <p className="mk-aside">Only you see these choices; the party keeps its own.</p>
 </>:null}
 {section==='audio'?<>
 <h4 className="mk-group">Table sounds</h4>
 <MenuRow name="Interface sounds" why="Soft, tactile clicks."><OnOff label="Interface sounds" on={audio.interfaceSounds} onChange={()=>audio.toggleInterfaceSounds()}/></MenuRow>
 <MenuRow name="Volume"><Notches label="Interface volume" value={audio.preferences.interfaceVolume} onChange={audio.setInterfaceVolume}/><button type="button" className="mk-link" data-ui-sound="off" disabled={audio.preferences.interfaceVolume===0} onClick={audio.previewSound}>Try it</button></MenuRow>
 <MenuRow name="Pointing sounds" why="A click when you point at or move between choices."><OnOff label="Hover and keyboard focus sounds" on={audio.preferences.hoverSounds} onChange={audio.setHoverSounds}/></MenuRow>
 {audio.soundError?<p className="settings-audio-error" role="status">{audio.soundError}</p>:null}
 <h4 className="mk-group">The narrator</h4>
 <MenuRow name="Narration" why={audio.available?'Your device’s voice reads the story aloud.':'Your browser has no voice to read the story.'}><OnOff label="Spoken narration" disabled={!audio.available} on={audio.voice} onChange={()=>audio.toggleVoice()}/></MenuRow>
 <MenuRow name="Voice volume"><Notches label="Narration volume" disabled={!audio.available} value={audio.preferences.voiceVolume} onChange={audio.setVoiceVolume}/></MenuRow>
 <MenuRow name="Voice speed"><Notches label="Narration speed" disabled={!audio.available} min={.5} max={1.5} value={audio.preferences.speechRate} format={v=>`${v.toFixed(1)}×`} onChange={audio.setSpeechRate}/><button type="button" className="mk-link" disabled={!audio.available} onClick={audio.previewVoice}>Hear a line</button></MenuRow>
 <h4 className="mk-group">Music</h4>
 <MenuRow name="Music" why="Quiet background notes. They pause while you’re away."><OnOff label="Background music" on={audio.music} onChange={()=>audio.toggleMusic()}/></MenuRow>
 <MenuRow name="Music volume"><Notches label="Music volume" value={audio.preferences.musicVolume} onChange={audio.setMusicVolume}/></MenuRow>
 </>:null}
 {section==='controls'?<ControlsSettings section="bindings"/>:null}
 {section==='game'?<><MenuRow name="AI adventures" id={`${id}-ai`} why="Personal quests and characters for new adventures."><OnOff label="AI adventures" describedBy={`${id}-ai`} on={aiEnabled} onChange={setAIEnabled}/></MenuRow><ControlsSettings section="interaction"/><button className="settings-link" disabled={leaving} onClick={onAI}><span>Ask Pip</span><Icon name="arrow" size={17}/></button>{game?<div className="current-game-settings"><h4>{game.kind==='online'?`Party ${game.roomCode}`:'This adventure'}</h4>{game.seed?<div className="seed-setting"><div><span>Seed</span><code>{game.seed}</code></div><button className="mk-link" onClick={()=>void copySeed()}>{copied?'Copied':'Copy'}</button></div>:null}{copyMessage?<p className="settings-description" role="status">{copyMessage}</p>:null}<p className="settings-description">{game.kind==='solo'?'Solo play pauses when you leave.':'Other players can continue while you are away.'}</p><button className="button primary full-width" disabled={leaving} onClick={game.onGames}>Save &amp; return to adventures<Icon name="arrow" size={17}/></button>{game.onLeave?<><button className="mk-link danger leave-party" disabled={game.busy||leaving} onClick={()=>{setLeaveError('');setLeave(true)}}>Leave party</button>{leave?<div className="setting-confirm" role="group" aria-label="Leave party confirmation"><p>Give up your seat? A companion takes over your character.</p><button className="button paper compact" disabled={leaving} onClick={()=>{setLeaveError('');setLeave(false)}}>Cancel</button><button className="button danger compact" disabled={game.busy||leaving} onClick={()=>void leaveParty()}>{leaving?'Leaving…':'Leave party'}</button>{leaveError?<p className="settings-leave-error" role="alert">{leaveError}</p>:null}</div>:null}</>:null}</div>:null}</>:null}
 </section>
 <footer className="options-foot"><KeyHints hints={[[['↑','↓'],'Choose'],[['←','→'],'Change'],[['Esc'],game?'Back to the table':'Back']]}/><span className="options-kept">Kept on this device · changes apply at once</span></footer>
 </div></Modal>;
}
