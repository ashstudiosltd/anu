import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/anu/env";

export async function authClient() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) throw new Error("Shared account configuration is missing");
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let isPublic = publishableKey.startsWith("sb_publishable_");
  if (!isPublic) { try { isPublic = JSON.parse(atob(publishableKey.split(".")[1])).role === "anon"; } catch { /* Not a legacy anon key. */ } }
  if (!isPublic) throw new Error("A Supabase publishable key is required; secret keys are forbidden");
  const projectUrl = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  if (projectUrl.pathname !== "/" && projectUrl.pathname !== "") throw new Error("Use the Supabase project root URL");
  const store = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: { path: "/", sameSite: "lax", ...(process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview" ? { domain: ".devvrats.in", secure: true } : {}) },
    cookies: { getAll: () => store.getAll(), setAll: (items) => { for (const {name, value, options} of items) store.set(name, value, options); } },
  });
}

export async function memberIdentity() {
  const client = await authClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError") throw new Error("Account verification unavailable");
  if (!user) return null;
  const raw = user.user_metadata.full_name || user.user_metadata.name || "Devvrat";
  const name = typeof raw === "string" ? raw.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 80) : "Devvrat";
  return { id: user.id, name };
}

export function loginUrl() {
  const origin = env.DEVVRATS_AUTH_ORIGIN || (process.env.NODE_ENV === "production" ? "https://www.devvrats.in" : "http://localhost:3001");
  const next = env.ANU_PUBLIC_URL || (process.env.NODE_ENV === "production" ? "https://anu.devvrats.in/" : "http://localhost:5173/");
  return `${origin}/registration?next=${encodeURIComponent(next)}`;
}

// Signed, HttpOnly preview quota survives refresh and new conversations.
// A durable rate limiter is still needed before opening this publicly at scale.
export async function previewAllowance(consume = false) {
  if (!env.ANU_PREVIEW_SECRET) throw new Error("Preview quota configuration is missing");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.ANU_PREVIEW_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  const store = await cookies();
  const current = store.get("anu-preview")?.value || "";
  let used = 0;
  let expires = Date.now() + 24 * 60 * 60 * 1000;
  const [payload, signature] = current.split(".");
  try {
    if (payload && signature && await crypto.subtle.verify("HMAC", key, Uint8Array.from(atob(signature), c => c.charCodeAt(0)), new TextEncoder().encode(payload))) {
      const decoded = JSON.parse(atob(payload));
      if (Number.isFinite(decoded.expires) && decoded.expires > Date.now() && Number.isInteger(decoded.used) && decoded.used >= 0) { used = decoded.used; expires = decoded.expires; }
    }
  } catch { /* Invalid cookies start an anonymous preview, never grant membership. */ }
  const allowed = used < 5;
  if (consume && allowed) {
    used++;
    const next = btoa(JSON.stringify({ used, expires }));
    const sig = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(next)))));
    store.set("anu-preview", `${next}.${sig}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: Math.max(0, Math.floor((expires-Date.now())/1000)) });
  }
  return { allowed, remaining: Math.max(0, 5-used) };
}
