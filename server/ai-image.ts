import {RoomError} from './rooms.ts';
import type {BudgetLedger} from './ai-ledger.ts';
import {creationText,NARRATOR_ACCESSORIES,NARRATOR_FORMS,isPortraitId} from '../game/creation.ts';
import {HERO_COLORS} from '../game/types.ts';
import {borrowedName} from '../game/paint-words.ts';

/* Painting a Game Master with the image model (FLUX with the team's style LoRA, hosted on fal).
   The server builds the prompt from the builder's choices and one short, checked description, reserves
   the cost in the shared AI ledger, holds each player to a daily allowance, keeps only images that
   passed fal's safety checker, and stores them so saves, rooms and replays refer to them by id.
   Nothing here runs unless the owner configured it (see imagesAvailable and AI-SETUP.md). */

export type ImageEnv={FAL_KEY?:string;FAL_LORA_URL?:string;AI_ENABLE_IMAGES?:string;AI_IMAGES_PER_PLAYER_DAY?:string;OPENAI_API_KEY?:string};
export const IMAGES_PER_PAINT=2;
/** fal bills $0.035 per megapixel, rounded up per image; a 768 × 1024 image is one megapixel. Reserve a little over. */
export const PAINT_RESERVE_MICRO_USD=IMAGES_PER_PAINT*40_000;
export const MAX_IMAGE_BYTES=1_200_000;
const FAL_ENDPOINT='https://fal.run/fal-ai/flux-lora';

export function imagesConfigured(env:ImageEnv){
 return env.AI_ENABLE_IMAGES==='I_ACCEPT_PAID_IMAGES'&&!!env.FAL_KEY&&/^https:\/\/[a-z0-9.-]*fal\.(media|ai|run)\//.test(env.FAL_LORA_URL??'');
}
/** Images each player may make per UTC day; the owner can lower or raise it, never past 12. */
export function imagesPerPlayerDay(env:ImageEnv){
 const value=env.AI_IMAGES_PER_PLAYER_DAY;
 return value===undefined?4:/^\d+$/.test(value)?Math.min(Number(value),12):0;
}

export interface PaintRequest {name:string;form:typeof NARRATOR_FORMS[number];accessory:typeof NARRATOR_ACCESSORIES[number];color:string;tone:'hopeful'|'wry'|'grave';description:string;requestId:string}
export function parsePaintRequest(v:Record<string,unknown>):PaintRequest|null{
 const description=typeof v.description==='string'?v.description.replace(/\s+/g,' ').trim():'';
 if(!creationText(v.name,28)||!NARRATOR_FORMS.includes(v.form as never)||!NARRATOR_ACCESSORIES.includes(v.accessory as never)||!HERO_COLORS.includes(String(v.color))
  ||!['hopeful','wry','grave'].includes(String(v.tone))||(description&&!creationText(description,80))||typeof v.requestId!=='string'||!/^[a-zA-Z0-9-]{8,64}$/.test(v.requestId))return null;
 return {name:String(v.name).trim(),form:v.form as PaintRequest['form'],accessory:v.accessory as PaintRequest['accessory'],color:String(v.color),tone:v.tone as PaintRequest['tone'],description,requestId:v.requestId};
}

const COLOUR_NAMES:Record<string,string>={'#ef997c':'coral','#a3bbf0':'cornflower blue','#edcf75':'golden yellow','#b19bd3':'lavender','#8ac4ae':'sea green','#f0a6b2':'rose pink','#87bdcf':'sky blue','#cbad81':'tan','#b2c877':'moss green','#a4a4bf':'slate lilac'};
const FORM_WORDS:Record<PaintRequest['form'],string>={human:'a human storyteller',spirit:'a glowing spirit storyteller with no feet, its robe fading into wisps',cat:'a cat storyteller standing upright',owl:'an owl storyteller standing upright',fox:'a fox storyteller standing upright',dragon:'a small dragon storyteller standing upright, with wings'};
// The hat is kept apart so a crown can take its place: a crown on top of a hat reads as a mistake.
const TONE_WORDS:Record<PaintRequest['tone'],{hat:string;rest:string}>={hopeful:{hat:'a wide traveller hat',rest:'warm and kind, holding up a lantern'},wry:{hat:'a feathered cap tipped to one side',rest:'a sly half smile, a cape over one shoulder, holding a book'},grave:{hat:'a tall pointed hat',rest:'solemn, a high collar and a long worn cloak, holding an hourglass'}};
/** The prompt is ours; the player's words only fill the description slot. */
export function paintPrompt(r:PaintRequest){
 const tone=TONE_WORDS[r.tone],head=r.accessory==='crown'?'a small gold crown and no hat':tone.hat;
 const wear=r.accessory==='glasses'?', round glasses':'';
 // Matches the training captions (full body, centred, plain white) so the picture can be cut out and stood on the ground.
 return `PRSTYLE, full body from head to feet, fantasy storyteller, ${FORM_WORDS[r.form]}, dressed in ${COLOUR_NAMES[r.color]??'muted'} clothes, wearing ${head}${wear}, ${tone.rest}${r.description?`, ${r.description}`:''}, feet visible, whole figure inside the frame, standing, front view, centered, plain white background, no glow halo, no border, no text, no signature`;
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

export async function paintGameMaster(request:PaintRequest,deps:{env:ImageEnv;ledger:BudgetLedger;store:ImageStore;fetcher?:typeof fetch;now?:number;signal?:AbortSignal}):Promise<{images:string[]}>{
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
   body:JSON.stringify({prompt:paintPrompt(request),loras:[{path:env.FAL_LORA_URL,scale:1.1}],image_size:{width:768,height:1024},num_images:IMAGES_PER_PAINT,num_inference_steps:28,guidance_scale:3.5,enable_safety_checker:true,output_format:'jpeg'})});
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
