import {AETHER,creationFixture} from '../../game/creation.ts';
import type {CreationRequest,HeroProfile,NarratorProfile,StoryBlueprint} from '../../game/creation.ts';

/** Ready-made adventures, one per setting. They need no provider, credentials or network. */
const STORIES:readonly StoryBlueprint[]=[
 {title:'The Lantern in the Greenwood',synopsis:'The old roads through Lanternwood are fading from every map. Guided by Aether, a band of unlikely heroes must recover the lantern shards before the paths between villages vanish. Their final choice will bring the lost light home.',timeline:'The last autumn of the old roads',world:'Lanternwood',locations:['Mossgate crossing','The hollow oak','The lantern glade'],biome:'woodland'},
 {title:'The Star Beneath the City',synopsis:'A city built on a sleeping dragon has lost its guiding star. Guided by Aether, a band of unlikely heroes must recover the lantern shards from the ruins below before the streets forget their own names.',timeline:'An age of wandering magic',world:'Asterfall',locations:['Starfall market','The hollow observatory','The lantern gate'],biome:'ruins'},
 {title:'The Tide-Bell of Saltmere',synopsis:'The tide-bell of Saltmere has fallen silent, and ships no longer find the harbor. Guided by Aether, a band of unlikely heroes must recover the lantern shards along the shore and light the beacon again.',timeline:'The season of long tides',world:'Saltmere',locations:['Gullwatch quay','The drowned stair','The beacon rock'],biome:'coast'},
];

export interface QuickStart {narrator:NarratorProfile;story:StoryBlueprint;heroes:HeroProfile[];hero:HeroProfile;}

/** A complete, reviewable draft. The player still confirms it on the creator's final step. */
export function quickStartDraft(pick=Math.random()):QuickStart {
 const story=structuredClone(STORIES[Math.min(STORIES.length-1,Math.max(0,Math.floor(pick*STORIES.length)))]);
 const heroes=creationFixture({action:'heroes',scope:'quick-start',requestId:'quick-start',enabled:false,prompt:'',message:'',traits:{},story} as CreationRequest).heroes??[];
 return {narrator:structuredClone(AETHER),story,heroes,hero:heroes[0]};
}
