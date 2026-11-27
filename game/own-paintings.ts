import {isPortraitId} from './creation.ts';

/**
 * Your own Game Master or hero is drawn (from our parts) or painted with the image AI (app/api/ai/paint).
 * A painted one keeps every painting made for them, newest first, and shows the one the player chose.
 * Paintings are server ids only (isPortraitId), never URLs.
 */
export type OwnMode='draw'|'paint';
/** The paintings kept per creation: a day's allowance and a few from before. */
export const MAX_PAINTINGS=8;
/** Saved painting ids, checked and de-duplicated. */
export const parsePaintings=(v:unknown)=>Array.isArray(v)?[...new Set(v.filter(isPortraitId))].slice(0,MAX_PAINTINGS):[];
/** The list after a new painting: it goes first, and the oldest drop off past the limit. */
export const addPainting=(paintings:string[],id:string)=>[id,...paintings.filter(p=>p!==id)].slice(0,MAX_PAINTINGS);
/** The portrait that counts: a painted creation shows its chosen painting; a drawn one never does. */
export const ownPortrait=(input:{mode?:OwnMode;portrait?:string})=>input.mode==='paint'&&isPortraitId(input.portrait)?input.portrait:undefined;
