import {RoomError} from './rooms.ts';
import type {BudgetLedger} from './ai-ledger.ts';
import {creationText,isPortraitId} from '../game/creation.ts';
import {HERO_CLASSES,type HeroClass} from '../game/types.ts';
import {borrowedName} from '../game/paint-words.ts';

/* Painting your own Game Master or hero with the image model (FLUX with the team's style LoRA, hosted on fal).
   The player describes them in their own words (and, for a hero, picks the class that sets their gear); the server
   wraps that in the style prompt, checks the words, paints one picture per try, reserves
   the cost in the shared AI ledger, holds each player to a daily allowance, keeps only images that
   passed fal's safety checker, and stores them so saves, rooms and replays refer to them by id.
   Nothing here runs unless the owner configured it (see imagesAvailable and AI-SETUP.md). */

export type ImageEnv={FAL_KEY?:string;FAL_LORA_URL?:string;AI_ENABLE_IMAGES?:string;AI_IMAGES_PER_PLAYER_DAY?:string;OPENAI_API_KEY?:string};
/** One picture per try: each of the daily paintings is its own description. */
export const IMAGES_PER_PAINT=1;
/** fal bills $0.035 per megapixel, rounded up per image; a 768 × 1024 image is one megapixel. Reserve a little over. */
export const PAINT_RESERVE_MICRO_USD=IMAGES_PER_PAINT*40_000;
export const MAX_IMAGE_BYTES=1_200_000;
const FAL_ENDPOINT='https://fal.run/fal-ai/flux-lora';

export function imagesConfigured(env:ImageEnv){
 return env.AI_ENABLE_IMAGES==='I_ACCEPT_PAID_IMAGES'&&!!env.FAL_KEY&&/^https:\/\/[a-z0-9.-]*fal\.(media|ai|run)\//.test(env.FAL_LORA_URL??'');
}
/** Images each player may make per UTC day, for each kind (Game Master, hero); the owner can lower or raise it, never past 12. */
export function imagesPerPlayerDay(env:ImageEnv){
 const value=env.AI_IMAGES_PER_PLAYER_DAY;
 return value===undefined?4:/^\d+$/.test(value)?Math.min(Number(value),12):0;
}

/** The longest description a player may give the painter. */
export const PAINT_DESCRIPTION_MAX=200;
export interface PaintRequest {kind:'gm';description:string;requestId:string}
export interface HeroPaintRequest {kind:'hero';heroClass:HeroClass;description:string;requestId:string}
export type AnyPaintRequest=PaintRequest|HeroPaintRequest;
/** A paint request: the player's description (required) and, for a hero, the class. Anything else sent is ignored. */
export function parsePaintRequest(v:Record<string,unknown>):AnyPaintRequest|null{
 const description=typeof v.description==='string'?v.description.replace(/\s+/g,' ').trim():'';
 if(description.length<3||!creationText(description,PAINT_DESCRIPTION_MAX)||typeof v.requestId!=='string'||!/^[a-zA-Z0-9-]{8,64}$/.test(v.requestId))return null;
 if(v.kind==='hero')return HERO_CLASSES.includes(v.heroClass as HeroClass)?{kind:'hero',heroClass:v.heroClass as HeroClass,description,requestId:v.requestId}:null;
 return v.kind===undefined||v.kind==='gm'?{kind:'gm',description,requestId:v.requestId}:null;
}

// Matches the training captions (full body, centred, plain white) so the picture can be cut out and stood on the ground.
const FRAME='feet visible, whole figure inside the frame, standing, front view, centered, plain white background, no glow halo, no border, no text, no signature';
const CLASS_WORDS:Record<HeroClass,string>={
 knight:'a knight in plate armour with a sword and a round shield',guardian:'a guardian in heavy armour with a tall shield and a spear',
 rogue:'a rogue in a dark hood and leather with two daggers',ranger:'a ranger in a hood and cloak with a longbow and a quiver',
 mage:'a mage in a long robe with a staff and a little magic in one hand',cleric:'a cleric in robes with a holy symbol and a mace',
 bard:'a bard in a doublet and cape playing a lute',druid:'a druid with a gnarled wooden staff, leaves and a fur mantle',
};
/** A hero's prompt: the class sets the gear (it sets every rule too); the player's words describe the rest. */
export function heroPaintPrompt(r:HeroPaintRequest){
 return `PRSTYLE, full body from head to feet, fantasy hero, ${CLASS_WORDS[r.heroClass]}, ${r.description}, ${FRAME}`;
}
/** A Game Master's prompt: the player's words, inside the style and framing the cut-out needs. */
export function paintPrompt(r:PaintRequest){
 return `PRSTYLE, full body from head to feet, fantasy storyteller, ${r.description}, ${FRAME}`;
}

export interface ImageStore {put(id:string,contentType:string,base64:string,now:number):Promise<void>;get(id:string):Promise<{contentType:string;base64:string}|null>}
export class D1ImageStore implements ImageStore {
 private db:D1Database;constructor(db:D1Database){this.db=db;}
 async put(id:string,contentType:string,base64:string,now:number){await this.db.prepare('INSERT OR IGNORE INTO painted_images (id, content_type, bytes, created_at) VALUES (?, ?, ?, ?)').bind(id,contentType,base64,now).run();}
 async get(id:string){if(!isPortraitId(id))return null;const row=await this.db.prepare('SELECT content_type, bytes FROM painted_images WHERE id = ?').bind(id).first<{content_type:string;bytes:string}>();return row?{contentType:row.content_type,base64:row.bytes}:null;}
}
export class MemoryImageStore implements ImageStore {
 rows=new Map<string,{contentType:string;base64:string}>();
 async put(id:string,contentType:string,base64:string){if(!this.rows.has(id))this.rows.set(id,{contentType,base64});}
 async get(id:string){return this.rows.get(id)??null;}
}

