'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {setAIPreference} from './ai-preferences';
type Access={passwordRequired:boolean;available:boolean;remembered:boolean;enabled:boolean;unlocked:boolean;audioAvailable:boolean;limits:{campaign:number;day:number;month:number}};
const dollars=(micro:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(micro/1_000_000);
export default function AISettings({onAbout}:{onAbout:()=>void}){
 const [access,setAccess]=useState<Access|null>(null),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const pending=useRef(false),container=useRef<HTMLDivElement>(null),id=useId();
 useEffect(()=>{container.current?.closest('.settings-content')?.scrollTo({top:0});},[access?.remembered,access?.enabled]);
 useEffect(()=>{
  const controller=new AbortController();
  async function refresh(){if(pending.current)return;try{const response=await fetch('/api/ai/access',{cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error();setAccess(await response.json());setError('');}catch{if(!controller.signal.aborted)setError('Could not check team AI. Reopen settings to try again.');}}
  void refresh();window.addEventListener('focus',refresh);return()=>{controller.abort();window.removeEventListener('focus',refresh);};
 },[]);
 async function change(action:'unlock'|'enable'|'disable'|'forget'){
  if(pending.current)return;pending.current=true;setBusy(true);setError('');
  try{
   const response=await fetch('/api/ai/access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...(action==='unlock'?{password}:{})})});
   const result=await response.json() as Access&{error?:string};if(!response.ok)throw new Error(result.error||'Could not update team access. Try again.');setAccess(result);setAIPreference(result.unlocked);window.dispatchEvent(new Event('painted-realms-ai-access'));
  }catch(error){setError(error instanceof Error?error.message:'Could not update team access. Try again.');}
  finally{setPassword('');pending.current=false;setBusy(false);}
 }
 return <div ref={container} className="team-ai-settings">
  <p className="settings-description section-intro">New stories, character details and narration, covered by the table owner.</p>
  <div className="settings-row"><div><strong>Team AI</strong><p role="status">{!access?'Checking access…':!access.available?'Not available yet':access.unlocked?(access.passwordRequired?'On - this device is remembered':'On - no password needed'):access.remembered?'Off on this browser':'Locked — team password required'}</p></div><span className="ai-access-badge" data-active={access?.unlocked&&access.available?'true':'false'}>{access?.unlocked&&access.available?'On':'Off'}</span></div>
  {access?.remembered&&(access.available||access.passwordRequired)?<div className="ai-unlocked"><p className="settings-description">Your choice stays saved on this browser, including after you close it. Turning AI off stops new paid requests here; work already underway can finish.</p><div className="ai-device-actions"><button className="button paper" aria-pressed={access.enabled} disabled={busy||(!access.available&&!access.enabled)} onClick={()=>void change(access.enabled?'disable':'enable')}>{busy?'Saving…':access.enabled?'Disable AI':'Enable AI'}</button>{access.passwordRequired?<button className="text-button" disabled={busy} onClick={()=>void change('forget')}>Forget this device</button>:null}</div>{access.passwordRequired?<p className="settings-description">Remembered for up to a year. Clearing browser data or a password change will require the password again.</p>:null}</div>:access?.available?<form className="ai-unlock-form" onSubmit={event=>{event.preventDefault();void change('unlock')}}>
   <label htmlFor={`${id}-password`}>Team password</label><div className="ai-unlock-fields"><input id={`${id}-password`} name="team-password" type="password" autoComplete="current-password" minLength={12} maxLength={128} required disabled={busy} value={password} onChange={event=>setPassword(event.target.value)} aria-describedby={`${id}-password-note`} /><button className="button primary" type="submit" disabled={busy||password.length<12}>{busy?'Unlocking…':'Unlock AI'}</button></div><p className="settings-description" id={`${id}-password-note`}>Ask the table owner for the shared password. No API key needed.</p>
  </form>:access?<p className="settings-description ai-setup-note">The site owner still needs to enable team AI. You can keep playing with the built-in storyteller.</p>:null}
  {error?<p className="settings-audio-error" role="alert">{error}</p>:null}
  {access?<p className="settings-description ai-budget-note">Shared limits: {dollars(access.limits.month)} / month · {dollars(access.limits.day)} / day · {dollars(access.limits.campaign)} / campaign. The game reserves a conservative allowance before each request; this is not a bill.</p>:null}
  <div className="ai-play-guide"><h4>Play with AI</h4><ol><li>{access?.passwordRequired?'Unlock once here, before starting a new adventure.':access?.available?'AI is ready. No login needed.':'Enable AI on this server to use live generation.'}</li><li>Choose <strong>Solo quest</strong> or <strong>Gather party</strong>. AI will be on in the creator.</li><li>Message your narrator, or use <strong>Start voice</strong> for a conversation.</li></ol><p className="settings-description">AI follows the same game rules and shared spending limits. Creation keeps your draft when AI is unavailable; offline mode is your choice.</p><p className="settings-description">{access?.audioAvailable?'AI voice is available in the creator and narrator panel.':'AI voice is currently off; device narration is still available in Sound.'} Saved stories and cached audio remain available with AI off.</p></div>
  <button className="settings-link" onClick={onAbout}>About the AI game master <span aria-hidden="true">→</span></button>
 </div>;
}
