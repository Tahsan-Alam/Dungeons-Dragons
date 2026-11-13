import {DEFAULT_CAPS} from './ai-ledger.ts';
export const MAX_CONFIGURED_CAPS={campaign:2_000_000,day:8_000_000,month:25_000_000};
type Config={AI_CAMPAIGN_MICRO_USD?:string;AI_DAY_MICRO_USD?:string;AI_MONTH_MICRO_USD?:string};
export function aiCaps(env:Config){
 const cap=(value:string|undefined,fallback:number,maximum:number)=>value===undefined?fallback:/^\d+$/.test(value)&&Number.isSafeInteger(Number(value))?Math.min(Number(value),maximum):0;
 return {...DEFAULT_CAPS,campaign:cap(env.AI_CAMPAIGN_MICRO_USD,DEFAULT_CAPS.campaign,MAX_CONFIGURED_CAPS.campaign),day:cap(env.AI_DAY_MICRO_USD,DEFAULT_CAPS.day,MAX_CONFIGURED_CAPS.day),month:cap(env.AI_MONTH_MICRO_USD,DEFAULT_CAPS.month,MAX_CONFIGURED_CAPS.month)};
}
