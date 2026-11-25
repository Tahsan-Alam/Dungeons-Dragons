'use client';
/* One Web Audio graph for the whole game: music, ambience, effects and interface each have a level under a master
   that falls silent while the tab is hidden. Nothing sounds before the player's first press or key (browsers require
   it, and so do we); cues asked for before then are dropped, not queued. Files load on first use and stay cached. */
import {CUES,MUSIC_ONCE,ambienceUrl,cueUrl,musicUrl,type AmbienceName,type Bed,type Bus,type Cue,type CueName,type MusicName} from './catalog';

export interface SoundLevels {music:number;ambience:number;effects:number;interface:number}
export interface PlayOptions {/** Seconds from now. */delay?:number;gain?:number;/** Playback rate before the cue's own pitch spread. */rate?:number;/** Which variation (1-based); random otherwise. */variation?:number}

const FADE=1.6;

class SoundEngine{
 private ctx:AudioContext|null=null;
 private master:GainNode|null=null;
 private buses:Partial<Record<Bus,GainNode>>={};
 private buffers=new Map<string,Promise<AudioBuffer|null>>();
 private levels:SoundLevels={music:.5,ambience:.6,effects:.8,interface:.45};
 private on:Record<Bus,boolean>={music:true,ambience:true,effects:true,interface:true};
 private lastVariation=new Map<string,number>();
 private music:{name:MusicName;source:AudioBufferSourceNode;gain:GainNode}|null=null;
 private wantedMusic:MusicName|null=null;
 private beds=new Map<AmbienceName,{source:AudioBufferSourceNode;gain:GainNode;level:number}>();
 private wantedBeds:Bed[]=[];
 private wantedGulls=false;
 private gullTimer:ReturnType<typeof setTimeout>|null=null;
 private ducked=false;
 private listening=false;
 unlocked=false;

 /** Call once on the client: the first press or key opens the audio graph. */
 listen(){
  if(this.listening||typeof window==='undefined')return;this.listening=true;
  const unlock=()=>{this.unlock();if(this.unlocked){window.removeEventListener('pointerdown',unlock,true);window.removeEventListener('keydown',unlock,true)}};
  window.addEventListener('pointerdown',unlock,true);window.addEventListener('keydown',unlock,true);
  document.addEventListener('visibilitychange',()=>this.applyMaster());
 }
 private unlock(){
  if(this.unlocked)return;
  try{
   const Ctx=window.AudioContext??(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!Ctx)return;
   const ctx=new Ctx();this.ctx=ctx;
   this.master=ctx.createGain();this.master.connect(ctx.destination);
   for(const bus of ['music','ambience','effects','interface'] as Bus[]){const g=ctx.createGain();g.connect(this.master);this.buses[bus]=g}
   void ctx.resume().catch(()=>{});
   this.unlocked=true;this.applyLevels();this.applyMaster();
   if(this.wantedMusic){const m=this.wantedMusic;this.wantedMusic=null;this.setMusic(m)}
   this.setAmbience(this.wantedBeds,this.wantedGulls);
  }catch{this.ctx=null;this.unlocked=false}
 }
 private applyMaster(){
  if(!this.ctx||!this.master)return;
  const silent=typeof document!=='undefined'&&document.hidden;
  this.master.gain.setTargetAtTime(silent?0:1,this.ctx.currentTime,.08);
  if(!silent&&this.ctx.state==='suspended')void this.ctx.resume().catch(()=>{});
 }
 private applyLevels(){
  if(!this.ctx)return;
  for(const bus of Object.keys(this.buses) as Bus[]){
   const target=this.on[bus]?this.levels[bus]*(bus==='music'&&this.ducked?.45:1):0;
   this.buses[bus]!.gain.setTargetAtTime(target,this.ctx.currentTime,.12);
  }
 }
 setLevels(levels:SoundLevels,on:Record<Bus,boolean>){this.levels=levels;this.on=on;this.applyLevels()}
 /** Lower the music while a voice reads the story. */
 duck(active:boolean){if(this.ducked===active)return;this.ducked=active;this.applyLevels()}

 private load(url:string){
  let pending=this.buffers.get(url);
  if(!pending){
   pending=fetch(url).then(r=>r.ok?r.arrayBuffer():Promise.reject(new Error(url))).then(data=>this.ctx!.decodeAudioData(data)).catch(()=>null);
   this.buffers.set(url,pending);
  }
  return pending;
 }
 /** Fetch cues ahead of the moment they are needed (a chapter's voices, the dice). */
 preload(names:readonly CueName[]){
  if(!this.ctx)return;
  for(const name of names)for(let v=1;v<=CUES[name].variations;v++)void this.load(cueUrl(name,v));
 }

