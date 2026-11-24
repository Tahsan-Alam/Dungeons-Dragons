'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {setAIPreference} from './ai-preferences';
import {MenuRow,OnOff} from './MenuKit';
type Access={passwordRequired:boolean;available:boolean;remembered:boolean;enabled:boolean;unlocked:boolean;audioAvailable:boolean;limits:{campaign:number;day:number;month:number}};
const dollars=(micro:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(micro/1_000_000);
export default function AISettings({onAbout}:{onAbout?:()=>void}){
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
 const on=!!(access?.unlocked&&access.available);
 const status=!access?'Checking…':!access.available?'Not yet':on?'On':access.remembered?'Off':'Locked';
 return <div ref={container} className="team-ai-settings">
  <MenuRow name="Team AI" why={<span role="status">{!access?'Asking the table…':!access.available?'The site owner hasn’t set up team AI yet. The built-in storyteller tells every tale meanwhile.':access.unlocked?(access.passwordRequired?'New stories, characters and narration, paid by the table owner. This device is remembered.':'New stories, characters and narration, paid by the table owner. No password needed.'):access.remembered?'Switched off on this device.':'Ask the table owner for the team password.'}</span>}>
   {access?.remembered&&(access.available||access.passwordRequired)?<OnOff label="Team AI on this device" disabled={busy||(!access.available&&!access.enabled)} on={access.enabled} onChange={next=>void change(next?'enable':'disable')}/>:<span className={`ai-status${on?' on':''}`}>{status}</span>}
  </MenuRow>
  {access?.remembered&&(access.available||access.passwordRequired)?<>
   <p className="mk-aside">Your choice stays on this device, even after you close it. Turning AI off stops new paid requests here; work already under way can finish.</p>
   {access.passwordRequired?<div className="ai-device-actions"><button type="button" className="mk-link" disabled={busy} onClick={()=>void change('forget')}>Forget this device</button><span className="settings-description">Remembered for up to a year, until browser data is cleared or the password changes.</span></div>:null}
  </>:access?.available?<form className="ai-unlock-form" onSubmit={event=>{event.preventDefault();void change('unlock')}}>
   <label htmlFor={`${id}-password`}>Team password</label><div className="ai-unlock-fields"><input id={`${id}-password`} name="team-password" type="password" autoComplete="current-password" minLength={12} maxLength={128} required disabled={busy} value={password} onChange={event=>setPassword(event.target.value)} aria-describedby={`${id}-password-note`} /><button className="button primary" type="submit" disabled={busy||password.length<12}>{busy?'Unlocking…':'Unlock AI'}</button></div><p className="settings-description" id={`${id}-password-note`}>Ask the table owner for the shared password. No API key needed.</p>
  </form>:null}
  {error?<p className="settings-audio-error" role="alert">{error}</p>:null}
  {access?<MenuRow name="Shared limits" why="The game sets aside a careful allowance before each request. This is not a bill."><span className="ai-limits"><span><b>{dollars(access.limits.month)}</b> a month</span><span><b>{dollars(access.limits.day)}</b> a day</span><span><b>{dollars(access.limits.campaign)}</b> a tale</span></span></MenuRow>:null}
  <h4 className="mk-group">Playing with AI</h4>
  <ol className="ai-steps">
   <li>{access?.passwordRequired?'Unlock it once here, before you begin a new adventure.':access?.available?'AI is ready. No login needed.':'Team AI needs to be set up on this server first.'}</li>
   <li>Begin a new quest or gather a party; AI is on in the creator.</li>
   <li>Write to your narrator, or choose <em>Start voice</em> to talk.</li>
  </ol>
  <p className="mk-aside">AI keeps the same rules and limits. The creator keeps your draft when AI is away, and playing offline is always your choice. {access?.audioAvailable?'AI voice is ready in the creator and the narrator panel.':'AI voice is off; your device’s voice still reads in Sound.'} Saved stories and recorded voice stay with AI off.</p>
  {onAbout?<button type="button" className="settings-link" onClick={onAbout}><span>Ask your Game Master</span><span aria-hidden="true">›</span></button>:null}
 </div>;
}
