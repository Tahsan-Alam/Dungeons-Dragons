'use client';
import type {GameState} from '../../game/types';
import {storyGoal} from '../../game/campaign';
import {settingLine} from '../../game/lore';
import GameMasterScene from './GameMasterScene';
import {lower} from './route-map';
import {Icon} from './Art';

const ROMAN=['I','II','III','IV','V'];

/** The Game Master opens the chapter in its place. After the route map in the built-in tales; on its own in custom tales. */
export default function ChapterOpening({game,caption,talking=false,onReplay,onClose}:{game:GameState;caption:string;talking?:boolean;onReplay?:(line:string)=>void;onClose:()=>void}){
 const narrator=game.options.creation?.narrator.name??'The storyteller',goal=storyGoal(game);
 const chapter=`Chapter ${ROMAN[game.scene]??game.scene+1}${goal>1?` of ${ROMAN[goal-1]??goal}`:''}`;
 const setting=game.options.creation?settingLine(game.options.creation.story):undefined;
 return <GameMasterScene game={game} label={`${chapter}: ${game.sceneName}`} eyebrow={chapter} title={game.sceneName} talking={talking} onClose={onClose} className="gm-opening">
  <span className="gm-speaker">{narrator}{setting?<span> · {setting}</span>:null}</span>
  <p className="gm-line">“{caption}”</p>
  <div className="gm-rule" aria-hidden="true"/>
  <div className="gm-foot">
   <p className="gm-objective"><Icon name="flag" size={15}/><span><strong>Objective</strong> · {game.objective}</span></p>
   <div className="gm-actions">
    {onReplay?<button type="button" className="gm-secondary" onClick={()=>onReplay(caption)}><Icon name="sound" size={16}/>Replay narration</button>:null}
    <button type="button" className="gm-primary" data-autofocus onClick={onClose}>Enter {lower(game.sceneName)}<span aria-hidden="true">›</span></button>
   </div>
  </div>
 </GameMasterScene>;
}
