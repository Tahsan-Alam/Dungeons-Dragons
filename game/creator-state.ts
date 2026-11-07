import {parseGuide,parseHero,parseNarrator,parseStory} from './creation.ts';
import type {CreatorProposal,HeroProfile,NarratorProfile,StoryBlueprint} from './creation.ts';

export interface CreatorDraft {version:number;narrator:NarratorProfile|null;story:StoryBlueprint|null;hero:HeroProfile|null;}

export function emptyCreatorDraft():CreatorDraft{return {version:0,narrator:null,story:null,hero:null};}

/** Only an explicitly confirmed proposal for the current draft may be applied. */
export function applyCreatorProposal(draft:CreatorDraft,proposal:CreatorProposal):CreatorDraft|null {
 const parsed=parseGuide({proposal},draft.version)?.proposal;
 if(!parsed||draft.version>=1_000_000)return null;
 return {version:draft.version+1,narrator:parsed.narrator??structuredClone(draft.narrator),story:parsed.story??structuredClone(draft.story),hero:parsed.hero??structuredClone(draft.hero)};
}

/** Direct field changes invalidate any outstanding conversational proposals. */
export function editCreatorDraft(draft:CreatorDraft,changes:Partial<Omit<CreatorDraft,'version'>>):CreatorDraft|null {
 if(draft.version>=1_000_000)return null;
 if((changes.narrator!=null&&!parseNarrator(changes.narrator,true))||(changes.story!=null&&!parseStory(changes.story,true))||(changes.hero!=null&&!parseHero(changes.hero,true)))return null;
 // Validation normalizes prose at submission, but keystroke state must retain
 // spaces and line breaks so multiword names and paragraphs can be typed.
 return {version:draft.version+1,narrator:structuredClone(changes.narrator===undefined?draft.narrator:changes.narrator),story:structuredClone(changes.story===undefined?draft.story:changes.story),hero:structuredClone(changes.hero===undefined?draft.hero:changes.hero)};
}
