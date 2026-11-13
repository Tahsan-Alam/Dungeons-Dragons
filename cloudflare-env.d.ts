declare namespace Cloudflare {
  interface Env {
    OPENAI_API_KEY?:string;
    AI_ACCESS_PASSWORD_HASH?:string;
    AI_ACCESS_MODE?:string;
    AI_MODE?:string;
    AI_ENABLE_PAID?:string;
    AI_ENABLE_AUDIO?:string;
    AI_PLANNER_MODEL?:string;
    AI_CAMPAIGN_MICRO_USD?:string;
    AI_DAY_MICRO_USD?:string;
    AI_MONTH_MICRO_USD?:string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
