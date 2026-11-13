'use client';
import {useState} from 'react';
import {TRAITS} from '../../game/creation';
import type {TraitCategory,CreationResult} from '../../game/creation';
import {Icon} from './Art';

export function TraitPicker({category,label,values,onChange,validate,disabled}:{category:TraitCategory;label:string;values:string[];onChange:(values:string[])=>void;validate:(category:TraitCategory,value:string)=>Promise<CreationResult|null>;disabled:boolean}){
 const [custom,setCustom]=useState(''),[feedback,setFeedback]=useState(''),[suggestion,setSuggestion]=useState('');
 const options=[...new Set<string>([...TRAITS[category],...values])];
 function choose(value:string){setFeedback('');setSuggestion('');if(values.includes(value))onChange(values.filter(x=>x!==value));else if(values.length<3)onChange([...values,value]);else setFeedback('Choose up to three. Remove a trait to add another.');}
 async function add(){
  if(disabled||!custom.trim())return;
  if(custom.trim().split(/\s+/).length>2){setFeedback('Use one or two words, such as “Quietly confident”.');return;}
  const result=await validate(category,custom.trim());if(!result?.trait)return;
  setFeedback(result.reply);setSuggestion(result.trait.accepted?'':result.trait.suggestion);
  if(result.trait.accepted){if(!values.includes(result.trait.value)){if(values.length>=3){setFeedback('This fits. Remove a trait to make room for it.');return;}onChange([...values,result.trait.value]);}setCustom('');}
 }
 return <fieldset className="creator-traits" disabled={disabled}><legend>{label}<small>Up to 3</small></legend>
  <div className="creator-chips">{options.map(value=><button key={value} type="button" aria-pressed={values.includes(value)} onClick={()=>choose(value)}>{value}{values.includes(value)?<Icon name="check" size={13}/>:null}</button>)}</div>
  <div className="creator-custom-trait"><input aria-label={`Custom ${label.toLowerCase()}`} placeholder="Or add your own" maxLength={40} value={custom} onChange={e=>setCustom(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void add();}}}/><button className="text-button" type="button" disabled={!custom.trim()} onClick={()=>void add()}>Add</button></div>
  {feedback?<p className="creator-feedback" role="status">{feedback}{suggestion?<button type="button" className="text-button" onClick={()=>{choose(suggestion);setCustom('');}}>Use {suggestion}</button>:null}</p>:null}
 </fieldset>;
}
export type ConversationLine={role:'player'|'narrator';text:string};
export function CreatorConversation({name,lines,onSend,disabled,placeholder='Describe what you’d like to change…'}:{name:string;lines:ConversationLine[];onSend:(text:string)=>Promise<boolean>;disabled:boolean;placeholder?:string}){
 const [message,setMessage]=useState('');
 async function send(){if(disabled||!message.trim())return;const sent=await onSend(message.trim());if(sent)setMessage('');}
 return <section className="creator-conversation" aria-label={`Conversation with ${name}`}><h3>Talk with {name}</h3>
  {lines.length?<div className="creator-messages" role="log" aria-live="polite">{lines.map((line,i)=><p key={i} data-speaker={line.role}><strong>{line.role==='player'?'You':name}</strong>{line.text}</p>)}</div>:null}
  <label className="field">Your direction<textarea aria-label="Your direction" rows={2} maxLength={400} value={message} disabled={disabled} placeholder={placeholder} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();void send();}}}/></label>
  <button className="button paper" type="button" disabled={disabled||!message.trim()} onClick={()=>void send()}>Send<Icon name="arrow" size={15}/></button>
 </section>;
}
