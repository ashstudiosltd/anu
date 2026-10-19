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
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 5_000) return json({ error: "Profile notes are too long." }, 413);
    const body = JSON.parse(raw);
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
