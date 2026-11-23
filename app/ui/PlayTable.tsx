'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {Actor,GameAction,GameState,RoomView,Session} from '../../game/types';
import {CLASS_INFO,NO_ROLL_ABILITY,SUPPORT_ABILITY} from '../../game/types';
import {CLASS,encounterCleared,getReachable,getQuestAction,getValidTargets} from '../../game/engine';
import {currentNarration} from '../../game/ai';
import {storyGoal} from '../../game/campaign';
import {KEEPER_PROFILE,armorOf} from '../../game/keepers';
import {GAME_MASTERS,GAME_MASTER_ART_RATIO} from '../../game/presets';
import Board,{type Tool,type BoardControls} from './Board';
import {Icon} from './Art';
import {ActorPortrait} from './ActorArt';
import {heroArtFor} from './actor-art';
import Modal from './Modal';
import {Portrait} from './RealmKit';
import NarratorAvatar from './NarratorAvatar';
import JournalDrawer,{type JournalEntry,type JournalTab} from './JournalDrawer';
import {OwnRoll} from './RollCard';
import {prepareAttackRoll,findAttackRollResult,type AttackRollRequest} from './attack-roll';
import {useControls} from './useControls';
import {actionForKey,bindingLabel,eventBinding,type ControlAction} from './controls';
import {turnGuidance} from './turn-guidance';
import {upcomingTurns} from './turn-order';
import {healthLevel} from './readability';
import type {Exchange} from './narrator-thread';
import './controls.css';
import './realm-kit.css';
import './play-hud.css';

const ROMAN=['I','II','III','IV','V'];
const tiles=(a:{x:number;y:number},b:{x:number;y:number})=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);

type Props={game:GameState;room:RoomView|null;session:Session|null;busy:boolean;connection:string;onAction:(a:GameAction)=>unknown;onMenu:()=>void;onHelp:()=>void;onAI:()=>void;onSettings:()=>void;onTableDialogChange:(open:boolean)=>void;
 voice:boolean;speaking?:boolean;onVoice:()=>void;music:boolean;onMusic:()=>void;onSkip:()=>void;rollsPending?:boolean;
 thread?:Exchange[];onListen?:(line:string)=>void;onNarrate?:()=>unknown;onSteer?:(text:string)=>Promise<unknown>;
 /** Opens the Journal on a tab from outside, for example Ask’s Dialogue Log. */
 journalRequest?:{tab:JournalTab;at:number}|null};

