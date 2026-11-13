export interface Exchange {id:number;question:string;answer:string;/** True when the reply came from built-in guidance because the live narrator was unavailable. */local?:boolean}

export const THREAD_LIMIT=12;

/** Adds a question and its reply to the conversation, keeping only the newest exchanges. */
export function addExchange(thread:Exchange[],question:string,answer:string,local=false,limit=THREAD_LIMIT):Exchange[] {
 const id=(thread.at(-1)?.id??0)+1;
 return [...thread,{id,question:question.trim(),answer:answer.trim(),...(local?{local:true}:{})}].slice(-Math.max(1,limit));
}
