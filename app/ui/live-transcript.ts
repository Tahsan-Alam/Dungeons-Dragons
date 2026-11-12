export interface TranscriptLine {id:number;role:'user'|'assistant';name:string;text:string;complete:boolean;}
export interface LiveTranscriptState {lines:TranscriptLine[];nextId:number;}
export type TranscriptAction={type:'delta';role:TranscriptLine['role'];name:string;text:string}|{type:'finish'}|{type:'clear'};
// Visit-local captions only. Neither long calls nor repeated short comments can
// grow the history indefinitely; these are display bounds, not AI allowances.
export const TRANSCRIPT_LINES=12,TRANSCRIPT_CHARACTERS=1600;
export const emptyLiveTranscript=():LiveTranscriptState=>({lines:[],nextId:1});

export function liveTranscriptReducer(state:LiveTranscriptState,action:TranscriptAction):LiveTranscriptState {
 if(action.type==='clear')return {...state,lines:[]};
 const last=state.lines.at(-1);
 if(action.type==='finish')return !last||last.complete?state:{...state,lines:[...state.lines.slice(0,-1),{...last,complete:true}]};
 if(!action.text)return state;
 if(last&&!last.complete&&last.role===action.role&&last.name===action.name){
  return {...state,lines:[...state.lines.slice(0,-1),{...last,text:(last.text+action.text).slice(-TRANSCRIPT_CHARACTERS)}]};
 }
 // Preserve the speaker's identity even when the selected narrator changes.
 const finished=liveTranscriptReducer(state,{type:'finish'});
 return {nextId:state.nextId+1,lines:[...finished.lines,{id:state.nextId,role:action.role,name:action.name,text:action.text.slice(-TRANSCRIPT_CHARACTERS),complete:false}].slice(-TRANSCRIPT_LINES)};
}