/** The play screen: the board fills the window and the controls float over the scene (design canvas, Play screen page). */
export default function PlayTable({game,room,session,busy,connection,onAction,onMenu,onHelp,onAI,onSettings,onTableDialogChange,voice,speaking=false,onVoice,music,onMusic,onSkip,rollsPending=false,thread=[],onListen,onNarrate,onSteer,journalRequest}:Props){
 const {preferences}=useControls();const board=useRef<BoardControls>(null),journalOpener=useRef<HTMLElement|null>(null),actionPending=useRef(false);
 const[confirmEnd,setConfirmEnd]=useState(false),[moving,setMoving]=useState(false),[tool,setTool]=useState<Tool>('move'),[selectedId,setSelectedId]=useState(''),[detailId,setDetailId]=useState<string|null>(null);
 const[ownRoll,setOwnRoll]=useState<{request:AttackRollRequest;label:string}|null>(null),[journal,setJournal]=useState<JournalTab|null>(null),[sideTab,setSideTab]=useState<'party'|'foes'>('party'),[soundOpen,setSoundOpen]=useState(false),[sideOpen,setSideOpen]=useState(false),[seen,setSeen]=useState(game.eventSequence),[rollShown,setRollShown]=useState(false);
 const detail=game.actors.find(a=>a.id===detailId);
 const tableDialogOpen=!!detail||confirmEnd;
 useEffect(()=>{onTableDialogChange(tableDialogOpen);return()=>onTableDialogChange(false)},[tableDialogOpen,onTableDialogChange]);
 const me=session?.playerId||'you',actor=game.actors.find(a=>a.id===game.activeActorId),mine=game.actors.find(a=>a.playerId===me);
 const myTurn=!!actor&&!actor.bot&&actor.playerId===me&&game.status==='playing';
 const clear=encounterCleared(game),quest=getQuestAction(game,actor),target=game.actors.find(a=>a.id===selectedId);
 useEffect(()=>{setTool('move')},[game.activeActorId,game.round,game.scene]);
 // eslint-disable-next-line react-hooks/set-state-in-effect -- an outside request (Ask’s Dialogue Log) opens the drawer once
 useEffect(()=>{if(journalRequest)setJournal(journalRequest.tab)},[journalRequest]);
 useEffect(()=>{if(!selectedId&&mine)setSelectedId(mine.id)},[selectedId,mine]);
 function act(a:GameAction){
  if(busy||!myTurn||actionPending.current||board.current?.isInteracting()||board.current?.isMoving())return;
  actionPending.current=true;
  try{const result=onAction(a);if(a.type==='attack'||a.type==='ability')setTool('move');return Promise.resolve(result).then(value=>{actionPending.current=false;return value},()=>{actionPending.current=false})}catch(error){actionPending.current=false;throw error}
 }
 function step(dx:number,dy:number){
  if(!actor||!myTurn||busy||moving||actionPending.current||board.current?.isMoving())return;
  const x=actor.x+dx,y=actor.y+dy;
  if(getReachable(game,actor).some(tile=>tile.x===x&&tile.y===y)){setTool('move');act({type:'move',x,y})}
 }
 const locked=busy||moving||!!ownRoll;
 const shortcut=(action:ControlAction)=>bindingLabel(preferences.bindings[action][0]||preferences.bindings[action][1]);
 function actionTip(action:'move'|'attack'|'ability'|'guard'|'potion'|'end'){
  const descriptions={move:'Choose a reachable tile, or use your movement keys.',attack:'Choose an enemy within range, then attack from its card.',ability:mine?`${CLASS_INFO[mine.heroClass].ability}. ${mine.abilityUses} uses left.`:'Use your class power.',guard:'Defend yourself until your next turn.',potion:'Drink a potion to restore health.',end:'Finish your turn and let the next character act.'};
  const reason=!myTurn?'Wait for your turn.':busy?'Saving your action.':moving?'Movement is in progress.':action!=='move'&&action!=='end'&&actor?.actionUsed?'You have used your action.':action==='potion'&&!actor?.potions?'No potions remaining.':action==='potion'&&actor&&actor.hp>=actor.maxHp?'Your health is full.':action==='ability'&&!actor?.abilityUses?'No power uses remaining.':'';
  return `${descriptions[action]}${reason?' '+reason:''}`;
 }
 function openJournal(tab:JournalTab='log'){if(journal===tab){closeJournal();return}if(!journal)journalOpener.current=document.activeElement as HTMLElement;setSeen(game.eventSequence);setJournal(tab)}
 function closeJournal(){setJournal(null);setSeen(game.eventSequence);requestAnimationFrame(()=>{if(journalOpener.current?.isConnected)journalOpener.current.focus()})}
 function endTurn(){if(!myTurn||locked||board.current?.isMoving())return;if(preferences.confirmEnd&&!actor?.actionUsed&&!clear)setConfirmEnd(true);else act({type:'end'})}
 /** Attacks and attacking powers roll straight away; healing and support powers act without a roll. */
 function targetWith(action:Extract<GameAction,{targetId:string}>){
  if(!actor||!myTurn||locked||actionPending.current||board.current?.isInteracting()||board.current?.isMoving())return;
  const request=prepareAttackRoll(game,actor,action);
  if(!request){act(action);return}
  setRollShown(false);setOwnRoll({request,label:`${request.title} · ${actor.name} → ${request.targetName}`});
  void act(action);
 }
 useEffect(()=>{const handler=(e:KeyboardEvent)=>{
  if(board.current?.isInteracting()||e.defaultPrevented||e.isComposing||document.querySelector('dialog[open]'))return;const el=e.target as HTMLElement;if(el?.closest('input,textarea,select,[contenteditable=true]'))return;
  if(e.key==='Escape'&&(journal||soundOpen)){e.preventDefault();if(soundOpen)setSoundOpen(false);else closeJournal();return}
  if(el?.closest('[role=tablist]'))return;if((e.key==='Enter'||e.key===' ')&&el?.closest('button,a,[role=button]'))return;
  const action=actionForKey(preferences.bindings,eventBinding(e));if(!action)return;if(e.repeat&&!['moveUp','moveDown','moveLeft','moveRight','panUp','panDown','panLeft','panRight','zoomIn','zoomOut'].includes(action))return;
  const boardActions:Partial<Record<ControlAction,()=>void>>={fit:()=>board.current?.fit(),focus:()=>board.current?.focusActor(),zoomIn:()=>board.current?.zoomIn(),zoomOut:()=>board.current?.zoomOut(),grid:()=>board.current?.toggleGrid(),panUp:()=>board.current?.pan(0,50),panDown:()=>board.current?.pan(0,-50),panLeft:()=>board.current?.pan(50,0),panRight:()=>board.current?.pan(-50,0),
   party:()=>(document.querySelector('.ph-side [role=tab][aria-selected=true]') as HTMLElement|null)?.focus(),story:()=>openJournal('log'),settings:onSettings,menu:onMenu};
  if(boardActions[action]){e.preventDefault();boardActions[action]!();return}if(!myTurn||locked)return;
  const direction:Partial<Record<ControlAction,[number,number]>>={moveUp:[0,-1],moveDown:[0,1],moveLeft:[-1,0],moveRight:[1,0]};if(direction[action]){e.preventDefault();step(...direction[action]!);return;}
  if(action==='move'){e.preventDefault();setTool('move')}else if(action==='attack'&&!actor?.actionUsed){e.preventDefault();setTool('attack')}else if(action==='ability'&&!actor?.actionUsed&&actor?.abilityUses){e.preventDefault();setTool('ability')}else if(action==='end'){e.preventDefault();endTurn()}else if(action==='guard'&&!actor?.actionUsed){e.preventDefault();act({type:'guard'})}else if(action==='potion'&&!actor?.actionUsed&&actor?.potions&&actor.hp<actor.maxHp){e.preventDefault();act({type:'potion'})}else if(action==='interact'&&quest?.available){e.preventDefault();act({type:quest.type})}
 };window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler)},[preferences.bindings,preferences.confirmEnd,myTurn,busy,moving,ownRoll,actor,game.chest.opened,clear,journal,soundOpen,onMenu,onSettings,onAction]);
 /** Choosing a character selects it; with Attack or Power chosen, a valid target is used at once. */
 function clickActor(a:Actor){
  setSelectedId(a.id);if(a.enemy)setSideTab('foes');
  if(myTurn&&(tool==='attack'||tool==='ability')&&actor&&getValidTargets(game,actor,tool==='ability').some(t=>t.id===a.id)){targetWith({type:tool,targetId:a.id});return}
  if(!a.enemy&&a.id!==mine?.id)setDetailId(a.id);
 }
 const party=game.actors.filter(a=>!a.enemy),foes=game.actors.filter(a=>a.enemy&&!a.defeated&&a.hp>0);const turns=useMemo(()=>upcomingTurns(game),[game]);
 const entries=useMemo(()=>{const list:JournalEntry[]=[...game.events.slice(-45).map(event=>({key:`event-${event.id}`,at:event.id,event})),...(game.story?.narrations.slice(-10)??[]).map(narration=>({key:`narration-${narration.eventId}`,at:narration.eventId,narration}))];return list.sort((a,b)=>b.at-a.at||Number(!!b.narration)-Number(!!a.narration))},[game.events,game.story?.narrations]);
 const narrator=game.options.creation?.narrator,narratorName=narrator?.name??'Storyteller',gm=GAME_MASTERS.find(g=>g.profile.name===narrator?.name);
 const caption=currentNarration(game),host=!room||room.hostId===session?.playerId;
 const turnRole=(a:Actor)=>a.enemy?'Enemy':a.id===mine?.id?'You':a.bot?'Companion':'Player';
 const turnWhen=(index:number)=>index===0?'acting now':index===1?'up next':`in ${index} turns`;
 const currentPlayer=room?.players.find(p=>p.id===actor?.playerId);const canSkip=!!room&&room.hostId===session?.playerId&&!!currentPlayer&&!currentPlayer.bot&&Date.now()-currentPlayer.lastSeen>45000;
 const hint=busy?'Saving your action…':moving?'Moving…':turnGuidance(game,actor,myTurn,tool);
 const goal=storyGoal(game),fresh=journal===null&&(entries.find(e=>e.narration||e.event?.kind==='story')?.at??0)>seen;
 const ownResult=ownRoll?findAttackRollResult(game,ownRoll.request):undefined;
 // The selected foe's card: what an attack needs, and the action that uses it.
 const foe=target?.enemy&&!target.defeated?target:undefined,stats=mine?CLASS[mine.heroClass]:undefined;
 const inReach=!!(foe&&actor&&myTurn&&getValidTargets(game,actor).some(t=>t.id===foe.id));
 const powerReach=!!(foe&&actor&&myTurn&&!SUPPORT_ABILITY[actor.heroClass]&&actor.abilityUses>0&&getValidTargets(game,actor,true).some(t=>t.id===foe.id));
 const need=foe&&stats?game.options.rules==='simple'?'Anything but a 1':`${Math.max(2,armorOf(foe)-stats.bonus)} or more on the die`:'';
 return <div className={`play-screen ph realm${ownRoll||rollsPending?' rolling':''}${foe?' foe-open':''}`}>
  <div className="ph-board">
   <Board controlsRef={board} focusId={mine?.id} game={game} actor={actor} tool={tool} onTile={(x,y)=>{if(myTurn&&tool==='move')act({type:'move',x,y})}} onActor={clickActor} selectedId={selectedId} myTurn={myTurn&&!locked} onMotionChange={setMoving} autoFrame holdFeedback={(!!ownRoll&&!rollShown)||rollsPending}/>
  </div>
  <div className="ph-shade top" aria-hidden="true"/><div className="ph-shade bottom" aria-hidden="true"/>

  <header className="ph-top ph-ui">
   <div className="ph-title"><span className="realm-eyebrow">Chapter {ROMAN[game.scene]??game.scene+1} of {ROMAN[goal-1]??goal} · Round {game.round} · {game.options.rules==='simple'?'Streamlined':'Classic'}</span><h1>{game.sceneName}</h1></div>
   <p className="ph-objective"><Icon name="flag" size={15}/><span><strong>Objective</strong> · {game.objective}</span><span className="ph-shards" aria-label={`${game.relics} of ${goal} lantern shards`}>{Array.from({length:goal},(_,i)=><i key={i} className={i<game.relics?'on':''}/>)}</span></p>
   <div className="ph-tools" role="group" aria-label="Journal, sound, guide, settings and leave">
    <button type="button" className="ph-tool phone-only" aria-label="Party and foes" data-tooltip="Party and foes" aria-expanded={sideOpen} onClick={()=>setSideOpen(!sideOpen)}><Icon name="people" size={17}/></button>
    <button type="button" className="ph-tool wide" aria-expanded={!!journal} onClick={()=>openJournal('log')}><Icon name="book" size={16}/>Journal{fresh?<span className="ph-dot" aria-label="New entries"/>:null}</button>
    <div className="ph-sound"><button type="button" className="ph-tool" aria-label="Music and voice" data-tooltip="Music and voice" aria-expanded={soundOpen} onClick={()=>setSoundOpen(!soundOpen)}><Icon name={music||voice?'sound':'mute'} size={17}/></button>
     {soundOpen?<div className="ph-popover" role="group" aria-label="Sound"><label><input type="checkbox" checked={music} onChange={onMusic}/>Music</label><label><input type="checkbox" checked={voice} onChange={onVoice}/>{narratorName}’s voice</label></div>:null}</div>
    <button type="button" className="ph-tool" aria-label="Adventurer’s guide" data-tooltip="Adventurer’s guide" onClick={onHelp}><Icon name="book" size={17}/></button>
    <button type="button" className="ph-tool" aria-label="Table settings" data-tooltip="Table settings" onClick={onSettings}><Icon name="gear" size={17}/></button>
    <button type="button" className="ph-tool" aria-label="Leave the table" data-tooltip="Leave the table · your game is saved" onClick={onMenu}><Icon name="back" size={17}/></button>
   </div>
  </header>

  {turns.length>1?<ol className="ph-turns ph-ui" aria-label={`Turn order · round ${game.round}`}>{turns.map((slot,index)=><li key={slot.actor.id} className={slot.nextRound?'round-break':undefined}>{slot.nextRound?<span className="ph-round" title={`Round ${game.round+1}`}>R{game.round+1}</span>:null}
   <button type="button" className={`ph-turn ${slot.current?'now':''} ${slot.actor.enemy?'foe':'ally'}`} aria-current={slot.current?'true':undefined} aria-label={`${slot.actor.name}, ${turnRole(slot.actor)}, ${turnWhen(index)}`} data-tooltip={`${slot.actor.name} · ${turnRole(slot.actor)} · ${turnWhen(index)}`} onClick={()=>{setSelectedId(slot.actor.id);if(slot.actor.enemy)setSideTab('foes')}}><ActorPortrait actor={slot.actor} biome={game.options.biome}/></button>
   {index===0?<span className="ph-turn-label">Now</span>:index===1?<span className="ph-turn-label">Next</span>:null}
   {slot.current&&canSkip?<button type="button" className="ph-skip" disabled={busy} onClick={onSkip}>Away · Skip</button>:null}</li>)}</ol>:null}

  <section className={`ph-side ph-glass ph-ui${sideOpen?' open':''}`} aria-label="Party and foes">
   <div role="tablist" className="ph-tabs small"><button type="button" role="tab" aria-selected={sideTab==='party'} tabIndex={sideTab==='party'?0:-1} onClick={()=>setSideTab('party')}>Party</button><button type="button" role="tab" aria-selected={sideTab==='foes'} tabIndex={sideTab==='foes'?0:-1} onClick={()=>setSideTab('foes')}>Foes · {foes.length}</button></div>
   <ul role="tabpanel">{(sideTab==='party'?party:foes).map(a=><li key={a.id}><button type="button" className={`ph-member ${a.id===game.activeActorId?'active':''} ${a.id===selectedId?'selected':''} ${a.hp<=0?'fallen':''}`} onClick={()=>{setSelectedId(a.id);if(!a.enemy)setDetailId(a.id)}}>
    <span className="ph-face"><ActorPortrait actor={a} biome={game.options.biome}/></span>
    <span className="ph-member-info"><span className="ph-member-name">{a.name}{a.id===mine?.id?<i> · you</i>:null}<b>{a.hp}/{a.maxHp}</b></span><span className={`ph-bar ${a.enemy?'foe':''} health-${healthLevel(a.hp,a.maxHp)}`}><span style={{width:`${Math.max(0,a.hp/a.maxHp)*100}%`}}/></span>{a.hp<=0?<small>Down</small>:a.guarding?<small>Guarding</small>:null}</span>
   </button></li>)}{sideTab==='foes'&&!foes.length?<li className="ph-note">No foes stand.</li>:null}</ul>
  </section>

  <section className="ph-gm ph-glass ph-ui" aria-label={narratorName}>
   {gm?<Portrait art={gm.art} face={gm.face} ratio={GAME_MASTER_ART_RATIO} width={44} height={44} scale={2.4} eye={0.4}/>:<NarratorAvatar profile={narrator} size={44} talking={speaking}/>}
   <div><p>“{caption}”</p><span className="ph-row">{onListen?<button type="button" className="ph-link" onClick={()=>onListen(caption)}><Icon name="sound" size={13}/>Listen</button>:null}<button type="button" className="ph-link" onClick={onAI}><Icon name="book" size={13}/>Ask {narratorName}</button></span></div>
  </section>

  {foe?<section className="ph-target ph-glass ph-ui" aria-label={`Selected: ${foe.name}`}>
   <div className="ph-target-head"><span className="ph-face big"><ActorPortrait actor={foe} biome={game.options.biome}/></span><span><span className="realm-eyebrow">Selected</span><strong>{foe.name}</strong></span><button type="button" className="ph-close" aria-label="Clear selection" onClick={()=>setSelectedId(mine?.id??'')}><Icon name="close" size={14}/></button></div>
   <div className="ph-target-hp"><span>HP</span><span className="ph-bar foe"><span style={{width:`${Math.max(0,foe.hp/foe.maxHp)*100}%`}}/></span><b>{foe.hp}/{foe.maxHp}</b></div>
   <dl>{foe.keeper&&foe.plan?<div className="ph-fact threat"><dt>Next</dt><dd className="ph-threat">{KEEPER_PROFILE[foe.keeper].moveName}<span className="ph-fact-more"> · marked on the ground</span></dd></div>:null}<div className="ph-fact armour"><dt>Armour</dt><dd>AC {armorOf(foe)}{foe.exposed?' · exposed':''}</dd></div>{mine?<div className={`ph-fact ${stats&&tiles(mine,foe)<=stats.range?'near':'far'}`}><dt>Distance</dt><dd>{tiles(mine,foe)} {tiles(mine,foe)===1?'tile':'tiles'} · {stats&&tiles(mine,foe)<=stats.range?'in range':'out of range'}</dd></div>:null}{need?<div className="ph-fact hit"><dt>To hit</dt><dd>{need}</dd></div>:null}{stats?<div className="ph-fact damage"><dt>Damage</dt><dd>1d{stats.die} + 3</dd></div>:null}</dl>
   {inReach||powerReach?<div className="ph-target-actions">{inReach?<button type="button" className="ph-secondary" disabled={locked||!!actor?.actionUsed} aria-label={`Attack ${foe.name}`} data-tooltip="Attack" onClick={()=>targetWith({type:'attack',targetId:foe.id})}><Icon name="sword" size={15}/><span>Attack</span></button>:null}{powerReach&&!NO_ROLL_ABILITY[actor!.heroClass]?<button type="button" className="ph-secondary" disabled={locked||!!actor?.actionUsed} aria-label={`${CLASS_INFO[actor!.heroClass].ability} on ${foe.name}`} data-tooltip={CLASS_INFO[actor!.heroClass].ability} onClick={()=>targetWith({type:'ability',targetId:foe.id})}><Icon name="spark" size={15}/><span>{CLASS_INFO[actor!.heroClass].ability}</span></button>:null}</div>:null}
  </section>:null}

  {!ownRoll&&!rollsPending?<p id="turn-guidance" className="ph-hint ph-glass" role="status" aria-live="polite">{hint}</p>:null}
  {ownRoll?<div className="roll-dock ph-ui"><OwnRoll key={ownRoll.request.eventSequence} label={ownRoll.label} result={ownResult} onShown={()=>setRollShown(true)} onDone={()=>setOwnRoll(null)}/></div>:null}

  <footer className="ph-dock ph-ui">
   {mine?<div className="ph-hero"><button type="button" className="ph-hero-face" aria-label={`Inspect ${mine.name}`} data-tooltip="Your character" onClick={()=>setDetailId(mine.id)}><ActorPortrait actor={mine} biome={game.options.biome}/></button>
    <div className="ph-hero-info"><strong>{mine.name}</strong><span className="ph-hero-hp"><span>HP</span><span className={`ph-bar health-${healthLevel(mine.hp,mine.maxHp)}`}><span style={{width:`${Math.max(0,mine.hp/mine.maxHp)*100}%`}}/></span><b>{mine.hp}/{mine.maxHp}</b></span>
    <span className="ph-hero-stats">AC {mine.ac}{myTurn?<> · <b>{actor?.movement??0}</b> tiles · <b>{actor?.actionUsed?0:1}</b> action</>:<> · {actor?`${actor.name}’s turn`:'Waiting'}</>}</span></div></div>:null}
   <div className="ph-actions" role="group" aria-label="Actions">
    <button type="button" className={`ph-action ${tool==='move'?'chosen':''}`} disabled={!myTurn||locked} onClick={()=>setTool('move')} aria-pressed={tool==='move'} data-tooltip={actionTip('move')}><kbd>{shortcut('move')}</kbd>{myTurn?<small className="tiles">{actor?.movement??0} tiles</small>:null}<Icon name="move"/><span>Move</span></button>
    <button type="button" className={`ph-action ${tool==='attack'?'chosen':''}`} disabled={!myTurn||locked||actor?.actionUsed} onClick={()=>setTool('attack')} aria-pressed={tool==='attack'} data-tooltip={actionTip('attack')}><kbd>{shortcut('attack')}</kbd><Icon name="sword"/><span>Attack</span></button>
    <button type="button" className={`ph-action ${tool==='ability'?'chosen':''}`} disabled={!myTurn||locked||actor?.actionUsed||!actor?.abilityUses} onClick={()=>setTool('ability')} aria-pressed={tool==='ability'} data-tooltip={actionTip('ability')}><kbd>{shortcut('ability')}</kbd><small>×{mine?.abilityUses??0}</small><Icon name="spark"/><span>{mine?CLASS_INFO[mine.heroClass].ability:'Power'}</span></button>
    <button type="button" className="ph-action" disabled={!myTurn||locked||actor?.actionUsed} data-tooltip={actionTip('guard')} onClick={()=>act({type:'guard'})}><kbd>{shortcut('guard')}</kbd><Icon name="shield"/><span>Guard</span></button>
    <button type="button" className="ph-action" disabled={!myTurn||locked||actor?.actionUsed||!actor?.potions||actor.hp>=actor.maxHp} data-tooltip={actionTip('potion')} onClick={()=>act({type:'potion'})}><kbd>{shortcut('potion')}</kbd><small>×{mine?.potions??0}</small><Icon name="potion"/><span>Potion</span></button>
    {quest?<button type="button" className="ph-action quest" disabled={!myTurn||locked||!quest.available} aria-describedby="turn-guidance" onClick={()=>act({type:quest.type})}><Icon name={game.chest.opened?'flag':'chest'}/><span>{quest.label}</span></button>:null}
   </div>
   <button type="button" className="ph-end" disabled={!myTurn||locked} onClick={endTurn} data-tooltip={actionTip('end')}><span>{busy?'Saving…':'End turn'}</span><kbd>{shortcut('end')}</kbd></button>
  </footer>

  {journal?<JournalDrawer game={game} entries={entries} thread={thread} narratorName={narratorName} host={host} tab={journal} onTab={setJournal} onClose={closeJournal} onAsk={onAI} onNarrate={onNarrate} onSteer={onSteer} busy={busy}/>:null}
  <div className={`game-connection ${connection==='reconnecting'?'connection-warning':''}`} aria-live="polite">{connection==='reconnecting'?'Reconnecting… Your game is saved.':null}</div>

  {confirmEnd?<Modal title="End this turn?" onClose={()=>setConfirmEnd(false)}><div className="confirm-turn"><p>You still have an action available.</p><div><button className="button paper" onClick={()=>setConfirmEnd(false)}>Keep playing</button><button className="button primary" onClick={()=>{setConfirmEnd(false);act({type:'end'})}}>End turn</button></div></div></Modal>:null}
  {detail?<Modal title={detail.name} onClose={()=>setDetailId(null)} wide>{(()=>{const preset=heroArtFor(detail),named=!!preset&&(preset.name.toLowerCase()===detail.name.toLowerCase()||preset.short.toLowerCase()===detail.name.toLowerCase());const info=CLASS_INFO[detail.heroClass];
   return <div className="hs">
    <div className="hs-art">{preset?<img src={preset.art} alt=""/>:<ActorPortrait actor={detail} biome={game.options.biome}/>}</div>
    <div className="hs-info">
     <span className="realm-eyebrow">{named?`${preset!.className} · ${preset!.subclass}`:info.name}{detail.bot?' · companion':detail.id===mine?.id?' · you':''}</span>
     {named?<p className="hs-epithet">{preset!.epithet}</p>:<p className="hs-epithet">{info.description}</p>}
     <div className="hs-hp"><span>Health</span><span className={`ph-bar health-${healthLevel(detail.hp,detail.maxHp)}`}><span style={{width:`${Math.max(0,detail.hp/detail.maxHp)*100}%`}}/></span><b>{detail.hp}/{detail.maxHp}</b></div>
     <dl className="hs-stats"><div><dt>Armour</dt><dd>{detail.ac}</dd></div><div><dt>Speed</dt><dd>{detail.speed} tiles</dd></div><div><dt>Initiative</dt><dd>{detail.initiative}</dd></div><div><dt>Potions</dt><dd>{detail.potions}</dd></div><div><dt>Power uses</dt><dd>{detail.abilityUses}</dd></div><div><dt>Reach</dt><dd>{info.range} {info.range===1?'tile':'tiles'}</dd></div></dl>
     <p className="hs-ability"><strong>{info.ability}</strong> · {detail.abilityUses} {detail.abilityUses===1?'use':'uses'} left this encounter.</p>
     {named?<p className="hs-intro">{preset!.intro}</p>:null}
    </div>
   </div>})()}</Modal>:null}
 </div>;
}
