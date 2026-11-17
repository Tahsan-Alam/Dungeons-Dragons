'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {GameOptions,HeroClass,ReplayArchive} from '../../game/types';
import {useSession} from './useSession';
import {useAudio} from './useAudio';
import {Menu,Setup,Lobby} from './Menu';
import Landing from './Landing';
import AppHeader from './AppHeader';
import Settings from './Settings';
import TooltipLayer from './TooltipLayer';
import {useControls} from './useControls';
import {bindingLabel,type ControlAction} from './controls';
import PlayTable from './PlayTable';
import Storyteller from './Storyteller';
import {SharedRollCard,bigMoment} from './RollCard';
import {useRollFeed} from './useRollFeed';
import GameLibrary from './GameLibrary';
import Replay from './Replay';
import {ShortcutReference} from './ControlsSettings';
import Modal from './Modal';
import Toast from './Toast';
import {Icon} from './Art';
import {RealmToolsContext} from './RealmKit';
import {currentNarration} from '../../game/ai';
import {nextNarrationCue} from './narration-cue';
import {storyGoal} from '../../game/campaign';
import {settingLine} from '../../game/lore';
import ChapterMap from './ChapterMap';
import ChapterOpening from './ChapterOpening';
import AskScene from './AskScene';
import AdventureEnd from './AdventureEnd';
import {routeView} from './route-map';
import {adventureRecap} from './recap';
import {addExchange,type Exchange} from './narrator-thread';
import './settings.css';

