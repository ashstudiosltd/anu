export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
import { env } from "@/lib/anu/env";
import { replyToChat } from "@/lib/anu/reply-service";
import { memberIdentity, previewAllowance } from "@/lib/anu/auth";
import { readAnuMemberProfile } from "@/lib/anu/member-profile";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, {status:403});
  try {
    const member = await memberIdentity();
    if (request.headers.get("x-anu-account") !== (member?.id || "guest")) return Response.json({error:"Your account changed. Reloading your conversation."}, {status:409, headers:{"Cache-Control":"no-store"}});
    if (!member) {
      const preview = await previewAllowance();
      if (!preview.allowed) return Response.json({error:"Sign in with Devvrats to keep talking with Anu.", loginRequired:true}, {status:401, headers:{"Cache-Control":"no-store"}});
    }
    if (!env.GEMINI_API_KEY) return Response.json({ error: "Anu’s reply connection is missing. Add GEMINI_API_KEY to .env.local and restart the app to enable replies." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    const profile = member ? await readAnuMemberProfile(member.id) : null;
    const body = await request.clone().json().catch(() => null) as { space?: unknown } | null;
    if (!body || (body.space != null && body.space !== "anu")) return Response.json({ error: "Switch to Devvrats mode to use Sabha capabilities." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    const response = await replyToChat(request, member ? "full" : "main-demo", undefined, member?.name, profile ? { remember: profile.preferences.remember, responseStyle: profile.preferences.response_style, profile: { introduction: profile.account.bio || "", role: profile.account.role || "", skills: profile.account.skills || "", interests: profile.account.interests || "" } } : undefined);
    if (!member && response.ok) await previewAllowance(true);
    return response;
  } catch {
    return Response.json({error:"Accounts are temporarily unavailable. Please try again."}, {status:503, headers:{"Cache-Control":"no-store"}});
  }
}