 play(name:CueName,options:PlayOptions={}){
  const ctx=this.ctx,cue:Cue=CUES[name];
  if(!ctx||!this.on[cue.bus]||this.levels[cue.bus]<=0||document.hidden)return;
  let variation=options.variation??1;
  if(options.variation===undefined&&cue.variations>1){
   const last=this.lastVariation.get(name);
   do variation=1+Math.floor(Math.random()*cue.variations);while(variation===last);
   this.lastVariation.set(name,variation);
  }
  const at=ctx.currentTime+(options.delay??0);
  void this.load(cueUrl(name,variation)).then(buffer=>{
   if(!buffer||!this.ctx)return;
   const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();
   source.buffer=buffer;
   const spread=cue.pitch??0;source.playbackRate.value=(options.rate??1)*(1+(Math.random()*2-1)*spread);
   gain.gain.value=cue.gain*(options.gain??1);
   source.connect(gain);gain.connect(this.buses[cue.bus]!);
   source.onended=()=>{source.disconnect();gain.disconnect()};
   source.start(Math.max(at,this.ctx.currentTime));
  });
 }

 setMusic(name:MusicName|null){
  if(!this.ctx){this.wantedMusic=name;return}
  if(this.music?.name===name)return;
  const ctx=this.ctx,old=this.music;this.music=null;this.wantedMusic=name;
  if(old){old.gain.gain.setTargetAtTime(0,ctx.currentTime,FADE/4);try{old.source.stop(ctx.currentTime+FADE*1.5)}catch{/* Already stopped. */}}
  if(!name)return;
  void this.load(musicUrl(name)).then(buffer=>{
   if(!buffer||!this.ctx||this.wantedMusic!==name||this.music)return;
   const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();
   source.buffer=buffer;source.loop=!MUSIC_ONCE.has(name);
   gain.gain.setValueAtTime(0,this.ctx.currentTime);gain.gain.setTargetAtTime(1,this.ctx.currentTime+(old?FADE*.4:0),FADE/4);
   source.connect(gain);gain.connect(this.buses.music!);source.start();
   source.onended=()=>{source.disconnect();gain.disconnect();if(this.music?.source===source)this.music=null};
   this.music={name,source,gain};
  });
 }
 get currentMusic(){return this.music?.name??this.wantedMusic}

 /** The beds under the music: each fades to its level, beds no longer wanted fade out. */
 setAmbience(beds:Bed[],gulls=false){
  this.wantedBeds=beds;this.wantedGulls=gulls;
  if(!this.ctx)return;
  const ctx=this.ctx,wanted=new Map(beds.filter(b=>b.name).map(b=>[b.name,b.gain]));
  for(const [name,bed] of this.beds){
   if(wanted.has(name)){const level=wanted.get(name)!;if(level!==bed.level){bed.level=level;bed.gain.gain.setTargetAtTime(level,ctx.currentTime,FADE/3)}continue}
   bed.gain.gain.setTargetAtTime(0,ctx.currentTime,FADE/3);try{bed.source.stop(ctx.currentTime+FADE*2)}catch{/* Already stopped. */}
   this.beds.delete(name);
  }
  for(const [name,level] of wanted){
   if(this.beds.has(name))continue;
   const gain=ctx.createGain();gain.gain.setValueAtTime(0,ctx.currentTime);gain.connect(this.buses.ambience!);
   const source=ctx.createBufferSource();source.loop=true;
   const entry={source,gain,level};this.beds.set(name,entry);
   void this.load(ambienceUrl(name)).then(buffer=>{
    if(!buffer||this.beds.get(name)!==entry)return;
    source.buffer=buffer;source.connect(gain);source.start(ctx.currentTime,Math.random()*buffer.duration);
    gain.gain.setTargetAtTime(level,ctx.currentTime,FADE/3);
    source.onended=()=>{source.disconnect();gain.disconnect()};
   });
  }
  if(gulls!==!!this.gullTimer)this.scheduleGulls(gulls);
 }
 private scheduleGulls(active:boolean){
  if(this.gullTimer){clearTimeout(this.gullTimer);this.gullTimer=null}
  if(!active)return;
  const next=()=>{this.gullTimer=setTimeout(()=>{this.play('gull',{gain:.6+Math.random()*.4});next()},9000+Math.random()*16000)};
  next();
 }
}

/** The game's one sound engine. Safe to import on the server: nothing runs until listen() on the client. */
export const sound=new SoundEngine();
export const playSound=(name:CueName,options?:PlayOptions)=>{if(typeof window!=='undefined')sound.play(name,options)};