type Screen='home'|'games'|'solo'|'online'|'join'|'play'|'replay';
export default function GameApp(){
 const state=useSession(),audio=useAudio();const{preferences}=useControls();
 const[screen,setScreen]=useState<Screen>('home'),[modal,setModal]=useState<'help'|'ai'|'settings'|null>(null),[settingsTab,setSettingsTab]=useState<'appearance'|'controls'|'ai'>('appearance'),[chapter,setChapter]=useState(false),[chapterStep,setChapterStep]=useState<'map'|'opening'>('map'),[journalAsk,setJournalAsk]=useState<{tab:'dialogue';at:number}|null>(null),[code,setCode]=useState(''),[replay,setReplay]=useState<{archive:ReplayArchive;title:string}|null>(null);
 const[tableDialogOpen,setTableDialogOpen]=useState(false),[includeOpeningRolls,setIncludeOpeningRolls]=useState(false),[sharedRollPaused,setSharedRollPaused]=useState(false);
 const[setupBlocked,setSetupBlocked]=useState(false),[quick,setQuick]=useState(false);
 // The conversation with the narrator belongs to one adventure and survives closing the dialog.
 const[conversation,setConversation]=useState<{game:string|null;thread:Exchange[]}>({game:null,thread:[]});const setupLock=useRef(false),setupUrl=useRef('');
 const setSetupNavigationBlock=useCallback((blocked:boolean)=>{setupLock.current=blocked;if(blocked)setupUrl.current=location.href;setSetupBlocked(blocked);},[]);
 useEffect(()=>{if(!setupBlocked)return;const guard=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[setupBlocked]);
 const navigationEpoch=useRef(0),inviteRecovered=useRef(false),lastChapter=useRef(''),lastNarration=useRef('');const game=state.game;
 const rolls=useRollFeed(screen==='play'?state.activeId:null,screen==='play'?game:null,state.session?.playerId??'you',includeOpeningRolls);
 useEffect(()=>{const url=new URL(location.href),c=url.searchParams.get('room');if(c&&/^[A-Z]{6}$/i.test(c)){setCode(c.toUpperCase());setScreen('join')}else if(url.hash==='#games')setScreen('games')},[]);
 useEffect(()=>{const invite=new URL(location.href).searchParams.get('room')?.toUpperCase();if(invite&&state.libraryReady&&!inviteRecovered.current){inviteRecovered.current=true;const saved=state.library.find(g=>g.roomCode===invite&&g.status!=='unavailable');if(saved){const epoch=++navigationEpoch.current;void state.openSaved(saved.id).then(ok=>{if(epoch!==navigationEpoch.current){if(ok)state.backToLibrary();return}if(ok){lastNarration.current='';setScreen('play')}})}}},[state.libraryReady]);
 useEffect(()=>{if(screen==='play'&&game&&game.status==='playing'){const key=`${state.activeId}-${game.scene}`;if(key!==lastChapter.current){lastChapter.current=key;setChapterStep('map');setChapter(preferences.showChapterScenes)}}},[screen,game?.scene,state.activeId,game?.status,preferences.showChapterScenes]);
 useEffect(()=>{if(!game||screen!=='play')return;const cue=nextNarrationCue(game,state.activeId,lastNarration.current);if(cue){lastNarration.current=cue.key;audio.speak(cue.caption)}},[game?.eventSequence,game?.story?.narrations.length,audio.voice,screen,state.activeId]);
 async function start(name:string,cls:HeroClass,options:GameOptions,joinCode:string,heroId?:string){const epoch=++navigationEpoch.current;const ok=screen==='solo'?await state.startSolo(name,cls,options):screen==='online'?await state.createRoom(name,cls,options,heroId):await state.joinRoom(joinCode,name,cls,heroId);if(epoch!==navigationEpoch.current){if(ok)state.backToLibrary();return}if(!ok)return false;if(ok){if((screen==='solo'||screen==='online')&&!quick){try{localStorage.removeItem('painted-realms-creator-v2-'+screen);localStorage.removeItem('painted-realms-setup-v1-'+screen);}catch{}}setIncludeOpeningRolls(screen!=='join');lastChapter.current='';lastNarration.current='';setScreen('play')}}
 function silence(){if('speechSynthesis'in window)speechSynthesis.cancel()}
 function navigate(destination:'home'|'games',record=true){if(setupLock.current){if(!record&&setupUrl.current&&location.href!==setupUrl.current)history.pushState(null,'',setupUrl.current);return;}navigationEpoch.current++;setIncludeOpeningRolls(false);setSharedRollPaused(false);silence();setChapter(false);setModal(null);state.backToLibrary();setScreen(destination);const url=new URL(location.href);url.searchParams.delete('room');url.hash=destination==='games'?'games':'';if(record&&url.href!==location.href)history.pushState(null,'',url)}
 function newQuest(mode:'solo'|'online'){setQuick(false);setScreen(mode)}
 function quickQuest(){setQuick(true);setScreen('solo')}
 function menu(){navigate('games')}
 function home(){navigate('home')}
 useEffect(()=>{const restore=()=>navigate(location.hash==='#games'?'games':'home',false);window.addEventListener('popstate',restore);return()=>window.removeEventListener('popstate',restore)},[state.backToLibrary]);
 async function open(id:string){setIncludeOpeningRolls(false);const epoch=++navigationEpoch.current;const ok=await state.openSaved(id);if(epoch!==navigationEpoch.current){if(ok)state.backToLibrary();return}if(ok){const entry=state.library.find(g=>g.id===id);lastChapter.current=`${id}-${entry?.scene??0}`;lastNarration.current='';setScreen('play')}}
 async function watch(id:string){const epoch=++navigationEpoch.current;silence();const archive=await state.replayFor(id);if(epoch!==navigationEpoch.current)return;if(!archive){state.setError('There is no recorded play for this game yet.');return;}setChapter(false);setModal(null);setReplay({archive,title:state.library.find(g=>g.id===id)?.title||'Game replay'});state.backToLibrary();setScreen('replay')}
 function settings(){setSettingsTab('appearance');setModal('settings')}
 const tools={onHelp:()=>setModal('help'),onSettings:settings};
 const caption=game?currentNarration(game):'';
 const route=game?routeView(game):null;
 const listen=(line:string)=>{if(audio.voice){audio.speak(line);return}if(typeof window!=='undefined'&&'speechSynthesis' in window){window.speechSynthesis.cancel();window.speechSynthesis.speak(new SpeechSynthesisUtterance(line))}};
 const thread=conversation.game===state.activeId?conversation.thread:[];
 const recordExchange=(question:string,answer:string,local:boolean)=>{const id=state.activeId;setConversation(current=>({game:id,thread:addExchange(current.game===id?current.thread:[],question,answer,local)}))};
 const recap=screen==='play'&&game&&game.status!=='playing'?adventureRecap(game):null;
 const keys=(actions:ControlAction[])=>actions.map(action=>preferences.bindings[action].find(Boolean)).filter(Boolean).map(key=>bindingLabel(key!)).join(' / ');
 const recent=state.library.filter(entry=>!entry.archived&&(entry.status==='playing'||entry.status==='lobby')).sort((a,b)=>b.updatedAt-a.updatedAt)[0];
 return <><div data-screen={screen} className={`app-root ${screen==='play'||screen==='replay'||screen==='solo'||screen==='online'||screen==='join'?'immersive':''}`}>{screen==='play'?null:<AppHeader inert={setupBlocked} active={screen==='home'?'home':screen==='games'?'games':null} onHome={home} onGames={menu} onHelp={()=>setModal('help')} onSettings={settings}/>}<div className="app-content">
 {screen==='home'?<Landing disabled={state.busy||!state.libraryReady} onNew={newQuest} onQuick={quickQuest} onJoin={()=>setScreen('join')} onGames={menu} onHelp={()=>setModal('help')} onSettings={settings} resumeTitle={recent?.title} onResume={recent?()=>void open(recent.id):undefined}/>:screen==='games'?<Menu disabled={state.busy||!state.libraryReady} onNew={newQuest} onJoin={()=>setScreen('join')} onHelp={()=>setModal('help')} onSettings={settings}><GameLibrary games={state.library} ready={state.libraryReady} busy={state.busy} onOpen={open} onReplay={watch} onUpdate={state.updateSaved} onDelete={state.deleteSaved}/></Menu>:screen==='replay'&&replay?<Replay key={replay.title} archive={replay.archive} title={replay.title} onBack={menu} onSettings={settings} suspended={!!modal}/>:screen==='solo'||screen==='online'||screen==='join'?<RealmToolsContext.Provider value={tools}><Setup key={quick?'quick':'custom'} mode={screen} quick={quick&&screen==='solo'} onBack={home} onStart={start} busy={state.busy} initialCode={code} onAISettings={()=>{setSettingsTab('ai');setModal('settings')}} onNavigationBlockChange={setSetupNavigationBlock}/></RealmToolsContext.Provider>:state.room&&!state.room.game&&state.session?<Lobby room={state.room} session={state.session} busy={state.busy} command={state.command} onMenu={menu}/>:game?<PlayTable key={state.activeId??'table'} game={game} room={state.room} session={state.session} busy={state.busy} connection={state.connection} onAction={state.action} onMenu={menu} onHelp={()=>setModal('help')} onAI={()=>setModal('ai')} onSettings={settings} onTableDialogChange={setTableDialogOpen} voice={audio.voice} speaking={audio.speaking} onVoice={audio.toggleVoice} music={audio.music} onMusic={audio.toggleMusic} onSkip={()=>state.command({type:'skip'})} rollsPending={rolls.queue.length>0} thread={thread} onListen={listen} journalRequest={journalAsk} onNarrate={state.narrate} onSteer={state.steer}/>:<div className="loading-screen"><p>Game disconnected. Your saved games are still available.</p><button className="button paper" onClick={menu}>Adventures</button></div>}
 </div> </div>
 {state.error?<Toast message={state.error} onDismiss={()=>state.setError('')}/>:null}
 {chapter&&screen==='play'&&game?.status==='playing'&&route&&chapterStep==='map'?<ChapterMap key={`map-${state.activeId}-${game.scene}`} game={game} view={route} onClose={()=>setChapterStep('opening')}/>:null}
 {chapter&&screen==='play'&&game?.status==='playing'&&(!route||chapterStep==='opening')?<ChapterOpening key={`open-${state.activeId}-${game.scene}`} game={game} caption={caption} talking={audio.speaking} onReplay={listen} onClose={()=>setChapter(false)}/>:null}
 {screen==='play'&&game&&recap&&!rolls.queue.length?<AdventureEnd key={`end-${state.activeId}`} game={game} caption={caption} onReplay={state.activeId?()=>void watch(state.activeId!):undefined} onAdventures={menu} onNewQuest={home}/>:null}
 {modal==='help'?<Modal title="Adventurer’s guide" onClose={()=>setModal(null)} wide><div className="help-grid"><div><h3>Your turn</h3><ol className="help-steps"><li><strong>Move</strong> by selecting a highlighted tile{keys(['moveUp','moveDown','moveLeft','moveRight'])?<> or using <kbd>{keys(['moveUp','moveDown','moveLeft','moveRight'])}</kbd></>:null}. Each move uses part of your movement allowance.</li><li><strong>Take one action:</strong> attack, use a class power, guard, or drink a potion.</li><li><strong>End turn</strong> to let the next player act. Companions and enemies play automatically.</li></ol><p>Defeat the enemies, move beside the chest to open it, then reach the gateway. Collect each chapter’s shard and use the final gateway to finish.</p></div><div><h3>Board controls</h3><ul className="help-list"><li>Drag to pan{keys(['panUp','panDown','panLeft','panRight'])?<> or use <kbd>{keys(['panUp','panDown','panLeft','panRight'])}</kbd></>:null}. Scroll or pinch to zoom.</li><li>Hover a reachable tile to preview its route and cost.</li><li>Switch between the scene and the tactical map with Map beside the zoom buttons, or in Table settings. Direction keys follow the same grid in either view.</li><li>Select a foe to see its card: armour, distance, what you need to hit, and the attack that uses it. Select your portrait for your hero sheet.</li><li>Journal keeps the log, your questions to the Game Master and the story’s pace.</li><li>Leave the table (the arrow at the top right) to return to Adventures. Your game is saved.</li></ul></div></div><div className="help-shortcuts"><ShortcutReference/><button className="text-button" onClick={()=>{setSettingsTab('controls');setModal('settings')}}>Customize shortcuts<Icon name="arrow" size={15}/></button></div><details className="rules-details"><summary>Rules</summary><p>Streamlined has reliable hits and forgiving recovery. Classic adds initiative, armor checks, critical hits and death saves. Both use custom characters and powers; Classic is a subset of D&D, not the complete ruleset.</p></details><details className="credits"><summary>Attribution</summary><p>This work includes material taken from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC and available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.</p></details></Modal>:null}
 {modal==='ai'&&screen==='play'&&game?<AskScene game={game} room={state.room} session={state.session} thread={thread} talking={audio.speaking} onExchange={recordExchange} onListen={listen} onDialogue={()=>{setModal(null);setJournalAsk({tab:'dialogue',at:Date.now()})}} onClose={()=>setModal(null)}/>:null}
 {modal==='ai'&&!(screen==='play'&&game)?<Modal title={`Ask ${game?.options.creation?.narrator.name??'Pip'}`}  onClose={()=>setModal(null)} wide><Storyteller game={game} room={state.room} session={state.session} narrate={state.narrate} steer={state.steer} busy={state.busy} preferences={audio.preferences} automaticSpeaking={audio.speaking} thread={thread} onExchange={recordExchange}/></Modal>:null}

 {modal==='settings'?<Settings onClose={()=>setModal(null)} initialSection={settingsTab} audio={audio} onAI={()=>setModal('ai')} game={screen==='play'?{kind:state.room?'online':'solo',roomCode:state.room?.code,seed:game?.options.seed||state.room?.options.seed,onGames:menu,onLeave:state.room?async()=>!!(await state.command({type:'leave'})):undefined,busy:state.busy}:undefined}/>:null}

 {screen==='play'&&game&&rolls.queue[0]&&!modal&&!(chapter&&game.status==='playing')&&!tableDialogOpen?<div className="roll-dock ph-ui"><SharedRollCard key={rolls.queue[0].event.id} roll={rolls.queue[0]} remaining={rolls.queue.length} paused={sharedRollPaused} big={bigMoment(rolls.queue[0].event,game)} onPausedChange={setSharedRollPaused} onDone={()=>rolls.dismiss(rolls.queue[0].event.id)}/></div>:null}
 <TooltipLayer/>
 </>
}
