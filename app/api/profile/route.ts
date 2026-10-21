import { authClient, memberIdentity } from "@/lib/anu/auth";
import { readAnuMemberProfile, type AnuMemberPreferences } from "@/lib/anu/member-profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });

export async function GET() {
  try {
    const member = await memberIdentity();
    if (!member) return json({ error: "Sign in with Devvrats to open your profile." }, 401);
    return json(await readAnuMemberProfile(member.id));
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Your profile is temporarily unavailable." }, 503);
  }
}

export async function PUT(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Invalid request origin." }, 403);
  try {
    const member = await memberIdentity();
    if (!member) return json({ error: "Sign in with Devvrats to save your profile." }, 401);
    if (request.headers.get("x-anu-account") !== member.id) return json({ error: "Your account changed. Refresh and try again." }, 409);
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 12_000) return json({ error: "Profile notes are too long." }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: "Invalid profile request." }, 400); }
    if (body?.section === "account") {
      const limits: Record<string, number> = { name: 80, username: 30, bio: 500, role: 80, skills: 500, interests: 500, website: 300, location: 120 };
      if (!body.account || typeof body.account !== "object" || Array.isArray(body.account)) return json({ error: "Check your account details." }, 400);
      const fields: Record<string, string | boolean | null> = {};
      for (const [key, limit] of Object.entries(limits)) {
        const value = body.account[key];
        if (typeof value !== "string" || value.length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) return json({ error: `Check your ${key}.` }, 400);
        fields[key] = value.trim() || null;
      }
      if (typeof fields.name !== "string" || fields.name.length < 2) return json({ error: "Use a name between 2 and 80 characters." }, 400);
      if (typeof fields.username !== "string" || !/^[a-z0-9_]{3,30}$/.test(fields.username)) return json({ error: "Username needs 3–30 lowercase letters, numbers, or underscores." }, 400);
      if (fields.website) {
        try { const url = new URL(String(fields.website)); if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error(); }
        catch { return json({ error: "Use a full http or https website URL." }, 400); }
      }
      if (typeof body.account.location_public !== "boolean") return json({ error: "Check your location visibility." }, 400);
      fields.location_public = body.account.location_public;
      const client = await authClient();
      const { data, error } = await client.from("profiles").update(fields).eq("id", member.id).select("id").maybeSingle();
      if (error?.code === "23505") return json({ error: "That username is already in use." }, 409);
      if (error || !data) return json({ error: "Your Devvrats profile could not be saved." }, 503);
      return json(await readAnuMemberProfile(member.id));
    }
    if (!body || typeof body !== "object" || typeof body.remember !== "string" || typeof body.response_style !== "string" || !["light", "dark", "system"].includes(body.theme)) return json({ error: "Check your profile details and try again." }, 400);
    const preferences: AnuMemberPreferences = { remember: body.remember.trim(), response_style: body.response_style.trim(), theme: body.theme };
    if (preferences.remember.length > 1_500 || preferences.response_style.length > 1_000) return json({ error: "Profile notes are too long." }, 413);
    const client = await authClient();
    const { error } = await client.from("anu_member_preferences").upsert({ user_id: member.id, ...preferences, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) return json({ error: "Your profile could not be saved. Please try again." }, 503);
    return json({ preferences });
  } catch {
    return json({ error: "Your profile could not be saved. Please try again." }, 503);
  }
}
