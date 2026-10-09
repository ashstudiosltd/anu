declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    GEMINI_API_KEY?: string;
    ANU_GEMINI_MODEL?: string;
    SABHA_PUBLIC_URL?: string;
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
    DEVVRATS_AUTH_ORIGIN?: string;
    ANU_PREVIEW_SECRET?: string;
  }
}
