export type RateCategory='create'|'creator'|'join'|'read'|'command'|'unlock';
const LIMITS:Record<RateCategory,number>={create:12,creator:120,join:40,read:900,command:600,unlock:5};
export async function rateLimitKey(category:string,identity:string,window:number) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${category}:${identity}:${window}`));
  return Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
}

export class D1RateLimiter {
  private db:D1Database;
  constructor(database:D1Database){this.db=database;}
  async consume(category:RateCategory,identity:string,now=Date.now(),overrideLimit?:number):Promise<boolean> {
    const key=await rateLimitKey(category,identity,Math.floor(now/60_000));
    const limit=overrideLimit??LIMITS[category];
    const row=await this.db.prepare('INSERT INTO room_rate_limits (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 WHERE count < ? RETURNING count')
      .bind(key,now+120_000,limit).first<{count:number}>();
    if(row?.count===1) {
      // Bounded, indexed maintenance on the first request of a bucket. No cron.
      await this.db.prepare('DELETE FROM room_rate_limits WHERE key IN (SELECT key FROM room_rate_limits WHERE expires_at < ? LIMIT 100)').bind(now).run();
    }
    return !!row;
  }
}
