import type {GameState} from '../../game/types.ts';
import {currentNarration} from '../../game/ai.ts';

/** Read each story beat once, preferring an accepted telling when one exists. */
export function nextNarrationCue(game:GameState,adventureId:string|null,previous:string):{key:string;caption:string}|null {
 const story=game.events.findLast(event=>event.kind==='story');
 const accepted=game.story?.narrations.find(record=>record.eventId===game.eventSequence);
 if(!story&&!accepted)return null;
 const prefix=`${adventureId??'table'}:${story?.id??-1}:`;
 // Later moves must not replace an already-read AI telling with the base story.
 if(!accepted&&previous.startsWith(prefix))return null;
 const key=prefix+(accepted?`saved:${accepted.eventId}`:'local');
 return key===previous?null:{key,caption:currentNarration(game)};
}
