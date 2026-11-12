export type HealthLevel='ok'|'low'|'critical'|'down';

/** Health bars change colour at half and at a quarter; the number beside them carries the same information. */
export function healthLevel(hp:number,maxHp:number):HealthLevel {
 if(hp<=0||maxHp<=0)return 'down';
 const ratio=hp/maxHp;
 return ratio<=.25?'critical':ratio<=.5?'low':'ok';
}

/** Longer messages stay longer: six to twelve seconds, about 70ms per character. */
export function toastDuration(message:string):number {
 return Math.min(12_000,Math.max(6_000,message.length*70));
}