const toBase64=(bytes:Uint8Array)=>{let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s);};
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');

/** A free moderation check of the player's description, when the server has an OpenAI key. */
async function descriptionFlagged(text:string,env:ImageEnv,fetcher:typeof fetch,signal?:AbortSignal){
 if(!text||!env.OPENAI_API_KEY)return false;
 const response=await fetcher('https://api.openai.com/v1/moderations',{method:'POST',signal,headers:{authorization:`Bearer ${env.OPENAI_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({model:'omni-moderation-latest',input:text})});
 if(!response.ok)throw new RoomError('The description could not be checked just now. Try again in a moment.',503,'PAINT_UNAVAILABLE');
 const data=await response.json() as {results?:{flagged?:boolean}[]};
 return !!data.results?.some(r=>r.flagged);
}

export async function paintGameMaster(request:AnyPaintRequest,deps:{env:ImageEnv;ledger:BudgetLedger;store:ImageStore;fetcher?:typeof fetch;now?:number;signal?:AbortSignal}):Promise<{images:string[]}>{
 const {env,ledger,store}=deps,fetcher=deps.fetcher??fetch,now=deps.now??Date.now();
 if(!imagesConfigured(env))throw new RoomError('Painting is not set up on this server. Your Game Master keeps their drawing.',503,'PAINT_UNAVAILABLE');
 const key=`paint:${request.requestId}`;
 const cached=await ledger.cached(key) as {images:string[]}|null;
 if(cached){if(!cached.images.length)throw new RoomError('That painting did not finish. Try again.',503,'PAINT_UNAVAILABLE');return cached;}
 const borrowed=borrowedName(request.description);
 if(borrowed)throw new RoomError(`“${borrowed}” belongs to another story. Describe how they look instead.`,400,'PAINT_BORROWED');
 if(await descriptionFlagged(request.description,env,fetcher,deps.signal))throw new RoomError('That description can’t be painted. Try different words.',400,'PAINT_REJECTED');
 const reservation=await ledger.reserve(key,`paint:${new Date(now).toISOString().slice(0,10)}`,PAINT_RESERVE_MICRO_USD,4_000);
 if(reservation==='blocked')throw new RoomError('Today’s painting allowance is used up. Your Game Master keeps their drawing.',503,'PAINT_ALLOWANCE');
 if(reservation!=='reserved')throw new RoomError('This painting is already being made. Try again in a moment.',409,'PAINT_PENDING');
 let outcome='failed';
 try{
  const response=await fetcher(FAL_ENDPOINT,{method:'POST',signal:deps.signal,headers:{authorization:`Key ${env.FAL_KEY}`,'content-type':'application/json'},
   body:JSON.stringify({prompt:request.kind==='hero'?heroPaintPrompt(request):paintPrompt(request),loras:[{path:env.FAL_LORA_URL,scale:1.1}],image_size:{width:768,height:1024},num_images:IMAGES_PER_PAINT,num_inference_steps:28,guidance_scale:3.5,enable_safety_checker:true,output_format:'jpeg'})});
  if(!response.ok){outcome=`fal ${response.status}`;throw new RoomError('The painter could not finish. Your Game Master keeps their drawing.',503,'PAINT_UNAVAILABLE');}
  const data=await response.json() as {images?:{url?:string}[];has_nsfw_concepts?:boolean[]};
  const images:string[]=[];
  for(const [i,image] of (data.images??[]).slice(0,IMAGES_PER_PAINT).entries()){
   if(data.has_nsfw_concepts?.[i]||!image.url||!/^https:\/\/[a-z0-9.-]*fal\.(media|ai|run)\//.test(image.url))continue;
   const file=await fetcher(image.url,{signal:deps.signal});
   const type=file.headers.get('content-type')?.split(';')[0]??'';
   if(!file.ok||!['image/jpeg','image/png','image/webp'].includes(type))continue;
   const bytes=new Uint8Array(await file.arrayBuffer());if(!bytes.length||bytes.length>MAX_IMAGE_BYTES)continue;
   const id=hex(await crypto.subtle.digest('SHA-256',bytes)).slice(0,32);
   await store.put(id,type,toBase64(bytes),now);images.push(id);
  }
  if(!images.length){outcome='no safe image';throw new RoomError('Nothing came back that could be used. Try a different description.',503,'PAINT_EMPTY');}
  outcome='ok';
  await ledger.finish(key,{images},undefined,{outcome});
  return {images};
 }catch(error){
  // The reservation stays (it may have been billed); record what happened so it is never retried blindly.
  await ledger.finish(key,{images:[]},undefined,{outcome}).catch(()=>{});
  throw error instanceof RoomError?error:new RoomError('The painter could not be reached. Your Game Master keeps their drawing.',503,'PAINT_UNAVAILABLE');
 }
}
