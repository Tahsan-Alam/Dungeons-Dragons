import type {StoryBlueprint} from '../../game/creation.ts';

export type CreationLandscape='space'|'woodland'|'coast'|'ruins'|'sky';

/** Rendering hints only. These never change the campaign's biome or rules. */
export function creationLandscape(story?:StoryBlueprint|null):CreationLandscape {
 if(!story)return 'space';
 const premise=[story.title,story.world,story.synopsis,...story.locations].join(' ').toLowerCase();
 if(/\b(floating (city|cities|island|islands)|sky (city|cities|island|islands)|above the clouds|cloud city|skybound)\b/.test(premise))return 'sky';
 return story.biome;
}

/** Hue shift for existing purple portraits; identity is kept in both art styles. */
export function portraitHueShift(color:string):number {
 if(!/^#[\da-f]{6}$/i.test(color))return 0;
 const channels=[1,3,5].map(start=>parseInt(color.slice(start,start+2),16)/255),[r,g,b]=channels,max=Math.max(...channels),min=Math.min(...channels),delta=max-min;
 if(delta<.025)return 0;
 const hue=(max===r?(g-b)/delta+(g<b?6:0):max===g?(b-r)/delta+2:(r-g)/delta+4)*60;
 return Math.round(hue-273);
}
